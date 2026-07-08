import { useState } from "react";
import { TIER_CADENCE, TIER_COLORS, daysSince, todayISO, INTERACTION_TYPES } from "../lib/utils.js";
import Avatar from "../components/Avatar.jsx";

export default function ReviewMode({ queue, contacts, onClose, onMarkDone, onSnooze, onCheckIn, onLog, onOpenDetail }) {
  const [idx, setIdx] = useState(0);
  const [handled, setHandled] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [logType, setLogType] = useState("message");
  const [logNote, setLogNote] = useState("");

  const total = queue.length;
  const item = queue[idx];
  const contact = item ? contacts.find(c => c.id === item.id) : null;
  const finished = idx >= total;

  function advance(didHandle) {
    if (didHandle) setHandled(h => h + 1);
    setShowLog(false);
    setLogType("message");
    setLogNote("");
    setIdx(i => i + 1);
  }

  function handleContacted() {
    if (item.reason === "overdue") onMarkDone(contact.id);
    else onCheckIn(contact.id);
    advance(true);
  }

  function handleSnooze() {
    onSnooze(contact.id, 7);
    advance(true);
  }

  function handleLogSave() {
    onLog(contact.id, { date: todayISO(), type: logType, note: logNote.trim() || null });
    if (item.reason === "overdue") onMarkDone(contact.id);
    advance(true);
  }

  const ds = contact ? daysSince(contact.last_contact) : null;
  const cadence = contact ? TIER_CADENCE[contact.tier] || 90 : 90;
  const lastNote = contact?.interactions?.[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {finished ? (
          <div style={{ textAlign: "center", padding: "28px 8px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
              本週回顧完成
            </div>
            <div style={{ fontSize: 13.5, color: "var(--ink-mid)", marginBottom: 20 }}>
              處理了 {handled} / {total} 位聯絡人
            </div>
            <button className="btn-primary" onClick={onClose}>關閉</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 600, marginBottom: 6 }}>
                <span>每週回顧</span>
                <span>{idx + 1} / {total}</span>
              </div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
                <div style={{ height: 3, width: `${(idx / total) * 100}%`, background: "var(--acc)", borderRadius: 2, transition: "width .25s" }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <Avatar contact={contact} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                  {contact.name}
                  {contact.tier && (
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                      background: TIER_COLORS[contact.tier].bg, color: TIER_COLORS[contact.tier].text,
                    }}>T{contact.tier}</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-light)" }}>
                  {[contact.role, contact.company].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>

            <div style={{
              background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
              padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "var(--ink-mid)", lineHeight: 1.6,
            }}>
              {item.reason === "overdue" ? (
                <div>⏰ Follow-up 逾期 — {contact.next_follow_up}{contact.follow_up_note ? `：${contact.follow_up_note}` : ""}</div>
              ) : (
                <div>🌵 已 {ds} 天未聯繫（T{contact.tier || "?"} 週期 {cadence} 天）</div>
              )}
              {lastNote?.note && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-light)" }}>
                  上次互動（{lastNote.date}）：{lastNote.note.length > 80 ? lastNote.note.slice(0, 80) + "…" : lastNote.note}
                </div>
              )}
            </div>

            {showLog ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
                <select className="form-input" style={{ fontSize: 13 }} value={logType} onChange={e => setLogType(e.target.value)}>
                  {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
                <textarea className="form-textarea" rows={2} autoFocus placeholder="做了什麼、聊了什麼…"
                  value={logNote} onChange={e => setLogNote(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleLogSave}>儲存並繼續</button>
                  <button className="btn-secondary" onClick={() => setShowLog(false)}>返回</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="btn-primary" onClick={handleContacted}>✓ 已聯絡</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowLog(true)}>✍️ 記錄互動</button>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={handleSnooze}>⏰ 延後一週</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { onOpenDetail(contact.id); onClose(); }}>查看檔案</button>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => advance(false)}>跳過</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
