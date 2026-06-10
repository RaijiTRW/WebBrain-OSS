import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_MANAGEMENT_API_URL = "https://api.supabase.com";

type SupabaseConnectionRow = {
  id: string;
  client_id: string;
  project_id: string;
  status: "connected" | "expired" | "error";
  supabase_user_id: string | null;
  supabase_username: string | null;
  supabase_email: string | null;
  organization_slug: string | null;
  organization_name: string | null;
  supabase_project_ref: string | null;
  supabase_project_name: string | null;
  supabase_api_url: string | null;
  access_token_cipher: string;
  refresh_token_cipher: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type SupabaseConnectionUpsertData = Partial<Omit<SupabaseConnectionRow, "id" | "client_id" | "project_id" | "created_at" | "updated_at">>;

export type WebBrainSupabaseConnectionSummary = {
  id: string;
  status: "connected" | "expired" | "error";
  supabaseUserId?: string;
  supabaseUsername?: string;
  supabaseEmail?: string;
  organizationSlug?: string;
  organizationName?: string;
  projectRef?: string;
  projectName?: string;
  apiUrl?: string;
  expiresAt?: string;
  updatedAt: string;
};

export type WebBrainSupabaseConnectionStatus = {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  missingEnv: string[];
  callbackUrl: string;
  connection: WebBrainSupabaseConnectionSummary | null;
};

export type WebBrainSupabaseProjectOption = {
  ref: string;
  name: string;
  organizationSlug?: string;
  organizationId?: string;
  organizationName?: string;
  region?: string;
  status?: string;
  apiUrl: string;
};

export type WebBrainSupabaseOrganizationOption = {
  id?: string;
  slug: string;
  name: string;
};

export type WebBrainSupabaseTableOption = {
  schema: string;
  name: string;
  type: "table" | "partitioned_table";
  columnCount: number;
  rowEstimate: number;
  sizeBytes: number;
  comment?: string;
};

export type WebBrainSupabaseTableColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  comment?: string;
};

export type WebBrainSupabaseTablePreview = {
  schema: string;
  name: string;
  columns: WebBrainSupabaseTableColumn[];
  rows: Record<string, unknown>[];
  rowLimit: number;
};

export type WebBrainSupabaseSqlResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};

type OAuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};

type SupabaseProfile = {
  id?: string;
  gotrue_id?: string;
  username?: string;
  primary_email?: string;
  email?: string;
};

type SupabaseOrganization = {
  id?: string;
  slug?: string;
  name?: string;
};

type SupabaseProject = {
  id?: string;
  ref?: string;
  name?: string;
  region?: string;
  status?: string;
};

type SupabaseProjectListResponse = SupabaseProject[] | {
  projects?: SupabaseProject[];
};

type SupabaseQueryResponse = unknown[] | {
  data?: unknown[];
  result?: unknown[];
  rows?: unknown[];
};

class SupabaseManagementApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseManagementApiError";
    this.status = status;
  }
}

function isSupabaseManagementApiError(error: unknown): error is SupabaseManagementApiError {
  return error instanceof SupabaseManagementApiError;
}

function normalizeSupabaseProjects(value: SupabaseProjectListResponse | unknown): SupabaseProject[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object" && "projects" in value) {
    const projects = (value as { projects?: unknown }).projects;

    return Array.isArray(projects) ? projects : [];
  }

  return [];
}

function normalizeSupabaseQueryRows(value: SupabaseQueryResponse | unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const response = value as { data?: unknown; result?: unknown; rows?: unknown };
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.result)) return response.result;
    if (Array.isArray(response.rows)) return response.rows;
  }

  return [];
}

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function quoteSqlIdentifier(value: string) {
  const identifier = value.trim();

  if (!identifier || identifier.length > 128 || identifier.includes("\0")) {
    throw new Error("Некорректное имя таблицы Supabase.");
  }

  return `"${identifier.replaceAll("\"", "\"\"")}"`;
}

