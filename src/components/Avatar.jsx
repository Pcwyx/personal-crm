import { avatarInitials, avatarColor, strengthColor, computeStrength } from "../lib/utils.js";

export default function Avatar({ contact, size = 40, showRing = true }) {
  const initials = avatarInitials(contact.name || "?");
  const color = avatarColor(contact.name || "");
  const strength = contact.strength ?? computeStrength(contact);
  const ringColor = strengthColor(strength);

  const ringSize = size + 6;
  const r = ringSize / 2 - 2;
  const circ = 2 * Math.PI * r;
  const dash = strength * circ;

  const fontSize = size <= 32 ? size * 0.38 : size * 0.36;

  return (
    <div className="avatar-wrap" style={{ width: ringSize, height: ringSize }}>
      {showRing && (
        <svg
          className="avatar-ring"
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={r}
            fill="none" stroke="var(--card)" strokeWidth="2.5"
          />
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="2.5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
      )}
      <div
        className="avatar-circle"
        style={{
          width: size, height: size,
          background: color,
          color: "#fff",
          fontSize,
          position: "absolute",
          top: 3, left: 3,
        }}
      >
        {contact.photo
          ? <img src={contact.photo} alt={contact.name} className="avatar-img" />
          : initials
        }
      </div>
    </div>
  );
}

// Smaller variant without strength ring (e.g. activity list)
export function AvatarSimple({ contact, size = 32 }) {
  const initials = avatarInitials(contact.name || "?");
  const color = avatarColor(contact.name || "");
  const fontSize = size * 0.38;
  return (
    <div
      className="avatar-circle"
      style={{ width: size, height: size, background: color, color: "#fff", fontSize, flexShrink: 0 }}
    >
      {contact.photo
        ? <img src={contact.photo} alt={contact.name} className="avatar-img" />
        : initials
      }
    </div>
  );
}
