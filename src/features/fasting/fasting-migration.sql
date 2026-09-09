
create table if not exists public.fasting_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 client_session_id text not null, started_at timestamptz not null, ended_at timestamptz,
 target_hours numeric not null default 16, status text not null default 'active', payload jsonb not null default '{}'::jsonb,
 device_id text, updated_at timestamptz not null default now(), unique(user_id,client_session_id)
);
alter table public.fasting_sessions enable row level security;
drop policy if exists fasting_select_own on public.fasting_sessions;
create policy fasting_select_own on public.fasting_sessions for select using (auth.uid()=user_id);
drop policy if exists fasting_insert_own on public.fasting_sessions;
create policy fasting_insert_own on public.fasting_sessions for insert with check (auth.uid()=user_id);
drop policy if exists fasting_update_own on public.fasting_sessions;
create policy fasting_update_own on public.fasting_sessions for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists fasting_delete_own on public.fasting_sessions;
create policy fasting_delete_own on public.fasting_sessions for delete using (auth.uid()=user_id);
