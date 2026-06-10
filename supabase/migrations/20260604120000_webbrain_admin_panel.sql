create table if not exists public.webbrain_platform_state (
  scope text primary key check (scope in ('app', 'global')),
  mode text not null default 'open' check (mode in ('open', 'platform_update', 'problem')),
  message text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.webbrain_platform_state (scope, mode, message)
values
  ('app', 'open', ''),
  ('global', 'open', '')
on conflict (scope) do nothing;

alter table public.webbrain_profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists ban_reason text not null default '',
  add column if not exists access_denied boolean not null default false,
  add column if not exists access_denied_reason text not null default '',
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references auth.users(id) on delete set null;

create index if not exists webbrain_profiles_access_status_idx
  on public.webbrain_profiles (is_banned, access_denied);

alter table public.webbrain_platform_state enable row level security;

grant select on public.webbrain_platform_state to anon, authenticated;
grant select, insert, update, delete on public.webbrain_platform_state to service_role;

drop policy if exists "Anyone can read WebBrain platform state" on public.webbrain_platform_state;
create policy "Anyone can read WebBrain platform state"
  on public.webbrain_platform_state
  for select
  using (true);
