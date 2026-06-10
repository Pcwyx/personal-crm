-- ============================================================
-- Personal CRM — Lock RLS to the single owner (by email claim)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Replaces the broad "any authenticated user" policies with
-- policies scoped to the owner's email, read from the JWT.
-- No user_id column or uid lookup needed (single-user app).
--
-- If your owner email differs, change it in all four places below.
-- ============================================================

-- ── CONTACTS ────────────────────────────────────────────
drop policy if exists "contacts_new_auth" on contacts;
drop policy if exists "contacts_auth"      on contacts;

create policy "contacts_owner" on contacts for all
  using      ((auth.jwt() ->> 'email') = 'patrick.chung2003@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'patrick.chung2003@gmail.com');

-- ── INTERACTIONS ────────────────────────────────────────
drop policy if exists "interactions_auth" on interactions;

create policy "interactions_owner" on interactions for all
  using      ((auth.jwt() ->> 'email') = 'patrick.chung2003@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'patrick.chung2003@gmail.com');

-- ── VERIFY ──────────────────────────────────────────────
-- Run this afterwards to confirm only the owner policies remain:
--   select tablename, policyname, cmd
--   from pg_policies
--   where tablename in ('contacts', 'interactions', 'settings')
--   order by tablename, policyname;
