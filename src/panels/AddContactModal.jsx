import { useState } from "react";
import { RELATIONSHIPS, TIER_COLORS, TAG_NAMESPACES, avatarColor, avatarInitials, followUpDaysPreset } from "../lib/utils.js";

export default function AddContactModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: "", role: "", company: "", email: "", phone: "",
    linkedin: "", twitter: "", instagram: "",
    birthday: "", location: "",
    relationship: [], tier: 3, tags: [], notes: "",
    followUpPreset: "",
  });
  const [tagDraft, setTagDraft] = useState("");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagPickerNs, setTagPickerNs] = useState("");
  const [tagPickerVal, setTagPickerVal] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function toggleRel(r) {
    set("relationship", form.relationship.includes(r)
      ? form.relationship.filter(x => x !== r)
      : [...form.relationship, r]
    );
  }

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/,/g, "");
    if (tag && !form.tags.includes(tag)) set("tags", [...form.tags, tag]);
    setTagDraft("");
  }

  function addStructuredTag() {
    const tag = tagPickerNs
      ? `${tagPickerNs}:${tagPickerVal.trim().toLowerCase()}`
      : tagPickerVal.trim().toLowerCase();
    if (tag && tag !== ":" && !form.tags.includes(tag)) set("tags", [...form.tags, tag]);
    setTagPickerNs("");
    setTagPickerVal("");
    setTagPickerOpen(false);
  }

  function removeTag(t) { set("tags", form.tags.filter(x => x !== t)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const social = {};
    if (form.linkedin) social.linkedin = form.linkedin;
    if (form.twitter) social.twitter = form.twitter;
    if (form.instagram) social.instagram = form.instagram;

    const next_follow_up = form.followUpPreset ? followUpDaysPreset(form.followUpPreset) : null;

    const data = {
      name: form.name.trim(),
      role: form.role || null,
      company: form.company || null,
      email: form.email || null,
      phone: form.phone || null,
      birthday: form.birthday || null,
      location: form.location || null,
      relationship: form.relationship,
      tier: form.tier,
      tags: form.tags,
      notes: form.notes || null,
      bio: null, photo: null,
      social: Object.keys(social).length ? social : {},
      next_follow_up,
      follow_up_note: null,
      last_contact: null,
      important_dates: [],
    };

    try {
      await onAdd(data);
    } finally {
      setSaving(false);
    }
  }

  const initials = avatarInitials(form.name || "?");
  const color = avatarColor(form.name || "");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div className="avatar-preview" style={{ background: color, color: "#fff" }}>{initials}</div>
          <div className="modal-title" style={{ marginBottom: 0 }}>New contact</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="Full name" value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
          </div>

          <div className="form-row-2">
            <div>
              <label className="form-label">Role</label>
              <input className="form-input" placeholder="Product Manager" value={form.role} onChange={e => set("role", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Company</label>
              <input className="form-input" placeholder="Acme Inc." value={form.company} onChange={e => set("company", e.target.value)} />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="name@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" placeholder="+1 555 0100" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="form-label">LinkedIn</label>
              <div className="form-prefix-wrap">
                <span className="form-prefix">in/</span>
                <input className="form-input form-input-prefixed" placeholder="username" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Twitter</label>
              <div className="form-prefix-wrap">
                <span className="form-prefix">@</span>
                <input className="form-input form-input-prefixed" placeholder="handle" value={form.twitter} onChange={e => set("twitter", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div>
              <label className="form-label">Instagram</label>
              <div className="form-prefix-wrap">
                <span className="form-prefix">@</span>
                <input className="form-input form-input-prefixed" placeholder="handle" value={form.instagram} onChange={e => set("instagram", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="form-label">Birthday (MM-DD)</label>
              <input className="form-input" placeholder="05-14" value={form.birthday} onChange={e => set("birthday", e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="San Francisco, CA" value={form.location} onChange={e => set("location", e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">Relationship</label>
            <div className="rel-picker">
              {RELATIONSHIPS.map(r => (
                <button key={r} type="button"
                  className={`rel-pick-btn${form.relationship.includes(r) ? " active" : ""}`}
                  onClick={() => toggleRel(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Priority Tier</label>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[1, 2, 3, 4].map(t => {
                const col = TIER_COLORS[t];
                const active = form.tier === t;
                return (
                  <button key={t} type="button"
                    onClick={() => set("tier", t)}
                    style={{
                      padding: "5px 14px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                      border: `1.5px solid ${active ? col.border : "var(--border)"}`,
                      background: active ? col.bg : "none",
                      color: active ? col.text : "var(--ink-mid)",
                      cursor: "pointer",
                    }}
                  >T{t}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
              T1 = 30d · T2 = 60d · T3 = 90d · T4 = 180d
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Tags</label>
            <div className="tag-input-wrap">
              {form.tags.map(t => {
                const isStructured = t.includes(":");
                const [ns, val] = isStructured ? t.split(/:(.+)/) : [null, t];
                return (
                  <span key={t} className={`tag-chip${isStructured ? " structured" : ""}`}>
                    {isStructured && <span className="tag-ns">{ns}:</span>}{isStructured ? val : t}
                    <button type="button" className="tag-rm" onClick={() => removeTag(t)}>×</button>
                  </span>
                );
              })}
              <input
                className="tag-input"
                placeholder="Add tag…"
                value={tagDraft}
                onChange={e => setTagDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagDraft); }
                  if (e.key === "Backspace" && !tagDraft && form.tags.length) removeTag(form.tags[form.tags.length - 1]);
                }}
                onBlur={() => tagDraft && addTag(tagDraft)}
              />
              <button
                type="button"
                onClick={() => setTagPickerOpen(v => !v)}
                style={{ fontSize: 16, color: "var(--acc)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                title="Add structured tag"
              >＋</button>
            </div>
            {tagPickerOpen && (
              <div style={{
                marginTop: 8, padding: "10px 12px",
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {TAG_NAMESPACES.map(ns => (
                    <button key={ns} type="button"
                      onClick={() => setTagPickerNs(tagPickerNs === ns ? "" : ns)}
                      style={{
                        padding: "3px 8px", borderRadius: 5, fontSize: 11.5, cursor: "pointer",
                        border: "1px solid var(--border)",
                        background: tagPickerNs === ns ? "var(--acc-pale)" : "none",
                        color: tagPickerNs === ns ? "var(--acc)" : "var(--ink-mid)",
                      }}
                    >{ns}</button>
                  ))}
                  <button type="button"
                    onClick={() => setTagPickerNs("")}
                    style={{
                      padding: "3px 8px", borderRadius: 5, fontSize: 11.5, cursor: "pointer",
                      border: "1px solid var(--border)",
                      background: tagPickerNs === "" ? "var(--acc-pale)" : "none",
                      color: tagPickerNs === "" ? "var(--acc)" : "var(--ink-faint)",
                    }}
                  >general</button>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {tagPickerNs && <span style={{ fontSize: 12, color: "var(--ink-mid)", fontWeight: 600, whiteSpace: "nowrap" }}>{tagPickerNs}:</span>}
                  <input
                    className="form-input"
                    style={{ flex: 1, fontSize: 13 }}
                    placeholder={tagPickerNs ? `e.g. "tech"` : "tag value"}
                    value={tagPickerVal}
                    onChange={e => setTagPickerVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStructuredTag(); } if (e.key === "Escape") setTagPickerOpen(false); }}
                    autoFocus
                  />
                  <button type="button" className="btn-primary"
                    style={{ fontSize: 12, padding: "5px 10px" }}
                    onClick={addStructuredTag}
                    disabled={!tagPickerVal.trim()}
                  >Add</button>
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} placeholder="Any context about this person…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">Follow-up reminder</label>
            <div className="followup-picker">
              {[["3d","3 days"],["1w","1 week"],["2w","2 weeks"],["1m","1 month"],["3m","3 months"]].map(([key, label]) => (
                <button key={key} type="button"
                  className={`followup-btn${form.followUpPreset === key ? " active" : ""}`}
                  onClick={() => set("followUpPreset", form.followUpPreset === key ? "" : key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!form.name.trim() || saving}>
              {saving ? "Adding…" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
