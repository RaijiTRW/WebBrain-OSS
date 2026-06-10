import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

export type WebBrainPlatformScope = "app" | "global";
export type WebBrainPlatformMode = "open" | "platform_update" | "problem";

export type WebBrainPlatformState = {
  scope: WebBrainPlatformScope;
  mode: WebBrainPlatformMode;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export function isMissingAdminSchemaError(error: unknown) {
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

export function normalizePlatformMode(value: unknown): WebBrainPlatformMode {
  return value === "platform_update" || value === "problem" ? value : "open";
}

export function normalizePlatformScope(value: unknown): WebBrainPlatformScope {
  return value === "global" ? "global" : "app";
}

function defaultPlatformState(scope: WebBrainPlatformScope): WebBrainPlatformState {
  return {
    scope,
    mode: "open",
    message: "",
    updatedAt: null,
    updatedBy: null,
  };
}

export async function getProfileAdminStatus(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_profiles")
    .select("is_admin")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingAdminSchemaError(error)) return false;
    throw error;
  }

  return data?.is_admin === true;
}

export async function requireAdminRequest(request: NextRequest) {
  const clientId = await validateRequestClientId(request);
  const isAdmin = await getProfileAdminStatus(clientId);

  if (!isAdmin) {
    throw new Error("Недостаточно прав администратора");
  }

  return clientId;
}

export async function getPlatformStates(): Promise<Record<WebBrainPlatformScope, WebBrainPlatformState>> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_platform_state")
    .select("scope,mode,message,updated_at,updated_by")
    .in("scope", ["app", "global"]);

  if (error) {
    if (isMissingAdminSchemaError(error)) {
      return {
        app: defaultPlatformState("app"),
        global: defaultPlatformState("global"),
      };
    }

    throw error;
  }

  const states = {
    app: defaultPlatformState("app"),
    global: defaultPlatformState("global"),
  };

  for (const row of data ?? []) {
    const scope = normalizePlatformScope(row.scope);
    states[scope] = {
      scope,
      mode: normalizePlatformMode(row.mode),
      message: typeof row.message === "string" ? row.message : "",
      updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
      updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    };
  }

  return states;
}

export async function updatePlatformState(input: {
  scope: WebBrainPlatformScope;
  mode: WebBrainPlatformMode;
  message?: string;
  updatedBy: string;
}) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("webbrain_platform_state")
    .upsert({
      scope: input.scope,
      mode: input.mode,
      message: input.message?.trim().slice(0, 500) ?? "",
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    }, { onConflict: "scope" });

  if (error) throw error;

  return getPlatformStates();
}

export function platformModeLabel(mode: WebBrainPlatformMode) {
  if (mode === "platform_update") return "Идет обновление платформы";
  if (mode === "problem") return "Мы решаем проблему";
  return "Работает";
}
