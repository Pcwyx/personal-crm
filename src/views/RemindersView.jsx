import { daysUntilDate } from "../lib/utils.js";
import Avatar, { AvatarSimple } from "../components/Avatar.jsx";
import DueBadge from "../components/DueBadge.jsx";

export default function RemindersView({ contacts, onOpenDetail, today, onMarkDone }) {
  const overdue = contacts
    .filter(c => c.next_follow_up && c.next_follow_up < today)
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up));

  const upcoming = contacts
    .filter(c => c.next_follow_up && c.next_follow_up >= today)
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up))
    .slice(0, 20);

  const empty = !overdue.length && !upcoming.length;

  return (
    <div style={{ padding: "28px 24px 80px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Follow-ups</h2>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mid)", marginBottom: 24 }}>
        Stay in touch, intentionally
      </p>

      {empty ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">All clear</div>
          <div className="empty-state-sub">No follow-ups scheduled. Add one from a contact's profile.</div>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div className="section-label" style={{ marginBottom: 0 }}>Overdue</div>
                <span style={{ background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10 }}>
                  {overdue.length}
                </span>
              </div>
              <div className="section-card">
                {overdue.map(c => <ReminderRow key={c.id} contact={c} onOpenDetail={onOpenDetail} onDone={() => onMarkDone(c.id)} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <div className="section-label">Upcoming</div>
              <div className="section-card">
                {upcoming.map(c => <ReminderRow key={c.id} contact={c} onOpenDetail={onOpenDetail} onDone={() => onMarkDone(c.id)} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ReminderRow({ contact: c, onOpenDetail, onDone }) {
  return (
    <div className="section-card-row" style={{ gap: 12 }}>
      <div onClick={() => onOpenDetail(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}>
        <AvatarSimple contact={c} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-light)" }}>
            {[c.role, c.company].filter(Boolean).join(" · ")}
          </div>
          {c.follow_up_note && (
            <div style={{ fontSize: 11.5, color: "var(--ink-light)", marginTop: 2 }}>{c.follow_up_note}</div>
          )}
        </div>
        <DueBadge date={c.next_follow_up} threshold={365} />
      </div>
      <button className="done-btn" onClick={e => { e.stopPropagation(); onDone(); }}>
        ✓ Done
      </button>
    </div>
  );
}
