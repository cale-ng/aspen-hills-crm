-- V0.5 — Context Library
-- Extend `attachments` into the Context Library: typed artifacts (transcripts,
-- emails, JDs, decks, etc.) with optional extracted text for an AI agent.
--
-- Apply by pasting into the Supabase SQL editor.

alter table public.attachments
  add column if not exists kind            text
    not null default 'other'
    check (kind in ('transcript','email','job_description','deck','document','image','other')),
  add column if not exists tag             text,
  add column if not exists note            text,
  add column if not exists extracted_text  text;

create index if not exists attachments_kind_idx on public.attachments (kind);