function quoteSqlLiteral(value: string) {
  const literal = value.trim();

  if (!literal || literal.length > 128 || literal.includes("\0")) {
    throw new Error("Некорректное имя таблицы Supabase.");
  }

  return `'${literal.replaceAll("'", "''")}'`;
}

function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

function tokenKey() {
  const secret = process.env.WEBBRAIN_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!secret) {
    throw new Error("WEBBRAIN_TOKEN_ENCRYPTION_KEY or SUPABASE_SECRET_KEY is required for Supabase OAuth storage");
  }

  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");

  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted token format");
  }

  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function toSummary(row: SupabaseConnectionRow): WebBrainSupabaseConnectionSummary {
  return {
    id: row.id,
    status: row.status,
    supabaseUserId: row.supabase_user_id ?? undefined,
    supabaseUsername: row.supabase_username ?? undefined,
    supabaseEmail: row.supabase_email ?? undefined,
    organizationSlug: row.organization_slug ?? undefined,
    organizationName: row.organization_name ?? undefined,
    projectRef: row.supabase_project_ref ?? undefined,
    projectName: row.supabase_project_name ?? undefined,
    apiUrl: row.supabase_api_url ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function getSupabaseOAuthConfig(origin?: string) {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const baseOrigin = process.env.WEBBRAIN_APP_ORIGIN?.trim() || origin || "http://localhost:3000";
  const callbackUrl = process.env.SUPABASE_OAUTH_REDIRECT_URI?.trim() || `${baseOrigin}/api/supabase/oauth/callback`;
  const missingEnv = [
    !clientId ? "SUPABASE_OAUTH_CLIENT_ID" : "",
    !clientSecret ? "SUPABASE_OAUTH_CLIENT_SECRET" : "",
  ].filter(Boolean);

  return {
    clientId,
    clientSecret,
    callbackUrl,
    configured: missingEnv.length === 0,
    missingEnv,
  };
}

export async function getProjectSupabaseConnection(clientId: string, projectId: string) {
  const projectConnection = await getExactProjectSupabaseConnection(clientId, projectId);

  if (projectConnection?.status === "connected") {
    return projectConnection;
  }

  const accountConnection = await getSupabaseAccountConnection(clientId);

  if (!accountConnection) return projectConnection;

  return {
    ...accountConnection,
    project_id: projectId,
    organization_slug: null,
    organization_name: null,
    supabase_project_ref: null,
    supabase_project_name: null,
    supabase_api_url: null,
  } satisfies SupabaseConnectionRow;
}

async function getExactProjectSupabaseConnection(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_supabase_connections")
    .select("*")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  return data as SupabaseConnectionRow | null;
}

async function getSupabaseAccountConnection(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_supabase_connections")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  return data as SupabaseConnectionRow | null;
}

export async function getSupabaseConnectionStatus(clientId: string, projectId: string, origin?: string): Promise<WebBrainSupabaseConnectionStatus> {
  const config = getSupabaseOAuthConfig(origin);

  try {
    const projectConnection = await getExactProjectSupabaseConnection(clientId, projectId);
    const accountConnection = projectConnection?.status === "connected" ? projectConnection : await getSupabaseAccountConnection(clientId);
    const connection = projectConnection ?? (accountConnection
      ? {
          ...accountConnection,
          project_id: projectId,
          organization_slug: null,
          organization_name: null,
          supabase_project_ref: null,
          supabase_project_name: null,
          supabase_api_url: null,
        } satisfies SupabaseConnectionRow
      : null);

    return {
      configured: config.configured,
      connected: Boolean(accountConnection),
      schemaReady: true,
      missingEnv: config.missingEnv,
      callbackUrl: config.callbackUrl,
      connection: connection ? toSummary(connection) : null,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        configured: config.configured,
        connected: false,
        schemaReady: false,
        missingEnv: config.missingEnv,
        callbackUrl: config.callbackUrl,
        connection: null,
      };
    }

    throw error;
  }
}

async function managementFetch<T>(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_MANAGEMENT_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string; error?: string; code?: string };

  if (!response.ok) {
    const details = [data.message, data.error, data.code].filter(Boolean).join(" ");

    throw new SupabaseManagementApiError(details || `Supabase Management API failed: ${response.status}`, response.status);
  }

  return data as T;
}

