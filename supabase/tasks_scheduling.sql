alter table tasks
  add column if not exists due_date date,
  add column if not exists due_time time,
  add column if not exists reminder_minutes integer;

create index if not exists tasks_due_date_idx on tasks (due_date);
