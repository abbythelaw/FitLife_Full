create extension if not exists pgcrypto;

create table if not exists public.fasting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_session_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  target_hours numeric not null default 16,
  status text not null default 'active'
    check (status in ('active','completed','cancelled','ended')),
  payload jsonb not null default '{}'::jsonb,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_session_id)
);

create index if not exists fasting_sessions_user_started_idx
on public.fasting_sessions(user_id, started_at desc);

alter table public.fasting_sessions enable row level security;

drop policy if exists "fasting select own" on public.fasting_sessions;
create policy "fasting select own"
on public.fasting_sessions
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "fasting insert own" on public.fasting_sessions;
create policy "fasting insert own"
on public.fasting_sessions
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fasting update own" on public.fasting_sessions;
create policy "fasting update own"
on public.fasting_sessions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "fasting delete own" on public.fasting_sessions;
create policy "fasting delete own"
on public.fasting_sessions
for delete to authenticated
using ((select auth.uid()) = user_id);

do $$
begin
  alter publication supabase_realtime
  add table public.fasting_sessions;
exception
  when duplicate_object then null;
end $$;
