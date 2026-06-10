import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveWebBrainTierId, type WebBrainTierId } from "@/lib/webbrain-ai/credits";
import { getWebBrainPricingPlan } from "@/lib/webbrain-pricing-plans";
import { getSite, listSitePages, updateSite, type WebBrainSite, type WebBrainSitePage } from "@/lib/webbrain-site-store";

export type WebBrainPublishPlanKey = "basic" | "standard" | "business" | "custom";

export type WebBrainPublishedSite = {
  id: string;
  client_id: string;
  project_id: string;
  site_id: string;
  slug: string;
  custom_domain: string | null;
  plan_key: WebBrainPublishPlanKey;
  status: "active" | "suspended" | "draft";
  paid_until: string;
  settings: Record<string, unknown>;
  last_published_at: string;
  created_at: string;
  updated_at: string;
};

export type WebBrainPublicationUsage = {
  visits: number;
  leads: number;
  traffic_bytes: number;
};

export type WebBrainPublicSiteBundle = {
  publication: WebBrainPublishedSite;
  site: WebBrainSite;
  pages: WebBrainSitePage[];
};

const publishedSiteColumns =
  "id,client_id,project_id,site_id,slug,custom_domain,plan_key,status,paid_until,settings,last_published_at,created_at,updated_at";

function isMissingPublishedSitesTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("Could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function slugifyPublication(value: string) {
  const translit: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  const normalized = value
    .toLowerCase()
    .replace(/[ъь]/g, "")
    .replace(/[а-яё]/g, (char) => translit[char] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

  return normalized || "site";
}

async function makeUniquePublicationSlug(site: WebBrainSite, preferredSlug?: string) {
  const supabase = createSupabaseAdmin();
  const base = slugifyPublication(preferredSlug || site.slug || site.name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("webbrain_published_sites")
      .select("id,site_id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.site_id === site.id) return slug;

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function cleanCustomDomain(value: unknown) {
  if (typeof value !== "string") return null;
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  return domain && domain.includes(".") ? domain : null;
}

function planKeyFromTierId(tierId: WebBrainTierId) {
  return tierId === "pro_plus" ? "pro-plus" : tierId;
}

async function getClientPublishingTierId(clientId: string): Promise<WebBrainTierId> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_billing_subscriptions")
    .select("plan_key")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingPublishedSitesTableError(error)) return "start";
    throw error;
  }

  return resolveWebBrainTierId(typeof data?.plan_key === "string" ? data.plan_key : "start");
}

async function getClientPublishingAdminStatus(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_profiles")
    .select("is_admin")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingPublishedSitesTableError(error)) return false;
    throw error;
  }

  return data?.is_admin === true;
}

async function countActivePublications(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("webbrain_published_sites")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "active");

  if (error) throw error;

  return count ?? 0;
}

async function assertClientCanCreatePublication(clientId: string, existingPublication: WebBrainPublishedSite | null) {
  if (existingPublication) return;

  const isAdmin = await getClientPublishingAdminStatus(clientId);
  if (isAdmin) return;

  const [tierId, activePublications] = await Promise.all([
    getClientPublishingTierId(clientId),
    countActivePublications(clientId),
  ]);
  const plan = getWebBrainPricingPlan(planKeyFromTierId(tierId));
  const publicationLimit = Math.max(1, plan.limits.sites);

  if (activePublications >= publicationLimit) {
    throw new Error(`Достигнут лимит публикаций: ${activePublications} / ${publicationLimit}. Существующие публикации можно обновлять, для новой публикации обновите план.`);
  }
}

