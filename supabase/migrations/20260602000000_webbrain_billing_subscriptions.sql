create schema if not exists webbrain_private;

revoke all on schema webbrain_private from public;
revoke all on schema webbrain_private from anon;
revoke all on schema webbrain_private from authenticated;

create table if not exists public.webbrain_billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null default 'start' check (plan_key in ('start', 'pro', 'pro-plus', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  billing_provider text not null default 'manual' check (billing_provider in ('manual', 'stripe', 'yookassa', 'cloudpayments', 'other')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create unique index if not exists webbrain_billing_subscriptions_provider_subscription_uidx
  on public.webbrain_billing_subscriptions (billing_provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists webbrain_billing_subscriptions_plan_status_idx
  on public.webbrain_billing_subscriptions (plan_key, status, updated_at desc);

alter table public.webbrain_billing_subscriptions enable row level security;

drop policy if exists "Users can read own WebBrain subscription" on public.webbrain_billing_subscriptions;
create policy "Users can read own WebBrain subscription"
  on public.webbrain_billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = client_id);

grant select on public.webbrain_billing_subscriptions to authenticated;
grant select, insert, update, delete on public.webbrain_billing_subscriptions to service_role;

create or replace function webbrain_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists webbrain_billing_subscriptions_set_updated_at on public.webbrain_billing_subscriptions;
create trigger webbrain_billing_subscriptions_set_updated_at
  before update on public.webbrain_billing_subscriptions
  for each row
  execute function webbrain_private.set_updated_at();

create or replace function webbrain_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.webbrain_profiles (
    id,
    email,
    display_name,
    avatar_url,
    metadata
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    jsonb_build_object('provider', coalesce(new.raw_app_meta_data->>'provider', 'email'))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(webbrain_profiles.display_name, excluded.display_name),
        avatar_url = coalesce(webbrain_profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  insert into public.webbrain_billing_subscriptions (
    client_id,
    plan_key,
    status,
    billing_provider,
    metadata
  )
  values (
    new.id,
    'start',
    'active',
    'manual',
    jsonb_build_object('source', 'auth_user_created')
  )
  on conflict (client_id) do nothing;

  return new;
end;
$$;

drop trigger if exists webbrain_auth_user_created on auth.users;
create trigger webbrain_auth_user_created
  after insert on auth.users
  for each row
  execute function webbrain_private.handle_new_auth_user();

insert into public.webbrain_billing_subscriptions (
  client_id,
  plan_key,
  status,
  billing_provider,
  metadata
)
select
  users.id,
  'start',
  'active',
  'manual',
  jsonb_build_object('source', 'migration_backfill')
from auth.users
on conflict (client_id) do nothing;
