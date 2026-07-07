import { useState } from "react";
import { callAI } from "../lib/ai.js";
import { todayISO, findContactMatches, interactionEmoji, INTERACTION_TYPES } from "../lib/utils.js";

const VALID_TYPES = new Set(INTERACTION_TYPES.map(t => t.value));

function buildPrompt(text) {
  return `Parse a CRM interaction from Chinese/English text. Today is ${todayISO()}.
Return JSON only: {"contacts":["name1"],"type":"coffee|call|video|email|meeting|event|message|note","date":"YYYY-MM-DD","note":"brief"}
- contacts: all people mentioned
- type: infer from context (meals/lunch/dinner → "coffee"); default "note"
- date: resolve relative expressions (昨天/上週五/last Monday); default today
- note: one-sentence summary in Traditional Chinese (繁體中文)

Text: ${text}`;
}

export default function QuickCapture({ contacts, onLog }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("idle"); // idle|parsing|confirm|saving|done|error
  const [parsed, setParsed] = useState(null);
  const [resolved, setResolved] = useState([]); // [{query, contact|null, candidates}]

  async function handleParse() {
    if (!text.trim() || phase === "parsing") return;
    setPhase("parsing");
    try {
      const p = await callAI([{ role: "user", content: buildPrompt(text.trim()) }], 300);
      if (!VALID_TYPES.has(p.type)) p.type = "note";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) p.date = todayISO();
      if (typeof p.note !== "string") p.note = "";
      const names = (Array.isArray(p.contacts) ? p.contacts : []).filter(n => typeof n === "string").slice(0, 10);
      if (!names.length) { setPhase("error"); return; }

      const res = names.map(q => {
        const hits = findContactMatches(q, contacts);
        if (hits.length && hits[0].score >= 0.85 && (hits.length === 1 || hits[0].score > hits[1].score + 0.1)) {
          return { query: q, contact: hits[0].contact, candidates: [] };
        }
        return { query: q, contact: null, candidates: hits.map(h => h.contact) };
      });
      setParsed(p);
      setResolved(res);
      setPhase("confirm");
    } catch {
      setPhase("error");
    }
  }

  function pick(idx, contact) {
    setResolved(prev => prev.map((r, i) => (i === idx ? { ...r, contact } : r)));
  }

  async function handleSave() {
    const targets = resolved.filter(r => r.contact);
    if (!targets.length) return;
    setPhase("saving");
    for (const t of targets) {
      await onLog(t.contact.id, { date: parsed.date, type: parsed.type, note: parsed.note || null });
    }
    setText("");
    setParsed(null);
    setResolved([]);
    setPhase("done");
    setTimeout(() => setPhase(p => (p === "done" ? "idle" : p)), 2500);
  }

  function reset() {
    setParsed(null);
    setResolved([]);
    setPhase("idle");
  }

  const savable = resolved.some(r => r.contact);

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "12px 14px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{
            flex: 1, border: "none", outline: "none", background: "none",
            fontSize: 14, color: "var(--ink)", fontFamily: "inherit",
          }}
          placeholder="✨ 快速記錄:跟王小明吃午飯,聊了新專案…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleParse(); }}
          disabled={phase === "parsing" || phase === "saving"}
        />
        <button
          className="btn-primary"
          style={{ fontSize: 12.5, padding: "5px 14px", flexShrink: 0 }}
          onClick={handleParse}
          disabled={!text.trim() || phase === "parsing" || phase === "saving"}
        >
          {phase === "parsing" ? "解析中…" : "記錄"}
        </button>
      </div>

      {phase === "error" && (
        <div style={{ fontSize: 12.5, color: "var(--red)", marginTop: 8 }}>
          解析失敗——請確認句子裡有人名,或再試一次。
        </div>
      )}

      {phase === "done" && (
        <div style={{ fontSize: 12.5, color: "var(--green)", marginTop: 8 }}>✓ 已記錄</div>
      )}

      {(phase === "confirm" || phase === "saving") && parsed && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: "var(--ink-mid)" }}>
            <span>📅 {parsed.date}</span>
            <span>{interactionEmoji(parsed.type)} {INTERACTION_TYPES.find(t => t.value === parsed.type)?.label}</span>
          </div>

          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {resolved.map((r, i) => (
              <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 13 }}>
                {r.contact ? (
                  <span style={{
                    background: "var(--acc-pale)", color: "var(--acc)", fontWeight: 600,
                    padding: "2px 10px", borderRadius: 12,
                  }}>
                    {r.contact.name}
                  </span>
                ) : r.candidates.length ? (
                  <>
                    <span style={{ color: "var(--ink-faint)", fontSize: 12.5 }}>「{r.query}」是:</span>
                    {r.candidates.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => pick(i, c)}
                        style={{
                          border: "1px solid var(--border)", background: "none", cursor: "pointer",
                          padding: "2px 10px", borderRadius: 12, fontSize: 12.5, color: "var(--ink-mid)",
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </>
                ) : (
                  <span style={{ color: "var(--ink-faint)", fontSize: 12.5 }}>找不到「{r.query}」——將略過</span>
                )}
              </div>
            ))}
          </div>

          {parsed.note && (
            <div style={{ fontSize: 12.5, color: "var(--ink-light)", marginTop: 8 }}>📝 {parsed.note}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-primary" style={{ fontSize: 12.5, padding: "5px 14px" }}
              onClick={handleSave} disabled={!savable || phase === "saving"}>
              {phase === "saving" ? "儲存中…" : `確認記錄${resolved.filter(r => r.contact).length > 1 ? `(${resolved.filter(r => r.contact).length} 人)` : ""}`}
            </button>
            <button className="btn-secondary" style={{ fontSize: 12.5, padding: "5px 14px" }}
              onClick={reset} disabled={phase === "saving"}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