export function getSupabaseProjectCreationError(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Не удалось создать проект для данных сайта.";

  if (!isSupabaseManagementApiError(error)) {
    if (fallback.toLowerCase().includes("организац")) {
      return {
        status: 400,
        message: fallback,
      };
    }

    return {
      status: 500,
      message: fallback,
    };
  }

  const lowerMessage = error.message.toLowerCase();

  if (error.status === 401) {
    return {
      status: 401,
      message: "Подключение к Supabase устарело. Подключите аккаунт заново и попробуйте еще раз.",
    };
  }

  if (
    error.status === 403 ||
    lowerMessage.includes("scope") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("not authorized") ||
    lowerMessage.includes("unauthorized")
  ) {
    return {
      status: 403,
      message:
        "Supabase не дал WebBrain право создавать проекты. В настройках OAuth-приложения Supabase нужен доступ Projects: Write, после изменения аккаунт надо подключить заново.",
    };
  }

  if (error.status === 402 || lowerMessage.includes("billing") || lowerMessage.includes("payment")) {
    return {
      status: 402,
      message: "Supabase не разрешил создать проект из-за ограничений аккаунта или оплаты. Проверьте аккаунт Supabase или создайте проект вручную и выберите его здесь.",
    };
  }

  if (error.status === 429) {
    return {
      status: 429,
      message: "Supabase временно ограничил количество запросов. Подождите минуту и попробуйте снова.",
    };
  }

  return {
    status: error.status >= 400 && error.status < 500 ? error.status : 502,
    message: fallback,
  };
}

export async function exchangeSupabaseOAuthCode(code: string, codeVerifier: string, origin?: string) {
  const config = getSupabaseOAuthConfig(origin);

  if (!config.configured) {
    throw new Error(`Supabase OAuth is not configured: ${config.missingEnv.join(", ")}`);
  }

  const response = await fetch(`${SUPABASE_MANAGEMENT_API_URL}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.callbackUrl,
      code_verifier: codeVerifier,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OAuthTokens & { message?: string; error?: string };

  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.message || data.error || "Supabase OAuth token exchange failed");
  }

  return data;
}

export async function refreshSupabaseOAuthToken(clientId: string, connection: SupabaseConnectionRow) {
  const config = getSupabaseOAuthConfig();

  if (!config.configured) {
    throw new Error(`Supabase OAuth is not configured: ${config.missingEnv.join(", ")}`);
  }

  const refreshToken = decrypt(connection.refresh_token_cipher);
  const response = await fetch(`${SUPABASE_MANAGEMENT_API_URL}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OAuthTokens & { message?: string; error?: string };

  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.message || data.error || "Supabase OAuth refresh failed");
  }

  const tokenData = createSupabaseTokenData(data, {
    supabase_user_id: connection.supabase_user_id,
    supabase_username: connection.supabase_username,
    supabase_email: connection.supabase_email,
    metadata: connection.metadata,
  });
  const supabase = createSupabaseAdmin();
  const { data: updated, error } = await supabase
    .from("webbrain_supabase_connections")
    .update(tokenData)
    .eq("client_id", clientId)
    .eq("id", connection.id)
    .select("*")
    .single();

  if (error) throw error;

  await syncSupabaseAccountTokens(clientId, updated as SupabaseConnectionRow);

  return updated as SupabaseConnectionRow;
}

async function getValidAccessToken(clientId: string) {
  const connection = await getSupabaseAccountConnection(clientId);

  if (!connection || connection.status !== "connected") {
    throw new Error("Supabase is not connected for this WebBrain account");
  }

  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const shouldRefresh = expiresAt > 0 && expiresAt < Date.now() + 120_000;
  const nextConnection = shouldRefresh ? await refreshSupabaseOAuthToken(clientId, connection) : connection;

  return decrypt(nextConnection.access_token_cipher);
}

