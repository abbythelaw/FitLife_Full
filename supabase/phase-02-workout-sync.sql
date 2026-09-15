create extension if not exists pgcrypto;

create table if not exists public.live_workout_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_key text not null,
  state_value jsonb,
  is_deleted boolean not null default false,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, state_key)
);

create index if not exists live_workout_state_user_updated_idx
on public.live_workout_state(user_id, updated_at desc);

alter table public.live_workout_state enable row level security;

drop policy if exists "live workout select own" on public.live_workout_state;
create policy "live workout select own"
on public.live_workout_state
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "live workout insert own" on public.live_workout_state;
create policy "live workout insert own"
on public.live_workout_state
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "live workout update own" on public.live_workout_state;
create policy "live workout update own"
on public.live_workout_state
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "live workout delete own" on public.live_workout_state;
create policy "live workout delete own"
on public.live_workout_state
for delete to authenticated
using ((select auth.uid()) = user_id);

do $$
begin
  alter publication supabase_realtime add table public.live_workout_state;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
