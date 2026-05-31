import { useState, useRef, useEffect } from "react";
import { birthdayDaysUntil } from "../lib/utils.js";
import { AvatarSimple } from "./Avatar.jsx";

const NAV_ITEMS = [
  { id: "home",      icon: "🏠", label: "Home" },
  { id: "contacts",  icon: "👥", label: "Contacts" },
  { id: "activity",  icon: "🌊", label: "Activity" },
  { id: "reminders", icon: "⏰", label: "Follow-ups" },
  { id: "stats",     icon: "📊", label: "Stats" },
];

const ACCENT_OPTIONS = ["#D97757", "#3B6FD4", "#9B4F8E"];

export default function Sidebar({
  activeView, onNav, collapsed, onToggleCollapse,
  overdueCount, contacts,
  onOpenDetail, accentColor, onAccentChange,
  viewMode, onViewModeChange,
  onEnterSelectMode, onSignOut,
  onExportAll,
  gcalConnected, gcalLastSync, onGcalConnect, onGcalSync, onGcalDisconnect, onGcalSyncBirthdays,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!showSettings) return;
    function close(e) { if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showSettings]);

  // Today's overdue follow-ups for TodayWidget
  const today = new Date().toISOString().slice(0, 10);
  const overdueItems = contacts
    .filter(c => c.next_follow_up && c.next_follow_up < today)
    .sort((a, b) => a.next_follow_up.localeCompare(b.next_follow_up))
    .slice(0, 3);

  // Birthdays today / tomorrow
  const birthdayItems = contacts
    .filter(c => { const d = birthdayDaysUntil(c.birthday); return d !== null && d <= 1; })
    .sort((a, b) => birthdayDaysUntil(a.birthday) - birthdayDaysUntil(b.birthday))
    .slice(0, 2);

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-brand">
        {!collapsed && <span className="sidebar-brand-name">people<span>.</span>crm</span>}
        <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item${activeView === item.id ? " active" : ""}`}
            onClick={() => onNav(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {!collapsed && <span className="nav-item-label">{item.label}</span>}
            {!collapsed && item.id === "reminders" && overdueCount > 0 && (
              <span className="nav-item-badge">{overdueCount}</span>
            )}
          </button>
        ))}

        {!collapsed && (overdueItems.length > 0 || birthdayItems.length > 0) && (
          <>
            {overdueItems.length > 0 && (
              <div className="today-widget" style={{ marginTop: 12 }}>
                <div className="today-widget-title">Overdue</div>
                {overdueItems.map(c => (
                  <div key={c.id} className="today-widget-item" onClick={() => onOpenDetail(c.id)}>
                    <AvatarSimple contact={c} size={22} />
                    <span className="today-widget-name">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            {birthdayItems.length > 0 && (
              <div className="today-widget">
                <div className="today-widget-title" style={{ color: "#9B3F8A" }}>🎂 Birthdays</div>
                {birthdayItems.map(c => {
                  const d = birthdayDaysUntil(c.birthday);
                  return (
                    <div key={c.id} className="today-widget-item" onClick={() => onOpenDetail(c.id)}>
                      <AvatarSimple contact={c} size={22} />
                      <span className="today-widget-name">{c.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "#9B3F8A" }}>
                        {d === 0 ? "Today" : "Tomorrow"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </nav>

      {!collapsed && (
        <button className="sidebar-log-btn" onClick={() => onNav("activity")}>
          ✍️ <span>Log Activity</span>
        </button>
      )}

      <div className="sidebar-footer" ref={settingsRef}>
        {!collapsed && showSettings && (
          <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 8 }}>Accent</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {ACCENT_OPTIONS.map(c => (
                <div
                  key={c}
                  onClick={() => onAccentChange(c)}
                  style={{
                    width: 22, height: 22, borderRadius: "50%", background: c,
                    cursor: "pointer",
                    outline: accentColor === c ? `2.5px solid var(--ink)` : "2.5px solid transparent",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 6 }}>View</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {["grid","list"].map(m => (
                <button
                  key={m}
                  onClick={() => onViewModeChange(m)}
                  style={{
                    flex: 1, padding: "4px 0",
                    borderRadius: 6, border: "1px solid var(--border)",
                    background: viewMode === m ? "var(--card)" : "none",
                    color: viewMode === m ? "var(--ink)" : "var(--ink-mid)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {m === "grid" ? "⊞ Grid" : "☰ List"}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 6 }}>Export all</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {["JSON","CSV","vCard"].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => onExportAll(fmt)}
                  style={{
                    flex: 1, padding: "4px 0",
                    borderRadius: 6, border: "1px solid var(--border)",
                    background: "none", color: "var(--ink-mid)",
                    fontSize: 11, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 6 }}>Google Calendar</div>
            {gcalConnected ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: "var(--ink-mid)" }}>Connected</span>
                </div>
                {gcalLastSync && (
                  <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginBottom: 6 }}>
                    Last sync: {new Date(gcalLastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                  <button
                    onClick={onGcalSync}
                    style={{
                      flex: 2, padding: "4px 0", borderRadius: 6,
                      border: "1px solid var(--acc)", background: "var(--acc-pale)",
                      color: "var(--acc)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Sync meetings
                  </button>
                  <button
                    onClick={onGcalDisconnect}
                    style={{
                      flex: 1, padding: "4px 0", borderRadius: 6,
                      border: "1px solid var(--border)", background: "none",
                      color: "var(--ink-faint)", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                </div>
                <button
                  onClick={onGcalSyncBirthdays}
                  style={{
                    width: "100%", padding: "4px 0", borderRadius: 6,
                    border: "1px solid var(--border)", background: "none",
                    color: "var(--ink-mid)", fontSize: 11, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  🎂 Sync all birthdays
                </button>
              </div>
            ) : (
              <button
                onClick={onGcalConnect}
                style={{
                  width: "100%", padding: "5px 0", borderRadius: 6,
                  border: "1px solid var(--border)", background: "none",
                  color: "var(--ink-mid)", fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <span>📅</span> Connect Google Calendar
              </button>
            )}
          </div>
        )}

        {!collapsed && (
          <button className="sidebar-footer-btn" onClick={() => setShowSettings(v => !v)}>
            <span style={{ fontSize: 13 }}>⚙️</span>
            <span>Settings</span>
          </button>
        )}
        {!collapsed && (
          <button className="sidebar-footer-btn" onClick={onEnterSelectMode}>
            <span style={{ fontSize: 13 }}>☑️</span>
            <span>Select contacts</span>
          </button>
        )}
        <button
          className="sidebar-footer-btn danger"
          onClick={onSignOut}
          title={collapsed ? "Sign out" : undefined}
        >
          <span style={{ fontSize: 13 }}>↩️</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
