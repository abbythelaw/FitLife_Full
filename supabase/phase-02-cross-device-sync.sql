create extension if not exists pgcrypto;

create table if not exists public.fitlife_user_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_key text not null,
  state_value jsonb not null default '{}'::jsonb,
  device_id text,
  updated_at timestamptz not null default now(),
  unique(user_id,state_key)
);

alter table public.fitlife_user_state enable row level security;

drop policy if exists "fitlife state select own" on public.fitlife_user_state;
create policy "fitlife state select own" on public.fitlife_user_state
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "fitlife state insert own" on public.fitlife_user_state;
create policy "fitlife state insert own" on public.fitlife_user_state
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "fitlife state update own" on public.fitlife_user_state;
create policy "fitlife state update own" on public.fitlife_user_state
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "fitlife state delete own" on public.fitlife_user_state;
create policy "fitlife state delete own" on public.fitlife_user_state
for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fitlife-media','fitlife-media',false,15728640,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "fitlife media insert own" on storage.objects;
create policy "fitlife media insert own" on storage.objects for insert to authenticated
with check(bucket_id='fitlife-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "fitlife media select own" on storage.objects;
create policy "fitlife media select own" on storage.objects for select to authenticated
using(bucket_id='fitlife-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "fitlife media update own" on storage.objects;
create policy "fitlife media update own" on storage.objects for update to authenticated
using(bucket_id='fitlife-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='fitlife-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "fitlife media delete own" on storage.objects;
create policy "fitlife media delete own" on storage.objects for delete to authenticated
using(bucket_id='fitlife-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

alter publication supabase_realtime add table public.fitlife_user_state;
