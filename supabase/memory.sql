create table if not exists memory (
  id uuid primary key default gen_random_uuid(),
  key text,
  value text,
  type text,
  created_at timestamp default now()
);
