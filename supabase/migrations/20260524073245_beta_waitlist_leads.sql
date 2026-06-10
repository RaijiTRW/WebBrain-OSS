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

create unique index if not exists webbrain_beta_leads_email_lower_uidx
  on public.webbrain_beta_leads (lower(email));

create unique index if not exists webbrain_beta_leads_position_uidx
  on public.webbrain_beta_leads (position);

create index if not exists webbrain_beta_leads_status_created_idx
  on public.webbrain_beta_leads (status, created_at desc);

create index if not exists webbrain_beta_leads_telegram_chat_idx
  on public.webbrain_beta_leads (telegram_chat_id)
  where telegram_chat_id is not null;

alter table public.webbrain_beta_leads enable row level security;

revoke all on public.webbrain_beta_leads from anon;
revoke all on public.webbrain_beta_leads from authenticated;

grant select, insert, update, delete on public.webbrain_beta_leads to service_role;
