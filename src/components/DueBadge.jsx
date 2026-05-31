import { daysUntilDate } from "../lib/utils.js";

export default function DueBadge({ date, threshold = 3 }) {
  if (!date) return null;
  const days = daysUntilDate(date);
  if (days > threshold) return null;

  if (days < 0) return <span className="due-badge overdue">⚡ {Math.abs(days)}d overdue</span>;
  if (days === 0) return <span className="due-badge today">⏰ Due today</span>;
  return <span className="due-badge soon">🔔 {days}d</span>;
}
