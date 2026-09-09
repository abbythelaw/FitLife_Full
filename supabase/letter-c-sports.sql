alter table public.sports_entries add column if not exists client_entry_id text;
alter table public.sports_media add column if not exists crop_scale numeric not null default 1;
create unique index if not exists sports_entries_user_client_unique on public.sports_entries(user_id,client_entry_id) where client_entry_id is not null and deleted_at is null;
