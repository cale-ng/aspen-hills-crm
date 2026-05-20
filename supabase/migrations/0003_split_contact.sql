-- V0.5.1 — Split contact into structured fields.
--
-- The original `contact` column was a single free-text "Name · role · email" string.
-- Adds structured `contact_name`, `email`, `phone` columns so the form can capture
-- them separately and the Aspen Agent can populate them from meeting summaries.
--
-- The legacy `contact` column is kept for now (existing rows preserve their data).
-- It can be dropped in a later migration once data is fully migrated.
--
-- Apply by pasting into the Supabase SQL editor.

alter table public.opportunities
  add column if not exists contact_name text,
  add column if not exists email        text,
  add column if not exists phone        text;
