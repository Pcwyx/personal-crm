# CLAUDE.md — Personal CRM

## Project Purpose

A personal relationship management tool built for private use by Patrick Chung. It tracks contacts (family, friends, colleagues, business), surfaces follow-up reminders, upcoming birthdays, and drifting relationships. The goal is to maintain intentional connections without relying on commercial CRM products.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (multi-file, Vite 5) |
| Styling | `src/styles/globals.css`, CSS custom properties, Google Fonts (Lora + DM Sans) |
| Database | Supabase (PostgreSQL) — normalized `contacts` + `interactions` tables |
| AI | OpenAI `gpt-4o-mini` via Vercel serverless (`/api/ai`) |
| Deployment | Vercel (production: `personal-crm-silk.vercel.app`) |

Environment variables (in `.env`, never committed):
- `VITE_OPENAI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Project Structure

```
/
├── index.html                    # Vite entry point
├── vite.config.js
├── vercel.json                   # SPA rewrite + /api serverless routes
├── package.json
├── .env                          # Secret keys (gitignored)
├── api/
│   ├── ai.js                     # Serverless: OpenAI proxy (AI suggestions + meeting prep)
│   └── notify.js                 # Serverless: birthday/follow-up email notifications
├── src/
│   ├── main.jsx                  # React root render
│   ├── App.jsx                   # Root state, auth, CRUD, routing between views
│   ├── supabase.js               # Supabase client
│   ├── lib/utils.js              # Shared helpers: computeStrength, cadence, date utils, INTERACTION_TYPES
│   ├── styles/globals.css        # All CSS — design tokens, components, views
│   ├── components/
│   │   ├── Avatar.jsx            # Avatar + AvatarSimple (SVG strength ring)
│   │   ├── Sidebar.jsx           # Left nav, today widget, settings
│   │   ├── BottomNav.jsx         # Mobile bottom nav
│   │   ├── DueBadge.jsx          # Overdue / due-date badge
│   │   ├── RelChip.jsx           # Relationship tag chip
│   │   ├── SpeedDial.jsx         # FAB speed dial (add contact / log activity)
│   │   └── LoginScreen.jsx       # Magic-link auth screen
│   ├── views/
│   │   ├── HomeView.jsx          # Dashboard: stat cards, birthdays, follow-ups, going cold
│   │   ├── ContactsView.jsx      # Searchable/filterable contact grid or list
│   │   ├── ActivityView.jsx      # Global activity feed
│   │   ├── RemindersView.jsx     # Overdue + upcoming follow-ups
│   │   └── StatsView.jsx         # Monthly bar chart, top contacts, type distribution
│   └── panels/
│       ├── ContactDetail.jsx     # Slide-in detail: edit, interactions, meeting prep AI
│       ├── QuickLog.jsx          # Log interaction + follow-up strip
│       ├── AddContactModal.jsx   # New contact form
│       └── AddActivityModal.jsx  # Global "log activity" with contact picker
└── scripts/
    └── migrate.mjs               # One-time migration: contacts_legacy (jsonb) → normalized tables
```

### Component hierarchy

```
App  (auth, contacts[], interactions via join)
├── Sidebar
├── HomeView          — needs-attention count, birthdays, follow-ups due, going cold
├── ContactsView      — search + relationship filter, grid/list toggle, select mode
├── ActivityView      — flat interaction log across all contacts
├── RemindersView     — overdue + upcoming next_follow_up
├── StatsView         — monthly chart, top contacts (90d), by-type distribution
└── ContactDetail     — edit form, quick log, interaction history, meeting prep AI
    └── QuickLog      — log interaction + inline follow-up strip after save
```

---

## Database Schema (normalized, current)

```sql
-- contacts table
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text,
  company       text,
  location      text,
  email         text,
  phone         text,
  birthday      text,           -- "MM-DD" (year-less)
  bio           text,
  notes         text,
  photo         text,           -- Supabase Storage public URL
  tags          text[],
  relationship  text[],         -- ["Friend","Family","Colleague",…]
  cadence       int,            -- override in days; null = computed from relationship[]
  last_contact  date,           -- auto-updated when interaction is added
  next_follow_up date,
  follow_up_note text,
  social        jsonb,          -- { linkedin, twitter, instagram }
  created_at    timestamptz default now()
);

