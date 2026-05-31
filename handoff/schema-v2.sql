-- ============================================================
-- Personal CRM — Schema v2 (Normalized)
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Step 1 of migration: creates contacts_new + interactions
-- ============================================================

-- CONTACTS_NEW table (normalized, replaces contacts)
create table if not exists contacts_new (
  id              uuid primary key,
  name            text not null default '',
  role            text,
  company         text,
  email           text,
  phone           text,
  tags            text[]        default '{}',
  last_contact    date,
  next_follow_up  date,
  follow_up_note  text,
  relationship    text[]        default '{}',   -- Friend|Family|School|Colleague|Network|Mentor|Collaborator
  cadence         int,                           -- ideal days between touchpoints
  notes           text,
  bio             text,
  photo           text,                          -- Supabase Storage public URL
  social          jsonb         default '{}',   -- {linkedin, twitter, instagram}
  birthday        text,                          -- MM-DD format e.g. "05-14"
  location        text,
  important_dates jsonb         default '[]',   -- [{name, date}]
  created_at      timestamptz   default now(),
  updated_at      timestamptz   default now()
);

-- INTERACTIONS table (replaces updates[] in JSONB)
create table if not exists interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references contacts_new(id) on delete cascade,
  date        date not null,
  type        text not null default 'note',     -- coffee|call|video|email|meeting|event|message|note
  note        text,
  created_at  timestamptz default now()
);

-- Indexes
create index if not exists interactions_contact_id_idx on interactions(contact_id);
create index if not exists interactions_date_idx on interactions(date desc);
create index if not exists contacts_new_next_follow_up_idx on contacts_new(next_follow_up);
create index if not exists contacts_new_last_contact_idx on contacts_new(last_contact);

-- RLS (auth required — same policy as current app)
alter table contacts_new    enable row level security;
alter table interactions     enable row level security;

create policy "contacts_new_auth" on contacts_new for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "interactions_auth" on interactions for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger contacts_new_updated_at
  before update on contacts_new
  for each row execute function update_updated_at();
