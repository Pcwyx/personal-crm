import { useState } from "react";
import { birthdayDaysUntil, formatBirthday, TIER_CADENCE, daysSince } from "../lib/utils.js";
import Avatar, { AvatarSimple } from "../components/Avatar.jsx";
import DueBadge from "../components/DueBadge.jsx";

const PAGE = 5;

function CollapsibleSection({ label, items, renderRow }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, PAGE);
  const overflow = items.length > PAGE;
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>{label}</div>
        {overflow && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ fontSize: 12, color: "var(--acc)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            {expanded ? "Show less" : `See all (${items.length})`}
          </button>
        )}
      </div>
      <div className="section-card">
        {visible.map(renderRow)}
      </div>
    </section>
  );
}

export default function HomeView({ contacts, onOpenDetail, today, needsAttentionCount }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning ☀️" : hour < 17 ? "Good afternoon 🌤" : "Good evening 🌙";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const birthdays = contacts
    .filter(c => { const d = birthdayDaysUntil(c.birthday); return d !== null && d <= 7; })
    .sort((a, b) => birthdayDaysUntil(a.birthday) - birthdayDaysUntil(b.birthday));

  const followUps = contacts
    .filter(c => c.next_follow_up && c.next_follow_up <= today)
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up));

  const overdueFollowUpIds = new Set(followUps.map(c => c.id));
  const goingCold = contacts
    .filter(c => {
      if (overdueFollowUpIds.has(c.id)) return false;
      const threshold = TIER_CADENCE[c.tier] || 90;
      const ds = daysSince(c.last_contact);
      return ds !== null && ds > threshold;
    })
    .sort((a, b) => (daysSince(b.last_contact) ?? 9999) - (daysSince(a.last_contact) ?? 9999));

  const allEmpty = !birthdays.length && !followUps.length && !goingCold.length;

  return (
    <div style={{ padding: "28px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 8 }}>
          {dateStr.toUpperCase()}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.3px", marginBottom: 4, lineHeight: 1.2 }}>
          {greeting}
        </h1>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15, color: "var(--ink-mid)" }}>
          Here's your week
        </p>
      </div>

      <div className="stats-strip" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-number">{contacts.length}</div>
          <div className="stat-label">Total contacts</div>
        </div>
        <div className="stat-card" style={{ borderColor: needsAttentionCount > 0 ? "var(--acc-light)" : undefined }}>
          <div className="stat-number" style={{ color: needsAttentionCount > 0 ? "var(--red)" : "var(--green)" }}>{needsAttentionCount}</div>
          <div className="stat-label">Needs attention</div>
        </div>
      </div>

      {allEmpty ? (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-state-icon">🌸</div>
          <div className="empty-state-title">All caught up</div>
          <div className="empty-state-sub">No follow-ups due, no drifting relationships.</div>
        </div>
      ) : (
        <>
          {birthdays.length > 0 && (
            <CollapsibleSection
              label="🎂 Birthdays"
              items={birthdays}
              renderRow={c => {
                const days = birthdayDaysUntil(c.birthday);
                return (
                  <div key={c.id} className="section-card-row" onClick={() => onOpenDetail(c.id)}>
                    <AvatarSimple contact={c} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-light)" }}>{formatBirthday(c.birthday)}</div>
                    </div>
                    <span className="bday-badge">
                      {days === 0 ? "Today! 🎂" : days === 1 ? "Tomorrow" : `in ${days}d`}
                    </span>
                  </div>
                );
              }}
            />
          )}

          {followUps.length > 0 && (
            <CollapsibleSection
              label="⏰ Follow-ups due"
              items={followUps}
              renderRow={c => (
                <div key={c.id} className="section-card-row" onClick={() => onOpenDetail(c.id)}>
                  <AvatarSimple contact={c} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-light)" }}>
                      {c.role}{c.company ? ` · ${c.company}` : ""}
                    </div>
                    {c.follow_up_note && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-light)", marginTop: 1 }}>{c.follow_up_note}</div>
                    )}
                  </div>
                  <DueBadge date={c.next_follow_up} threshold={365} />
                </div>
              )}
            />
          )}

          {goingCold.length > 0 && (
            <CollapsibleSection
              label="🌵 Going cold"
              items={goingCold}
              renderRow={c => {
                const ds = daysSince(c.last_contact);
                return (
                  <div key={c.id} className="section-card-row" onClick={() => onOpenDetail(c.id)}>
                    <Avatar contact={c} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-light)" }}>
                        {c.role}{c.company ? ` · ${c.company}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink-faint)", flexShrink: 0 }}>
                      {ds !== null ? `${ds}d ago` : "No contact"}
                    </span>
                  </div>
                );
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
