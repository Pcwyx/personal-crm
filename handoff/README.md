# Handoff: Personal CRM Pro — Full Revamp

> **For Claude Code / developers picking this up:**
> The HTML prototype in this folder (`Personal CRM Pro.html`) is a **high-fidelity design reference** built in React + Babel. It is NOT production code to copy verbatim — it's a working, interactive mock showing exact intended look, behaviour, and interactions. Your task is to **recreate these designs in your existing codebase** using your established framework, component library, and patterns.

---

## 1. Project Overview

A **Personal CRM** — a tool for managing relationships with people who matter. The core user jobs are:

1. Never forget to follow up with someone
2. Log every interaction quickly and naturally
3. Get reminded about birthdays and important dates
4. Understand which relationships are healthy vs. fading

The design language is **"Warm Editorial"** — linen-toned backgrounds, serif headings (Lora), clean sans-serif body (DM Sans), terracotta accent. Think a well-worn Moleskine, not a SaaS dashboard.

---

## 2. Fidelity

**High-fidelity.** All colours, font sizes, spacing, border radii, shadows, hover states, and interactions in the prototype are intentional and should be reproduced as closely as possible. See `design-tokens.css` for the full token set.

---

## 3. Architecture Overview (from the prototype)

The prototype is a single-page React app with the following component tree:

```
App
├── SpeedDial (FAB — global Add Contact / Log Activity)
├── Sidebar (desktop only)
│   ├── Nav items (Home, Contacts, Activity River, Follow-ups)
│   ├── "✍️ Log Activity" quick button
│   └── TodayWidget (overdue follow-ups)
├── Main content area (switches by nav)
│   ├── HomeView          — Weekly digest / dashboard
│   ├── ContactsView      — Grid or list of all contacts
│   ├── RiverView         — Chronological activity timeline
│   └── RemindersView     — Follow-ups, overdue first
├── Detail panel (desktop: side panel; mobile: full-screen overlay)
│   ├── Contact header (avatar ring, name, role, company, RelChip)
│   ├── Relationship health bar + cadence progress
│   ├── Contact info (email, phone, social)
│   ├── Tags, Notes, Birthday/Location
│   ├── AISuggestion (Claude-powered follow-up draft)
│   └── Interaction timeline (TLItem list)
├── AddContactModal       — Full form: name/role/company/email/phone/social/tags/birthday/location/relationship/notes/follow-up
├── AddActivityModal      — Global log: contact search (typeahead) + date + type + note
├── QuickLog              — Lightweight log from inside Detail panel
└── BottomNav             — Mobile only (Home / Contacts / Follow-ups / Activity)
```

---

## 4. Data Model

### Contact object
```typescript
interface Contact {
  id: string | number;
  name: string;
  role: string;
  company: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  lastContact: string;       // ISO date "YYYY-MM-DD"
  nextFollowUp: string | null; // ISO date
  strength: number;          // 0.0 – 1.0 (relationship health)
  notes: string;
  birthday: string | null;   // "MM-DD" format e.g. "05-14"
  location: string | null;
  relationship: string | null; // "Friend" | "Colleague" | "Mentor" | "Investor" | "Partner" | "Collaborator"
  cadence: number | null;    // days between ideal touchpoints
  social: {
    linkedin: string | null; // username only, not full URL
    twitter: string | null;
  };
  interactions: Interaction[];
}

interface Interaction {
  date: string;   // ISO date "YYYY-MM-DD"
  type: InteractionType;
  note: string;
}

type InteractionType = 'coffee' | 'call' | 'video' | 'email' | 'meeting' | 'event' | 'message' | 'note';
```

---

## 5. Supabase Schema

See `schema.sql` for the full setup SQL. Summary:

- **`contacts`** table — all contact fields above
- **`interactions`** table — linked to contacts via `contact_id` (UUID FK)
- RLS enabled with open anon policies for prototyping (tighten for production)
- Birthday stored as `TEXT` in `MM-DD` format
- Interactions fetched as a joined array: `.select('*, interactions(*)')`

**After running schema.sql, also run the ALTER TABLE** to add fields added mid-session:
```sql
alter table contacts 
  add column if not exists birthday text,
  add column if not exists location text,
  add column if not exists relationship text,
  add column if not exists cadence int;
```

### Supabase project
- **URL**: `https://mslsbkrgmkcpmizjcjcj.supabase.co`
- **Anon key**: `sb_publishable_RtJBt3zHoNnIzKtkdQK_Zw_2A4giSCW`

---

## 6. Views / Screens

