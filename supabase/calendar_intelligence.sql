create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  participants jsonb default '[]'::jsonb,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  date date not null,
  summary text not null,
  priority_tasks jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  opportunities jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists calendar_events_start_time_idx
on calendar_events (start_time);

create index if not exists daily_briefings_date_idx
on daily_briefings (date);

alter table calendar_events disable row level security;
alter table daily_briefings disable row level security;
