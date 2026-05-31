-- ============================================================
-- Personal CRM Pro — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- CONTACTS table
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  role            text,
  company         text,
  email           text,
  phone           text,
  tags            text[]        default '{}',
  last_contact    date,
  next_follow_up  date,
  strength        float         default 0.5,   -- 0.0 (dormant) to 1.0 (thriving)
  notes           text,
  social          jsonb         default '{}',  -- { linkedin: "username", twitter: "username" }
  birthday        text,                        -- MM-DD format e.g. "05-14"
  location        text,
  relationship    text,                        -- "Friend" | "Colleague" | "Mentor" | "Investor" | "Partner" | "Collaborator"
  cadence         int,                         -- ideal days between touchpoints
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

-- INTERACTIONS table
create table if not exists interactions (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid references contacts(id) on delete cascade,
  date            date not null,
  type            text not null,  -- "coffee" | "call" | "video" | "email" | "meeting" | "event" | "message" | "note"
  note            text,
  created_at      timestamptz default now()
);

-- INDEX for fast interaction lookups by contact
create index if not exists interactions_contact_id_idx on interactions(contact_id);
create index if not exists interactions_date_idx on interactions(date desc);
create index if not exists contacts_next_follow_up_idx on contacts(next_follow_up);
create index if not exists contacts_strength_idx on contacts(strength);

-- ── ROW LEVEL SECURITY ──────────────────────────────────
-- NOTE: These are permissive open policies for prototyping.
-- For production, replace with user-scoped policies using auth.uid().

alter table contacts    enable row level security;
alter table interactions enable row level security;

-- Allow anon read/write (prototype mode)
create policy "anon_all_contacts"
  on contacts for all
  using (true)
  with check (true);

create policy "anon_all_interactions"
  on interactions for all
  using (true)
  with check (true);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

-- ── USEFUL VIEWS ─────────────────────────────────────────

-- View: contacts with their latest interaction date (computed)
create or replace view contacts_with_stats as
select
  c.*,
  (
    select max(i.date)
    from interactions i
    where i.contact_id = c.id
  ) as computed_last_contact,
  (
    select count(*)
    from interactions i
    where i.contact_id = c.id
  ) as interaction_count
from contacts c;

-- ── PRODUCTION RLS TEMPLATE ──────────────────────────────
-- When you add auth, replace the open policies above with:
--
-- create policy "users_own_contacts"
--   on contacts for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
--
-- (Also add a user_id uuid references auth.users(id) column to contacts)

-- ── SAMPLE DATA (optional, for testing) ──────────────────
-- Uncomment to seed with one sample contact:

/*
insert into contacts (name, role, company, email, tags, last_contact, next_follow_up, strength, notes, birthday, relationship, cadence)
values (
  'Sample Contact', 'Product Manager', 'Acme Inc.', 'sample@acme.com',
  array['design', 'mentor'],
  current_date - interval '14 days',
  current_date + interval '7 days',
  0.72,
  'Met at a conference. Great energy.',
  '06-15',
  'Mentor',
  30
);
*/
