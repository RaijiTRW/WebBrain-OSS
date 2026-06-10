import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { starterSiteCss, starterSiteHtml, starterSiteJs, starterSiteName, starterSitePageTemplates } from "@/lib/starter-site";
import {
  createBlankHeroDocument,
  createStarterDocument,
  renderWebBrainDocument,
  type WebBrainDocument
} from "@/lib/webbrain-document";
import { normalizeWebBrainDocumentForAi } from "@/lib/webbrain-document-validator";
import type {
  WebBrainCodegenElementMap,
  WebBrainCodegenFile,
  WebBrainRenderEngine,
} from "@/lib/webbrain-codegen/types";

export type WebBrainSiteStatus = "draft" | "published";

export type WebBrainSite = {
  id: string;
  client_id: string;
  project_id: string;
  chat_id: string | null;
  name: string;
  slug: string;
  html: string;
  css: string;
  js: string;
  status: WebBrainSiteStatus;
  created_at: string;
  updated_at: string;
};

export type WebBrainSitePage = {
  id: string;
  client_id: string;
  site_id: string;
  name: string;
  slug: string;
  html: string;
  document_json: WebBrainDocument | null;
  render_engine?: WebBrainRenderEngine;
  codegen_entry?: string | null;
  codegen_files?: WebBrainCodegenFile[] | null;
  codegen_overlay_css?: string | null;
  codegen_element_map?: WebBrainCodegenElementMap | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WebBrainSiteTemplate = "starter" | "blankHero";

export function normalizeSiteName(value: string | undefined) {
  const name = value?.replace(/\s+/g, " ").trim();

  if (!name) return starterSiteName;
  if (name.length <= 72) return name;

  return name.slice(0, 72);
}

function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "site";
}

function makeVersionedSlug(value: string) {
  return `${makeSlug(value)}-${Date.now().toString(36)}`;
}

const sitePageColumns = "id,client_id,site_id,name,slug,html,sort_order,created_at,updated_at";
const sitePageColumnsWithDocument = "id,client_id,site_id,name,slug,html,document_json,sort_order,created_at,updated_at";
const sitePageColumnsWithCodegen =
  "id,client_id,site_id,name,slug,html,document_json,render_engine,codegen_entry,codegen_files,codegen_overlay_css,codegen_element_map,sort_order,created_at,updated_at";

function isMissingSitePagesTable(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("webbrain_site_pages");
}

function isMissingDocumentJsonColumn(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.code === "PGRST204" || Boolean(error.message?.includes("document_json"));
}

function isMissingCodegenColumn(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.code === "PGRST204" || Boolean(error.message?.includes("render_engine") || error.message?.includes("codegen_"));
}

function withDocumentJsonEngine<T extends Omit<WebBrainSitePage, "document_json"> & { document_json?: WebBrainDocument | null }>(page: T): WebBrainSitePage {
  return {
    ...page,
    document_json: page.document_json ?? null,
    render_engine: page.render_engine === "codegen" ? "codegen" : "document_json",
    codegen_entry: page.codegen_entry ?? null,
    codegen_files: Array.isArray(page.codegen_files) ? page.codegen_files : null,
    codegen_overlay_css: page.codegen_overlay_css ?? null,
    codegen_element_map: page.codegen_element_map ?? null,
  };
}

function getSitePageSeed(template: WebBrainSiteTemplate) {
  if (template === "blankHero") {
    const document = createBlankHeroDocument("home", "Главная");

    return [
      {
        name: "Главная",
        slug: "home",
        html: renderWebBrainDocument(document, "home"),
        document_json: document,
        sort_order: 0
      }
    ];
  }

  return starterSitePageTemplates.map((page) => {
    const document = createStarterDocument(page.slug, page.name);

    return {
      name: page.name,
      slug: page.slug,
      html: renderWebBrainDocument(document, page.slug),
      document_json: document,
      sort_order: page.sort_order
    };
  });
}

