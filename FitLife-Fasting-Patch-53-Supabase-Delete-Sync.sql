-- FitLife Fasting deletion and realtime support
alter table public.fasting_sessions add column if not exists client_session_id text;
alter table public.fasting_sessions add column if not exists expected_end_at timestamptz;
alter table public.fasting_sessions add column if not exists protocol text;
alter table public.fasting_sessions add column if not exists actual_hours numeric;
alter table public.fasting_sessions add column if not exists payload jsonb default '{}'::jsonb;
alter table public.fasting_sessions add column if not exists device_id text;
alter table public.fasting_sessions add column if not exists updated_at timestamptz default now();
alter table public.fasting_sessions add column if not exists deleted_at timestamptz;

create unique index if not exists fasting_sessions_user_client_unique
on public.fasting_sessions(user_id,client_session_id)
where client_session_id is not null;

alter table public.fasting_sessions enable row level security;
drop policy if exists "fasting select own" on public.fasting_sessions;
create policy "fasting select own" on public.fasting_sessions for select using(auth.uid()=user_id);
drop policy if exists "fasting insert own" on public.fasting_sessions;
create policy "fasting insert own" on public.fasting_sessions for insert with check(auth.uid()=user_id);
drop policy if exists "fasting update own" on public.fasting_sessions;
create policy "fasting update own" on public.fasting_sessions for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "fasting delete own" on public.fasting_sessions;
create policy "fasting delete own" on public.fasting_sessions for delete using(auth.uid()=user_id);

do $$ begin
  alter publication supabase_realtime add table public.fasting_sessions;
exception when duplicate_object then null;
end $$;
