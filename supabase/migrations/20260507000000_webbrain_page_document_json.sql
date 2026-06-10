alter table public.webbrain_site_pages
  add column if not exists document_json jsonb;
