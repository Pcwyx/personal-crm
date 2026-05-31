const NAV_ITEMS = [
  { id: "home",      icon: "🏠", label: "Home" },
  { id: "contacts",  icon: "👥", label: "Contacts" },
  { id: "reminders", icon: "⏰", label: "Follow-ups" },
  { id: "activity",  icon: "🌊", label: "Activity" },
];

export default function BottomNav({ activeView, onNav, overdueCount }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bottom-nav-item${activeView === item.id ? " active" : ""}`}
          onClick={() => onNav(item.id)}
        >
          {item.id === "reminders" && overdueCount > 0 && (
            <span className="bottom-nav-badge">{overdueCount}</span>
          )}
          <span className="bottom-nav-item-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