function createSupabaseTokenData(tokens: OAuthTokens, connectionData: SupabaseConnectionUpsertData = {}) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + Math.max(tokens.expires_in ?? 3600, 60) * 1000).toISOString();

  return {
    status: "connected",
    supabase_user_id: connectionData.supabase_user_id ?? null,
    supabase_username: connectionData.supabase_username ?? null,
    supabase_email: connectionData.supabase_email ?? null,
    access_token_cipher: encrypt(tokens.access_token),
    refresh_token_cipher: encrypt(tokens.refresh_token),
    expires_at: expiresAt,
    metadata: connectionData.metadata ?? {},
    updated_at: now,
  };
}

async function syncSupabaseAccountTokens(clientId: string, sourceConnection: SupabaseConnectionRow) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("webbrain_supabase_connections")
    .update({
      status: sourceConnection.status,
      supabase_user_id: sourceConnection.supabase_user_id,
      supabase_username: sourceConnection.supabase_username,
      supabase_email: sourceConnection.supabase_email,
      access_token_cipher: sourceConnection.access_token_cipher,
      refresh_token_cipher: sourceConnection.refresh_token_cipher,
      expires_at: sourceConnection.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId);

  if (error) throw error;
}

export async function saveSupabaseConnection(
  clientId: string,
  projectId: string,
  tokens: OAuthTokens,
  connectionData: SupabaseConnectionUpsertData = {},
) {
  const supabase = createSupabaseAdmin();
  const row = {
    client_id: clientId,
    project_id: projectId,
    ...createSupabaseTokenData(tokens, connectionData),
    organization_slug: connectionData.organization_slug ?? null,
    organization_name: connectionData.organization_name ?? null,
    supabase_project_ref: connectionData.supabase_project_ref ?? null,
    supabase_project_name: connectionData.supabase_project_name ?? null,
    supabase_api_url: connectionData.supabase_api_url ?? null,
  };

  const { data, error } = await supabase
    .from("webbrain_supabase_connections")
    .upsert(row, { onConflict: "client_id,project_id" })
    .select("*")
    .single();

  if (error) throw error;

  return data as SupabaseConnectionRow;
}

export async function saveSupabaseOAuthConnection(clientId: string, projectId: string, tokens: OAuthTokens) {
  const profile = await managementFetch<SupabaseProfile>("/v1/profile", tokens.access_token).catch(() => ({} as SupabaseProfile));
  const currentProjectConnection = await getExactProjectSupabaseConnection(clientId, projectId);

  const saved = await saveSupabaseConnection(clientId, projectId, tokens, {
    supabase_user_id: profile.gotrue_id ?? profile.id ?? null,
    supabase_username: profile.username ?? null,
    supabase_email: profile.primary_email ?? profile.email ?? null,
    organization_slug: currentProjectConnection?.organization_slug ?? null,
    organization_name: currentProjectConnection?.organization_name ?? null,
    supabase_project_ref: currentProjectConnection?.supabase_project_ref ?? null,
    supabase_project_name: currentProjectConnection?.supabase_project_name ?? null,
    supabase_api_url: currentProjectConnection?.supabase_api_url ?? null,
    metadata: { ...(currentProjectConnection?.metadata ?? {}), profile },
  });

  await syncSupabaseAccountTokens(clientId, saved);

  return saved;
}

export async function listSupabaseProjects(clientId: string): Promise<WebBrainSupabaseProjectOption[]> {
  const accessToken = await getValidAccessToken(clientId);
  const organizations = await listSupabaseOrganizationsWithToken(accessToken);
  const projects: WebBrainSupabaseProjectOption[] = [];

  for (const organization of organizations) {
    const slug = organization.slug;
    if (!slug) continue;

    const organizationProjectsResponse = await managementFetch<SupabaseProjectListResponse>(
      `/v1/organizations/${encodeURIComponent(slug)}/projects?limit=100`,
      accessToken,
    ).catch(() => []);
    const organizationProjects = normalizeSupabaseProjects(organizationProjectsResponse);

    for (const project of organizationProjects) {
      const ref = project.ref ?? project.id;
      if (!ref) continue;

      projects.push({
        ref,
        name: project.name || ref,
        organizationSlug: slug,
        organizationId: organization.id,
        organizationName: organization.name,
        region: project.region,
        status: project.status,
        apiUrl: `https://${ref}.supabase.co`,
      });
    }
  }

  return projects.sort((a, b) => `${a.organizationSlug}/${a.name}`.localeCompare(`${b.organizationSlug}/${b.name}`));
}

