# CLAUDE.md — Personal CRM

## Project Purpose

A personal relationship management tool built for private use by Patrick Chung. It tracks contacts (family, friends, colleagues, business), surfaces follow-up reminders, upcoming birthdays, and drifting relationships. The goal is to maintain intentional connections without relying on commercial CRM products.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (single `.jsx` file), Vite 5 |
| Styling | CSS-in-JS via injected `<style>` tag, CSS variables, Google Fonts (Lora + DM Sans) |
| Database | Supabase (PostgreSQL) — table `contacts`, column `data jsonb` |
| AI | OpenAI `gpt-4o-mini` via REST (`/v1/chat/completions`) |
| Deployment | Vercel (production: `personal-crm-silk.vercel.app`) |
| Node scripts | `scripts/process-import.mjs` — one-time contact enrichment |

Environment variables (in `.env`, never committed):
- `VITE_OPENAI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Project Structure

```
/
├── personal-crm.jsx          # Entire app — components, styles, logic in one file
├── index.html                # Vite entry point
├── vite.config.js            # Vite config with React plugin
├── vercel.json               # SPA rewrite rule
├── package.json              # Scripts: dev / build / preview / import
├── .env                      # Secret keys (gitignored)
├── crm_contacts_final.json   # Original raw export from old CRM (source of truth for import)
├── src/
│   ├── main.jsx              # React root render
│   ├── supabase.js           # Supabase client (reads VITE_ env vars)
│   └── imported-contacts.json  # AI-enriched contacts seeded into Supabase
└── scripts/
    └── process-import.mjs    # Node script: reads crm_contacts_final.json → enriches with OpenAI → writes imported-contacts.json
```

### Component hierarchy (all in `personal-crm.jsx`)

```
App
├── Dashboard          — summary cards, follow-ups, birthdays, reconnect list (collapsible sections)
├── ContactsList       — filterable/searchable grid, multi-select category filter
└── ContactProfile     — detail view, edit panel, update log, AI follow-up suggestions
```

---

## Contact Data Schema

Each contact stored in Supabase as `{ id, data: <json> }` where `data` contains:

```js
{
  id, name,
  categories,                // string[]  — "family" | "friend" | "colleague" | "business" (multi-select)
  category,                  // legacy: string (old records only — use getCategories() helper, never read directly)
  role, company, location,
  phone, email,
  linkedin, instagram,       // social handles
  birthday,                  // ISO string or "--MM-DD" (year-less) or null
  strength,                  // 1–5
  strengthOverride,          // number | null — manual override bypasses auto-compute
  notes,                     // freeform string (legacy; new notes go in updates[])
  bio,                       // freeform string
  photo,                     // Supabase Storage public URL or null
  tags,                      // string[]
  updates,                   // [{ date, text }]  — update log, capped at 50, newest first
  lastContact,               // ISO date string or null — auto-set from updates
  lastModified,              // ISO datetime string — set on every updateContact() / addUpdate() call
  followUp: { date, note },  // or null
  importantDates,            // [{ name, date }] — arbitrary recurring dates
}
```

**`getCategories(contact)` helper** — always use this instead of reading `category`/`categories` directly:
```js
// handles both legacy {category: string} and new {categories: string[]}
function getCategories(contact) {
  if (contact.categories?.length) return contact.categories;
  if (contact.category) return [contact.category];
  return ["friend"];
}
```

New contacts write `categories: string[]`. Old contacts in Supabase still have `category: string` — `getCategories()` normalizes both.

Birthday normalization: `--MM-DD` is converted to `2000-MM-DD` for date math, but displayed without year.

---

## Cadence / Drift Logic

```js
CATEGORY_CADENCE = { family: 30, friend: 90, colleague: 75, business: 60 }  // days
STRENGTH_CADENCE = { 5: -15, 4: -10, 3: 0, 2: +10, 1: +20 }               // day adjustment
```

Drift threshold = `Math.min(...categories.map(cat => CATEGORY_CADENCE[cat])) + STRENGTH_CADENCE[strength]`. When a contact has multiple categories, the **strictest** (smallest) cadence wins.

A contact is "drifting" when `daysSince > threshold`. Overdue by >60d = high urgency.

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
- **Do not split `personal-crm.jsx`** into multiple files unless explicitly requested — single-file is an intentional design choice for simplicity.
- **Do not add sample/mock data** back into the app — real contacts come from Supabase.
- **Do not expose API keys** in client-side code outside of Vite `VITE_` env var pattern.

---

## Common Commands

```bash
npm run dev          # local dev server (localhost:5173)
npm run build        # production build → dist/
npm run import       # AI-enrich crm_contacts_final.json → src/imported-contacts.json
vercel --prod        # deploy to production
```

---

## Supabase Setup (reference)

Table DDL:
```sql
create table contacts (
  id text primary key,
  data jsonb
);
alter table contacts enable row level security;
create policy "allow all" on contacts for all using (true) with check (true);
```

**Sync pattern**: per-contact debounced write (600ms). `syncContact(contact)` clears the previous timer for that contact ID and schedules a single `supabase.upsert`. Guarded by `loadedRef.current` on initial load. Timer map lives in `syncTimers` ref.

**Supabase Storage**: `avatars` bucket (public) stores contact photos. Must be created manually in the Supabase Dashboard — the anon key does not have permission to create buckets via API. Path pattern: `avatars/<contact-id>`. `onUpload` callback writes the public URL to `contact.photo`.