function virtualSitePages(site: WebBrainSite, template: WebBrainSiteTemplate = "starter") {
  const now = site.updated_at;

  return getSitePageSeed(template).map((page) => ({
    id: `${site.id}:${page.slug}`,
    client_id: site.client_id,
    site_id: site.id,
    name: page.name,
    slug: page.slug,
    html: page.slug === "home" ? site.html || page.html : page.html,
    document_json: page.document_json,
    render_engine: "document_json" as const,
    codegen_entry: null,
    codegen_files: null,
    codegen_overlay_css: null,
    codegen_element_map: null,
    sort_order: page.sort_order,
    created_at: site.created_at,
    updated_at: now
  })) satisfies WebBrainSitePage[];
}

function normalizeSitePages(pages: WebBrainSitePage[]): WebBrainSitePage[] {
  return pages.map((page): WebBrainSitePage => ({
    ...page,
    render_engine: page.render_engine === "codegen" ? "codegen" : "document_json",
    codegen_entry: page.codegen_entry ?? null,
    codegen_files: Array.isArray(page.codegen_files) ? page.codegen_files : null,
    codegen_overlay_css: page.codegen_overlay_css ?? null,
    codegen_element_map: page.codegen_element_map ?? null,
    document_json: normalizeWebBrainDocumentForAi(page.document_json, {
      slug: page.slug,
      name: page.name,
    }),
    html:
      page.html ||
      renderWebBrainDocument(
        normalizeWebBrainDocumentForAi(page.document_json, {
          slug: page.slug,
          name: page.name,
        }),
        page.slug,
      )
  }));
}

async function selectSitePages(clientId: string, siteId: string) {
  const supabase = createSupabaseAdmin();
  const request = supabase
    .from("webbrain_site_pages")
    .select(sitePageColumnsWithCodegen)
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true });

  const { data, error } = await request;

  if (!error) return (data ?? []) as WebBrainSitePage[];
  if (isMissingCodegenColumn(error)) {
    const fallback = await supabase
      .from("webbrain_site_pages")
      .select(sitePageColumnsWithDocument)
      .eq("client_id", clientId)
      .eq("site_id", siteId)
      .order("sort_order", { ascending: true });

    if (!fallback.error) return ((fallback.data ?? []) as WebBrainSitePage[]).map(withDocumentJsonEngine);
    if (!isMissingDocumentJsonColumn(fallback.error)) throw fallback.error;
  }
  if (isMissingDocumentJsonColumn(error)) {
    const fallback = await supabase
      .from("webbrain_site_pages")
      .select(sitePageColumns)
      .eq("client_id", clientId)
      .eq("site_id", siteId)
      .order("sort_order", { ascending: true });

    if (fallback.error) throw fallback.error;

    return ((fallback.data ?? []) as Omit<WebBrainSitePage, "document_json">[]).map((page) => ({
      ...page,
      document_json: null,
      render_engine: "document_json" as const,
      codegen_entry: null,
      codegen_files: null,
      codegen_overlay_css: null,
      codegen_element_map: null
    }));
  }

  throw error;
}

async function backfillPageDocuments(site: WebBrainSite, pages: WebBrainSitePage[]) {
  const supabase = createSupabaseAdmin();
  const pagesWithoutDocument = pages.filter((page) => !page.document_json);

  await Promise.all(
    pagesWithoutDocument.map(async (page) => {
      const document = normalizeWebBrainDocumentForAi(page.document_json, {
        slug: page.slug,
        name: page.name,
      });
      const html = renderWebBrainDocument(document, page.slug);
      const { error } = await supabase
        .from("webbrain_site_pages")
        .update({
          document_json: document,
          html,
          updated_at: new Date().toISOString()
        })
        .eq("id", page.id)
        .eq("client_id", site.client_id)
        .eq("site_id", site.id);

      if (error && !isMissingDocumentJsonColumn(error)) throw error;
    })
  );
}