async function listSupabaseOrganizationsWithToken(accessToken: string): Promise<WebBrainSupabaseOrganizationOption[]> {
  const organizations = await managementFetch<SupabaseOrganization[]>("/v1/organizations", accessToken);

  return organizations
    .map((organization) => ({
      id: organization.id,
      slug: organization.slug ?? organization.id ?? "",
      name: organization.name ?? organization.slug ?? organization.id ?? "Supabase organization",
    }))
    .filter((organization) => organization.slug);
}

export async function listSupabaseOrganizations(clientId: string): Promise<WebBrainSupabaseOrganizationOption[]> {
  const accessToken = await getValidAccessToken(clientId);

  const organizations = await listSupabaseOrganizationsWithToken(accessToken).catch(() => []);

  return organizations.length ? organizations : inferOrganizationsFromProjects(accessToken);
}

async function inferOrganizationsFromProjects(accessToken: string): Promise<WebBrainSupabaseOrganizationOption[]> {
  const projectsResponse = await managementFetch<SupabaseProjectListResponse>("/v1/projects", accessToken).catch(() => []);
  const projects = normalizeSupabaseProjects(projectsResponse);
  const organizations = new Map<string, WebBrainSupabaseOrganizationOption>();

  for (const project of projects) {
    const metadata = project as SupabaseProject & {
      organization_id?: string;
      organization_slug?: string;
      organization_name?: string;
    };
    const slug = metadata.organization_slug ?? metadata.organization_id;

    if (!slug) continue;
    organizations.set(slug, {
      id: metadata.organization_id,
      slug,
      name: metadata.organization_name ?? slug,
    });
  }

  return [...organizations.values()];
}

