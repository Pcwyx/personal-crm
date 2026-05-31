import { RELATIONSHIPS, birthdayDaysUntil, formatRelative } from "../lib/utils.js";
import Avatar from "../components/Avatar.jsx";
import RelChip from "../components/RelChip.jsx";
import DueBadge from "../components/DueBadge.jsx";

export default function ContactsView({
  contacts, onOpenDetail, today,
  search, onSearchChange,
  filterRels, onFilterRelsChange,
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
    return matchSearch && matchRel;
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14 }}>
        {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
        {(search || filterRels.length > 0) ? " matched" : ""}
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

function ContactCard({ contact: c, today, selectMode, isSelected, onClick }) {
  const bdDays = birthdayDaysUntil(c.birthday);
  const showBdBadge = bdDays !== null && bdDays <= 14;

  return (
    <div
      className={`contact-card${isSelected ? " selected" : ""}`}
      onClick={onClick}
    >
      {selectMode && (
        <div className={`card-checkbox${isSelected ? " checked" : ""}`}>
          {isSelected && "✓"}
        </div>
      )}
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
          <span key={t} className="tag-chip">{t}</span>
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
        <div className="contact-row-name">{c.name}</div>
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
