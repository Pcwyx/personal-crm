import { useState } from "react";
import { INTERACTION_TYPES, todayISO, followUpDaysPreset } from "../lib/utils.js";

export default function QuickLog({ onAdd, onSetFollowUp }) {
  const [type, setType] = useState("note");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showStrip, setShowStrip] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    await onAdd({ date, type, note: note.trim() });
    setNote("");
    setType("note");
    setDate(todayISO());
    setSaving(false);
    setShowStrip(true);
  }

  function handleFollowUp(preset) {
    onSetFollowUp?.(followUpDaysPreset(preset));
    setShowStrip(false);
  }

  return (
    <div>
      <form className="quicklog" onSubmit={handleSubmit}>
        <div className="dp-section-title" style={{ marginBottom: 8 }}>Log interaction</div>
        <div className="ql-types">
          {INTERACTION_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              className={`ql-type-btn${type === t.value ? " active" : ""}`}
              onClick={() => setType(t.value)}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <textarea
          className="ql-textarea"
          placeholder="What happened? Any notes…"
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="ql-footer">
          <input
            type="date"
            className="ql-date-input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: "6px 14px", fontSize: 13 }}
            disabled={!note.trim() || saving}
          >
            {saving ? "Saving…" : "Log"}
          </button>
        </div>
      </form>

      {showStrip && (
        <div className="followup-strip">
          <span className="followup-strip-label">✓ Logged! Follow up in:</span>
          {[["3d","3 days"],["1w","1 week"],["2w","2 weeks"],["1m","1 month"]].map(([key, label]) => (
            <button key={key} className="followup-strip-btn" onClick={() => handleFollowUp(key)}>{label}</button>
          ))}
          <button className="followup-strip-btn skip" onClick={() => setShowStrip(false)}>Skip</button>
        </div>
      )}
    </div>
  );
}
