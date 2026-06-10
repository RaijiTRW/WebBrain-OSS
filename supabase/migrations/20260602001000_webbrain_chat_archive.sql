alter table public.webbrain_chats
  add column if not exists is_archived boolean not null default false;

create index if not exists webbrain_chats_archive_updated_idx
  on public.webbrain_chats (client_id, is_archived, updated_at desc);
