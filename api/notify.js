import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const APP_URL = "https://personal-crm-silk.vercel.app";

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const RELATIONSHIP_CADENCE = {
  Family: 30, Friend: 60, School: 90, Colleague: 75, Network: 90, Mentor: 45, Collaborator: 60,
};

function threshold(c) {
  if (c.cadence) return c.cadence;
  if (c.relationship?.length) return Math.min(...c.relationship.map(r => RELATIONSHIP_CADENCE[r] ?? 90));
  return 90;
}

function daysSince(c) {
  if (!c.last_contact) return null;
  return Math.floor((Date.now() - new Date(c.last_contact)) / 86400000);
}

function driftRatio(c) {
  const ds = daysSince(c);
  return ds === null ? 0 : ds / threshold(c);
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function birthdayDaysUntil(birthday) {
  if (!birthday) return null;
  // Handles both "MM-DD" (new) and "--MM-DD" (legacy, during transition)
  const raw = birthday.startsWith("--") ? birthday.slice(2) : birthday;
  const [mm, dd] = raw.split("-").map(Number);
  if (!mm || !dd) return null;
  // "Today" in GMT+8, consistent with the rest of this handler
  const nowGmt8 = new Date(Date.now() + 8 * 3600000);
  const y = nowGmt8.getUTCFullYear();
  const todayMidnight = Date.UTC(y, nowGmt8.getUTCMonth(), nowGmt8.getUTCDate());
  // Feb 29 birthdays fall on Feb 28 in non-leap years
  const occurrence = (yy) => {
    const day = mm === 2 && dd === 29 && !isLeapYear(yy) ? 28 : dd;
    return Date.UTC(yy, mm - 1, day);
  };
  let next = occurrence(y);
  if (next < todayMidnight) next = occurrence(y + 1);
  return Math.round((next - todayMidnight) / 86400000);
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function contactRow(c, detail) {
  const sub = [c.role, c.company].filter(Boolean).map(esc).join(" · ");
  const link = `${APP_URL}/?contact=${c.id}`;
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid rgba(60,50,40,0.07);">
        <a href="${link}" style="text-decoration:none;color:inherit;display:block;">
          <span style="font-size:14px;font-weight:600;color:#2A251F;">${esc(c.name) || "未命名"}</span>
          ${sub ? `<span style="font-size:12px;color:#8B7F70;margin-left:8px;">${sub}</span>` : ""}
          <div style="font-size:12px;color:#6B6055;margin-top:3px;">${detail}</div>
        </a>
      </td>
    </tr>`;
}

function section(title, rows, overflow) {
  if (!rows.length) return "";
  return `
    <div style="margin-bottom:28px;">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#5C6B4E;margin-bottom:10px;">${title}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;border:1px solid rgba(60,50,40,0.09);border-radius:10px;padding:0 16px;">
        <tbody>${rows.join("")}</tbody>
      </table>
      ${overflow > 0 ? `<div style="font-size:12px;color:#8B7F70;margin-top:7px;padding-left:2px;">還有 ${overflow} 人</div>` : ""}
    </div>`;
}

function wrapEmail(body, dateLabel) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;padding:0;background:#F5F1EA;">
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:36px 24px;">
      <div style="margin-bottom:32px;">
        <div style="font-size:21px;font-weight:700;color:#2A251F;letter-spacing:-0.3px;">趴踢的人際週報</div>
        <div style="font-size:13px;color:#6B6055;margin-top:5px;">${dateLabel}</div>
      </div>
      ${body}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(60,50,40,0.10);text-align:center;">
        <a href="${APP_URL}" style="display:inline-block;background:#5C6B4E;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">開啟 people.crm</a>
      </div>
    </div>
  </body></html>`;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).end();
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, role, company, last_contact, next_follow_up, follow_up_note, birthday, cadence, relationship, bio, notes");
  if (error) return res.status(500).json({ error: error.message });
  const contacts = data || [];

  const nowGmt8 = new Date(Date.now() + 8 * 3600000);
  const todayISO = nowGmt8.toISOString().slice(0, 10);
  const isMonday = nowGmt8.getDay() === 1;
  const dateLabel = `${nowGmt8.getMonth() + 1}月${nowGmt8.getDate()}日`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const todayBirthdays = contacts.filter(c => birthdayDaysUntil(c.birthday) === 0);

  if (isMonday) {
    // Drift: contacts overdue on cadence, top 5 by ratio
    const driftAll = contacts
      .filter(c => { const ds = daysSince(c); return ds !== null && ds > threshold(c); })
      .sort((a, b) => driftRatio(b) - driftRatio(a));
    const driftTop = driftAll.slice(0, 5);
    const driftRows = driftTop.map(c => {
      const overdue = daysSince(c) - threshold(c);
      return contactRow(c, `已超過 ${overdue} 天未聯繫`);
    });

    // Follow-up: overdue + this week (next 6 days), sorted by date
    const endOfWeek = new Date(nowGmt8);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const endOfWeekISO = endOfWeek.toISOString().slice(0, 10);
    const followAll = contacts
      .filter(c => c.next_follow_up && c.next_follow_up <= endOfWeekISO)
      .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up));
    const followTop = followAll.slice(0, 5);
    const followRows = followTop.map(c => {
      const isOverdue = c.next_follow_up < todayISO;
      const label = `${isOverdue ? "逾期 · " : ""}${formatDate(c.next_follow_up)}${c.follow_up_note ? ` — ${esc(c.follow_up_note)}` : ""}`;
      return contactRow(c, label);
    });

    // Birthdays this week (0–6 days)
    const bdAll = contacts
      .filter(c => { const d = birthdayDaysUntil(c.birthday); return d !== null && d >= 0 && d <= 6; })
      .sort((a, b) => birthdayDaysUntil(a.birthday) - birthdayDaysUntil(b.birthday));
    const bdTop = bdAll.slice(0, 5);
    const bdRows = bdTop.map(c => {
      const d = birthdayDaysUntil(c.birthday);
      return contactRow(c, d === 0 ? "🎂 今天生日" : `${d} 天後生日`);
    });

    if (!driftTop.length && !followTop.length && !bdTop.length) {
      return res.status(200).json({ sent: false, reason: "no content" });
    }

    const body = [
      section("建立聯繫的人", driftRows, driftAll.length - driftTop.length),
      section("待辦 Follow-up", followRows, followAll.length - followTop.length),
      section("本週生日", bdRows, bdAll.length - bdTop.length),
    ].join("");

    await transporter.sendMail({
      from: `"people.crm" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `趴踢的人際週報 — ${dateLabel}`,
      html: wrapEmail(body, dateLabel),
    });

    return res.status(200).json({ sent: true, type: "weekly" });
  }

  // Non-Monday: birthday-only emails
  if (!todayBirthdays.length) {
    return res.status(200).json({ sent: false, reason: "no birthdays today" });
  }

  for (const c of todayBirthdays) {
    const sub = [c.role, c.company].filter(Boolean).map(esc).join(" · ");
    const bio = esc(c.bio || c.notes || "");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#F5F1EA;">
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:36px 24px;">
        <div style="margin-bottom:24px;">
          <div style="font-size:21px;font-weight:700;color:#2A251F;">今天的壽星是：${esc(c.name)}</div>
          ${sub ? `<div style="font-size:13px;color:#6B6055;margin-top:5px;">${sub}</div>` : ""}
        </div>
        <div style="background:#FBF8F3;border:1px solid rgba(60,50,40,0.09);border-radius:10px;padding:24px;text-align:center;">
          <div style="font-size:40px;margin-bottom:${bio ? "14px" : "0"};">🎂</div>
          ${bio ? `<div style="font-size:13.5px;color:#6B6055;line-height:1.65;text-align:left;">${bio}</div>` : ""}
        </div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${APP_URL}/?contact=${c.id}" style="display:inline-block;background:#5C6B4E;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">開啟聯絡人頁面</a>
        </div>
      </div>
    </body></html>`;

    await transporter.sendMail({
      from: `"people.crm" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `今天的壽星是：${c.name}`,
      html,
    });
  }

  return res.status(200).json({ sent: true, type: "birthday", count: todayBirthdays.length });
}
