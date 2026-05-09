# Personal CRM — Redesign Spec

> **Audience**: Claude Code (or any engineer) inheriting this redesign.
> **Source of truth**: this document + `Personal CRM Redesign.html` (visual reference for Dashboard / Contact detail / Add contact).
> **Owner**: Patrick. **Date**: April 29, 2026.

---

## 0. Product positioning (read this first)

**JTBD (primary)**: 「不要讓重要的人從生活中淡出。」
**JTBD (secondary)**: 「記得跟每個人之間發生過什麼。」

We chose **A + a little B**. That means:
- **Dashboard** = action list (A). What should I do today?
- **Contact detail** = memory file (B). What do I remember about this person?
- **Contacts list** = directory (C, only as routing surface).

Anything that doesn't serve A or B should be cut.

---

## 1. Global changes (apply everywhere)

### 1.1 Remove "Relationship Strength ★" entirely
- Drop the field from contacts table.
- Drop the underline bar / star UI from all cards.
- Replaced by **cadence threshold** (already exists in DB).

### 1.2 Cadence calculation rule changes
- **Cadence countdown only starts after the first `last_contacted_date` is set** — either at contact creation (required, see §4) or at the first logged update.
- A newly created contact with `last_contacted_date = today` is **not** "overdue".
- Eliminate the "Infinityd overdue" state — it should be impossible.

### 1.3 Microcopy normalization
| Old | New |
|---|---|
| "Infinityd overdue" | (impossible state — remove) |
| "Overdue" badge | "Been a while" (only when actually >threshold) |
| "Mark done ✓" | "✓ I reached out" |
| "Check-in threshold: 90d" | "Catch up every ~3 months" (humanized) |
| "Last update never" | "No log yet" |
| "Good day ✦" | "Good morning, {firstName}." |

### 1.4 Color palette (move from warm-orange-led to moss-led)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F1EA` | Page bg |
| `--surface` | `#FBF8F3` | Cards, inputs |
| `--text` | `#2A251F` | Primary text |
| `--text-muted` | `#6B6055` | Secondary |
| `--text-subtle` | `#8B7F70` | Tertiary |
| `--accent` | `#5C6B4E` (moss) | Primary CTA, section headers |
| `--accent-soft` | `rgba(92,107,78,0.10)` | Accent backgrounds, chips |
| `--ink` | `#1A1612` | Active nav, dark CTA |
| `--warn` | `#A6442D` | Only for genuinely time-sensitive states (rare) |
| Border | `rgba(60,50,40,0.06–0.12)` | Hairlines |

Keep warm orange `#C96442` only for the brand mark `people.crm` and (optionally) destructive actions.

### 1.5 Typography
- **Headings**: Inter 500, letter-spacing -0.01 to -0.02em, large (Greeting 44px).
- **Body**: Inter 400/500, 14px base; 13px on dense rows.
- **Section labels**: 11–13px, weight 600, letter-spacing 0.08em, UPPERCASE, color `--accent`.
- **CJK**: Noto Sans TC fallback for Chinese names. No mixed-font rule beyond fallback.
- Do not use Fraunces in shipped version (was a Tweaks-only experiment).

### 1.6 IA / Top nav
- Two top-level routes: `Dashboard` · `Contacts`.
- Brand mark left, nav center (pill-style active state on dark), `+ New contact` button right.
- (Future) `Settings` lives in a user-menu dropdown on the brand area, not as a third nav item.

---

## 2. Dashboard

### 2.1 Layout (top → bottom)
1. **Greeting block**
   - Date (small, muted, uppercase): `Wednesday, April 29`
   - Greeting (44px, weight 500): `Good morning, Patrick.`
   - Subtitle: `{N} people you might want to reach today.` or `You're caught up. Nice work today.` if N=0.

