import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

const ACCOUNT_DELETE_DELAY_DAYS = 7;
const ACCOUNT_DELETE_DELAY_MS = ACCOUNT_DELETE_DELAY_DAYS * 24 * 60 * 60 * 1000;

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);
  const resolvedStatus =
    status !== 500
      ? status
      : message.includes("Client id") || message.includes("Требуется вход") || message.includes("Сессия истекла")
        ? 401
        : message.includes("не совпадает")
          ? 403
          : status;

  return NextResponse.json({ error: message }, { status: resolvedStatus });
}

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
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

function normalizeProvider(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getProviders(user: {
  app_metadata?: { provider?: unknown; providers?: unknown };
  identities?: Array<{ provider?: string }> | null;
}) {
  const providers = new Set<string>();

  const primaryProvider = normalizeProvider(user.app_metadata?.provider);
  if (primaryProvider) providers.add(primaryProvider);

  if (Array.isArray(user.app_metadata?.providers)) {
    for (const provider of user.app_metadata.providers) {
      const normalized = normalizeProvider(provider);
      if (normalized) providers.add(normalized);
    }
  }

  for (const identity of user.identities ?? []) {
    const normalized = normalizeProvider(identity.provider);
    if (normalized) providers.add(normalized);
  }

  return [...providers].sort();
}

function buildSecurityPayload(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown };
  identities?: Array<{ provider?: string }> | null;
}) {
  const createdAt = user.created_at ? new Date(user.created_at) : new Date();
  const canDeleteAt = new Date(createdAt.getTime() + ACCOUNT_DELETE_DELAY_MS);
  const now = Date.now();

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      createdAt: createdAt.toISOString(),
      emailConfirmedAt: user.email_confirmed_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      providers: getProviders(user),
      canDeleteAt: canDeleteAt.toISOString(),
      canDeleteNow: now >= canDeleteAt.getTime(),
      deleteDelayDays: ACCOUNT_DELETE_DELAY_DAYS,
    },
  };
}

async function getRequestUser(request: NextRequest) {
  const clientId = await validateRequestClientId(request);
  const token = bearerToken(request);

  if (!token) throw new Error("Требуется вход в аккаунт");

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) throw new Error("Сессия истекла. Войдите снова.");
  if (data.user.id !== clientId) throw new Error("Сессия не совпадает с пользователем");

  return data.user;
}

async function deleteFromTable(table: string, clientId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq("client_id", clientId);

  if (error && !isMissingSchemaError(error)) throw error;
}

async function deleteWebBrainUserData(clientId: string) {
  const tables = [
    "webbrain_billing_subscriptions",
    "webbrain_project_artifacts",
    "webbrain_ai_runs",
    "webbrain_messages",
    "webbrain_site_pages",
    "webbrain_published_sites",
    "webbrain_supabase_connections",
    "webbrain_sites",
    "webbrain_chats",
    "webbrain_projects",
  ];

  for (const table of tables) {
    await deleteFromTable(table, clientId);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);

    return NextResponse.json(buildSecurityPayload(user));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    const payload = buildSecurityPayload(user);

    if (!payload.user.canDeleteNow) {
      return NextResponse.json(
        {
          error: `Аккаунт можно удалить только через ${ACCOUNT_DELETE_DELAY_DAYS} дней после создания.`,
          ...payload,
        },
        { status: 403 },
      );
    }

    await deleteWebBrainUserData(user.id);

    const supabase = createSupabaseAdmin();
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
