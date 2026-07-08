import { getSupabaseAdmin } from "./google/_utils.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const TG = `https://api.telegram.org/bot${TOKEN}`;

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function tg(method, body) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const send = (chatId, text, extra = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });

const edit = (chatId, msgId, text, extra = {}) =>
  tg("editMessageText", { chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", ...extra });

const ack = (id) => tg("answerCallbackQuery", { callback_query_id: id });

const SK = (id) => `tg_state_${id}`;

async function getState(sb, chatId) {
  const { data } = await sb.from("settings").select("value").eq("key", SK(chatId)).single();
  if (!data?.value) return null;
  if (Date.now() - (data.value.ts || 0) > 7200000) {
    await sb.from("settings").delete().eq("key", SK(chatId));
    return null;
  }
  return data.value;
}

const setState = (sb, chatId, state) =>
  sb.from("settings").upsert({ key: SK(chatId), value: { ...state, ts: Date.now() } });

const clearState = (sb, chatId) =>
  sb.from("settings").delete().eq("key", SK(chatId));

async function parseMsg(text) {
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Parse a CRM interaction from Chinese/English text. Today is ${today} (Asia/Taipei).
Return JSON only: {"contacts":["name1"],"type":"Coffee|Meal|Call|Video Call|Meeting|Message|Note","date":"YYYY-MM-DD","note":"brief"}
- contacts: all people mentioned
- type: infer from context; default "Note"
- date: resolve relative expressions (昨天/上週/last Monday); default today
- note: one-sentence summary in Traditional Chinese (繁體中文)`,
        },
        { role: "user", content: text },
      ],
    }),
  });
  const d = await r.json();
  if (!d.choices?.[0]) {
    console.error("OpenAI error:", JSON.stringify(d));
    throw new Error(d.error?.message || "no choices");
  }
  return JSON.parse(d.choices[0].message.content);
}

function scoreMatch(q, name) {
  const a = q.toLowerCase().replace(/\s+/g, "");
  const b = name.toLowerCase().replace(/\s+/g, "");
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.85;
  let m = 0;
  for (const ch of a) if (b.includes(ch)) m++;
  return m / Math.max(a.length, b.length);
}

function findMatches(query, contacts) {
  return contacts
    .map(c => ({ c, s: scoreMatch(query, c.name) }))
    .filter(x => x.s >= 0.5)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5);
}

const TYPE_ICON = {
  Coffee: "☕", Meal: "🍜", Call: "📞", "Video Call": "💻",
  Meeting: "🤝", Message: "💬", Note: "📝",
};

function previewHtml({ parsed, resolved }) {
  const icon = TYPE_ICON[parsed.type] || "📝";
  return [
    `📋 <b>確認記錄</b>`,
    `📅 日期：${esc(parsed.date)}`,
    `${icon} 類型：${esc(parsed.type)}`,
    `👥 聯絡人：${resolved.map(r => esc(r.contact.name)).join("、")}`,
    `📝 備註：${esc(parsed.note || "（無）")}`,
  ].join("\n");
}

const FU_KB = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "3天", callback_data: "fu:3" }, { text: "1週", callback_data: "fu:7" }, { text: "2週", callback_data: "fu:14" }],
      [{ text: "1個月", callback_data: "fu:30" }, { text: "不用了", callback_data: "fu:skip" }],
    ],
  },
};

async function handleNew(sb, chatId, text) {
  if (await getState(sb, chatId)) {
    await send(chatId, "有未完成的記錄，請先完成或輸入 /cancel 取消。");
    return;
  }

  let parsed;
  try { parsed = await parseMsg(text); }
  catch (e) { await send(chatId, `❌ 解析失敗：${e.message}`); return; }

  const VALID_TYPES = new Set(["Coffee", "Meal", "Call", "Video Call", "Meeting", "Message", "Note"]);
  if (!VALID_TYPES.has(parsed.type)) parsed.type = "Note";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    parsed.date = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  }
  if (typeof parsed.note === "string" && parsed.note.length > 500) parsed.note = parsed.note.slice(0, 500);
  if (!Array.isArray(parsed.contacts)) parsed.contacts = [];
  parsed.contacts = parsed.contacts.filter(c => typeof c === "string").slice(0, 20);

  if (!parsed.contacts?.length) {
    await send(chatId, "找不到人名，請重新描述。");
    return;
  }

  const { data: contacts } = await sb.from("contacts").select("id, name");
  const resolved = [], pending = [], notFound = [];

  for (const name of parsed.contacts) {
    const hits = findMatches(name, contacts);
    if (!hits.length) {
      notFound.push(name);
    } else if (hits[0].s >= 0.85 && (hits.length === 1 || hits[0].s > (hits[1]?.s ?? 0) + 0.1)) {
      resolved.push({ query: name, contact: { id: hits[0].c.id, name: hits[0].c.name } });
    } else {
      pending.push({ query: name, candidates: hits.map(h => ({ id: h.c.id, name: h.c.name })) });
    }
  }

  if (notFound.length)
    await send(chatId, `⚠️ 找不到這些人：${notFound.map(esc).join("、")}`);

  const state = { parsed, resolved, pending, notFound, pidx: 0 };

  if (pending.length) {
    await setState(sb, chatId, { ...state, step: "sel" });
    await askSel(chatId, state);
  } else if (resolved.length) {
    await setState(sb, chatId, { ...state, step: "confirm" });
    await showConfirm(chatId, state);
  } else {
    await send(chatId, "沒有可記錄的聯絡人。");
  }
}

async function askSel(chatId, state) {
  const item = state.pending[state.pidx];
  await send(chatId, `「${esc(item.query)}」找到多個候選，請選擇：`, {
    reply_markup: {
      inline_keyboard: [
        ...item.candidates.map((c, i) => [{ text: `${i + 1}. ${c.name}`, callback_data: `sel:${i}` }]),
        [{ text: "⏭ 跳過此人", callback_data: "sel:skip" }],
      ],
    },
  });
}

async function showConfirm(chatId, state) {
  await send(chatId, previewHtml(state), {
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ 確認記錄", callback_data: "confirm" },
        { text: "❌ 取消", callback_data: "cancel" },
      ]],
    },
  });
}

const TIER_CADENCE = { 1: 30, 2: 60, 3: 90, 4: 180 };

async function handleToday(sb, chatId) {
  const { data: contacts } = await sb
    .from("contacts")
    .select("id, name, birthday, next_follow_up, follow_up_note, last_contact, tier");
  const all = contacts || [];

  const nowGmt8 = new Date(Date.now() + 8 * 3600000);
  const todayISO = nowGmt8.toISOString().slice(0, 10);
  const todayMMDD = todayISO.slice(5);

  const birthdays = all.filter(c => {
    const raw = (c.birthday || "").startsWith("--") ? c.birthday.slice(2) : c.birthday;
    return raw === todayMMDD;
  });

  const overdue = all
    .filter(c => c.next_follow_up && c.next_follow_up <= todayISO)
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up));

  const overdueIds = new Set(overdue.map(c => c.id));
  const cold = all
    .filter(c => {
      if (overdueIds.has(c.id) || !c.last_contact) return false;
      const ds = Math.floor((Date.now() - new Date(c.last_contact + "T00:00:00Z")) / 86400000);
      return ds > (TIER_CADENCE[c.tier] || 90);
    })
    .sort((a, b) => (a.last_contact || "").localeCompare(b.last_contact || ""));

  const lines = [`📋 <b>今日摘要 — ${todayISO}</b>`];
  if (birthdays.length) {
    lines.push("", "🎂 <b>今天生日</b>");
    for (const c of birthdays) lines.push(`· ${esc(c.name)}`);
  }
  if (overdue.length) {
    lines.push("", `⏰ <b>逾期 Follow-up（${overdue.length}）</b>`);
    for (const c of overdue.slice(0, 8))
      lines.push(`· ${esc(c.name)} — ${esc(c.next_follow_up)}${c.follow_up_note ? `（${esc(c.follow_up_note)}）` : ""}`);
    if (overdue.length > 8) lines.push(`…還有 ${overdue.length - 8} 人`);
  }
  if (cold.length) {
    lines.push("", `🌵 <b>變冷名單（${cold.length}）</b>`);
    for (const c of cold.slice(0, 8)) {
      const ds = Math.floor((Date.now() - new Date(c.last_contact + "T00:00:00Z")) / 86400000);
      lines.push(`· ${esc(c.name)} — ${ds} 天未聯繫`);
    }
    if (cold.length > 8) lines.push(`…還有 ${cold.length - 8} 人`);
  }
  if (!birthdays.length && !overdue.length && !cold.length) {
    lines.push("", "✅ 全部處理完畢，沒有待辦。");
  }
  await send(chatId, lines.join("\n"));
}

async function handleCb(sb, chatId, msgId, data) {
  const state = await getState(sb, chatId);
  if (!state) { await send(chatId, "Session 已過期，請重新輸入。"); return; }

  if (data.startsWith("sel:")) {
    const choice = data.slice(4);
    if (choice !== "skip") {
      const idx = parseInt(choice);
      const item = state.pending[state.pidx];
      if (isNaN(idx) || idx < 0 || idx >= item.candidates.length) return;
      state.resolved.push({ query: item.query, contact: item.candidates[idx] });
    }
    state.pidx++;
    if (state.pidx < state.pending.length) {
      await setState(sb, chatId, state);
      await askSel(chatId, state);
      return;
    }
    state.step = "confirm";
    await setState(sb, chatId, state);
    if (!state.resolved.length) {
      await clearState(sb, chatId);
      await send(chatId, "沒有可記錄的聯絡人。");
      return;
    }
    await showConfirm(chatId, state);
    return;
  }

  if (data === "confirm") {
    const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const date = state.parsed.date || today;

    const { error } = await sb.from("interactions").insert(
      state.resolved.map(r => ({
        contact_id: r.contact.id, date, type: state.parsed.type,
        note: state.parsed.note || null, source: "telegram",
      }))
    );

    if (error) {
      await edit(chatId, msgId, "❌ 記錄失敗，請再試一次。", { reply_markup: { inline_keyboard: [] } });
      return;
    }

    await Promise.all(
      state.resolved.map(r => sb.from("contacts").update({ last_contact: date }).eq("id", r.contact.id))
    );

    await edit(chatId, msgId, previewHtml(state) + `\n\n✅ <b>已記錄 ${state.resolved.length} 筆互動！</b>`, {
      reply_markup: { inline_keyboard: [] },
    });

    if (state.resolved.length === 1) {
      const c = state.resolved[0].contact;
      await setState(sb, chatId, { ...state, step: "fu", fuId: c.id, fuName: c.name });
      await send(chatId, `要為 <b>${esc(c.name)}</b> 設定 follow-up 嗎？`, FU_KB);
    } else {
      await setState(sb, chatId, { ...state, step: "fu_who" });
      await send(chatId, "要為哪位設定 follow-up？", {
        reply_markup: {
          inline_keyboard: [
            ...state.resolved.map(r => [{ text: r.contact.name, callback_data: `fuwho:${r.contact.id}` }]),
            [{ text: "不用了", callback_data: "fu:skip" }],
          ],
        },
      });
    }
    return;
  }

  if (data === "cancel") {
    await clearState(sb, chatId);
    await edit(chatId, msgId, "已取消。", { reply_markup: { inline_keyboard: [] } });
    return;
  }

  if (data.startsWith("fuwho:")) {
    const contactId = data.slice(6);
    const contact = state.resolved.find(r => r.contact.id === contactId)?.contact;
    if (!contact) return;
    await setState(sb, chatId, { ...state, step: "fu", fuId: contact.id, fuName: contact.name });
    await send(chatId, `要多久後 follow-up <b>${esc(contact.name)}</b>？`, FU_KB);
    return;
  }

  if (data.startsWith("fu:")) {
    const days = data.slice(3);
    await clearState(sb, chatId);
    if (days === "skip") {
      await send(chatId, "👍 好的，已完成記錄。");
      return;
    }
    const d = new Date(Date.now() + 8 * 3600000);
    d.setDate(d.getDate() + parseInt(days));
    const fuDate = d.toISOString().slice(0, 10);
    await sb.from("contacts").update({ next_follow_up: fuDate }).eq("id", state.fuId);
    await send(chatId, `⏰ 已為 <b>${esc(state.fuName)}</b> 設定 follow-up：${fuDate}`);
    return;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret && req.headers["x-telegram-bot-api-secret-token"] !== webhookSecret) {
    return res.status(401).end();
  }
  const sb = getSupabaseAdmin();

  try {
    const body = req.body;
    if (body.callback_query) {
      const { id, from, message, data } = body.callback_query;
      await ack(id);
      if (String(from.id) === ALLOWED_ID)
        await handleCb(sb, String(from.id), message.message_id, data);
    } else if (body.message?.text) {
      const { text, from } = body.message;
      const chatId = String(from.id);
      if (chatId !== ALLOWED_ID) {
        await send(chatId, "⛔ Unauthorized");
      } else if (text === "/cancel") {
        await clearState(sb, chatId);
        await send(chatId, "已取消。");
      } else if (text === "/start") {
        await send(chatId, "👋 CRM Bot 就緒！\n輸入互動描述，例如：「跟王小明吃午飯，聊了新創計畫」\n\n/today — 今日摘要（生日、逾期 follow-up、變冷名單）");
      } else if (text === "/today") {
        await handleToday(sb, chatId);
      } else {
        await handleNew(sb, chatId, text);
      }
    }
  } catch (e) {
    console.error("tg:", e);
  }

  return res.status(200).json({ ok: true });
}
