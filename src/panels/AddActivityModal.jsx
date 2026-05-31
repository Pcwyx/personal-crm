import { useState, useMemo } from "react";
import { INTERACTION_TYPES, todayISO, avatarColor, avatarInitials } from "../lib/utils.js";
import { AvatarSimple } from "../components/Avatar.jsx";

export default function AddActivityModal({ contacts, onClose, onAdd }) {
  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("coffee");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, contacts]);

  function selectContact(c) {
    setSelectedContact(c);
    setQuery(c.name);
    setShowDropdown(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedContact || !note.trim()) return;
    setSaving(true);
    await onAdd({ contactId: selectedContact.id, date, type, note: note.trim() });
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Log Activity</div>

        <form onSubmit={handleSubmit}>
          {/* Contact typeahead */}
          <div className="form-row">
            <label className="form-label">Contact *</label>
            <div className="typeahead-wrap">
              {selectedContact ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--cream)" }}>
                  <AvatarSimple contact={selectedContact} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{selectedContact.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-light)" }}>{[selectedContact.role, selectedContact.company].filter(Boolean).join(" · ")}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedContact(null); setQuery(""); }} style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 16 }}>×</button>
                </div>
              ) : (
                <input
                  className="form-input"
                  placeholder="Search contacts…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  autoFocus
                />
              )}
              {showDropdown && results.length > 0 && (
                <div className="typeahead-dropdown">
                  {results.map(c => (
                    <div key={c.id} className="typeahead-item" onClick={() => selectContact(c)}>
                      <AvatarSimple contact={c} size={28} />
                      <div>
                        <div className="typeahead-name">{c.name}</div>
                        <div className="typeahead-role">{[c.role, c.company].filter(Boolean).join(" · ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="form-row">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Type */}
          <div className="form-row">
            <label className="form-label">Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INTERACTION_TYPES.map(t => (
                <button
                  key={t.value} type="button"
                  className={`ql-type-btn${type === t.value ? " active" : ""}`}
                  onClick={() => setType(t.value)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="form-row">
            <label className="form-label">Note *</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="What happened? Key takeaways, follow-ups, or just a quick note…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!selectedContact || !note.trim() || saving}>
              {saving ? "Logging…" : "Log activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
