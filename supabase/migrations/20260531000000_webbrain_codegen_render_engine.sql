alter table public.webbrain_sites
  add column if not exists render_engine text not null default 'document_json';

alter table public.webbrain_sites
  drop constraint if exists webbrain_sites_render_engine_check;

alter table public.webbrain_sites
  add constraint webbrain_sites_render_engine_check
  check (render_engine in ('document_json', 'codegen'));

alter table public.webbrain_site_pages
  add column if not exists render_engine text not null default 'document_json',
  add column if not exists codegen_entry text not null default 'src/App.tsx',
  add column if not exists codegen_files jsonb not null default '[]'::jsonb,
  add column if not exists codegen_overlay_css text not null default '',
  add column if not exists codegen_element_map jsonb;

alter table public.webbrain_site_pages
  drop constraint if exists webbrain_site_pages_render_engine_check;

alter table public.webbrain_site_pages
  add constraint webbrain_site_pages_render_engine_check
  check (render_engine in ('document_json', 'codegen'));

create index if not exists webbrain_site_pages_render_engine_idx
  on public.webbrain_site_pages (client_id, site_id, render_engine);

