create table if not exists nexus_profile (
  id uuid primary key default gen_random_uuid(),
  profile_key text unique not null,
  profile_value text,
  created_at timestamptz default now()
);

alter table nexus_profile disable row level security;

insert into nexus_profile (profile_key, profile_value)
values
  ('brand_name', 'ControlHub Nexus AI'),
  ('focus_area', 'AI Automation'),
  ('target_audience', 'Solo Founder, Content Creator, Customer Support Worker'),
  ('content_style', 'Educational, Practical, Behind The Scenes'),
  ('goal', 'Build AI branding and reduce repetitive work'),
  ('platforms', 'Instagram, X, YouTube, WhatsApp')
on conflict (profile_key) do update
set profile_value = excluded.profile_value;
