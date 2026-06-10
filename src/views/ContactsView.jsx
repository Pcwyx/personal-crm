import { RELATIONSHIPS, TIER_COLORS, birthdayDaysUntil, formatRelative } from "../lib/utils.js";
import Avatar from "../components/Avatar.jsx";
import RelChip from "../components/RelChip.jsx";
import DueBadge from "../components/DueBadge.jsx";

export default function ContactsView({
  contacts, onOpenDetail, today,
  search, onSearchChange,
  filterRels, onFilterRelsChange,
  filterTier, onFilterTierChange,
  viewMode,
  selectMode, selectedIds, onToggleSelect, onSelectAll,
}) {
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q)) ||
      c.notes?.toLowerCase().includes(q) ||
      c.bio?.toLowerCase().includes(q) ||
      c.interactions?.some(i => i.note?.toLowerCase().includes(q));
    const matchRel = !filterRels.length || filterRels.every(r => (c.relationship || []).includes(r));
    const matchTier = filterTier === null || c.tier === filterTier;
    return matchSearch && matchRel && matchTier;
  });

  function toggleFilter(rel) {
    onFilterRelsChange(prev =>
      prev.includes(rel) ? prev.filter(r => r !== rel) : [...prev, rel]
    );
  }

  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const someSelected = filtered.some(c => selectedIds.has(c.id));

  function handleSelectAll() {
    if (allSelected) onSelectAll([]);
    else onSelectAll(filtered.map(c => c.id));
  }

  function handleCardClick(c) {
    if (selectMode) { onToggleSelect(c.id); return; }
    onOpenDetail(c.id);
  }

  return (
    <div style={{ padding: "24px 24px 80px" }}>
      {/* Toolbar */}
      <div style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search contacts…"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          {selectMode && (
            <div
              className={`select-all-box${allSelected ? " checked" : someSelected ? " indeterminate" : ""}`}
              onClick={handleSelectAll}
            >
              {allSelected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
              {!allSelected && someSelected && <span style={{ color: "var(--acc)", fontSize: 14, fontWeight: 700 }}>–</span>}
            </div>
          )}
        </div>

        {/* Relationship filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {RELATIONSHIPS.map(rel => (
            <button
              key={rel}
              className={`filter-pill${filterRels.includes(rel) ? " active" : ""}`}
              onClick={() => toggleFilter(rel)}
            >
              {rel}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>Tier</span>
          {[1, 2, 3, 4].map(t => {
            const col = TIER_COLORS[t];
            const active = filterTier === t;
            return (
              <button
                key={t}
                onClick={() => onFilterTierChange(active ? null : t)}
                style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${active ? col.border : "var(--border)"}`,
                  background: active ? col.bg : "none",
                  color: active ? col.text : "var(--ink-mid)",
                  cursor: "pointer",
                }}
              >
                T{t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14 }}>
        {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
        {(search || filterRels.length > 0 || filterTier !== null) ? " matched" : ""}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No contacts found</div>
          <div className="empty-state-sub">Try adjusting your search or filters.</div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="contacts-grid">
          {filtered.map(c => <ContactCard key={c.id} contact={c} today={today} selectMode={selectMode} isSelected={selectedIds.has(c.id)} onClick={() => handleCardClick(c)} />)}
        </div>
      ) : (
        <div className="contacts-list">
          {filtered.map(c => <ContactRow key={c.id} contact={c} today={today} selectMode={selectMode} isSelected={selectedIds.has(c.id)} onClick={() => handleCardClick(c)} />)}
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier }) {
  if (!tier) return null;
  const col = TIER_COLORS[tier];
  return (
    <span style={{
      position: "absolute", top: 8, right: 8,
      fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
      padding: "2px 6px", borderRadius: 4,
      background: col.bg, color: col.text,
    }}>
      T{tier}
    </span>
  );
}

function ContactCard({ contact: c, today, selectMode, isSelected, onClick }) {
  const bdDays = birthdayDaysUntil(c.birthday);
  const showBdBadge = bdDays !== null && bdDays <= 14;

  return (
    <div
      className={`contact-card${isSelected ? " selected" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      {selectMode && (
        <div className={`card-checkbox${isSelected ? " checked" : ""}`}>
          {isSelected && "✓"}
        </div>
      )}
      {!selectMode && <TierBadge tier={c.tier} />}
      <div className="contact-card-avatar" style={selectMode ? { paddingLeft: 22 } : {}}>
        <Avatar contact={c} size={44} />
      </div>
      <div className="contact-card-name">{c.name}</div>
      {(c.role || c.company) && (
        <div className="contact-card-role">{[c.role, c.company].filter(Boolean).join(" · ")}</div>
      )}
      <div className="contact-card-meta">
        {(c.relationship || []).slice(0, 1).map(r => <RelChip key={r} rel={r} />)}
        {(c.tags || []).slice(0, 2).map(t => (
          <span key={t} className="tag-chip">{t.includes(":") ? t.split(":")[1] : t}</span>
        ))}
        {showBdBadge && (
          <span className="bday-badge">{bdDays === 0 ? "🎂 Today" : `🎂 ${bdDays}d`}</span>
        )}
      </div>
      <div className="contact-card-footer">
        <span className="contact-card-last">
          {c.last_contact ? `Last: ${formatRelativeShort(c.last_contact)}` : "No contact yet"}
        </span>
        <DueBadge date={c.next_follow_up} threshold={3} />
      </div>
    </div>
  );
}

function ContactRow({ contact: c, today, selectMode, isSelected, onClick }) {
  return (
    <div
      className={`contact-row${isSelected ? " selected" : ""}`}
      onClick={onClick}
    >
      {selectMode && (
        <div className={`card-checkbox${isSelected ? " checked" : ""}`} style={{ position: "static" }}>
          {isSelected && "✓"}
        </div>
      )}
      <Avatar contact={c} size={38} />
      <div className="contact-row-info">
        <div className="contact-row-name">
          {c.name}
          {c.tier && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700,
              padding: "1px 5px", borderRadius: 3,
              background: TIER_COLORS[c.tier].bg,
              color: TIER_COLORS[c.tier].text,
            }}>T{c.tier}</span>
          )}
        </div>
        <div className="contact-row-role">{[c.role, c.company].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {(c.relationship || []).slice(0, 1).map(r => <RelChip key={r} rel={r} />)}
        <DueBadge date={c.next_follow_up} threshold={3} />
        <span className="contact-row-date">
          {c.last_contact ? formatRelativeShort(c.last_contact) : "—"}
        </span>
      </div>
    </div>
  );
}

function formatRelativeShort(dateStr) {
  if (!dateStr) return "";
  const ds = Math.floor((Date.now() - new Date(dateStr + "T00:00:00")) / 86400000);
  if (ds === 0) return "Today";
  if (ds === 1) return "Yesterday";
  if (ds < 7) return `${ds}d ago`;
  if (ds < 30) return `${Math.round(ds / 7)}w ago`;
  if (ds < 365) return `${Math.round(ds / 30)}mo ago`;
  return `${Math.round(ds / 365)}y ago`;
}
