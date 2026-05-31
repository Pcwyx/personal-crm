import { interactionEmoji, formatRelative } from "../lib/utils.js";
import { AvatarSimple } from "../components/Avatar.jsx";

export default function ActivityView({ contacts, onOpenDetail }) {
  // Flatten all interactions with contact info, sort newest first
  const allItems = contacts
    .flatMap(c =>
      (c.interactions || []).map(i => ({ ...i, contact: c }))
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at || "") || 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "28px 24px 16px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>Activity</h2>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mid)", marginTop: 3 }}>
          All interactions, newest first
        </p>
      </div>

      {allItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🌊</div>
          <div className="empty-state-title">No activity yet</div>
          <div className="empty-state-sub">Log your first interaction to get started.</div>
        </div>
      ) : (
        <div className="activity-list">
          {allItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="activity-item"
              onClick={() => onOpenDetail(item.contact.id)}
            >
              <div className="activity-dot">{interactionEmoji(item.type)}</div>
              <div className="activity-body">
                <div className="activity-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AvatarSimple contact={item.contact} size={22} />
                    <span className="activity-name">{item.contact.name}</span>
                  </div>
                  <span className="activity-time">{formatRelative(item.date)}</span>
                </div>
                {item.note && <div className="activity-note">{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