### 6a. Home (Weekly Digest)
**Default landing screen.** Shows a time-based greeting + network snapshot.

| Section | Content | Notes |
|---|---|---|
| Header | Time-based greeting ("Good morning ☀️") + italic serif subtitle "Here's your week" | `padding: 28px 24px 22px`, `background: var(--paper)` |
| Stats strip | 3 cards: Total contacts / Overdue count / Thriving count | Grid 3-col, `gap: 10px`. Numbers in Lora serif 28px |
| 🎂 Birthdays | Contacts with birthday within 7 days | Badge: "Today!" / "Tomorrow" / "in Nd", purple (`#9B3F8A`) |
| ⏰ Follow-ups due | Contacts where `nextFollowUp <= today` | Shows `DueBadge` on right. "See all →" links to Reminders view |
| 🌵 Going cold | Contacts with `strength < 0.3` AND `lastContact > 45 days ago` AND not already in overdue | Shows days since last contact |
| Empty state | 🌸 "All caught up" | Only when all three sections are empty |

**Key logic:** "Going cold" must exclude contacts already in "Overdue" to avoid duplication.

### 6b. Contacts View
Two layout modes toggled via Tweaks: **Grid** (card grid, `minmax(195px, 1fr)`) and **List** (full-width rows).

**Contact Card (grid):**
- Avatar with SVG strength ring (colour-coded: green ≥0.8, amber ≥0.5, terracotta ≥0.25, red <0.25)
- Name (Lora serif 14.5px bold), role, company
- Relationship chip + up to 2 tags
- Last contact date + DueBadge (only shown if due within 3 days)

**Contact Row (list):**
- Same info, horizontal layout
- Left accent border when selected (`3px solid var(--acc)`)

**Search:** Live filter across name, company, role, tags. Input with `🔍` icon prefix.

### 6c. Activity River
Chronological reverse-sorted list of ALL interactions across all contacts. Each entry:
- Emoji icon for type + contact name + relative time
- Click → opens contact's Detail panel
- Continuous connector line between entries

### 6d. Follow-ups / Reminders
Two sections: **Overdue** (badge with count) → **Upcoming**.

Each row has:
- Avatar + name + role/company
- `DueBadge` showing urgency
- **"✓ Done" quick button** — logs a "message / Quick check-in" interaction and updates `lastContact` without opening any modal. On hover: button turns accent-coloured.

### 6e. Contact Detail Panel
Desktop: slides in from the right (360px wide, `animation: slideRight`).
Mobile: full-screen overlay (animation: `slideUp`).

**Header zone:**
- Back button (←) + "Log" button + "Message" button
- Avatar (58px with ring) + name/role/company + RelChip
- Relationship health bar (strength 0–1 → green/amber/red)
- Cadence progress bar (shows how many days until/overdue next cadence)
- DueBadge if overdue

**Scrollable body:**
- Contact info (email, phone)
- Social chips (LinkedIn blue `#2563EB`, Twitter blue `#1DA1F2`)
- Tags (accent-coloured chips)
- Notes (italic Lora serif)
- Birthday (formatted "May 14") + Location
- **AISuggestion block** — dashed border "Generate AI follow-up suggestion". Calls Claude API (`window.claude.complete`), parses JSON `{action, message}`, shows suggested action + draft message with Copy + "✓ I reached out" buttons
- Interaction timeline (TLItem components with connector line)

---

## 7. Modals

### AddContactModal
Full-form modal for creating a new contact. Fields:
- Name* (with live avatar preview showing initials)
- Role, Company (side-by-side)
- Email, Phone (side-by-side)
- LinkedIn (prefix `in/`), Twitter (prefix `@`) (side-by-side)
- Birthday `MM-DD`, Location (side-by-side)
- Relationship type picker (6 pill buttons: Friend / Colleague / Mentor / Investor / Partner / Collaborator)
- Tag input (Enter or comma to add, × to remove)
- Notes textarea
- Follow-up picker (3 days / 1 week / 2 weeks / 1 month / 3 months)

**On save:** calculates `nextFollowUp` date, auto-sets `cadence` from relationship type, inserts to Supabase if connected.

### AddActivityModal (Global Log)
Triggered from FAB or sidebar button. Fields (all required):
- **Contact** — typeahead search dropdown showing avatar + name + role/company
- **Date** — date input, default today
- **Interaction type** — 8 pill buttons
- **Note** — textarea (required, validated)

On save: closes modal, updates contact's `lastContact`, `strength` (+0.08), prepends to `interactions[]`.

### QuickLog (from Detail panel)
Lightweight version: type pills + note textarea. No contact picker (already in context).