export async function createSupabaseProjectForWebBrain(
  clientId: string,
  projectId: string,
  input: {
    name: string;
    organizationSlug?: string;
    organizationId?: string;
    region?: string;
    dbPass?: string;
  },
) {
  const accessToken = await getValidAccessToken(clientId);
  const organizations = await listSupabaseOrganizationsWithToken(accessToken).catch(() => inferOrganizationsFromProjects(accessToken));
  const organization =
    organizations.find((item) => item.slug === input.organizationSlug || item.id === input.organizationId) ??
    organizations[0];

  if (!organization) {
    throw new Error("В аккаунте Supabase не найдена организация для создания проекта.");
  }

  const name = input.name.trim().slice(0, 48) || "WebBrain site data";
  const customDbPass = input.dbPass?.trim();
  const dbPass = customDbPass || randomBytes(24).toString("base64url");

  if (customDbPass && customDbPass.length < 12) {
    throw new Error("Пароль базы данных должен быть не короче 12 символов.");
  }

  const body = {
    name,
    organization_slug: organization.slug,
    region: input.region || "eu-central-1",
    db_pass: dbPass,
  };
  const createdProject = await managementFetch<SupabaseProject>("/v1/projects", accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const ref = createdProject.ref ?? createdProject.id;

  if (!ref) {
    throw new Error("Supabase создал проект, но не вернул его идентификатор.");
  }

  const project: WebBrainSupabaseProjectOption = {
    ref,
    name: createdProject.name || name,
    organizationSlug: organization.slug,
    organizationId: organization.id,
    organizationName: organization.name,
    region: createdProject.region ?? input.region ?? "eu-central-1",
    status: createdProject.status,
    apiUrl: `https://${ref}.supabase.co`,
  };
  await selectSupabaseProject(clientId, projectId, project);

  return project;
}

export async function selectSupabaseProject(clientId: string, projectId: string, project: WebBrainSupabaseProjectOption) {
  const accountConnection = await getSupabaseAccountConnection(clientId);
  const existingProjectConnection = await getExactProjectSupabaseConnection(clientId, projectId);
  const connection = existingProjectConnection ?? accountConnection;

  if (!connection) {
    throw new Error("Supabase is not connected for this WebBrain account");
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_supabase_connections")
    .upsert({
      client_id: clientId,
      project_id: projectId,
      status: "connected",
      supabase_user_id: connection.supabase_user_id,
      supabase_username: connection.supabase_username,
      supabase_email: connection.supabase_email,
      access_token_cipher: connection.access_token_cipher,
      refresh_token_cipher: connection.refresh_token_cipher,
      expires_at: connection.expires_at,
      organization_slug: project.organizationSlug ?? null,
      organization_name: project.organizationName ?? null,
      supabase_project_ref: project.ref,
      supabase_project_name: project.name,
      supabase_api_url: project.apiUrl,
      metadata: {
        ...(connection.metadata ?? {}),
        selectedProjectSyncedFromConnectionId: connection.id,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id,project_id" })
    .select("*")
    .single();

  if (error) throw error;

  return toSummary(data as SupabaseConnectionRow);
}

async function querySupabaseProjectReadOnly(projectRef: string, accessToken: string, query: string) {
  const body = JSON.stringify({ query });
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  };

  return managementFetch<SupabaseQueryResponse>(`/v1/projects/${encodeURIComponent(projectRef)}/database/query/read-only`, accessToken, init)
    .catch((error) => {
      if (isSupabaseManagementApiError(error) && error.status === 404) {
        return managementFetch<SupabaseQueryResponse>(`/v1/projects/${encodeURIComponent(projectRef)}/database/query`, accessToken, init);
      }

      throw error;
    });
}

async function querySupabaseProject(projectRef: string, accessToken: string, query: string) {
  return managementFetch<SupabaseQueryResponse>(`/v1/projects/${encodeURIComponent(projectRef)}/database/query`, accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
}

function normalizeSqlResultRows(rows: unknown[]) {
  return rows.map<Record<string, unknown>>((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return row as Record<string, unknown>;
    }

    return { value: row };
  });
}

function getSqlResultColumns(rows: Record<string, unknown>[]) {
  const columns = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columns.add(key));
  });

  return Array.from(columns);
}

export async function listSupabaseProjectTables(clientId: string, projectId: string): Promise<WebBrainSupabaseTableOption[]> {
  const connection = await getProjectSupabaseConnection(clientId, projectId);
  const projectRef = connection?.supabase_project_ref;

  if (!connection || connection.status !== "connected" || !projectRef) {
    return [];
  }

  const accessToken = await getValidAccessToken(clientId);
  const rows = normalizeSupabaseQueryRows(await querySupabaseProjectReadOnly(projectRef, accessToken, `
    select
      n.nspname as schema_name,
      c.relname as table_name,
      c.relkind as table_kind,
      count(a.attname)::int as column_count,
      greatest(coalesce(s.n_live_tup, c.reltuples, 0), 0)::bigint as row_estimate,
      pg_total_relation_size(c.oid)::bigint as size_bytes,
      obj_description(c.oid, 'pg_class') as table_comment
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    left join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where c.relkind in ('r', 'p')
      and n.nspname not in ('information_schema', 'pg_catalog', 'pg_toast')
      and n.nspname not like 'pg_%'
    group by n.nspname, c.relname, c.relkind, c.oid, s.n_live_tup, c.reltuples
    order by n.nspname asc, c.relname asc
  `));

  return rows.reduce<WebBrainSupabaseTableOption[]>((tables, row) => {
    const value = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const schema = String(value.schema_name ?? value.schema ?? "").trim();
    const name = String(value.table_name ?? value.name ?? "").trim();

    if (!schema || !name) return tables;

    tables.push({
        schema,
        name,
        type: value.table_kind === "p" ? "partitioned_table" as const : "table" as const,
        columnCount: toNumber(value.column_count),
        rowEstimate: toNumber(value.row_estimate),
        sizeBytes: toNumber(value.size_bytes),
        comment: typeof value.table_comment === "string" && value.table_comment.trim() ? value.table_comment.trim() : undefined,
    });

    return tables;
  }, []);
}

export async function executeSupabaseProjectSql(clientId: string, projectId: string, query: string): Promise<WebBrainSupabaseSqlResult> {
  const sql = query.trim();

  if (!sql) {
    throw new Error("Напишите SQL-запрос перед запуском.");
  }

  if (sql.length > 20000) {
    throw new Error("SQL-запрос слишком большой. Сократите его и попробуйте еще раз.");
  }

  const connection = await getProjectSupabaseConnection(clientId, projectId);
  const projectRef = connection?.supabase_project_ref;

  if (!connection || connection.status !== "connected" || !projectRef) {
    throw new Error("Сначала подключите проект Supabase.");
  }

  const accessToken = await getValidAccessToken(clientId);
  const rows = normalizeSqlResultRows(normalizeSupabaseQueryRows(await querySupabaseProject(projectRef, accessToken, sql)));

  return {
    rows,
    columns: getSqlResultColumns(rows),
    rowCount: rows.length,
  };
}

export async function getSupabaseProjectTablePreview(
  clientId: string,
  projectId: string,
  schema: string,
  table: string
): Promise<WebBrainSupabaseTablePreview> {
  const connection = await getProjectSupabaseConnection(clientId, projectId);
  const projectRef = connection?.supabase_project_ref;

  if (!connection || connection.status !== "connected" || !projectRef) {
    throw new Error("Сначала подключите проект Supabase.");
  }

  const safeSchemaLiteral = quoteSqlLiteral(schema);
  const safeTableLiteral = quoteSqlLiteral(table);
  const safeTableReference = `${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`;
  const accessToken = await getValidAccessToken(clientId);
  const columnRows = normalizeSupabaseQueryRows(await querySupabaseProjectReadOnly(projectRef, accessToken, `
    select
      a.attname as column_name,
      format_type(a.atttypid, a.atttypmod) as data_type,
      not a.attnotnull as is_nullable,
      exists (
        select 1
        from pg_index i
        where i.indrelid = c.oid
          and i.indisprimary
          and a.attnum = any(i.indkey)
      ) as is_primary_key,
      col_description(a.attrelid, a.attnum) as column_comment
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${safeSchemaLiteral}
      and c.relname = ${safeTableLiteral}
      and c.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
    order by a.attnum asc
  `));

  const columns = columnRows.reduce<WebBrainSupabaseTableColumn[]>((items, row) => {
    const value = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const name = String(value.column_name ?? "").trim();

    if (!name) return items;

    items.push({
      name,
      dataType: String(value.data_type ?? "unknown"),
      nullable: value.is_nullable === true || value.is_nullable === "true",
      primaryKey: value.is_primary_key === true || value.is_primary_key === "true",
      comment: typeof value.column_comment === "string" && value.column_comment.trim() ? value.column_comment.trim() : undefined,
    });

    return items;
  }, []);

  if (!columns.length) {
    throw new Error("Таблица не найдена или доступ к ней не выдан.");
  }

  const rowLimit = 50;
  const rowValues = normalizeSupabaseQueryRows(await querySupabaseProjectReadOnly(projectRef, accessToken, `
    select *
    from ${safeTableReference}
    limit ${rowLimit}
  `));

  return {
    schema: schema.trim(),
    name: table.trim(),
    columns,
    rows: rowValues.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object" && !Array.isArray(row))),
    rowLimit,
  };
}

export async function disconnectSupabaseConnection(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("webbrain_supabase_connections")
    .delete()
    .eq("client_id", clientId);

  if (error) throw error;
}

export async function getSupabaseArtifactStatus(clientId: string, projectId: string) {
  const connection = await getProjectSupabaseConnection(clientId, projectId);

  if (!connection || connection.status !== "connected" || !connection.supabase_project_ref) return "needs_connection" as const;

  return "prepared" as const;
}
