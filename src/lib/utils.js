export const RELATIONSHIP_CADENCE = {
  Family: 30, Friend: 60, School: 90, Colleague: 75, Network: 90, Mentor: 45, Collaborator: 60,
};

export const RELATIONSHIPS = ["Friend", "Family", "School", "Colleague", "Network", "Mentor", "Collaborator"];

export const TIER_CADENCE = { 1: 30, 2: 60, 3: 90, 4: 180 };

export const TIER_COLORS = {
  1: { bg: "#FEF3CD", text: "#B07700", border: "#B07700" },
  2: { bg: "#EFF4FD", text: "#3B6FD4", border: "#3B6FD4" },
  3: { bg: "#EAF3EC", text: "#2A8C5E", border: "#2A8C5E" },
  4: { bg: "#F3F3F3", text: "#888888", border: "#AAAAAA" },
};

export const TAG_NAMESPACES = ["industry", "context", "project", "location"];

export function parseTag(tag) {
  const idx = tag.indexOf(":");
  if (idx === -1) return { namespace: null, value: tag };
  return { namespace: tag.slice(0, idx), value: tag.slice(idx + 1) };
}

export function groupTags(tags) {
  const general = [];
  const structured = {};
  for (const tag of (tags || [])) {
    const { namespace, value } = parseTag(tag);
    if (!namespace) { general.push(tag); }
    else { (structured[namespace] = structured[namespace] || []).push({ tag, value }); }
  }
  return { general, structured };
}

export const INTERACTION_TYPES = [
  { value: "coffee",  label: "Coffee",  emoji: "☕" },
  { value: "call",    label: "Call",    emoji: "📞" },
  { value: "video",   label: "Video",   emoji: "🎥" },
  { value: "email",   label: "Email",   emoji: "✉️" },
  { value: "meeting", label: "Meeting", emoji: "🤝" },
  { value: "event",   label: "Event",   emoji: "🎉" },
  { value: "message", label: "Message", emoji: "💬" },
  { value: "note",    label: "Note",    emoji: "📝" },
];

export function interactionEmoji(type) {
  return INTERACTION_TYPES.find(t => t.value === type)?.emoji || "📝";
}

export function computeCadence(relationships) {
  if (!relationships?.length) return 90;
  return Math.min(...relationships.map(r => RELATIONSHIP_CADENCE[r] ?? 90));
}

export function computeStrength(contact) {
  if (!contact.last_contact) return 0.5;
  const cadence = TIER_CADENCE[contact.tier] || 90;
  const ds = daysSince(contact.last_contact);
  return Math.max(0, Math.min(1, 1 - ds / cadence));
}

export function strengthColor(s) {
  if (s >= 0.8) return "#5A8A6A";
  if (s >= 0.5) return "#C49B3A";
  if (s >= 0.25) return "#D97757";
  return "#C44F3A";
}

export function strengthLabel(s) {
  if (s >= 0.8) return "Thriving";
  if (s >= 0.5) return "Active";
  if (s >= 0.25) return "Fading";
  return "Dormant";
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr + "T00:00:00")) / 86400000);
}

export function daysUntilDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr + "T00:00:00") - today) / 86400000);
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// birthday: "MM-DD"
export function birthdayDaysUntil(birthday) {
  if (!birthday) return null;
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return null;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // Feb 29 birthdays fall on Feb 28 in non-leap years
  const occurrence = (y) => new Date(y, mm - 1, mm === 2 && dd === 29 && !isLeapYear(y) ? 28 : dd);
  let next = occurrence(todayMidnight.getFullYear());
  if (next < todayMidnight) next = occurrence(todayMidnight.getFullYear() + 1);
  return Math.round((next - todayMidnight) / 86400000);
}

export function formatBirthday(birthday) {
  if (!birthday) return "";
  const [mm, dd] = birthday.split("-").map(Number);
  if (!mm || !dd) return birthday;
  return new Date(2000, mm - 1, dd).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRelative(dateStr) {
  if (!dateStr) return "";
  const ds = daysSince(dateStr);
  if (ds === null) return "";
  if (ds === 0) return "Today";
  if (ds === 1) return "Yesterday";
  if (ds < 7) return `${ds} days ago`;
  if (ds < 30) return `${Math.round(ds / 7)}w ago`;
  if (ds < 365) return `${Math.round(ds / 30)}mo ago`;
  return `${Math.round(ds / 365)}y ago`;
}

export function avatarInitials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

const AVI_COLORS = ["#C87553","#5A8A6A","#8B6BB5","#3B6FD4","#C49B3A","#E07A5F","#6B9E9E","#D97757"];
export function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVI_COLORS[h % AVI_COLORS.length];
}

export const REL_CHIP_COLORS = {
  Friend:       { bg: "#FEF2EE", text: "#C87553" },
  Family:       { bg: "#EAF3EC", text: "#2A8C5E" },
  School:       { bg: "#FDF6E3", text: "#B08A20" },
  Colleague:    { bg: "#EFF4FD", text: "#3B6FD4" },
  Network:      { bg: "#F2EDFD", text: "#7C5AC2" },
  Mentor:       { bg: "#FDF0FB", text: "#9B3F8A" },
  Collaborator: { bg: "#EDE8DF", text: "#6B5040" },
};

export function followUpDaysPreset(preset) {
  const map = { "3d": 3, "1w": 7, "2w": 14, "1m": 30, "3m": 90 };
  const days = map[preset];
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function scoreNameMatch(query, name) {
  const a = (query || "").toLowerCase().replace(/\s+/g, "");
  const b = (name || "").toLowerCase().replace(/\s+/g, "");
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.85;
  let m = 0;
  for (const ch of a) if (b.includes(ch)) m++;
  return m / Math.max(a.length, b.length);
}

export function findContactMatches(query, contacts) {
  return (contacts || [])
    .map(c => ({ contact: c, score: scoreNameMatch(query, c.name) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
