create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_time timestamptz,
  notes text,
  created_at timestamptz default now()
);

alter table meetings add column if not exists meeting_time timestamptz;
alter table meetings add column if not exists notes text;

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  event_time time,
  type text default 'event',
  status text default 'scheduled',
  created_at timestamptz default now()
);

alter table calendar_events add column if not exists event_date date;
alter table calendar_events add column if not exists event_time time;
alter table calendar_events add column if not exists type text default 'event';
alter table calendar_events add column if not exists status text default 'scheduled';

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text default 'active',
  created_at timestamptz default now()
);

alter table projects add column if not exists title text;
alter table projects add column if not exists name text;
alter table projects add column if not exists status text default 'active';

update projects
set title = coalesce(title, name, 'Untitled project')
where title is null;

alter table projects alter column title set not null;

insert into projects (title, status)
select 'ControlHub Nexus AI', 'active'
where not exists (
  select 1 from projects where title = 'ControlHub Nexus AI'
);

alter table meetings disable row level security;
alter table calendar_events disable row level security;
alter table projects disable row level security;
