import { AvatarSimple } from "../components/Avatar.jsx";
import { INTERACTION_TYPES, avatarColor } from "../lib/utils.js";

function getMonthlyData(interactions) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleDateString("en-US", { month: "short" }), value: 0 });
  }
  interactions.forEach(i => {
    const m = months.find(m => m.key === i.date?.slice(0, 7));
    if (m) m.value++;
  });
  return months;
}

function getTopContacts(contacts, interactions) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const counts = {};
  interactions.filter(i => i.date >= cutoffStr).forEach(i => {
    counts[i.contact_id] = (counts[i.contact_id] || 0) + 1;
  });
  return contacts
    .map(c => ({ contact: c, count: counts[c.id] || 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getTypeDistrib(interactions) {
  const counts = {};
  interactions.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 120;
  const barW = 70;
  const gap = 20;
  const totalW = data.length * (barW + gap) - gap;
  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${H + 24}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible", display: "block" }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * H, d.value > 0 ? 5 : 2);
        const x = i * (barW + gap);
        const y = H - h;
        const isCurrent = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={5}
              fill="var(--acc)"
              opacity={isCurrent ? 1 : d.value > 0 ? 0.55 : 0.12}
            />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" style={{ fontFamily: "var(--font-body)" }}>{d.label}</text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="var(--ink-mid)" style={{ fontFamily: "var(--font-display)" }}>{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsView({ contacts }) {
  const allInteractions = contacts.flatMap(c =>
    (c.interactions || []).map(i => ({ ...i, contact_id: c.id }))
  );

  const monthly = getMonthlyData(allInteractions);
  const topContacts = getTopContacts(contacts, allInteractions);
  const typeDistrib = getTypeDistrib(allInteractions);
  const maxTop = topContacts[0]?.count || 1;
  const maxType = typeDistrib[0]?.[1] || 1;

  const totalThisMonth = monthly[monthly.length - 1]?.value ?? 0;
  const totalLastMonth = monthly[monthly.length - 2]?.value ?? 0;
  const totalYear = monthly.reduce((s, m) => s + m.value, 0);
  const avgPerMonth = monthly.filter(m => m.value > 0).length
    ? Math.round(totalYear / monthly.filter(m => m.value > 0).length)
    : 0;

  return (
    <div style={{ padding: "28px 24px 80px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Stats</h2>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mid)", marginBottom: 24 }}>
        How you've been showing up
      </p>

      {/* Summary strip */}
      <div className="stats-strip">
        <div className="stat-card">
          <div className="stat-number">{totalThisMonth}</div>
          <div className="stat-label">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalLastMonth}</div>
          <div className="stat-label">Last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalYear}</div>
          <div className="stat-label">Past 12mo</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{avgPerMonth}</div>
          <div className="stat-label">Avg / active mo</div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="stats-card" style={{ marginBottom: 20 }}>
        <div className="stats-card-title">Monthly interactions</div>
        <div style={{ padding: "8px 0 4px" }}>
          <BarChart data={monthly} />
        </div>
      </div>

      {/* Top contacts + Type distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Top contacts */}
        <div className="stats-card">
          <div className="stats-card-title">Most active (90d)</div>
          {topContacts.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic", padding: "8px 0" }}>No interactions yet</div>
          ) : (
            topContacts.map(({ contact: c, count }) => (
              <div key={c.id} className="stats-bar-row">
                <AvatarSimple contact={c} size={22} />
                <div className="stats-bar-name">{c.name}</div>
                <div className="stats-bar-track">
                  <div className="stats-bar-fill" style={{ width: `${(count / maxTop) * 100}%`, background: avatarColor(c.name) }} />
                </div>
                <span className="stats-bar-count">{count}</span>
              </div>
            ))
          )}
        </div>

        {/* Type distribution */}
        <div className="stats-card">
          <div className="stats-card-title">By type</div>
          {typeDistrib.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic", padding: "8px 0" }}>No interactions yet</div>
          ) : (
            typeDistrib.map(([type, count]) => {
              const t = INTERACTION_TYPES.find(x => x.value === type);
              return (
                <div key={type} className="stats-bar-row">
                  <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{t?.emoji || "📝"}</span>
                  <div className="stats-bar-name">{t?.label || type}</div>
                  <div className="stats-bar-track">
                    <div className="stats-bar-fill" style={{ width: `${(count / maxType) * 100}%`, background: "var(--acc)" }} />
                  </div>
                  <span className="stats-bar-count">{count}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
