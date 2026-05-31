-- ============================================================
-- Personal CRM — Google Calendar Integration Schema
-- Run in Supabase SQL Editor after schema-v2.sql
-- ============================================================

-- Settings table for storing OAuth tokens and preferences
create table if not exists settings (
  key   text primary key,
  value jsonb not null default '{}'
);

alter table settings enable row level security;

-- Service role only (accessed via SUPABASE_SERVICE_ROLE_KEY from API routes)
create policy "settings_service_only" on settings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Add gcal_followup_event_id to contacts table
alter table contacts
  add column if not exists gcal_followup_event_id text;

-- Add source columns to interactions for deduplication
alter table interactions
  add column if not exists source      text,       -- 'gcal' | null
  add column if not exists source_id   text;       -- google event id

create unique index if not exists interactions_source_id_idx
  on interactions(source_id) where source_id is not null;
