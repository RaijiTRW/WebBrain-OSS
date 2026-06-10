create table if not exists public.webbrain_site_pages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  site_id uuid not null references public.webbrain_sites(id) on delete cascade,
  name text not null,
  slug text not null,
  html text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webbrain_site_pages_site_order_idx
  on public.webbrain_site_pages (client_id, site_id, sort_order asc);

create unique index if not exists webbrain_site_pages_site_slug_idx
  on public.webbrain_site_pages (site_id, slug);

alter table public.webbrain_site_pages enable row level security;

grant select, insert, update, delete on public.webbrain_site_pages to service_role;
