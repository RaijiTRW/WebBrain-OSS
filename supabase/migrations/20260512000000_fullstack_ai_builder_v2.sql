alter table public.webbrain_messages
  add column if not exists payload jsonb;

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

create table if not exists public.webbrain_project_artifacts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_id uuid not null references public.webbrain_projects(id) on delete cascade,
  chat_id uuid references public.webbrain_chats(id) on delete set null,
  kind text not null check (kind in ('document_json', 'source_file', 'api_route', 'sql_migration', 'env_manifest', 'backend_manifest', 'test_plan')),
  path text not null,
  title text not null,
  content text not null,
  status text not null default 'prepared' check (status in ('prepared', 'needs_connection', 'approved', 'applied', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webbrain_ai_runs_chat_updated_idx
  on public.webbrain_ai_runs (client_id, chat_id, updated_at desc);

create index if not exists webbrain_ai_runs_waiting_idx
  on public.webbrain_ai_runs (client_id, chat_id, status, waiting_for);

create index if not exists webbrain_project_artifacts_project_updated_idx
  on public.webbrain_project_artifacts (client_id, project_id, updated_at desc);

create index if not exists webbrain_project_artifacts_kind_idx
  on public.webbrain_project_artifacts (client_id, project_id, kind);

alter table public.webbrain_ai_runs enable row level security;
alter table public.webbrain_project_artifacts enable row level security;

grant select, insert, update, delete on public.webbrain_ai_runs to service_role;
grant select, insert, update, delete on public.webbrain_project_artifacts to service_role;
