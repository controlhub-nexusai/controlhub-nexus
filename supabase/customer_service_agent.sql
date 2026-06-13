create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('super_admin', 'admin', 'customer')),
  created_at timestamptz default now()
);

create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'General',
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default 'Customer',
  message text not null,
  ai_response text,
  status text not null default 'resolved' check (status in ('resolved', 'escalated')),
  created_at timestamptz default now()
);

create table if not exists tickets (
  id text primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  assigned_admin uuid references users(id),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  created_at timestamptz default now()
);

create table if not exists analytics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  questions_count integer not null default 0,
  ai_resolved integer not null default 0,
  escalated integer not null default 0,
  created_at timestamptz default now()
);

alter table users disable row level security;
alter table knowledge_base disable row level security;
alter table faq disable row level security;
alter table conversations disable row level security;
alter table tickets disable row level security;
alter table analytics disable row level security;
