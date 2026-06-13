create extension if not exists vector;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  company text,
  email text,
  phone text,
  status text default 'prospect',
  last_contact date,
  follow_up_date date,
  summary text,
  created_at timestamptz default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  date date default current_date,
  summary text,
  action_items jsonb default '[]'::jsonb,
  participants jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  status text default 'active',
  deadline date,
  summary text,
  created_at timestamptz default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  memory_type text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

alter table clients disable row level security;
alter table meetings disable row level security;
alter table projects disable row level security;
alter table memories disable row level security;
