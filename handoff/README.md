# Personal CRM — Redesign Handoff Package

This folder is a **self-contained handoff** for redesigning the Personal CRM (`personal-crm-silk.vercel.app`). Drop it into Claude Code (or share with any engineer) — everything they need is here.

## What's inside

| File | Purpose |
|---|---|
| `PERSONAL_CRM_REDESIGN_SPEC.md` | **Source of truth.** Complete spec covering positioning, IA, every screen, data model, algorithms, removals, and out-of-scope items. Read this first. |
| `Personal CRM Redesign.html` | **Visual reference.** High-fi mockup with 3 after-screens (Dashboard, Contact detail, Add contact). Open in a browser. The Tweaks panel (bottom-right) lets you compare moss / ink / umber accents. |
| `README.md` | This file. |

## How to use this package in Claude Code

1. Drop the folder into your codebase (or attach to a Claude Code session).
2. Tell Claude Code: **"Read `PERSONAL_CRM_REDESIGN_SPEC.md` and `Personal CRM Redesign.html`. Then implement the changes against my Next.js codebase. Start with §1 global changes, then §2 Dashboard."**
3. The spec has section numbers (§1–§10) — reference them when iterating.

## Critical things to NOT lose in translation

These are the highest-leverage changes — confirm they survive engineering:

1. **Kill the ★ Relationship Strength** entirely (§1.1).
2. **No more "Infinityd overdue"** — cadence starts from `last_contacted_date`, which is now required at contact creation (§1.2, §4.1).
3. **Today is capped at 3 cards**, no exceptions; rest collapses (§2.1).
4. **AI gives factual topic lines, never writes messages for the user** (§2.1, §6).
5. **No channel CTAs (LINE/IG/etc.) on Dashboard or Contact detail's next-step strip.** User decides how to reach out (§2.1, §3.1).
6. **`meeting_date` ≠ `updated_at`.** Cadence and spotlight use the user-set meeting date (§2.5, §3.4).
7. **Header (role/location/birthday) and About section are the same data**, edits sync both ways (§3.3).
8. **Add contact = one page**, with grouped optional fields. Not a wizard (§4.4).
9. **Inline edit everywhere in About section**, no separate edit mode (§3.2).
10. **Property-based contact data model** for future custom fields (§7.1).

## Mockup ↔ Spec reconciliation

Where the mockup HTML and the spec disagree, **the spec wins**:

- The mockup's Add contact is two-stage (seed → progressive disclosure). The **spec's §4.4 one-page form** is final.
- The mockup's Contact detail About section is a flat key-value list. **Spec §3.2 inline-edit + property-based** is final.
- The mockup includes "Open LINE" CTAs in some early renders — already removed; do not re-add.

## Open questions to resolve with Patrick before shipping

See **§10** in the spec.

---

Made April 29, 2026.