2. **Today section**
   - Section header: `TODAY · {N}` (left), `{M} more waiting` (right, muted, only shown if M > 0).
   - **Cap N at 3 visible cards.** Anything beyond goes into the "+M more" expand region below.
   - Selection logic for which 3:
     - First, anyone whose `last_contacted_date` is more than 1.5× their cadence threshold past due AND has unresolved follow-up topic — sort by overdue ratio.
     - If fewer than 3, top up with cadence-due (1× threshold past due).
     - Never show the same contact twice. **Merge any duplicate follow-ups for one person into a single card** (combine topic snippets with " · ").

3. **Today's follow-up card** (per person):
   - Avatar (42) + Name + role.
   - "{N}d since you talked" (right-aligned, muted).
   - **Topic line**: `LAST` chip (small, accent) + factual one-line summary of last note.
     - Tone: factual, not advisory. Example: `他上次提到正在離職、想找品牌策略類的工作` — never "你應該問他⋯".
   - Buttons row:
     - **Primary**: `✓ I reached out` (accent-soft bg, accent fg) → see §2.4.
     - **Secondary**: `Snooze ▾` → popover with `This week` / `Next week` / `Next month`.
     - **Tertiary**: `View profile →` (right-aligned, plain text link).
   - **DO NOT** include "Open LINE" / "Copy message" / channel CTAs — user manages outreach themselves.

4. **"+ M more people you haven't talked to in a while"** — collapsed by default.
   - Expanded: section label `BEEN A WHILE`, then a compact row list (avatar 32 + name + role + "~Nw since you talked").
   - Each row links to the contact profile.
   - `Hide` button at the bottom.

5. **Spotlight section** (max 1 card)
   - Section header: `SPOTLIGHT`.
   - Priority logic:
     - If any contact's birthday is today → birthday spotlight.
     - Else if there exists a contact whose `last_contacted_date` (NOT note edit date — see §2.5) is >6 months ago AND was previously close (recent before that gap) → stale-profile spotlight.
     - Else → hide section entirely (do not show a placeholder).
   - Card layout: avatar (48) + label chip + headline + 1–2 sentence narrative reminding the user of last context + `Open profile →`.

6. **This week section**
   - Section header: `THIS WEEK`.
   - Upcoming birthdays in the next 14 days.
   - Each row: 🎂 emoji + `{Name}'s birthday` + date + "in N days".