export function getPublicationOrigin() {
  return (
    process.env.WEBBRAIN_PUBLIC_ORIGIN?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_WEBBRAIN_PUBLIC_ORIGIN?.replace(/\/+$/, "") ||
    process.env.WEBBRAIN_APP_ORIGIN?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export function getPublicationUrl(publication: Pick<WebBrainPublishedSite, "slug" | "custom_domain">) {
  if (publication.custom_domain) return `https://${publication.custom_domain}`;

  const rootDomain = process.env.WEBBRAIN_PUBLIC_ROOT_DOMAIN?.trim();
  if (rootDomain) return `https://${publication.slug}.${rootDomain}`;

  return `${getPublicationOrigin()}/p/${publication.slug}`;
}

function currentUsageMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function getPublicationUsage(publicationId: string): Promise<WebBrainPublicationUsage> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_site_usage")
    .select("visits,leads,traffic_bytes")
    .eq("published_site_id", publicationId)
    .eq("month", currentUsageMonth())
    .maybeSingle();

  if (error) {
    if (isMissingPublishedSitesTableError(error)) {
      return { visits: 0, leads: 0, traffic_bytes: 0 };
    }

    throw error;
  }

  return {
    visits: Math.max(0, Number(data?.visits) || 0),
    leads: Math.max(0, Number(data?.leads) || 0),
    traffic_bytes: Math.max(0, Number(data?.traffic_bytes) || 0),
  };
}

export async function getPublicationForSite(clientId: string, siteId: string) {
  const supabase = createSupabaseAdmin();
  await getSite(clientId, siteId);
  const { data, error } = await supabase
    .from("webbrain_published_sites")
    .select(publishedSiteColumns)
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .maybeSingle();

  if (error) {
    if (isMissingPublishedSitesTableError(error)) return null;
    throw error;
  }

  if (!data) return null;

  const publication = data as WebBrainPublishedSite;

  return {
    publication,
    publicUrl: getPublicationUrl(publication),
    usage: await getPublicationUsage(publication.id),
  };
}

export async function updatePublicationStatus(
  clientId: string,
  siteId: string,
  status: WebBrainPublishedSite["status"],
) {
  if (status !== "active" && status !== "suspended" && status !== "draft") {
    throw new Error("Unknown publication status");
  }

  const supabase = createSupabaseAdmin();
  await getSite(clientId, siteId);
  const { data, error } = await supabase
    .from("webbrain_published_sites")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .select(publishedSiteColumns)
    .single();

  if (error) throw error;

  const publication = data as WebBrainPublishedSite;

  return {
    publication,
    publicUrl: getPublicationUrl(publication),
    usage: await getPublicationUsage(publication.id),
  };
}

export async function publishSite(
  clientId: string,
  siteId: string,
  input: {
    planKey?: WebBrainPublishPlanKey;
    slug?: string;
    settings?: Record<string, unknown>;
  } = {},
) {
  const supabase = createSupabaseAdmin();
  const site = await getSite(clientId, siteId);
  const pages = await listSitePages(clientId, siteId);
  const existing = await supabase
    .from("webbrain_published_sites")
    .select(publishedSiteColumns)
    .eq("site_id", site.id)
    .maybeSingle();

  if (existing.error) throw existing.error;

  const now = new Date();
  const existingPublication = existing.data as WebBrainPublishedSite | null;
  await assertClientCanCreatePublication(clientId, existingPublication);
  const currentPaidUntil = existingPublication?.paid_until ? new Date(existingPublication.paid_until) : null;
  const paidUntil =
    currentPaidUntil && currentPaidUntil.getTime() > now.getTime()
      ? currentPaidUntil.toISOString()
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const requestedSlug = typeof input.slug === "string" && input.slug.trim() ? input.slug : undefined;
  const slug = requestedSlug
    ? await makeUniquePublicationSlug(site, requestedSlug)
    : existingPublication?.slug ?? (await makeUniquePublicationSlug(site));
  const settings = input.settings ?? {};
  const row = {
    client_id: clientId,
    project_id: site.project_id,
    site_id: site.id,
    slug,
    custom_domain: cleanCustomDomain(settings.customDomain),
    plan_key: input.planKey ?? "standard",
    status: "active",
    paid_until: paidUntil,
    settings,
    last_published_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const { data, error } = await supabase
    .from("webbrain_published_sites")
    .upsert(row, { onConflict: "site_id" })
    .select(publishedSiteColumns)
    .single();

  if (error) throw error;

  await updateSite(clientId, site.id, { status: "published" });

  return {
    publication: data as WebBrainPublishedSite,
    pages,
    publicUrl: getPublicationUrl(data as WebBrainPublishedSite),
    usage: await getPublicationUsage((data as WebBrainPublishedSite).id),
  };
}

export async function getPublishedSiteBundle(target: string): Promise<WebBrainPublicSiteBundle | null> {
  const supabase = createSupabaseAdmin();
  const normalizedTarget = target.trim().toLowerCase();
  const query = normalizedTarget.includes(".")
    ? supabase.from("webbrain_published_sites").select(publishedSiteColumns).eq("custom_domain", normalizedTarget).maybeSingle()
    : supabase.from("webbrain_published_sites").select(publishedSiteColumns).eq("slug", normalizedTarget).maybeSingle();
  const { data: publication, error } = await query;

  if (isMissingPublishedSitesTableError(error)) return null;
  if (error) throw error;
  if (!publication) return null;

  const typedPublication = publication as WebBrainPublishedSite;
  const site = await getSite(typedPublication.client_id, typedPublication.site_id);
  const pages = await listSitePages(typedPublication.client_id, typedPublication.site_id);

  return { publication: typedPublication, site, pages };
}

export function publicationIsAvailable(publication: WebBrainPublishedSite) {
  return publication.status === "active" && new Date(publication.paid_until).getTime() > Date.now();
}
