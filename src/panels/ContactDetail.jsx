import { useState } from "react";
import {
  computeStrength, strengthColor, strengthLabel,
  formatBirthday, formatDate, formatRelative,
  interactionEmoji, daysUntilDate, birthdayDaysUntil,
  todayISO, followUpDaysPreset, RELATIONSHIPS, computeCadence,
} from "../lib/utils.js";
import Avatar from "../components/Avatar.jsx";
import RelChip from "../components/RelChip.jsx";
import DueBadge from "../components/DueBadge.jsx";
import QuickLog from "./QuickLog.jsx";

export default function ContactDetail({ contact: c, onClose, onUpdate, onAddInteraction, onDeleteInteraction, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiState, setAiState] = useState("idle");
  const [aiResult, setAiResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showFollowUpEdit, setShowFollowUpEdit] = useState(false);
  const [fuDate, setFuDate] = useState(c.next_follow_up || "");
  const [fuNote, setFuNote] = useState(c.follow_up_note || "");
  const [showPrep, setShowPrep] = useState(false);
  const [prepState, setPrepState] = useState("idle"); // idle | loading | done
  const [prepResult, setPrepResult] = useState(null);

  const strength = computeStrength(c);
  const sColor = strengthColor(strength);
  const sLabel = strengthLabel(strength);
  const cadence = c.cadence || 90;
  const daysSince = c.last_contact
    ? Math.floor((Date.now() - new Date(c.last_contact + "T00:00:00")) / 86400000)
    : null;
  const cadenceProgress = daysSince !== null ? Math.min(100, (daysSince / cadence) * 100) : 0;
  const barColor = cadenceProgress < 70 ? "var(--green)" : cadenceProgress < 100 ? "var(--amber)" : "var(--red)";
  const today = todayISO();

  function saveFollowUp() {
    onUpdate({ next_follow_up: fuDate || null, follow_up_note: fuNote || null });
    setShowFollowUpEdit(false);
  }

  async function generateAI() {
    setAiState("loading");
    const recentNotes = (c.interactions || [])
      .slice(0, 3)
      .map(i => `${i.date}: ${i.note}`)
      .join("\n");
    const prompt = `You are a personal relationship assistant. Based on the context below about ${c.name}, generate a specific follow-up suggestion.

Contact: ${c.name}
Role: ${c.role || "unknown"} at ${c.company || "unknown"}
Relationship: ${(c.relationship || []).join(", ")}
Last contact: ${c.last_contact || "unknown"}
Notes: ${c.notes || ""}
Recent interactions:
${recentNotes || "None"}

Return ONLY valid JSON, no markdown:
{"action": "A short specific action to take (under 12 words, starts with a verb)", "message": "A warm natural draft message to send (2-4 sentences, casual and genuine)"}`;

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 500 }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setAiResult(parsed);
      setAiState("done");
    } catch {
      setAiState("idle");
    }
  }

  async function generatePrep() {
    setPrepState("loading");
    const recent = (c.interactions || [])
      .slice(0, 5)
      .map(i => `${i.date} [${i.type}]: ${i.note}`)
      .join("\n");
    const prompt = `You are helping prepare for an upcoming meeting with ${c.name}. Be specific and concise.

Contact: ${c.name}
Role: ${c.role || "unknown"} at ${c.company || "unknown"}
Relationship: ${(c.relationship || []).join(", ")}
Bio: ${c.bio || ""}
Notes: ${c.notes || ""}
Recent interactions:
${recent || "None recorded"}

Return ONLY valid JSON, no markdown:
{"lastMeeting": "One sentence about the most recent interaction, or null", "background": "2-3 key things to remember about this person in one short paragraph", "topics": ["specific talking point 1", "specific talking point 2", "specific talking point 3"]}`;
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 600 }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setPrepResult(parsed);
      setPrepState("done");
    } catch {
      setPrepState("idle");
    }
  }

  async function handleReachedOut() {
    await onAddInteraction({ date: today, type: "message", note: "Reached out — AI-suggested follow-up" });
    onUpdate({ next_follow_up: null, follow_up_note: null });
    setAiResult(null);
    setAiState("idle");
  }

  const interactions = (c.interactions || [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  if (editMode) {
    return (
      <EditContactPanel
        contact={c}
        onSave={(data) => { onUpdate(data); setEditMode(false); }}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className="detail-panel">
      {/* Header */}
      <div className="dp-header">
        <div className="dp-header-top">
          <button className="dp-back" onClick={onClose}>← Back</button>
          <div className="dp-actions">
            <button className="dp-action-btn" onClick={() => setEditMode(true)}>✏️ Edit</button>
            <button className="dp-action-btn" onClick={() => setShowFollowUpEdit(v => !v)}>📅 Follow-up</button>
            <button className="dp-action-btn" onClick={() => {
              setShowPrep(v => !v);
              if (!showPrep && prepState === "idle") generatePrep();
            }}>📋 Prep</button>
          </div>
        </div>

        <div className="dp-identity">
          <Avatar contact={{ ...c, strength }} size={58} />
          <div className="dp-identity-info">
            <div className="dp-name">{c.name}</div>
            <div className="dp-role">
              {[c.role, c.company].filter(Boolean).join(" · ") || <span style={{ color: "var(--ink-faint)" }}>Role · Company</span>}
            </div>
            <div className="dp-rel-tags">
              {(c.relationship || []).map(r => <RelChip key={r} rel={r} />)}
              {c.next_follow_up && <DueBadge date={c.next_follow_up} threshold={365} />}
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div className="dp-health">
          <div className="dp-health-label">
            <span className="dp-health-name">Relationship health</span>
            <span className="dp-health-value" style={{ color: sColor }}>{sLabel}</span>
          </div>
          <div className="dp-bar-track">
            <div className="dp-bar-fill" style={{ width: `${strength * 100}%`, background: sColor }} />
          </div>
          <div className="dp-health-label">
            <span className="dp-health-name">Cadence ({cadence}d)</span>
            <span className="dp-health-value" style={{ color: barColor }}>
              {daysSince !== null ? `${daysSince}d since last contact` : "No contact yet"}
            </span>
          </div>
          <div className="dp-bar-track">
            <div className="dp-bar-fill" style={{ width: `${Math.min(cadenceProgress, 100)}%`, background: barColor }} />
          </div>
        </div>
      </div>

      {/* Follow-up editor */}
      {showFollowUpEdit && (
        <div className="dp-section" style={{ background: "var(--acc-pale)", borderColor: "var(--acc-light)" }}>
          <div className="dp-section-title">Set Follow-up</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[["3d","3 days"],["1w","1 week"],["2w","2 weeks"],["1m","1 month"],["3m","3 months"]].map(([key, label]) => (
              <button key={key} className="followup-btn" onClick={() => setFuDate(followUpDaysPreset(key))}>{label}</button>
            ))}
          </div>
          <input type="date" className="form-input" style={{ marginBottom: 8 }} value={fuDate} onChange={e => setFuDate(e.target.value)} />
          <input className="form-input" style={{ marginBottom: 10 }} placeholder="Note (optional)" value={fuNote} onChange={e => setFuNote(e.target.value)} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-primary" style={{ fontSize: 13, padding: "6px 14px" }} onClick={saveFollowUp}>Save</button>
            {c.next_follow_up && (
              <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => { onUpdate({ next_follow_up: null, follow_up_note: null }); setShowFollowUpEdit(false); }}>Clear</button>
            )}
            <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowFollowUpEdit(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Meeting Prep panel */}
      {showPrep && (
        <div className="dp-section meeting-prep-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="dp-section-title" style={{ marginBottom: 0 }}>📋 Meeting prep</div>
            <button onClick={() => setShowPrep(false)} style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
          {prepState === "loading" && (
            <div style={{ fontSize: 13, color: "var(--ink-mid)", padding: "8px 0" }}>✨ Preparing brief…</div>
          )}
          {prepState === "done" && prepResult && (
            <div className="prep-card">
              {prepResult.lastMeeting && (
                <div className="prep-row">
                  <span className="prep-label">Last meeting</span>
                  <span className="prep-value">{prepResult.lastMeeting}</span>
                </div>
              )}
              {prepResult.background && (
                <div className="prep-row">
                  <span className="prep-label">Background</span>
                  <span className="prep-value">{prepResult.background}</span>
                </div>
              )}
              {(prepResult.topics || []).length > 0 && (
                <div className="prep-row">
                  <span className="prep-label">Topics</span>
                  <ul className="prep-topics">
                    {prepResult.topics.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              <button className="prep-refresh" onClick={() => { setPrepState("idle"); setPrepResult(null); generatePrep(); }}>↻ Refresh</button>
            </div>
          )}
          {prepState === "idle" && (
            <button className="ai-generate-btn" onClick={generatePrep}>✨ Generate brief</button>
          )}
        </div>
      )}

      <div className="dp-body">
        {/* Contact info */}
        <div className="dp-section">
          <div className="dp-section-title">Contact</div>
          {c.email && (
            <div className="dp-info-row">
              <span className="dp-info-icon">✉️</span>
              <a href={`mailto:${c.email}`} className="dp-info-link">{c.email}</a>
            </div>
          )}
          {c.phone && (
            <div className="dp-info-row">
              <span className="dp-info-icon">📞</span>
              <a href={`tel:${c.phone}`} className="dp-info-link">{c.phone}</a>
            </div>
          )}
          {c.location && (
            <div className="dp-info-row">
              <span className="dp-info-icon">📍</span>
              <span className="dp-info-val">{c.location}</span>
            </div>
          )}
          {c.birthday && (
            <div className="dp-info-row">
              <span className="dp-info-icon">🎂</span>
              <span className="dp-info-val">{formatBirthday(c.birthday)}</span>
            </div>
          )}
          {(!c.email && !c.phone && !c.location && !c.birthday) && (
            <div style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic" }}>No contact info yet</div>
          )}
        </div>

        {/* Social */}
        {(c.social?.linkedin || c.social?.twitter || c.social?.instagram) && (
          <div className="dp-section">
            <div className="dp-section-title">Social</div>
            <div className="dp-social-chips">
              {c.social.linkedin && (
                <a href={`https://linkedin.com/in/${c.social.linkedin}`} target="_blank" rel="noreferrer" className="dp-social-chip linkedin">
                  in {c.social.linkedin}
                </a>
              )}
              {c.social.twitter && (
                <a href={`https://twitter.com/${c.social.twitter}`} target="_blank" rel="noreferrer" className="dp-social-chip twitter">
                  @{c.social.twitter}
                </a>
              )}
              {c.social.instagram && (
                <a href={`https://instagram.com/${c.social.instagram}`} target="_blank" rel="noreferrer" className="dp-social-chip instagram">
                  @{c.social.instagram}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {(c.tags || []).length > 0 && (
          <div className="dp-section">
            <div className="dp-section-title">Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {c.tags.map(t => <span key={t} className="tag-chip accent">{t}</span>)}
            </div>
          </div>
        )}

        {/* Notes / Bio */}
        {(c.bio || c.notes) && (
          <div className="dp-section">
            <div className="dp-section-title">Notes</div>
            {c.bio && <p className="dp-notes-text" style={{ marginBottom: c.notes ? 8 : 0 }}>{c.bio}</p>}
            {c.notes && <p style={{ fontSize: 13.5, color: "var(--ink-mid)", lineHeight: 1.65 }}>{c.notes}</p>}
          </div>
        )}

        {/* Important dates */}
        {(c.important_dates || []).length > 0 && (
          <div className="dp-section">
            <div className="dp-section-title">Important dates</div>
            {c.important_dates.map((d, i) => (
              <div key={i} className="dp-info-row">
                <span className="dp-info-icon">📅</span>
                <span className="dp-info-val">{d.name} — {d.date}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI suggestion */}
        <div className="dp-section">
          <div className="dp-section-title">AI Suggestion</div>
          <div className="ai-block">
            {aiState === "idle" && (
              <button className="ai-generate-btn" onClick={generateAI}>
                ✨ Generate follow-up suggestion
              </button>
            )}
            {aiState === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "10px 0", fontSize: 13, color: "var(--ink-mid)" }}>
                <span className="spin" style={{ display: "inline-block" }}>⏳</span> Thinking…
              </div>
            )}
            {aiState === "done" && aiResult && (
              <>
                <div className="ai-action">→ {aiResult.action}</div>
                <div className="ai-message">{aiResult.message}</div>
                <div className="ai-actions">
                  <button className="ai-btn" onClick={() => { navigator.clipboard.writeText(aiResult.message); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button className="ai-btn primary" onClick={handleReachedOut}>✓ I reached out</button>
                  <button className="ai-btn" onClick={() => { setAiState("idle"); setAiResult(null); }}>×</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Log */}
        <div className="dp-section" style={{ borderBottom: "none" }}>
          <QuickLog onAdd={onAddInteraction} onSetFollowUp={(date) => onUpdate({ next_follow_up: date })} />
        </div>

        {/* Interaction timeline */}
        {interactions.length > 0 && (
          <div className="dp-section" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="dp-section-title">History ({interactions.length})</div>
            <div className="tl-list">
              {interactions.map(i => (
                <div key={i.id} className="tl-item">
                  <div className="tl-dot">{interactionEmoji(i.type)}</div>
                  <div className="tl-content">
                    <div className="tl-meta">
                      <span className="tl-date">{formatDate(i.date)}</span>
                      <button className="tl-delete" onClick={() => onDeleteInteraction(i.id)}>×</button>
                    </div>
                    {i.note && <div className="tl-note">{i.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div style={{ padding: "14px 16px" }}>
          {showDeleteConfirm ? (
            <div style={{ background: "rgba(196,79,58,.07)", border: "1px solid var(--acc-light)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13.5, color: "var(--ink)", marginBottom: 10 }}>Delete {c.name}? This cannot be undone.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-danger" style={{ fontSize: 13 }} onClick={onDelete}>Delete</button>
                <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ fontSize: 12.5, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>
              Delete contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditContactPanel({ contact: c, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: c.name || "",
    role: c.role || "",
    company: c.company || "",
    email: c.email || "",
    phone: c.phone || "",
    linkedin: c.social?.linkedin || "",
    twitter: c.social?.twitter || "",
    instagram: c.social?.instagram || "",
    birthday: c.birthday || "",
    location: c.location || "",
    relationship: c.relationship || [],
    cadenceOverride: c.cadence !== computeCadence(c.relationship || []) ? String(c.cadence || "") : "",
    tags: c.tags || [],
    notes: c.notes || "",
    bio: c.bio || "",
    important_dates: c.important_dates ? [...c.important_dates] : [],
  });
  const [tagInput, setTagInput] = useState("");
  const [newDateName, setNewDateName] = useState("");
  const [newDateVal, setNewDateVal] = useState("");

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
    setTagInput("");
  }

  function removeTag(t) { set("tags", form.tags.filter(x => x !== t)); }

  function handleTagKey(e) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
    if (e.key === "Backspace" && !tagInput && form.tags.length) removeTag(form.tags[form.tags.length - 1]);
  }

  function addImportantDate() {
    if (!newDateName.trim() || !newDateVal.trim()) return;
    set("important_dates", [...form.important_dates, { name: newDateName.trim(), date: newDateVal.trim() }]);
    setNewDateName("");
    setNewDateVal("");
  }

  function removeImportantDate(i) {
    set("important_dates", form.important_dates.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (form.birthday && !/^\d{2}-\d{2}$/.test(form.birthday)) return;
    const social = {};
    if (form.linkedin.trim()) social.linkedin = form.linkedin.trim();
    if (form.twitter.trim()) social.twitter = form.twitter.trim();
    if (form.instagram.trim()) social.instagram = form.instagram.trim();

    const cadenceOverrideNum = parseInt(form.cadenceOverride, 10);
    const computedCadence = computeCadence(form.relationship);
    const cadence = (!isNaN(cadenceOverrideNum) && cadenceOverrideNum > 0)
      ? cadenceOverrideNum
      : computedCadence;

    onSave({
      name: form.name.trim(),
      role: form.role.trim() || null,
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      birthday: form.birthday.trim() || null,
      location: form.location.trim() || null,
      relationship: form.relationship,
      cadence,
      tags: form.tags,
      notes: form.notes.trim() || null,
      bio: form.bio.trim() || null,
      social,
      important_dates: form.important_dates,
    });
  }

  return (
    <div className="detail-panel">
      <div className="dp-header" style={{ paddingBottom: 12 }}>
        <div className="dp-header-top">
          <button className="dp-back" onClick={onCancel}>← Cancel</button>
          <button className="btn-primary" style={{ fontSize: 13, padding: "6px 16px" }} onClick={handleSave} disabled={!form.name.trim()}>
            Save
          </button>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>
          Edit contact
        </div>
      </div>

      <div className="dp-body" style={{ paddingTop: 0 }}>
        {/* Basic info */}
        <div className="dp-section">
          <div className="dp-section-title">Basic info</div>
          <div className="form-row">
            <label className="form-label">Name *</label>
            <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} autoFocus />
          </div>
          <div className="form-row-2" style={{ marginTop: 10 }}>
            <div>
              <label className="form-label">Role</label>
              <input className="form-input" placeholder="Product Manager" value={form.role} onChange={e => set("role", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Company</label>
              <input className="form-input" placeholder="Acme Inc." value={form.company} onChange={e => set("company", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="dp-section">
          <div className="dp-section-title">Contact info</div>
          <div className="form-row">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="name@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" placeholder="+1 555 0100" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Location</label>
            <input className="form-input" placeholder="San Francisco, CA" value={form.location} onChange={e => set("location", e.target.value)} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Birthday (MM-DD)</label>
            <input
              className="form-input"
              placeholder="05-14"
              value={form.birthday}
              onChange={e => set("birthday", e.target.value)}
              style={form.birthday && !/^\d{2}-\d{2}$/.test(form.birthday) ? { borderColor: "var(--red)" } : {}}
            />
            {form.birthday && !/^\d{2}-\d{2}$/.test(form.birthday) && (
              <div style={{ fontSize: 11.5, color: "var(--red)", marginTop: 3 }}>格式需為 MM-DD，例如 05-14</div>
            )}
          </div>
        </div>

        {/* Social */}
        <div className="dp-section">
          <div className="dp-section-title">Social</div>
          <div className="form-row">
            <label className="form-label">LinkedIn</label>
            <div className="form-prefix-wrap">
              <span className="form-prefix">in/</span>
              <input className="form-input form-input-prefixed" placeholder="username" value={form.linkedin} onChange={e => set("linkedin", e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Twitter</label>
            <div className="form-prefix-wrap">
              <span className="form-prefix">@</span>
              <input className="form-input form-input-prefixed" placeholder="handle" value={form.twitter} onChange={e => set("twitter", e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Instagram</label>
            <div className="form-prefix-wrap">
              <span className="form-prefix">@</span>
              <input className="form-input form-input-prefixed" placeholder="handle" value={form.instagram} onChange={e => set("instagram", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Relationship & Cadence */}
        <div className="dp-section">
          <div className="dp-section-title">Relationship</div>
          <div className="rel-picker" style={{ marginBottom: 12 }}>
            {RELATIONSHIPS.map(r => (
              <button key={r} type="button"
                className={`rel-pick-btn${form.relationship.includes(r) ? " active" : ""}`}
                onClick={() => toggleRel(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="form-label">Cadence (days)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder={`Auto (${computeCadence(form.relationship)}d)`}
              value={form.cadenceOverride}
              onChange={e => set("cadenceOverride", e.target.value)}
              style={{ width: 120 }}
            />
            {form.cadenceOverride && (
              <button type="button" onClick={() => set("cadenceOverride", "")} style={{ fontSize: 12, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>
                Reset to auto
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="dp-section">
          <div className="dp-section-title">Tags</div>
          <div className="tag-input-wrap">
            {form.tags.map(t => (
              <span key={t} className="tag-chip">
                {t} <button type="button" className="tag-rm" onClick={() => removeTag(t)}>×</button>
              </span>
            ))}
            <input
              className="tag-input"
              placeholder="Add tag…"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={() => tagInput && addTag(tagInput)}
            />
          </div>
        </div>

        {/* Notes & Bio */}
        <div className="dp-section">
          <div className="dp-section-title">Notes</div>
          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} placeholder="Context about this person…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Bio</label>
            <textarea className="form-textarea" rows={3} placeholder="Background, interests, background…" value={form.bio} onChange={e => set("bio", e.target.value)} />
          </div>
        </div>

        {/* Important dates */}
        <div className="dp-section">
          <div className="dp-section-title">Important dates</div>
          {form.important_dates.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 13, color: "var(--ink)" }}>{d.name} — {d.date}</span>
              <button type="button" onClick={() => removeImportantDate(i)} style={{ fontSize: 13, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              className="form-input"
              placeholder="Label (e.g. Anniversary)"
              value={newDateName}
              onChange={e => setNewDateName(e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              className="form-input"
              placeholder="MM-DD"
              value={newDateVal}
              onChange={e => setNewDateVal(e.target.value)}
              style={{ flex: 1 }}
              onKeyDown={e => e.key === "Enter" && addImportantDate()}
            />
            <button type="button" className="btn-secondary" style={{ fontSize: 13, padding: "6px 10px", whiteSpace: "nowrap" }} onClick={addImportantDate}>
              + Add
            </button>
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
