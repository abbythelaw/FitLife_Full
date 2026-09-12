alter table public.habits add column if not exists icon text default '✓';
alter table public.habits add column if not exists custom_category text;
alter table public.habits add column if not exists graph_type text default 'line';
alter table public.habits add column if not exists graph_period text default '30D';
alter table public.habits add column if not exists show_target boolean default true;
alter table public.habits add column if not exists show_average boolean default true;
alter table public.habits add column if not exists show_heatmap boolean default true;