async function ensureSitePages(site: WebBrainSite, template: WebBrainSiteTemplate = "starter") {
  const supabase = createSupabaseAdmin();
  let existingPages: WebBrainSitePage[] = [];
  let listError: { code?: string; message?: string } | null = null;

  try {
    existingPages = await selectSitePages(site.client_id, site.id);
  } catch (error) {
    listError = error as { code?: string; message?: string };
  }

  if (listError) {
    if (isMissingSitePagesTable(listError)) return virtualSitePages(site, template);

    throw listError;
  }

  if (existingPages?.length) {
    await backfillPageDocuments(site, existingPages);

    return normalizeSitePages(existingPages);
  }

  const rows = getSitePageSeed(template).map((page) => ({
    client_id: site.client_id,
    site_id: site.id,
    name: page.name,
    slug: page.slug,
    html: page.html,
    document_json: page.document_json,
    sort_order: page.sort_order
  }));

  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .upsert(rows, { onConflict: "site_id,slug" })
    .select(sitePageColumnsWithDocument)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingSitePagesTable(error)) return virtualSitePages(site, template);
    if (isMissingDocumentJsonColumn(error)) {
      const fallbackRows = rows.map((row) => ({
        client_id: row.client_id,
        site_id: row.site_id,
        name: row.name,
        slug: row.slug,
        html: row.html,
        sort_order: row.sort_order
      }));
      const fallback = await supabase
        .from("webbrain_site_pages")
        .upsert(fallbackRows, { onConflict: "site_id,slug" })
        .select(sitePageColumns)
        .order("sort_order", { ascending: true });

      if (fallback.error) throw fallback.error;

      return normalizeSitePages(
        ((fallback.data ?? []) as Omit<WebBrainSitePage, "document_json">[]).map((page) => ({
          ...page,
          document_json: null
        }))
      );
    }

    throw error;
  }

  return normalizeSitePages((data ?? []) as WebBrainSitePage[]);
}

export async function listProjectSites(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_sites")
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as WebBrainSite[];
}

