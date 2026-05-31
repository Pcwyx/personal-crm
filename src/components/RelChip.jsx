import { REL_CHIP_COLORS } from "../lib/utils.js";

export default function RelChip({ rel }) {
  const colors = REL_CHIP_COLORS[rel] || { bg: "var(--card)", text: "var(--ink-mid)" };
  return (
    <span className="rel-chip" style={{ background: colors.bg, color: colors.text }}>
      {rel}
    </span>
  );
}
