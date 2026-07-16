-- Phase 4: record which gate triggered each trial
-- Run once in the Supabase SQL editor.
-- Safe to re-run (IF NOT EXISTS).

alter table subscriptions
  add column if not exists trial_started_from_feature text;