export async function findChatSite(clientId: string, chatId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_sites")
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("chat_id", chatId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as WebBrainSite | null;
}

export async function findProjectSite(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_sites")
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as WebBrainSite | null;
}

export async function createProjectSite(
  clientId: string,
  projectId: string,
  input: {
    name?: string;
    chat_id?: string | null;
    html?: string;
    css?: string;
    js?: string;
    template?: WebBrainSiteTemplate;
  } = {}
) {
  const supabase = createSupabaseAdmin();
  const name = normalizeSiteName(input.name);
  const template = input.template ?? "starter";
  const blankHeroDocument = template === "blankHero" ? createBlankHeroDocument("home", "Главная") : null;

  const { data: project, error: projectError } = await supabase
    .from("webbrain_projects")
    .select("id")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project not found");

  const existingProjectSite = await findProjectSite(clientId, projectId);

  if (existingProjectSite) return existingProjectSite;

  const { data, error } = await supabase
    .from("webbrain_sites")
    .insert({
      client_id: clientId,
      project_id: projectId,
      chat_id: null,
      name,
      slug: makeVersionedSlug(name),
      html: input.html ?? (blankHeroDocument ? renderWebBrainDocument(blankHeroDocument, "home") : starterSiteHtml),
      css: input.css ?? starterSiteCss,
      js: input.js ?? starterSiteJs,
      status: "draft"
    })
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .single();

  if (error) throw error;

  const site = data as WebBrainSite;
  await ensureSitePages(site, template);

  return site;
}

export async function ensureProjectSite(clientId: string, projectId: string) {
  const existingSite = await findProjectSite(clientId, projectId);

  if (existingSite) return existingSite;

  return createProjectSite(clientId, projectId, {
    name: starterSiteName
  });
}

export async function ensureChatSite(clientId: string, projectId: string, chatId: string) {
  void chatId;
  return ensureProjectSite(clientId, projectId);
}

export async function getSite(clientId: string, siteId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_sites")
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .eq("id", siteId)
    .eq("client_id", clientId)
    .single();

  if (error) throw error;

  return data as WebBrainSite;
}

export async function listSitePages(clientId: string, siteId: string) {
  const site = await getSite(clientId, siteId);

  return ensureSitePages(site);
}

export async function createSitePage(clientId: string, siteId: string, input: { name?: string } = {}) {
  const supabase = createSupabaseAdmin();
  const site = await getSite(clientId, siteId);
  const existingPages = await ensureSitePages(site);
  const baseName = normalizeSiteName(input.name || "Новая страница");
  const existingNames = new Set(existingPages.map((page) => page.name));
  const existingSlugs = new Set(existingPages.map((page) => page.slug));
  let name = baseName;
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${baseName} ${suffix}`;
    suffix += 1;
  }

  const baseSlug = makeSlug(name);
  let slug = baseSlug;
  suffix = 2;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const document = createBlankHeroDocument(slug, name);
  const html = renderWebBrainDocument(document, slug);
  const sortOrder = existingPages.reduce((maxOrder, page) => Math.max(maxOrder, page.sort_order), -1) + 1;

  const row = {
    client_id: clientId,
    site_id: site.id,
    name,
    slug,
    html,
    document_json: document,
    sort_order: sortOrder
  };

  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .insert(row)
    .select(sitePageColumnsWithDocument)
    .single();

  if (!error) return normalizeSitePages([data as WebBrainSitePage])[0];

  if (isMissingDocumentJsonColumn(error)) {
    const fallback = await supabase
      .from("webbrain_site_pages")
      .insert({
        client_id: row.client_id,
        site_id: row.site_id,
        name: row.name,
        slug: row.slug,
        html: row.html,
        sort_order: row.sort_order
      })
      .select(sitePageColumns)
      .single();

    if (fallback.error) throw fallback.error;

    return normalizeSitePages([
      {
        ...(fallback.data as Omit<WebBrainSitePage, "document_json">),
        document_json: document
      }
    ])[0];
  }

  throw error;
}

export async function updateSitePageDocument(clientId: string, siteId: string, pageId: string, document: WebBrainDocument) {
  const supabase = createSupabaseAdmin();
  const site = await getSite(clientId, siteId);
  const normalizedDocument = normalizeWebBrainDocumentForAi(document);
  const html = renderWebBrainDocument(normalizedDocument);
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .update({
      document_json: normalizedDocument,
      html,
      updated_at: updatedAt
    })
    .eq("id", pageId)
    .eq("site_id", site.id)
    .eq("client_id", clientId)
    .select(sitePageColumnsWithDocument)
    .single();

  if (!error) return data as WebBrainSitePage;

  if (isMissingDocumentJsonColumn(error)) {
    const fallback = await supabase
      .from("webbrain_site_pages")
      .update({
        html,
        updated_at: updatedAt
      })
      .eq("id", pageId)
      .eq("site_id", site.id)
      .eq("client_id", clientId)
      .select(sitePageColumns)
      .single();

    if (fallback.error) throw fallback.error;

    return {
      ...(fallback.data as Omit<WebBrainSitePage, "document_json">),
      document_json: normalizedDocument
    };
  }

  throw error;
}

export async function deleteSitePage(clientId: string, siteId: string, pageId: string) {
  const supabase = createSupabaseAdmin();
  const site = await getSite(clientId, siteId);
  const pages = await ensureSitePages(site);

  if (pages.length <= 1) {
    throw new Error("Нельзя удалить последнюю страницу сайта.");
  }

  const page = pages.find((item) => item.id === pageId);

  if (!page) {
    throw new Error("Страница не найдена.");
  }

  const { error } = await supabase
    .from("webbrain_site_pages")
    .delete()
    .eq("id", pageId)
    .eq("site_id", site.id)
    .eq("client_id", clientId);

  if (error) throw error;

  return pages.filter((item) => item.id !== pageId);
}

export async function updateSite(
  clientId: string,
  siteId: string,
  changes: {
    name?: string;
    html?: string;
    css?: string;
    js?: string;
    status?: WebBrainSiteStatus;
  }
) {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, string> = {
    updated_at: new Date().toISOString()
  };

  if (changes.name !== undefined) {
    patch.name = normalizeSiteName(changes.name);
  }

  if (changes.html !== undefined) {
    patch.html = changes.html;
  }

  if (changes.css !== undefined) {
    patch.css = changes.css;
  }

  if (changes.js !== undefined) {
    patch.js = changes.js;
  }

  if (changes.status !== undefined) {
    patch.status = changes.status;
  }

  const { data, error } = await supabase
    .from("webbrain_sites")
    .update(patch)
    .eq("id", siteId)
    .eq("client_id", clientId)
    .select("id,client_id,project_id,chat_id,name,slug,html,css,js,status,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as WebBrainSite;
}

export async function deleteSite(clientId: string, siteId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("webbrain_sites").delete().eq("id", siteId).eq("client_id", clientId);

  if (error) throw error;
}