### 2.2 Empty / edge states
- 0 follow-ups today → Greeting subtitle reads "You're caught up. Nice work today.", Today section hides entirely (don't show "(0)"), Spotlight + This week still render.
- 0 follow-ups AND 0 spotlight AND 0 birthdays → show a single calm illustration / message: "Nothing pressing today. A good time to log something you remembered." with a `+ Log a memory` button (opens contact picker → log update flow).

### 2.3 Snooze behavior
- **This week** → snoozed until 3 days from now.
- **Next week** → 7 days from now.
- **Next month** → 30 days from now.
- Snoozed follow-ups disappear from Today and reappear at the snooze date.
- When a snoozed follow-up reappears, **mark it with a small `↻ snoozed` badge once**. If snoozed again, the second time it should appear inline-warning: "You snoozed this twice — want to remove it?" (treat as gentle nudge, not blocker).

### 2.4 "✓ I reached out" behavior
- Card fades out (200ms) and is removed from Today list.
- **Resets `last_contacted_date` to today** for that contact (cadence countdown restarts).
- Does **not** auto-prompt for a note. User logs updates manually if they want — keeps the action lightweight.
- (Optional polish) Tiny toast bottom-right: `Reset cadence with {Name} · Undo` for 4s.

### 2.5 Profile-update date is "meeting date", not edit date
- Each timeline entry has a `meeting_date` field (the date of the actual interaction; defaults to today, user-editable backwards but not forwards — see §3.4).
- Spotlight "stale profile" logic uses `MAX(meeting_date)` per contact, NOT `updated_at`.
- This decouples "I edited the note last week" from "I actually saw them last week."

---

## 3. Contact detail

### 3.1 Layout (top → bottom)
1. `← All contacts` link.
2. **Header block**: Avatar (64) + Name (28px) + role + Category pill + 📍 Location · 🎂 Birthday inline, plus `Edit profile` button (legacy — but inline-edit replaces this; keep button as a fallback for power users).
3. **Next-step strip** (single row, full width, accent-soft border, 12px vertical padding):
   - `NEXT` chip (accent-soft bg).
   - Sentence: `Last talked {N} days ago — about {topic}. You usually catch up every ~{cadence-humanized}.`
   - Right-aligned: `+ Log update` button (accent-soft).
   - **DO NOT** include channel CTAs ("Open LINE" etc.).
4. **Inline log-update editor** (hidden by default; opens when `+ Log update` clicked).
   - Multi-line textarea, placeholder: `What's new with {name}? What did you talk about?`
   - Bottom row: `+ Follow-up todo (optional)` plain input + meeting-date picker (default today, see §3.4) + `Cancel` + `Save` (accent CTA).
5. **Timeline section** (main body — this is the heart of the page).
   - Section label `TIMELINE`.
   - Vertical line + dots; newest entry's dot is filled accent, older are outlined.
   - Each entry: meeting date + "{N}d ago" + body text + topic tags + optional `↳ {follow-up todo}` chip.
   - Edit affordance: hover row → small pencil icon top-right of the entry; click → entry becomes inline-editable.
6. **About & contact info section** (collapsed by default).
   - Toggle button: `ABOUT & CONTACT INFO ▾`.
   - When expanded → 2-column grid of properties (see §3.2).

### 3.2 About & contact info (inline-edit, property-based)
- Backed by a `properties` table (each property is `{ key, label, type, value, position }`) so future custom properties are trivial.
- **Default property set** (in this order):
  - `birthday` (date) — also surfaces in header inline.
  - `location` (text) — also surfaces in header inline.
  - `role` (text) — also surfaces in header inline.
  - `company` (text)
  - `email` (email)
  - `phone` (tel)
  - `line` (text — LINE ID)
  - `instagram` (text — IG handle)
  - `facebook` (url)
  - `whatsapp` (tel)
  - `linkedin` (url)
- **Inline-edit interaction**:
  - Default state of each row: `LABEL` (uppercase muted) above `value` (regular).
  - Hover row → row gets a faint surface bg + pencil icon appears right.
  - Click anywhere on the value → it becomes an `<input>` / `<select>` / date picker matching property type.
  - Blur or Enter → save.
  - Esc → cancel.
- **Empty properties** show as muted `—` value with `+ Add` ghost text on hover.
- **+ Add property** button at the bottom of the grid (custom properties).

### 3.3 Header inline-edit sync
**CRITICAL**: When `role`, `location`, or `birthday` is edited (anywhere — header inline, About section, or modal), the change must propagate to:
- Contact card on Contacts list (`role`, `location` if shown).
- Contact detail header (`role`, `location`, `birthday`).
- Anywhere else they appear.

Use the property store as single source of truth; render header from properties.

### 3.4 Meeting-date input (in log update editor)
- Default value = today.
- User can set to any date **at most today** (no future dates).
- Use a native `<input type="date">` for low friction.
- This date is what feeds cadence calculations and spotlight staleness — **not** `created_at`.

### 3.5 Topic tags
- AI-extracted on save (server-side after textarea submit).
- Displayed as small neutral chips below the body.
- Click a topic chip → filter timeline (or eventually, search across all contacts).
- Limit display to 3 tags per entry; `+N` reveals the rest.
- The `↳ Follow-up todo` is **not** a topic tag — it's a separate inline chip with the `↳` glyph and accent color.

---

## 4. Add contact (one-page form)

### 4.1 Required fields
- `Name` (text, required, autoFocus)
- `Category` (segmented control: Friend / Colleague / Family / Business; default Friend)
- `How you know them` (textarea, required, 1 sentence) — this becomes the **first timeline entry**.
- `Last contacted date` (date picker, required, default today, max=today) — sets initial `last_contacted_date` so cadence starts cleanly.

### 4.2 Optional but surfaced on Contacts list / header (Group: "Shows on their card")
- `Role / title`
- `Location` (city, country)
- `Birthday` (native date picker — `<input type="date">`. Add a small "Year unknown" checkbox; if checked, store only month/day and render birthdays without year.)

### 4.3 Optional contact channels (Group: "How to reach them")
Two-column layout, all optional:
- LINE ID
- Instagram handle
- Facebook URL
- WhatsApp
- Email
- Phone
- LinkedIn

### 4.4 Form structure
```
┌─ Add a person ────────────────────────────┐
│  Name *                                   │
│  Category   [Friend|Colleague|Family|Business]
│  How you know them *  (textarea)          │
│  Last contacted *  [date, default today]  │
│                                           │
│  ─── Shows on their card ───              │
│  Role / title          Location           │
│  Birthday  [date]  ☐ Year unknown         │
│                                           │
│  ─── How to reach them (all optional) ──  │
│  LINE                  Instagram          │
│  Facebook              WhatsApp           │
│  Email                 Phone              │
│  LinkedIn                                 │
│                                           │
│         [Cancel]    [Add contact →]       │
└───────────────────────────────────────────┘
```
- The two grouped sections use small uppercase labels (same style as section headers elsewhere).
- All optional fields use `placeholder` text rather than `required` indicators.
- Form is **a single scrollable modal**, not multi-step.

### 4.5 Submit behavior
- On submit:
  1. Create contact row with all properties.
  2. Insert first timeline entry: `body = {how you know them}`, `meeting_date = {last_contacted}`.
  3. Set `last_contacted_date = {last_contacted}`. Cadence starts here.
- Redirect to the new contact's detail page.

---

## 5. Contacts list

### 5.1 Card layout (each contact)
```
┌──────────────────────────────────────────────┐
│ [Avatar] Name                  18d           │
│          Role · Location                     │
│                                              │
│ FRIEND  #student                             │
│                                              │
│ "搬從大阪回來，準備找日商行銷工作"           │  ← last note snippet, italic muted, 1-line truncated
└──────────────────────────────────────────────┘
```
- Show `{N}d` (since-last-talked) top right, muted.
- Show category pill + up to 2 tags.
- Show **last note snippet** (italic, 13px, muted, single-line ellipsis). If no note yet, show muted "No logs yet".
- **Remove** the underline `Relationship 1/5` bar.

### 5.2 Filters / search
- Top: search box `Search by name, role, tag, or note content...` (note content is new — index timeline body text).
- Below: category pills `All` / `Friends N` / `Colleagues N` / `Family N` / `Business N` — same as today.
- Sort default: most recently contacted first. Add a sort dropdown later (alphabetical, by overdue, etc.).

### 5.3 Duplicate handling
- Database constraint or merge-on-create UI: if `name` + `category` matches existing, show inline warning "You already have a {Friend} named 吳謹妤 — open profile / continue anyway?" — never silently create duplicates.

---

## 6. Things to remove

- ✂ Relationship Strength stars + underline bar (everywhere).
- ✂ Auto-generated full-message AI text on dashboard ("Hi 吳謹妤! I was thinking about..."). Replace with factual topic line (§2.1).
- ✂ "Copy message" button (no AI message exists to copy).
- ✂ "Open LINE" / channel CTAs on Dashboard and Contact detail next-step strip.
- ✂ "Voice note" tab in log update (or hide on desktop).
- ✂ "Follow-ups (23)" overdue mass list on Dashboard.
- ✂ "Recently updated" cards section on Dashboard.
- ✂ "Infinityd overdue" badge state.
- ✂ Two-stage Add contact (collapse to one page per §4).

---

## 7. Component contract (for engineering)

### 7.1 New / changed data model

```ts
// contacts table
{
  id: string,
  name: string,
  category: 'Friend' | 'Colleague' | 'Family' | 'Business',
  cadence_days: number,            // default by category: Friend 60, Colleague 75, Family 30, Business 90
  last_contacted_date: Date,       // REQUIRED on create
  created_at: Date,
}

// contact_properties table  (new — replaces flat columns)
{
  id: string,
  contact_id: string,
  key: string,                     // 'role' | 'location' | 'birthday' | 'email' | … | custom
  label: string,                   // human-readable
  type: 'text' | 'email' | 'tel' | 'url' | 'date' | 'number',
  value: string,                   // ISO date string for type=date
  position: number,
  is_birthday_year_unknown?: boolean,  // only on key='birthday'
}

// timeline_entries table (renamed from updates)
{
  id: string,
  contact_id: string,
  body: string,
  meeting_date: Date,              // user-set, max today
  follow_up_todo: string | null,
  topics: string[],                // AI-extracted
  created_at: Date,
}

// follow_ups table (NEW — derived/cached, drives Today)
{
  id: string,
  contact_id: string,
  topic_summary: string,           // factual one-liner
  surfaced_at: Date,
  status: 'pending' | 'reached_out' | 'snoozed',
  snoozed_until: Date | null,
  snooze_count: number,
}
```

### 7.2 Key actions

| Action | Effect |
|---|---|
| Click `✓ I reached out` on a Today card | `follow_up.status='reached_out'`; `contact.last_contacted_date=today`; remove from Today list (animated fade). |
| Click `Snooze · This week` | `follow_up.status='snoozed'`; `snoozed_until = today + 3d`; `snooze_count++`. |
| Save `Log update` | Insert `timeline_entry`; if `meeting_date >= contact.last_contacted_date`, update `contact.last_contacted_date = meeting_date`; clear any `pending` follow-ups for this contact (reached_out implicitly). |
| Edit a property inline | Patch single property, optimistic UI, blur/Enter commits. |
| Delete a contact | Soft-delete; offer Undo for 5s. |

### 7.3 Today selection algorithm (pseudocode)

```
overdue_ratio(c) = days_since(c.last_contacted_date) / c.cadence_days
candidates = contacts.filter(c => overdue_ratio(c) >= 1.0 AND !has_pending_snooze(c))
sorted = candidates.sortDesc(c => overdue_ratio(c))
deduped = dedupe_by_contact_id(sorted)        // never two cards for same person
today_3 = deduped.slice(0, 3)
more = deduped.slice(3)
```

### 7.4 Spotlight algorithm

```
if any contact has birthday == today: return birthday_spotlight(contact)
stale = contacts.filter(c => MAX(c.timeline.meeting_date) is older than 6 months)
if stale.length > 0: return stale_profile_spotlight(stale[0])  // pick one with strongest signal
else: hide spotlight section
```

---

## 8. Visual reference

See `Personal CRM Redesign.html` for high-fidelity reference of:
- ① Dashboard (Today, Spotlight, This week)
- ② Contact detail (Next-step strip, Timeline; About section to be redesigned per §3.2)
- ③ Add contact (visual is two-stage in mockup, but spec §4 supersedes — implement one-page form per §4.4)

The mockup uses moss green `#5C6B4E` as the primary accent. Tweaks panel inside the HTML allows comparing ink blue and deep umber.

---

## 9. Out of scope (for this redesign)

- Onboarding flow.
- Settings page.
- Mobile responsive design (do desktop first; mobile is a follow-up).
- Multi-user / sharing.
- Import from CSV / Google Contacts.
- Custom properties UI (data model supports it — UI to come later).

---

## 10. Open decisions for next round

These were not decided in this pass; flag back to Patrick before coding:
- Cadence default values per category (currently guessed: Friend 60, Colleague 75, Family 30, Business 90) — confirm.
- Snooze second-time warning copy — UX direction set, exact wording TBD.
- Topic tag click behavior — filter timeline (in-page) vs. global search — TBD.
- Empty-state illustrations — none yet; placeholder text only for v1.

---

**End of spec.**
