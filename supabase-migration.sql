-- ============================================================
-- K2 Inventory — Database Schema v2
-- SHARED WORKSPACE MODEL
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── WORKSPACE ─────────────────────────────────────────────────
-- Single shared inventory. All team members read/write the same data.
create table if not exists workspace (
  id          text primary key,
  state       jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  text not null default ''
);

alter table workspace enable row level security;

create policy "Auth users read workspace" on workspace
  for select using (auth.role() = 'authenticated');

create policy "Auth users update workspace" on workspace
  for update using (auth.role() = 'authenticated');

-- Create the single shared workspace row.
insert into workspace (id, state, updated_by)
values ('k2-main', '{}', 'system')
on conflict (id) do nothing;

revoke all on workspace from anon;
grant all on workspace to service_role;

-- ── ACTIVITY LOG ──────────────────────────────────────────────
-- Shows who did what. Visible to all team members.
create table if not exists activity_log (
  id          bigserial primary key,
  user_email  text not null,
  action      text not null,
  detail      text default '',
  created_at  timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy "Auth users read activity" on activity_log
  for select using (auth.role() = 'authenticated');

revoke all on activity_log from anon;
revoke all on activity_log from authenticated;
grant all on activity_log to service_role;
