create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text,
  status text not null default 'new',
  notes text,
  last_contact date,
  created_at timestamptz default now()
);

alter table leads
  alter column status set default 'new';

update leads
set status = lower(status)
where status is not null;

alter table leads
  drop constraint if exists leads_status_check;

alter table leads
  add constraint leads_status_check
  check (status in ('new', 'contacted', 'interested', 'proposal', 'won', 'lost'));

create index if not exists leads_status_idx on leads (status);
create index if not exists leads_last_contact_idx on leads (last_contact);
