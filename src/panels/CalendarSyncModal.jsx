import { useState, useEffect } from "react";
import { INTERACTION_TYPES } from "../lib/utils.js";
import { authFetch } from "../supabase.js";

export default function CalendarSyncModal({ onClose, onImported }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState([]);
  const [selected, setSelected] = useState({});
  const [types, setTypes] = useState({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/api/google/sync")
      .then(r => r.json())
      .then(({ preview: items, error: err }) => {
        if (err) { setError(err); setLoading(false); return; }
        setPreview(items || []);
        const sel = {};
        const tps = {};
        (items || []).forEach(ev => {
          sel[ev.google_event_id] = true;
          tps[ev.google_event_id] = ev.type;
        });
        setSelected(sel);
        setTypes(tps);
        setLoading(false);
      })
      .catch(() => { setError("Failed to fetch events"); setLoading(false); });
  }, []);

  function toggle(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleImport() {
    const items = preview
      .filter(ev => selected[ev.google_event_id])
      .map(ev => ({
        google_event_id: ev.google_event_id,
        title: ev.title,
        date: ev.date,
        type: types[ev.google_event_id] || ev.type,
        contact_ids: ev.matched_contacts.map(c => c.id),
        description: ev.description,
      }));
    if (!items.length) { onClose(); return; }
    setImporting(true);
    const r = await authFetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const { imported } = await r.json();
    setImporting(false);
    onImported(imported);
    onClose();
  }

  const checkedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-title" style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📅</span> Import from Google Calendar
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-faint)", fontSize: 14 }}>
            Fetching last 30 days…
          </div>
        ) : error ? (
          <div style={{ padding: "20px 0", color: "var(--red)", fontSize: 13.5 }}>{error}</div>
        ) : preview.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 14, color: "var(--ink-mid)" }}>No new events to import</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>All recent calendar meetings are already logged.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: "var(--ink-mid)", marginBottom: 14 }}>
              Found {preview.length} meetings with CRM contacts in the last 30 days.
            </div>
            <div style={{ overflowY: "auto", flex: 1, marginRight: -4, paddingRight: 4 }}>
              {preview.map(ev => (
                <div
                  key={ev.google_event_id}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    opacity: selected[ev.google_event_id] ? 1 : 0.4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[ev.google_event_id]}
                    onChange={() => toggle(ev.google_event_id)}
                    style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--acc)", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
                      {ev.title || "(no title)"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-mid)", marginBottom: 5 }}>
                      {ev.date} · {ev.matched_contacts.map(c => c.name).join(", ")}
                    </div>
                    <select
                      value={types[ev.google_event_id] || "meeting"}
                      onChange={e => setTypes(prev => ({ ...prev, [ev.google_event_id]: e.target.value }))}
                      style={{
                        fontSize: 11.5, padding: "3px 6px", border: "1px solid var(--border)",
                        borderRadius: 6, background: "var(--bg)", color: "var(--ink)", cursor: "pointer",
                      }}
                    >
                      {INTERACTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-footer" style={{ marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose} disabled={importing}>Cancel</button>
          {!loading && !error && preview.length > 0 && (
            <button className="btn-primary" onClick={handleImport} disabled={importing || checkedCount === 0}>
              {importing ? "Importing…" : `Import ${checkedCount} event${checkedCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
