create table if not exists content_ideas (
  id uuid primary key default gen_random_uuid(),
  platform text,
  title text,
  format text,
  status text default 'idea',
  notes text,
  created_at timestamptz default now()
);

alter table content_ideas disable row level security;
