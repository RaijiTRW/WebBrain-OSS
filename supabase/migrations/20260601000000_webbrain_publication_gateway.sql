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

create index if not exists webbrain_site_usage_site_month_idx
  on public.webbrain_site_usage (published_site_id, month);

alter table public.webbrain_published_sites enable row level security;
alter table public.webbrain_site_usage enable row level security;

grant select, insert, update, delete on public.webbrain_published_sites to service_role;
grant select, insert, update, delete on public.webbrain_site_usage to service_role;
