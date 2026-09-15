-- FitLife Full canonical data foundation. Idempotent and safe for existing data.
begin;
create extension if not exists pgcrypto;

create or replace function public.fitlife_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create or replace function public.fitlife_current_user_id() returns uuid language sql stable as $$ select auth.uid() $$;

create table if not exists public.fitlife_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text, date_of_birth date, timezone text not null default 'Europe/London', locale text not null default 'en-GB',
 measurement_system text not null default 'metric' check (measurement_system in ('metric','imperial')),
 height_unit text not null default 'cm', weight_unit text not null default 'kg', distance_unit text not null default 'km', glucose_unit text not null default 'mg/dL',
 week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6), clock_format text not null default '24h',
 height_cm numeric, activity_level text, primary_goals text[] not null default '{}', target_weight_kg numeric, active_calorie_goal integer,
 health_considerations text, medication_notes text, mobility_notes text, dietary_pattern text, allergies text, fasting_experience text,
 sleep_start time, sleep_end time, meal_schedule text,
 analysis_settings jsonb not null default '{"minimumMatchedDays":7,"minimumObservations":7,"outlierHandling":"flag","incompleteNutrition":"exclude","estimatedValues":"flag","baselineDays":30,"qualityThreshold":"limited"}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.fitlife_data_sources (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 source_type text not null, display_name text not null, external_account_id text, priority integer not null default 100,
 enabled boolean not null default true, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,source_type,external_account_id)
);
create table if not exists public.fitlife_metric_definitions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 slug text not null, name text not null, category text not null default 'Custom', canonical_unit text not null,
 value_type text not null default 'number', settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,slug)
);
create table if not exists public.fitlife_metric_observations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 metric_definition_id uuid not null references public.fitlife_metric_definitions(id), observed_at timestamptz not null,
 value_numeric numeric, value_text text, unit text not null, context text, notes text,
 source_type text not null default 'manual', source_record_id text, import_job_id uuid, metadata jsonb not null default '{}'::jsonb,
 client_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,source_type,source_record_id)
);
create table if not exists public.fitlife_metric_targets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 metric_definition_id uuid not null references public.fitlife_metric_definitions(id), effective_from date not null, target_min numeric, target_max numeric,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,metric_definition_id,effective_from)
);
create table if not exists public.fitlife_nutrition_days (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, record_date date not null,
 calories numeric, protein_g numeric, carbohydrates_g numeric, fat_g numeric, fibre_g numeric, sugar_g numeric, sodium_mg numeric, water_ml numeric,
 completeness text not null default 'complete' check (completeness in ('complete','partial','estimated')), notes text,
 source_type text not null default 'manual', source_file text, source_record_id text, import_job_id uuid, metadata jsonb not null default '{}'::jsonb,
 client_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,record_date,source_type)
);
create table if not exists public.fitlife_nutrition_targets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, effective_from date not null,
 calories numeric, protein_g numeric, carbohydrates_g numeric, fat_g numeric, fibre_g numeric, water_ml numeric,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(user_id,effective_from)
);
create table if not exists public.fitlife_habits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null,
 description text, tracking_type text not null default 'binary', target_value numeric, unit text, schedule jsonb not null default '{}'::jsonb,
 icon text, colour text, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.fitlife_habit_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 habit_id uuid not null references public.fitlife_habits(id), record_date date not null, value numeric, completed boolean not null default false, notes text,
 source_type text not null default 'manual', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,habit_id,record_date)
);
create table if not exists public.fitlife_fasting_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 protocol text, target_hours numeric not null, started_at timestamptz not null, expected_end_at timestamptz, ended_at timestamptz,
 status text not null default 'active' check(status in ('active','completed','cancelled')), notes text, source_type text not null default 'manual',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 check(ended_at is null or ended_at >= started_at)
);
create unique index if not exists fitlife_one_active_fast on public.fitlife_fasting_sessions(user_id) where status='active' and deleted_at is null;
create table if not exists public.fitlife_activities (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 activity_type text not null, title text not null, started_at timestamptz not null, ended_at timestamptz, duration_seconds integer, distance_m numeric,
 calories numeric, average_hr numeric, notes text, source_type text not null default 'manual', source_record_id text, import_job_id uuid,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 unique(user_id,source_type,source_record_id)
);
create table if not exists public.fitlife_activity_media (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, activity_id uuid not null references public.fitlife_activities(id),
 storage_path text not null, featured boolean not null default false, position jsonb not null default '{"x":50,"y":50,"scale":1}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.fitlife_gratitude_entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, occurred_at timestamptz not null,
 gratitude text, reflection text, mood numeric check(mood between 1 and 10), energy numeric check(energy between 1 and 10), stress numeric check(stress between 1 and 10),
 tags text[] not null default '{}', people text[] not null default '{}', places text[] not null default '{}', notes text, source_type text not null default 'manual',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.fitlife_import_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 file_name text not null, file_hash text not null, format text not null, status text not null default 'pending', mapping jsonb not null default '{}'::jsonb,
 result jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), completed_at timestamptz, unique(user_id,file_hash)
);
create table if not exists public.fitlife_audit_log (
 id bigint generated always as identity primary key, user_id uuid not null, table_name text not null, record_id uuid, action text not null,
 changed_at timestamptz not null default now(), old_data jsonb, new_data jsonb
);

