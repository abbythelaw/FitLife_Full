create extension if not exists pgcrypto;
create table if not exists public.analytics_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  metric_type text not null,
  x_value numeric,
  y_value numeric,
  score numeric,
  classification text,
  source_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, record_date, metric_type)
);
alter table public.analytics_history enable row level security;
drop policy if exists "analytics history select own" on public.analytics_history;
create policy "analytics history select own" on public.analytics_history for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "analytics history insert own" on public.analytics_history;
create policy "analytics history insert own" on public.analytics_history for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "analytics history update own" on public.analytics_history;
create policy "analytics history update own" on public.analytics_history for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "analytics history delete own" on public.analytics_history;
create policy "analytics history delete own" on public.analytics_history for delete to authenticated using ((select auth.uid())=user_id);
do $$ begin alter publication supabase_realtime add table public.analytics_history; exception when duplicate_object then null; end $$;
notify pgrst, 'reload schema';
