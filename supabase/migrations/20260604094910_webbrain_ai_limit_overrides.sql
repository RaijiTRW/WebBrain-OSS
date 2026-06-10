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

comment on table public.webbrain_ai_limit_overrides is
  'Admin-only limit controls for WebBrain AI usage. Use reset_usage_before to reset usage without deleting credit audit events.';

comment on column public.webbrain_ai_limit_overrides.tier_override is
  'Optional effective tier override. Null keeps the user billing plan tier.';

comment on column public.webbrain_ai_limit_overrides.monthly_credit_limit is
  'Optional monthly credit cap override. Null keeps the tier default or disables the window if the tier has no monthly window.';

comment on column public.webbrain_ai_limit_overrides.weekly_credit_limit is
  'Optional weekly credit cap override. Null keeps the tier default or disables the window if the tier has no weekly window.';

comment on column public.webbrain_ai_limit_overrides.five_hour_credit_limit is
  'Optional rolling 5-hour credit cap override. Null keeps the tier default or disables the window if the tier has no 5-hour window.';

comment on column public.webbrain_ai_limit_overrides.reset_usage_before is
  'Set this to now() to ignore older webbrain_ai_credit_events for limit calculations while keeping audit history.';

create index if not exists webbrain_ai_limit_overrides_enabled_idx
  on public.webbrain_ai_limit_overrides (enabled, updated_at desc);

create index if not exists webbrain_ai_limit_overrides_reset_idx
  on public.webbrain_ai_limit_overrides (reset_usage_before)
  where reset_usage_before is not null;

alter table public.webbrain_ai_limit_overrides enable row level security;

grant select, insert, update, delete on public.webbrain_ai_limit_overrides to service_role;

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
