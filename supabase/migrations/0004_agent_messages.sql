-- V0.6.3 — Persist agent conversations per opportunity.
--
-- Each opportunity has its own running chat with the Aspen Agent.
-- Conversations are logged here so they're recoverable across devices,
-- browsers, sessions, and time. No TTL — agent threads are part of the
-- opportunity record.
--
-- Apply by pasting into the Supabase SQL editor.

create table if not exists public.opportunity_messages (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  attachments     jsonb,  -- AttachmentRef[] for user messages (display metadata)
  created_at      timestamptz not null default now()
);

-- Common query: load all messages for an opportunity in chronological order.
create index if not exists opportunity_messages_opp_created_idx
  on public.opportunity_messages (opportunity_id, created_at asc);

-- Single-tenant for v1.
alter table public.opportunity_messages disable row level security;