-- interactions table
create table interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references contacts(id) on delete cascade,
  date        date not null,
  type        text,             -- see INTERACTION_TYPES in utils.js
  note        text,
  created_at  timestamptz default now()
);
```

Auth: Supabase magic-link email. RLS enabled on both tables (`auth.uid() is not null`).

Contacts are loaded with `supabase.from("contacts").select("*, interactions(*)")` — interactions are embedded as an array.

**Sync pattern**: per-contact debounced write (600ms). `syncContact(contact)` strips the `interactions` array before upserting to `contacts`. Interactions are written separately via `addInteraction` / `deleteInteraction`.

**Supabase Storage**: `avatars` bucket (public). Path: `avatars/<contact-id>`. Must be created manually in the Supabase Dashboard.

---

## Contact Data Shape (in-memory)

After load, each contact object is:

```js
{
  id, name, role, company, location, email, phone,
  birthday,         // "MM-DD" or null
  bio, notes, photo,
  tags,             // string[]
  relationship,     // string[] — "Friend" | "Family" | "Colleague" | "School" | "Network" | "Mentor" | "Collaborator"
  cadence,          // int (days) | null — if null, computeCadence(relationship) is used
  last_contact,     // "YYYY-MM-DD" | null — updated automatically when interaction added
  next_follow_up,   // "YYYY-MM-DD" | null
  follow_up_note,   // string | null
  social,           // { linkedin, twitter, instagram }
  interactions,     // [{ id, contact_id, date, type, note, created_at }] — from join
  strength,         // float 0–1 — added by contactsEnriched = contacts.map(c => ({...c, strength: computeStrength(c)}))
}
```

---

## Cadence / Drift Logic

```js
RELATIONSHIP_CADENCE = {
  Family: 30, Friend: 60, School: 90,
  Colleague: 75, Network: 90, Mentor: 45, Collaborator: 60
}  // days

computeCadence(relationship[]) → Math.min(...cadences)  // strictest wins
computeStrength(contact)       → max(0, 1 - daysSince / cadence)
```

`strength` is a float:
- `>= 0.8` → Thriving (green)
- `>= 0.5` → Active (amber)
- `>= 0.25` → Fading (orange)
- `< 0.25` → Dormant (red)

"Going cold" threshold in HomeView: `strength < 0.3 && daysSince > 45`.
"Needs attention" count (stat card): overdue follow-up OR going cold — deduplicated.

---

## AI Features

**`/api/ai`** (Vercel serverless, proxies OpenAI `gpt-4o-mini`):
- `action: "suggest"` — given contact context, returns suggested follow-up message
- `action: "prep"` — meeting prep brief: returns `{ lastMeeting, background, topics[] }`

Called client-side with `fetch("/api/ai", { method: "POST", body: JSON.stringify({action, contact, interactions}) })`.

---

## User Preferences & Working Style

- **Language**: Patrick communicates in Traditional Chinese (繁體中文). Respond in Chinese unless writing code or CLAUDE.md.
- **Tone**: Direct and concise. No padding, no unnecessary recaps.
- **Code style**: Minimal comments. No comments that just describe what the code does.
- **Scope discipline**: Only change what was asked. Do not refactor, clean up, or add features beyond the request.
- **No feature flags, no backwards-compat shims** — just change the code.
- **Confirmation before risky actions**: Ask before destructive git ops, force-push, dropping DB data, etc. Deploying to Vercel (`vercel --prod`) is considered routine and does not require confirmation.

---

## Prohibited Actions

- **Never commit `.env`** — it contains live API keys.
- **Never commit `crm_contacts_final.json`** to a public repo — contains real personal contact data.
- **Never add `node_modules/` or `dist/`** to version control.
- **Do not introduce new dependencies** without discussing first — keep the stack minimal.
- **Do not add sample/mock data** — real contacts come from Supabase.
- **Do not expose API keys** in client-side code outside of Vite `VITE_` env var pattern.

---

## Common Commands

```bash
npm run dev          # local dev server (localhost:5173)
npm run build        # production build → dist/
vercel --prod        # deploy to production
```