---

## 8. Key UX Patterns to Preserve

### Relationship Strength Ring
SVG circle around avatar. `stroke-dasharray` computed from `strength * circumference`. Colours:
- ≥ 0.8 → `#5A8A6A` (green) — "Thriving"
- ≥ 0.5 → `#C49B3A` (amber) — "Active"
- ≥ 0.25 → `#D97757` (terracotta) — "Fading"
- < 0.25 → `#C44F3A` (red) — "Dormant"

### DueBadge
Only renders if `nextFollowUp` is within 3 days. Three states:
- Overdue (⚡, red)
- Due today (⏰, terracotta)
- Due soon (🔔, amber, ≤3 days)

### Relationship Chips
Color-coded by type. Exact values:
```
Friend:       bg #FEF2EE  text #C87553
Colleague:    bg #EFF4FD  text #3B6FD4
Mentor:       bg #F2EDFD  text #7C5AC2
Investor:     bg #EAF3EC  text #2A8C5E
Partner:      bg #FDF6E3  text #B08A20
Collaborator: bg var(--card) text var(--ink-mid)
```

### Birthday Logic
Birthday stored as `MM-DD`. Computed with year-rollover logic:
- If birthday has passed this year → compute days until next year's
- Within 7 days → show in Home dashboard
- Within 14 days → show badge on contact card

### Cadence Progress Bar
`progress = (daysSinceLastContact / cadence) * 100%`
Bar colour:
- < 70% of cadence elapsed → green
- 70–100% → amber
- > 100% (overdue) → red

### Speed Dial FAB
- Fixed bottom-right, `52×52px` circle in accent colour
- Click: rotates `+45°`, reveals two sub-buttons (👤 Add Contact, ✍️ Log Activity) with label chips
- Click outside backdrop div → closes

### AI Suggestion
Uses `window.claude.complete()` — the built-in Claude helper available in the prototype environment. In production, replace with your own API call. Prompt asks for JSON `{action, message}`. Falls back gracefully if parsing fails.

---

## 9. Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| `> 700px` | Sidebar visible (216px), Detail panel slides in from right (360px), FAB bottom-right |
| `≤ 700px` | Sidebar hidden, BottomNav (4 tabs: Home/Contacts/Follow-ups/Activity), Detail = full-screen overlay, FAB at `bottom: 76px` (above BottomNav) |

---

## 10. Design Tokens

See `design-tokens.css`. Key values:

**Typography:**
- Headings: `'Lora', serif` (italic for subheadings, 700 for display)
- Body: `'DM Sans', sans-serif` (base 14px)
- Section labels: uppercase, `letter-spacing: 0.09em`, 10–11px

**Colours** (full list in `design-tokens.css`):
- Background layers: `--cream #FAF7F2` → `--paper #F0EBE3` → `--card #EDE8DF`
- Accent: `--acc #D97757` (terracotta, swappable to Cobalt `#3B6FD4` or Plum `#9B4F8E`)

**Shadows:** Three levels (`--sh-s`, `--sh-m`, `--sh-l`) — all warm-toned using `rgba(42,36,32,...)`

**Border radius:** Cards 12px, modals 16px, pills 20px, inputs 8px

---

## 11. Interaction Type Icons

```
coffee  → ☕    email   → ✉
call    → 📞   meeting → 🤝
video   → 🎥   event   → 🎉
message → 💬   note    → 📝
```

---

## 12. What Still Needs Building

These features were discussed but not yet prototyped:

| Feature | Priority | Notes |
|---|---|---|
| **Edit contact** | High | Tap to edit name, role, notes etc. inline in Detail panel |
| **Contact photo** | Medium | Drag & drop or URL — replace initials avatar |
| **Network Graph** | Low/Explore | 4 design directions: force-directed, concentric rings, tag clusters, time axis |
| **CSV import** | Low | User said manual entry preferred; consider later |

---

## 13. Files in This Package

| File | Description |
|---|---|
| `README.md` | This document |
| `Personal CRM Pro.html` | Full interactive prototype (open in browser) |
| `schema.sql` | Supabase database setup SQL |
| `design-tokens.css` | CSS custom properties / design token reference |

---

## 14. Running the Prototype

1. Open `Personal CRM Pro.html` in any modern browser
2. No build step required — it runs React + Babel from CDN
3. On first load, it attempts to connect to Supabase. If tables don't exist, a yellow banner appears with setup SQL
4. The **Tweaks panel** (click the toggle in the toolbar, or look for the floating panel) lets you switch accent colour, grid/list view, sidebar collapse
