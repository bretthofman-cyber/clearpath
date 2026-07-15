-- Independent Means — Subscriptions table
-- Run this in: Supabase Dashboard → SQL Editor → New Query

create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users not null unique,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'free'
                           check (status in ('free', 'trialing', 'active', 'past_due', 'canceled')),
  trial_started_at       timestamptz,
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Auto-update updated_at on every row change
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function handle_updated_at();

-- Row Level Security
alter table subscriptions enable row level security;

-- Users can read their own row
create policy "Users read own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Users can start their own trial — status must be 'trialing', no other value allowed from client
create policy "Users can start trial" on subscriptions
  for insert with check (auth.uid() = user_id and status = 'trialing');

-- All other writes (active, past_due, canceled) come from Stripe webhook via service_role key,
-- which bypasses RLS — no client-side update/delete policies needed.
