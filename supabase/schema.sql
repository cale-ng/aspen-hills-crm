-- Aspen Hills CRM — Supabase schema
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query)

create extension if not exists "pgcrypto";

-- =============================================================
-- opportunities
-- =============================================================
create table if not exists public.opportunities (
  id            uuid primary key default gen_random_uuid(),

  -- Identity
  company       text not null,
  contact       text,
  website       text,
  industry      text,
  revenue       text,

  -- Qualification
  current_pain  text,
  scope_notes   text,
  notes         text,
  fit           text not null default 'medium' check (fit in ('high','medium','low')),
  retainer_est  text,

  -- Pipeline
  stage         text not null default 'Qualifying' check (
                  stage in (
                    'Qualifying','Pitching','Proposal Sent',
                    'Negotiating','Closed Won','Closed Lost'
                  )),

  -- AI-generated
  pitch         text,
  pricing       jsonb,

  -- Timestamps
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists opportunities_stage_idx on public.opportunities (stage);
create index if not exists opportunities_fit_idx   on public.opportunities (fit);
create index if not exists opportunities_updated_idx on public.opportunities (updated_at desc);

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists opportunities_set_updated_at on public.opportunities;
create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

-- =============================================================
-- attachments
-- =============================================================
create table if not exists public.attachments (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  name            text not null,
  mime_type       text,
  size_bytes      bigint,
  storage_path    text,            -- path inside the Supabase storage bucket
  is_reference    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists attachments_opportunity_idx
  on public.attachments (opportunity_id);

-- =============================================================
-- Row Level Security
-- v1 is single-tenant (no auth yet). We disable RLS so the service
-- role and anon key both work. When we add auth, switch to RLS
-- policies tied to auth.uid().
-- =============================================================
alter table public.opportunities disable row level security;
alter table public.attachments   disable row level security;

-- =============================================================
-- Storage bucket for file attachments
-- =============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;
