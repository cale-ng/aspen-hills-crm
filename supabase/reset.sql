-- DROP + recreate. Run this if the schema is in a half-applied state.
-- Safe right now because there's no data yet.

drop table if exists public.attachments cascade;
drop table if exists public.opportunities cascade;

-- Then re-run supabase/schema.sql below.

create extension if not exists "pgcrypto";

create table public.opportunities (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  contact       text,
  website       text,
  industry      text,
  revenue       text,
  current_pain  text,
  scope_notes   text,
  notes         text,
  fit           text not null default 'medium' check (fit in ('high','medium','low')),
  retainer_est  text,
  stage         text not null default 'Qualifying' check (
                  stage in (
                    'Qualifying','Pitching','Proposal Sent',
                    'Negotiating','Closed Won','Closed Lost'
                  )),
  pitch         text,
  pricing       jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index opportunities_stage_idx   on public.opportunities (stage);
create index opportunities_fit_idx     on public.opportunities (fit);
create index opportunities_updated_idx on public.opportunities (updated_at desc);

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

create table public.attachments (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  name            text not null,
  mime_type       text,
  size_bytes      bigint,
  storage_path    text,
  is_reference    boolean not null default false,
  created_at      timestamptz not null default now()
);

create index attachments_opportunity_idx on public.attachments (opportunity_id);

alter table public.opportunities disable row level security;
alter table public.attachments   disable row level security;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;
