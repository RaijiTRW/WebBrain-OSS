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

create index if not exists webbrain_ai_credit_events_client_created_idx
  on public.webbrain_ai_credit_events (client_id, created_at desc);

create index if not exists webbrain_ai_credit_events_chat_created_idx
  on public.webbrain_ai_credit_events (client_id, chat_id, created_at desc);

alter table public.webbrain_ai_credit_events enable row level security;

grant select, insert, update, delete on public.webbrain_ai_credit_events to service_role;
