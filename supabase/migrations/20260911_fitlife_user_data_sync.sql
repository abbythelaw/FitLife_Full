
create table if not exists public.fitlife_user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,data_key)
);
alter table public.fitlife_user_data enable row level security;
drop policy if exists "Users read own FitLife data" on public.fitlife_user_data;
create policy "Users read own FitLife data" on public.fitlife_user_data for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users insert own FitLife data" on public.fitlife_user_data;
create policy "Users insert own FitLife data" on public.fitlife_user_data for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "Users update own FitLife data" on public.fitlife_user_data;
create policy "Users update own FitLife data" on public.fitlife_user_data for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users delete own FitLife data" on public.fitlife_user_data;
create policy "Users delete own FitLife data" on public.fitlife_user_data for delete to authenticated using (auth.uid()=user_id);
grant select,insert,update,delete on public.fitlife_user_data to authenticated;
