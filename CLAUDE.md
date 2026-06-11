# CLAUDE.md — Personal CRM

## Project Purpose

A personal relationship management tool built for private use by Patrick Chung. It tracks contacts (family, friends, colleagues, business), surfaces follow-up reminders, upcoming birthdays, and drifting relationships. Single-user app — there is exactly one account (the owner).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (multi-file, Vite 5) |
| Styling | `src/styles/globals.css`, CSS custom properties, Google Fonts (Lora + DM Sans) |
| Database | Supabase (PostgreSQL) — `contacts` + `interactions` + `settings` tables |
| AI | OpenAI `gpt-4o-mini` via Vercel serverless (`/api/ai`, `/api/telegram`) |
| Integrations | Google Calendar (OAuth, `/api/google/*`), Telegram bot (`/api/telegram`), Gmail SMTP weekly digest (`/api/notify`) |
| Tests | Vitest (`npm test`) |
| Deployment | Vercel (production: `personal-crm-silk.vercel.app`) |

### Environment variables

Client-side (Vite, baked into bundle — never put secrets here):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`

Server-side only (Vercel env vars):
- `OPENAI_API_KEY` — OpenAI proxy + Telegram NLP
- `SUPABASE_SERVICE_ROLE_KEY` (+ optional `SUPABASE_URL`, falls back to `VITE_SUPABASE_URL`)
- `CRON_SECRET` — required by `/api/notify`; Vercel cron auto-sends it as Bearer when set
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`
- `OWNER_EMAIL` (optional; defaults to owner's email in `api/google/_utils.js`)

---

## Security model (do not weaken)

- **Auth**: Supabase magic-link, `shouldCreateUser: false`; signups disabled in Supabase dashboard. One owner account only.
- **RLS**: `contacts`/`interactions` policies require the JWT email claim to equal the owner email (`handoff/schema-rls-owner.sql`). `settings` is service-role only.
- **API auth**: every `/api/google/*` route and `/api/ai` calls `verifyAuth(req)` (`api/google/_utils.js`) which validates the Supabase JWT **and** the owner email. Client must call them through `authFetch()` from `src/supabase.js`, never bare `fetch`.
- **`/api/notify`**: fail-closed Bearer check against `CRON_SECRET`.
- **`/api/telegram`**: verifies `x-telegram-bot-api-secret-token` header; messages/callbacks also checked against `TELEGRAM_CHAT_ID`. OpenAI parse output is validated (type enum, date format, lengths) before any DB write.
- **OAuth**: Google flow uses a `state` token stored in `settings` (CSRF protection).
- **CSP/headers**: set in `vercel.json`. `script-src 'self'` — do not add `unsafe-inline` for scripts.

---

## Project Structure

```
/
├── index.html / vite.config.js / vercel.json   # vercel.json: SPA rewrite, cron, security headers
├── api/
│   ├── ai.js                # OpenAI proxy (auth required, max_tokens clamped)
│   ├── notify.js            # Cron: Monday weekly digest + daily birthday emails (GMT+8 basis)
│   ├── telegram.js          # Telegram bot webhook: NLP interaction logging, state machine
│   └── google/
│       ├── _utils.js        # getSupabaseAdmin, verifyAuth (owner check), token refresh, matching
│       ├── auth.js / callback.js      # OAuth flow (with state param)
│       ├── status.js / disconnect.js
│       ├── birthday.js / birthday-bulk.js / followup.js   # calendar event CRUD
│       └── sync.js          # import calendar events as interactions
├── src/
│   ├── App.jsx              # Root state, auth, CRUD, undo toast, export, routing
│   ├── supabase.js          # supabase client + authFetch (adds JWT Bearer)
│   ├── lib/utils.js         # TIER_CADENCE, computeStrength, date/birthday helpers, tags
│   ├── components/          # Avatar, Sidebar, BottomNav, DueBadge, RelChip, SpeedDial, LoginScreen
│   ├── views/               # HomeView, ContactsView, ActivityView, RemindersView, StatsView
│   └── panels/              # ContactDetail (+QuickLog), AddContactModal, AddActivityModal, CalendarSyncModal
├── handoff/                 # SQL run manually in Supabase SQL Editor (schema-v2, gcal, rls-owner)
└── scripts/                 # one-time migration/import scripts
```

---

## Database Schema (current)

```sql
contacts (
  id uuid pk, name text, role text, company text, location text,
  email text, phone text,
  birthday text,            -- "MM-DD" (year-less)
  bio text, notes text, photo text,
  tags text[],              -- supports "namespace:value" structured tags
  relationship text[],      -- Friend|Family|School|Colleague|Network|Mentor|Collaborator
  tier int,                 -- 1..4, drives cadence (see below)
  cadence int,              -- legacy override, mostly unused
  last_contact date,        -- maintained by app when interactions change
  next_follow_up date, follow_up_note text,
  social jsonb,             -- {linkedin, twitter, instagram}
  important_dates jsonb,    -- [{name, date}]
  gcal_birthday_event_id text, gcal_followup_event_id text,
  created_at timestamptz, updated_at timestamptz
)

interactions (
  id uuid pk, contact_id uuid fk cascade,
  date date, type text,     -- coffee|call|video|email|meeting|event|message|note
  note text,
  source text, source_id text,  -- 'gcal'/'telegram' dedupe
  created_at timestamptz
)

settings ( key text pk, value jsonb )   -- google tokens, calendar ids, oauth state, telegram state
```

Contacts are loaded with `select("*, interactions(*)")`. Sync pattern: per-contact debounced upsert (600ms) via `syncContact`; it strips `interactions`, `strength`, `last_contact`, gcal event ids before writing. Interactions written via `addInteraction`/`deleteInteraction` (with 5s undo; pending delete is flushed, never cancelled, when a new delete starts).

**Supabase Storage**: `avatars` bucket (public), path `avatars/<contact-id>`.

---

## Tier / Drift Logic

```js
TIER_CADENCE = { 1: 30, 2: 60, 3: 90, 4: 180 }   // days, T1 = closest circle
effectiveCadence(c) = TIER_CADENCE[c.tier] || 90
computeStrength(c)  = clamp01(1 - daysSince(c.last_contact) / cadence)  // 0.5 if never contacted
```

- Strength bands: ≥0.8 Thriving · ≥0.5 Active · ≥0.25 Fading · <0.25 Dormant
- "Going cold" (HomeView) = `daysSince(last_contact) > tierCadence`, excluding contacts already counted as overdue follow-up
- Badge count = overdue follow-ups only; "Needs attention" = overdue + going cold (deduped)
- The old relationship-based `RELATIONSHIP_CADENCE`/`computeCadence` still exists in utils.js but is legacy — tier wins.
- All day-diff math uses `daysSince()` (local-midnight basis). `api/notify.js` uses GMT+8. Feb 29 birthdays fall on Feb 28 in non-leap years.

---

## User Preferences & Working Style

- **Language**: Patrick communicates in Traditional Chinese (繁體中文). Respond in Chinese unless writing code or CLAUDE.md.
- **Tone**: Direct and concise. No padding, no unnecessary recaps.
- **Code style**: Minimal comments. No comments that just describe what the code does.
- **Scope discipline**: Only change what was asked. No feature flags, no backwards-compat shims.
- **Confirmation before risky actions**: Ask before destructive git ops or dropping DB data. `vercel --prod` is routine — no confirmation needed.

---

## Agent Working Guide

### Commands
```bash
npm run dev      # local dev (port 3000)
npm run build    # must pass before any deploy
npm test         # Vitest, must be green before commit
vercel --prod    # deploy (also aliases personal-crm-silk.vercel.app)
```

### Self-verification checklist (after changes)
1. `npm run build` passes
2. `npm test` green
3. If serverless/API changed: curl the production endpoint (unauthenticated must return 401; `/api/notify` needs `Authorization: Bearer $CRON_SECRET`)
4. If frontend changed: load production URL, check login screen renders and no console errors
5. Commit per logical batch with a focused message; push to `origin main`

### Prohibited
- Never commit `.env`, `crm_contacts_final.json`, `src/imported-contacts.json` (all gitignored — keep it that way)
- Never put secrets in `VITE_`-prefixed vars or client code
- Never weaken: RLS policies, `verifyAuth` owner check, fail-closed `CRON_SECRET`, Telegram webhook secret, CSP
- Do not introduce new dependencies without discussing first
- Do not add sample/mock data; real data lives in Supabase
- Do not edit `handoff/*.sql` history — add new migration files instead (they are run manually in Supabase SQL Editor)
- Do not delete or rewrite `scripts/` migrations

### Gotchas
- `ContactDetail` must keep its `key={contact.id}` prop (state reset on contact switch)
- Side effects must stay **outside** `setContacts` updaters (StrictMode double-invokes them)
- `AddContactModal` field list must match actual DB columns — a stray field makes the insert fail
- Supabase JS errors are returned, not thrown: always check `{ error }`
- Telegram bot state lives in `settings` table as `tg_state_<chatId>`
