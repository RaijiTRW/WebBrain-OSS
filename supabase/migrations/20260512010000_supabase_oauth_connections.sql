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

alter table public.webbrain_project_artifacts
  drop constraint if exists webbrain_project_artifacts_status_check;

alter table public.webbrain_project_artifacts
  add constraint webbrain_project_artifacts_status_check
  check (status in ('prepared', 'needs_connection', 'needs_approval', 'approved', 'applied', 'error'));

create index if not exists webbrain_supabase_connections_project_idx
  on public.webbrain_supabase_connections (client_id, project_id, updated_at desc);

create index if not exists webbrain_supabase_connections_ref_idx
  on public.webbrain_supabase_connections (supabase_project_ref)
  where supabase_project_ref is not null;

alter table public.webbrain_supabase_connections enable row level security;

grant select, insert, update, delete on public.webbrain_supabase_connections to service_role;
