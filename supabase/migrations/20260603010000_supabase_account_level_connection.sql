create index if not exists webbrain_supabase_connections_client_idx
  on public.webbrain_supabase_connections (client_id, status, updated_at desc);

