create extension if not exists pgcrypto;
create table if not exists public.analytics_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,record_date date not null,metric_type text not null,x_value numeric,y_value numeric,score numeric,classification text,source_ids jsonb not null default '[]'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,record_date,metric_type));
alter table public.analytics_history enable row level security;
drop policy if exists analytics_history_owner on public.analytics_history;create policy analytics_history_owner on public.analytics_history for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
do $$ begin alter publication supabase_realtime add table public.analytics_history; exception when duplicate_object then null; end $$;
