-- Run in Supabase SQL Editor after you have configured authentication.
create table if not exists public.ipi_reports (
 id uuid primary key,
 title text not null,
 report_date date not null,
 status text not null check(status in ('INITIAL','FINAL')),
 payload jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ipi_title_idx on public.ipi_reports(title);
create index if not exists ipi_created_idx on public.ipi_reports(created_at desc);
alter table public.ipi_reports enable row level security;
-- No public policies: intentionally blocked until user authentication and access policies are configured.
-- Never add a blanket public write policy for internal maintenance records.
