begin;
create table if not exists public.gratitude_entries(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null,
  entry_date date not null default current_date,
  entry_time time not null default localtime,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.gratitude_media(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gratitude_id uuid not null references public.gratitude_entries(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gratitude_entries enable row level security;
alter table public.gratitude_media enable row level security;
drop policy if exists gratitude_entries_owner on public.gratitude_entries;
create policy gratitude_entries_owner on public.gratitude_entries for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists gratitude_media_owner on public.gratitude_media;
create policy gratitude_media_owner on public.gratitude_media for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
do $$ begin alter publication supabase_realtime add table public.gratitude_entries; exception when duplicate_object then null; end $$;
commit;