create or replace function public.fitlife_audit_row() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.fitlife_audit_log(user_id,table_name,record_id,action,old_data,new_data)
 values(coalesce(new.user_id,old.user_id),tg_table_name,coalesce(new.id,old.id),tg_op,to_jsonb(old),to_jsonb(new));
 return coalesce(new,old);
end $$;

-- Consistent timestamps, audit, RLS, and policies for canonical tables.
do $$ declare t text; begin
 foreach t in array array['fitlife_profiles','fitlife_data_sources','fitlife_metric_definitions','fitlife_metric_observations','fitlife_metric_targets','fitlife_nutrition_days','fitlife_nutrition_targets','fitlife_habits','fitlife_habit_logs','fitlife_fasting_sessions','fitlife_activities','fitlife_activity_media','fitlife_gratitude_entries'] loop
  execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
  execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.fitlife_set_updated_at()',t,t);
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I_owner_all on public.%I',t,t);
  execute format('create policy %I_owner_all on public.%I for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t,t);
 end loop;
 foreach t in array array['fitlife_data_sources','fitlife_metric_definitions','fitlife_metric_observations','fitlife_metric_targets','fitlife_nutrition_days','fitlife_nutrition_targets','fitlife_habits','fitlife_habit_logs','fitlife_fasting_sessions','fitlife_activities','fitlife_activity_media','fitlife_gratitude_entries'] loop
  execute format('drop trigger if exists %I_audit on public.%I',t,t);
  execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.fitlife_audit_row()',t,t);
 end loop;
end $$;
alter table public.fitlife_import_jobs enable row level security;
drop policy if exists fitlife_import_jobs_owner_all on public.fitlife_import_jobs;
create policy fitlife_import_jobs_owner_all on public.fitlife_import_jobs for all using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.fitlife_audit_log enable row level security;
drop policy if exists fitlife_audit_log_owner_read on public.fitlife_audit_log;
create policy fitlife_audit_log_owner_read on public.fitlife_audit_log for select using(user_id=auth.uid());

create index if not exists fitlife_observations_user_time on public.fitlife_metric_observations(user_id,observed_at desc) where deleted_at is null;
create index if not exists fitlife_nutrition_user_date on public.fitlife_nutrition_days(user_id,record_date desc) where deleted_at is null;
create index if not exists fitlife_fasts_user_start on public.fitlife_fasting_sessions(user_id,started_at desc) where deleted_at is null;
create index if not exists fitlife_activities_user_start on public.fitlife_activities(user_id,started_at desc) where deleted_at is null;
create index if not exists fitlife_gratitude_user_time on public.fitlife_gratitude_entries(user_id,occurred_at desc) where deleted_at is null;

-- Realtime publication additions are idempotent.
do $$ declare t text; begin
 foreach t in array array['fitlife_profiles','fitlife_metric_definitions','fitlife_metric_observations','fitlife_nutrition_days','fitlife_nutrition_targets','fitlife_habits','fitlife_habit_logs','fitlife_fasting_sessions','fitlife_activities','fitlife_activity_media','fitlife_gratitude_entries'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
commit;
