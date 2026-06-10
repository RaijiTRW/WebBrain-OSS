create schema if not exists webbrain_private;

revoke all on schema webbrain_private from public;
revoke all on schema webbrain_private from anon;
revoke all on schema webbrain_private from authenticated;

create table if not exists public.webbrain_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  onboarding_status text not null default 'active' check (onboarding_status in ('active', 'blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webbrain_profiles_email_lower_idx
  on public.webbrain_profiles (lower(email))
  where email is not null;

alter table public.webbrain_profiles enable row level security;

drop policy if exists "Users can read own WebBrain profile" on public.webbrain_profiles;
create policy "Users can read own WebBrain profile"
  on public.webbrain_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own WebBrain profile" on public.webbrain_profiles;
create policy "Users can update own WebBrain profile"
  on public.webbrain_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.webbrain_profiles to authenticated;
grant select, insert, update, delete on public.webbrain_profiles to service_role;

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

drop trigger if exists webbrain_profiles_set_updated_at on public.webbrain_profiles;
create trigger webbrain_profiles_set_updated_at
  before update on public.webbrain_profiles
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

  return new;
end;
$$;

drop trigger if exists webbrain_auth_user_created on auth.users;
create trigger webbrain_auth_user_created
  after insert on auth.users
  for each row
  execute function webbrain_private.handle_new_auth_user();

insert into public.webbrain_profiles (id, email, display_name, avatar_url, metadata)
select
  users.id,
  users.email,
  nullif(coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name'), ''),
  nullif(users.raw_user_meta_data->>'avatar_url', ''),
  jsonb_build_object('provider', coalesce(users.raw_app_meta_data->>'provider', 'email'))
from auth.users
on conflict (id) do nothing;
