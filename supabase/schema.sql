create extension if not exists pgcrypto;

create schema if not exists webbrain_private;

grant usage on schema webbrain_private to service_role;

create or replace function webbrain_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.webbrain_projects (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  name text not null default 'Новый проект',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_chats (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid references public.webbrain_projects(id) on delete cascade,
  title text not null default 'Новый чат',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.webbrain_chats(id) on delete cascade,
  client_id text not null,
  role text not null check (role in ('assistant', 'user')),
  text text not null,
  status text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webbrain_sites (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid not null references public.webbrain_projects(id) on delete cascade,
  chat_id uuid references public.webbrain_chats(id) on delete set null,
  name text not null default 'Новый сайт',
  slug text not null,
  html text not null,
  css text not null,
  js text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_site_pages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  site_id uuid not null references public.webbrain_sites(id) on delete cascade,
  name text not null,
  slug text not null,
  html text not null,
  document_json jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_ai_runs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  chat_id uuid not null references public.webbrain_chats(id) on delete cascade,
  phase text not null default 'thinking',
  status text not null default 'running',
  waiting_for text,
  brief_json jsonb,
  plan_json jsonb,
  abort_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_ai_credit_events (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid references public.webbrain_projects(id) on delete set null,
  chat_id uuid references public.webbrain_chats(id) on delete set null,
  run_id uuid references public.webbrain_ai_runs(id) on delete set null,
  operation text not null check (operation in ('direct_answer', 'brief_round', 'plan', 'site_generation', 'site_revision', 'component_edit', 'data_change', 'research')),
  credits integer not null default 0 check (credits >= 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  model_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webbrain_ai_limit_overrides (
  client_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  tier_override text check (tier_override in ('start', 'pro', 'pro_plus', 'business')),
  monthly_credit_limit integer check (monthly_credit_limit is null or monthly_credit_limit >= 0),
  weekly_credit_limit integer check (weekly_credit_limit is null or weekly_credit_limit >= 0),
  five_hour_credit_limit integer check (five_hour_credit_limit is null or five_hour_credit_limit >= 0),
  reset_usage_before timestamptz,
  notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_project_artifacts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid not null references public.webbrain_projects(id) on delete cascade,
  chat_id uuid references public.webbrain_chats(id) on delete set null,
  kind text not null check (kind in ('document_json', 'source_file', 'api_route', 'sql_migration', 'env_manifest', 'backend_manifest', 'test_plan')),
  path text not null,
  title text not null,
  content text not null,
  status text not null default 'prepared' check (status in ('prepared', 'needs_connection', 'needs_approval', 'approved', 'applied', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webbrain_supabase_connections (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid not null references public.webbrain_projects(id) on delete cascade,
  status text not null default 'connected' check (status in ('connected', 'expired', 'error')),
  supabase_user_id text,
  supabase_username text,
  supabase_email text,
  organization_slug text,
  organization_name text,
  supabase_project_ref text,
  supabase_project_name text,
  supabase_api_url text,
  access_token_cipher text not null,
  refresh_token_cipher text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, project_id)
);

create table if not exists public.webbrain_published_sites (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid not null references public.webbrain_projects(id) on delete cascade,
  site_id uuid not null references public.webbrain_sites(id) on delete cascade,
  slug text not null,
  custom_domain text,
  plan_key text not null default 'standard' check (plan_key in ('basic', 'standard', 'business', 'custom')),
  status text not null default 'active' check (status in ('active', 'suspended', 'draft')),
  paid_until timestamptz not null default (now() + interval '7 days'),
  settings jsonb not null default '{}'::jsonb,
  last_published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.webbrain_site_usage (
  id uuid primary key default gen_random_uuid(),
  published_site_id uuid not null references public.webbrain_published_sites(id) on delete cascade,
  month text not null,
  visits integer not null default 0,
  leads integer not null default 0,
  traffic_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (published_site_id, month)
);

alter table public.webbrain_projects
  add column if not exists is_pinned boolean not null default false;

alter table public.webbrain_chats
  add column if not exists project_id uuid references public.webbrain_projects(id) on delete cascade;

alter table public.webbrain_chats
  add column if not exists is_archived boolean not null default false;

alter table public.webbrain_sites
  add column if not exists chat_id uuid references public.webbrain_chats(id) on delete set null;

alter table public.webbrain_sites
  add column if not exists status text not null default 'draft' check (status in ('draft', 'published'));

alter table public.webbrain_messages
  add column if not exists payload jsonb;

alter table public.webbrain_project_artifacts
  drop constraint if exists webbrain_project_artifacts_status_check;

alter table public.webbrain_project_artifacts
  add constraint webbrain_project_artifacts_status_check
  check (status in ('prepared', 'needs_connection', 'needs_approval', 'approved', 'applied', 'error'));

create sequence if not exists public.webbrain_beta_lead_position_seq
  as integer
  start with 24
  increment by 1
  minvalue 24
  maxvalue 100;

create table if not exists public.webbrain_beta_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  position integer not null default nextval('public.webbrain_beta_lead_position_seq'::regclass),
  source text,
  page text not null default 'landing-beta',
  status text not null default 'waiting' check (status in ('waiting', 'telegram_started', 'invited', 'cancelled')),
  telegram_start_token text not null unique,
  telegram_chat_id bigint,
  telegram_user_id bigint,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  telegram_started_at timestamptz,
  admin_notified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webbrain_beta_leads_email_format
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint webbrain_beta_leads_position_range
    check (position between 1 and 100)
);

alter sequence public.webbrain_beta_lead_position_seq
  owned by public.webbrain_beta_leads.position;

create index if not exists webbrain_projects_client_pinned_updated_idx
  on public.webbrain_projects (client_id, is_pinned desc, updated_at desc);

create index if not exists webbrain_chats_project_updated_idx
  on public.webbrain_chats (client_id, project_id, updated_at desc);

create index if not exists webbrain_chats_archive_updated_idx
  on public.webbrain_chats (client_id, is_archived, updated_at desc);

create index if not exists webbrain_messages_chat_created_idx
  on public.webbrain_messages (chat_id, created_at asc);

create index if not exists webbrain_sites_project_updated_idx
  on public.webbrain_sites (client_id, project_id, updated_at desc);

create unique index if not exists webbrain_sites_project_slug_idx
  on public.webbrain_sites (project_id, slug);

create unique index if not exists webbrain_sites_chat_unique_idx
  on public.webbrain_sites (chat_id)
  where chat_id is not null;

create index if not exists webbrain_site_pages_site_order_idx
  on public.webbrain_site_pages (client_id, site_id, sort_order asc);

create unique index if not exists webbrain_site_pages_site_slug_idx
  on public.webbrain_site_pages (site_id, slug);

create index if not exists webbrain_ai_runs_chat_updated_idx
  on public.webbrain_ai_runs (client_id, chat_id, updated_at desc);

create index if not exists webbrain_ai_runs_waiting_idx
  on public.webbrain_ai_runs (client_id, chat_id, status, waiting_for);

create index if not exists webbrain_ai_credit_events_client_created_idx
  on public.webbrain_ai_credit_events (client_id, created_at desc);

create index if not exists webbrain_ai_credit_events_chat_created_idx
  on public.webbrain_ai_credit_events (client_id, chat_id, created_at desc);

create index if not exists webbrain_ai_limit_overrides_enabled_idx
  on public.webbrain_ai_limit_overrides (enabled, updated_at desc);

create index if not exists webbrain_ai_limit_overrides_reset_idx
  on public.webbrain_ai_limit_overrides (reset_usage_before)
  where reset_usage_before is not null;

create index if not exists webbrain_project_artifacts_project_updated_idx
  on public.webbrain_project_artifacts (client_id, project_id, updated_at desc);

create index if not exists webbrain_project_artifacts_kind_idx
  on public.webbrain_project_artifacts (client_id, project_id, kind);

create index if not exists webbrain_supabase_connections_project_idx
  on public.webbrain_supabase_connections (client_id, project_id, updated_at desc);

create index if not exists webbrain_supabase_connections_ref_idx
  on public.webbrain_supabase_connections (supabase_project_ref)
  where supabase_project_ref is not null;

create unique index if not exists webbrain_published_sites_site_uidx
  on public.webbrain_published_sites (site_id);

create unique index if not exists webbrain_published_sites_slug_uidx
  on public.webbrain_published_sites (slug);

create unique index if not exists webbrain_published_sites_domain_uidx
  on public.webbrain_published_sites (lower(custom_domain))
  where custom_domain is not null;

create index if not exists webbrain_published_sites_lookup_idx
  on public.webbrain_published_sites (status, paid_until desc);

create index if not exists webbrain_published_sites_client_updated_idx
  on public.webbrain_published_sites (client_id, updated_at desc);

create unique index if not exists webbrain_billing_subscriptions_provider_subscription_uidx
  on public.webbrain_billing_subscriptions (billing_provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists webbrain_billing_subscriptions_plan_status_idx
  on public.webbrain_billing_subscriptions (plan_key, status, updated_at desc);

create index if not exists webbrain_site_usage_site_month_idx
  on public.webbrain_site_usage (published_site_id, month);

create unique index if not exists webbrain_beta_leads_email_lower_uidx
  on public.webbrain_beta_leads (lower(email));

create unique index if not exists webbrain_beta_leads_position_uidx
  on public.webbrain_beta_leads (position);

create index if not exists webbrain_beta_leads_status_created_idx
  on public.webbrain_beta_leads (status, created_at desc);

create index if not exists webbrain_beta_leads_telegram_chat_idx
  on public.webbrain_beta_leads (telegram_chat_id)
  where telegram_chat_id is not null;

alter table public.webbrain_projects enable row level security;
alter table public.webbrain_chats enable row level security;
alter table public.webbrain_messages enable row level security;
alter table public.webbrain_sites enable row level security;
alter table public.webbrain_site_pages enable row level security;
alter table public.webbrain_ai_runs enable row level security;
alter table public.webbrain_ai_credit_events enable row level security;
alter table public.webbrain_ai_limit_overrides enable row level security;
alter table public.webbrain_project_artifacts enable row level security;
alter table public.webbrain_supabase_connections enable row level security;

create index if not exists webbrain_supabase_connections_client_idx
  on public.webbrain_supabase_connections (client_id, status, updated_at desc);

alter table public.webbrain_published_sites enable row level security;
alter table public.webbrain_billing_subscriptions enable row level security;
alter table public.webbrain_site_usage enable row level security;
alter table public.webbrain_beta_leads enable row level security;

drop policy if exists "Users can read own WebBrain subscription" on public.webbrain_billing_subscriptions;
create policy "Users can read own WebBrain subscription"
  on public.webbrain_billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = client_id);

grant usage on schema public to service_role;
revoke all on public.webbrain_beta_leads from anon;
revoke all on public.webbrain_beta_leads from authenticated;
grant select, insert, update, delete on public.webbrain_projects to service_role;
grant select, insert, update, delete on public.webbrain_chats to service_role;
grant select, insert, update, delete on public.webbrain_messages to service_role;
grant select, insert, update, delete on public.webbrain_sites to service_role;
grant select, insert, update, delete on public.webbrain_site_pages to service_role;
grant select, insert, update, delete on public.webbrain_ai_runs to service_role;
grant select, insert, update, delete on public.webbrain_ai_credit_events to service_role;
grant select, insert, update, delete on public.webbrain_ai_limit_overrides to service_role;
grant select, insert, update, delete on public.webbrain_project_artifacts to service_role;
grant select, insert, update, delete on public.webbrain_supabase_connections to service_role;
grant select, insert, update, delete on public.webbrain_published_sites to service_role;
grant select on public.webbrain_billing_subscriptions to authenticated;
grant select, insert, update, delete on public.webbrain_billing_subscriptions to service_role;
grant select, insert, update, delete on public.webbrain_site_usage to service_role;
grant select, insert, update, delete on public.webbrain_beta_leads to service_role;

drop trigger if exists webbrain_ai_limit_overrides_set_updated_at on public.webbrain_ai_limit_overrides;
create trigger webbrain_ai_limit_overrides_set_updated_at
  before update on public.webbrain_ai_limit_overrides
  for each row
  execute function webbrain_private.set_updated_at();

create or replace view public.webbrain_ai_user_limit_status
with (security_invoker = true) as
with tier_defaults as (
  select *
  from (
    values
      ('start'::text, 100000::integer, null::integer, null::integer),
      ('pro'::text, null::integer, 76160::integer, 53312::integer),
      ('pro_plus'::text, null::integer, 228479::integer, 159935::integer),
      ('business'::text, null::integer, 456958::integer, 319871::integer)
  ) as tiers(tier_id, monthly_credit_limit, weekly_credit_limit, five_hour_credit_limit)
),
users_with_limits as (
  select
    users.id as client_id,
    users.email,
    coalesce(profile.is_admin, false) as is_admin,
    subscription.plan_key as billing_plan_key,
    override.enabled as override_enabled,
    override.tier_override,
    case
      when coalesce(profile.is_admin, false) then 'business'
      else coalesce(override.tier_override, replace(coalesce(subscription.plan_key, 'start'), '-', '_'))
    end as effective_tier,
    override.monthly_credit_limit as monthly_credit_limit_override,
    override.weekly_credit_limit as weekly_credit_limit_override,
    override.five_hour_credit_limit as five_hour_credit_limit_override,
    override.reset_usage_before,
    override.notes,
    override.updated_at as override_updated_at
  from auth.users as users
  left join public.webbrain_profiles as profile
    on profile.id = users.id
  left join public.webbrain_billing_subscriptions as subscription
    on subscription.client_id = users.id
  left join public.webbrain_ai_limit_overrides as override
    on override.client_id = users.id and override.enabled = true
),
effective_limits as (
  select
    users_with_limits.*,
    case
      when users_with_limits.is_admin then null
      else coalesce(users_with_limits.monthly_credit_limit_override, tier_defaults.monthly_credit_limit)
    end as monthly_credit_limit,
    case
      when users_with_limits.is_admin then null
      else coalesce(users_with_limits.weekly_credit_limit_override, tier_defaults.weekly_credit_limit)
    end as weekly_credit_limit,
    case
      when users_with_limits.is_admin then null
      else coalesce(users_with_limits.five_hour_credit_limit_override, tier_defaults.five_hour_credit_limit)
    end as five_hour_credit_limit
  from users_with_limits
  left join tier_defaults
    on tier_defaults.tier_id = users_with_limits.effective_tier
)
select
  effective_limits.client_id,
  effective_limits.email,
  effective_limits.is_admin,
  effective_limits.billing_plan_key,
  effective_limits.effective_tier,
  effective_limits.override_enabled,
  effective_limits.tier_override,
  effective_limits.monthly_credit_limit_override,
  effective_limits.weekly_credit_limit_override,
  effective_limits.five_hour_credit_limit_override,
  effective_limits.monthly_credit_limit,
  effective_limits.weekly_credit_limit,
  effective_limits.five_hour_credit_limit,
  coalesce(usage.month_used, 0)::integer as month_used,
  coalesce(usage.week_used, 0)::integer as week_used,
  coalesce(usage.five_hour_used, 0)::integer as five_hour_used,
  case
    when effective_limits.monthly_credit_limit is null then null
    else greatest(0, effective_limits.monthly_credit_limit - coalesce(usage.month_used, 0))::integer
  end as month_remaining,
  case
    when effective_limits.weekly_credit_limit is null then null
    else greatest(0, effective_limits.weekly_credit_limit - coalesce(usage.week_used, 0))::integer
  end as week_remaining,
  case
    when effective_limits.five_hour_credit_limit is null then null
    else greatest(0, effective_limits.five_hour_credit_limit - coalesce(usage.five_hour_used, 0))::integer
  end as five_hour_remaining,
  effective_limits.reset_usage_before,
  effective_limits.notes,
  effective_limits.override_updated_at
from effective_limits
left join lateral (
  select
    sum(event.credits) filter (
      where event.created_at >= greatest(now() - interval '30 days', coalesce(effective_limits.reset_usage_before, '-infinity'::timestamptz))
    ) as month_used,
    sum(event.credits) filter (
      where event.created_at >= greatest(now() - interval '7 days', coalesce(effective_limits.reset_usage_before, '-infinity'::timestamptz))
    ) as week_used,
    sum(event.credits) filter (
      where event.created_at >= greatest(now() - interval '5 hours', coalesce(effective_limits.reset_usage_before, '-infinity'::timestamptz))
    ) as five_hour_used
  from public.webbrain_ai_credit_events as event
  where event.client_id = effective_limits.client_id::text
) as usage on true;

comment on view public.webbrain_ai_user_limit_status is
  'Read-only admin view with effective WebBrain AI limits, overrides, usage and remaining credits per user.';

revoke all on public.webbrain_ai_user_limit_status from anon;
revoke all on public.webbrain_ai_user_limit_status from authenticated;
grant select on public.webbrain_ai_user_limit_status to service_role;

create or replace function webbrain_private.resolve_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = auth, public, webbrain_private
as $$
declare
  v_client_id uuid;
begin
  select users.id
    into v_client_id
  from auth.users as users
  where lower(users.email) = lower(trim(p_email))
  limit 1;

  if v_client_id is null then
    raise exception 'WebBrain user with email "%" was not found', p_email;
  end if;

  return v_client_id;
end;
$$;

create or replace function webbrain_private.set_user_ai_limit_override(
  p_email text,
  p_tier_override text default null,
  p_monthly_credit_limit integer default null,
  p_weekly_credit_limit integer default null,
  p_five_hour_credit_limit integer default null,
  p_reset_usage boolean default false,
  p_notes text default ''
)
returns public.webbrain_ai_limit_overrides
language plpgsql
security definer
set search_path = public, auth, webbrain_private
as $$
declare
  v_client_id uuid;
  v_row public.webbrain_ai_limit_overrides;
begin
  if p_tier_override is not null and p_tier_override not in ('start', 'pro', 'pro_plus', 'business') then
    raise exception 'Invalid tier_override "%". Use start, pro, pro_plus or business.', p_tier_override;
  end if;

  if p_monthly_credit_limit is not null and p_monthly_credit_limit < 0 then
    raise exception 'monthly_credit_limit must be null or >= 0';
  end if;

  if p_weekly_credit_limit is not null and p_weekly_credit_limit < 0 then
    raise exception 'weekly_credit_limit must be null or >= 0';
  end if;

  if p_five_hour_credit_limit is not null and p_five_hour_credit_limit < 0 then
    raise exception 'five_hour_credit_limit must be null or >= 0';
  end if;

  v_client_id := webbrain_private.resolve_user_id_by_email(p_email);

  insert into public.webbrain_ai_limit_overrides (
    client_id,
    enabled,
    tier_override,
    monthly_credit_limit,
    weekly_credit_limit,
    five_hour_credit_limit,
    reset_usage_before,
    notes,
    updated_by
  )
  values (
    v_client_id,
    true,
    p_tier_override,
    p_monthly_credit_limit,
    p_weekly_credit_limit,
    p_five_hour_credit_limit,
    case when p_reset_usage then now() else null end,
    coalesce(p_notes, ''),
    auth.uid()
  )
  on conflict (client_id) do update
    set enabled = true,
        tier_override = excluded.tier_override,
        monthly_credit_limit = excluded.monthly_credit_limit,
        weekly_credit_limit = excluded.weekly_credit_limit,
        five_hour_credit_limit = excluded.five_hour_credit_limit,
        reset_usage_before = case
          when p_reset_usage then excluded.reset_usage_before
          else public.webbrain_ai_limit_overrides.reset_usage_before
        end,
        notes = excluded.notes,
        updated_by = excluded.updated_by
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function webbrain_private.reset_user_ai_limits(
  p_email text,
  p_notes text default 'manual reset'
)
returns public.webbrain_ai_limit_overrides
language plpgsql
security definer
set search_path = public, auth, webbrain_private
as $$
declare
  v_client_id uuid;
  v_row public.webbrain_ai_limit_overrides;
begin
  v_client_id := webbrain_private.resolve_user_id_by_email(p_email);

  insert into public.webbrain_ai_limit_overrides (
    client_id,
    enabled,
    reset_usage_before,
    notes,
    updated_by
  )
  values (
    v_client_id,
    true,
    now(),
    coalesce(p_notes, 'manual reset'),
    auth.uid()
  )
  on conflict (client_id) do update
    set enabled = true,
        reset_usage_before = excluded.reset_usage_before,
        notes = excluded.notes,
        updated_by = excluded.updated_by
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function webbrain_private.clear_user_ai_limit_override(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth, webbrain_private
as $$
declare
  v_client_id uuid;
begin
  v_client_id := webbrain_private.resolve_user_id_by_email(p_email);

  delete from public.webbrain_ai_limit_overrides
  where client_id = v_client_id;
end;
$$;

revoke all on function webbrain_private.resolve_user_id_by_email(text) from public, anon, authenticated;
revoke all on function webbrain_private.set_user_ai_limit_override(text, text, integer, integer, integer, boolean, text) from public, anon, authenticated;
revoke all on function webbrain_private.reset_user_ai_limits(text, text) from public, anon, authenticated;
revoke all on function webbrain_private.clear_user_ai_limit_override(text) from public, anon, authenticated;

grant execute on function webbrain_private.resolve_user_id_by_email(text) to service_role;
grant execute on function webbrain_private.set_user_ai_limit_override(text, text, integer, integer, integer, boolean, text) to service_role;
grant execute on function webbrain_private.reset_user_ai_limits(text, text) to service_role;
grant execute on function webbrain_private.clear_user_ai_limit_override(text) to service_role;
