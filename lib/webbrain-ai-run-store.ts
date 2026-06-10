import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  WebBrainArtifactStatus,
  WebBrainMessagePayload,
  WebBrainProjectArtifact,
  WebBrainSiteBriefPayload,
  WebBrainSitePlanPayload,
} from "@/lib/webbrain-ai-types";

export type WebBrainAiRun = {
  id: string;
  client_id: string;
  chat_id: string;
  phase: string;
  status: string;
  waiting_for: string | null;
  brief_json: WebBrainSiteBriefPayload | null;
  plan_json: WebBrainSitePlanPayload | null;
  abort_requested: boolean;
  created_at: string;
  updated_at: string;
};

export type WebBrainChatRunSummary = {
  chat_id: string;
  run_id: string;
  phase: string;
  status: string;
  waiting_for: string | null;
  updated_at: string;
};

const WAITING_RUN_TIMEOUT_MS = 5 * 60 * 60 * 1000;
const runColumns = "id,client_id,chat_id,phase,status,waiting_for,brief_json,plan_json,abort_requested,created_at,updated_at";

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

function makeLocalRun(clientId: string, chatId: string): WebBrainAiRun {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    client_id: clientId,
    chat_id: chatId,
    phase: "thinking",
    status: "running",
    waiting_for: null,
    brief_json: null,
    plan_json: null,
    abort_requested: false,
    created_at: now,
    updated_at: now,
  };
}

export async function createAiRun(clientId: string, chatId: string, existingRunId?: string | null) {
  if (existingRunId) {
    return updateAiRun(clientId, existingRunId, {
      status: "running",
      waiting_for: null,
      abort_requested: false,
    });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_ai_runs")
    .insert({
      client_id: clientId,
      chat_id: chatId,
      phase: "thinking",
      status: "running",
      waiting_for: null,
    })
    .select(runColumns)
    .single();

  if (error) {
    if (isMissingSchemaError(error)) return makeLocalRun(clientId, chatId);
    throw error;
  }

  return data as WebBrainAiRun;
}

export async function updateAiRun(
  clientId: string,
  runId: string,
  changes: Partial<Pick<WebBrainAiRun, "phase" | "status" | "waiting_for" | "brief_json" | "plan_json" | "abort_requested">>,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_ai_runs")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("client_id", clientId)
    .select(runColumns)
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        ...makeLocalRun(clientId, ""),
        id: runId,
        ...changes,
      } as WebBrainAiRun;
    }
    throw error;
  }

  return data as WebBrainAiRun;
}

export async function expireStaleWaitingRuns(clientId: string) {
  const supabase = createSupabaseAdmin();
  const cutoff = new Date(Date.now() - WAITING_RUN_TIMEOUT_MS).toISOString();
  const { error } = await supabase
    .from("webbrain_ai_runs")
    .update({
      status: "stopped",
      phase: "expired",
      waiting_for: null,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("status", "waiting")
    .lt("updated_at", cutoff);

  if (error && !isMissingSchemaError(error)) throw error;
}

export async function listLatestAiRunsForChats(clientId: string): Promise<WebBrainChatRunSummary[]> {
  await expireStaleWaitingRuns(clientId);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_ai_runs")
    .select("id,chat_id,phase,status,waiting_for,updated_at")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const latestByChat = new Map<string, WebBrainChatRunSummary>();

  for (const row of data ?? []) {
    const chatId = String(row.chat_id ?? "");
    if (!chatId || latestByChat.has(chatId)) continue;

    latestByChat.set(chatId, {
      chat_id: chatId,
      run_id: String(row.id),
      phase: String(row.phase ?? "thinking"),
      status: String(row.status ?? "running"),
      waiting_for: typeof row.waiting_for === "string" ? row.waiting_for : null,
      updated_at: String(row.updated_at ?? new Date().toISOString()),
    });
  }

  return [...latestByChat.values()];
}

export async function stopLatestAiRun(clientId: string, chatId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_ai_runs")
    .update({
      status: "stopped",
      abort_requested: true,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("chat_id", chatId)
    .in("status", ["running", "waiting"])
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  return data?.[0]?.id ?? null;
}

export async function updateAiRunFromAssistantPayload(clientId: string, runId: string | undefined, payload: WebBrainMessagePayload | null | undefined, status: string) {
  if (!runId) return;

  if (payload?.kind === "site_brief") {
    await updateAiRun(clientId, runId, {
      phase: "brief",
      status: "waiting",
      waiting_for: "brief",
      brief_json: payload,
    });
    return;
  }

  if (payload?.kind === "site_plan") {
    await updateAiRun(clientId, runId, {
      phase: "plan",
      status: "waiting",
      waiting_for: "plan",
      plan_json: payload,
    });
    return;
  }

  if (status === "Готово") {
    await updateAiRun(clientId, runId, {
      phase: "done",
      status: "completed",
      waiting_for: null,
    });
    return;
  }

  if (status === "Ошибка" || status === "Остановлено") {
    await updateAiRun(clientId, runId, {
      phase: status === "Ошибка" ? "error" : "stopped",
      status: status === "Ошибка" ? "error" : "stopped",
      waiting_for: null,
    });
  }
}

export async function saveProjectArtifacts(
  clientId: string,
  projectId: string,
  chatId: string | null,
  artifacts: WebBrainProjectArtifact[],
): Promise<WebBrainProjectArtifact[]> {
  if (!artifacts.length) return [];

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const rows = artifacts.map((artifact) => ({
    client_id: clientId,
    project_id: projectId,
    chat_id: chatId,
    kind: artifact.kind,
    path: artifact.path,
    title: artifact.title,
    content: artifact.content,
    status: artifact.status,
    metadata: artifact.metadata ?? {},
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("webbrain_project_artifacts")
    .insert(rows)
    .select("id,project_id,chat_id,kind,path,title,content,status,metadata,created_at,updated_at");

  if (error) {
    if (isMissingSchemaError(error)) return artifacts;
    throw error;
  }

  return (data ?? []) as WebBrainProjectArtifact[];
}

export async function listProjectArtifacts(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_project_artifacts")
    .select("id,project_id,chat_id,kind,path,title,content,status,metadata,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []) as WebBrainProjectArtifact[];
}

export async function updateProjectArtifactStatus(
  clientId: string,
  artifactId: string,
  status: WebBrainArtifactStatus,
  metadata?: Record<string, unknown> | null,
) {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (metadata) {
    patch.metadata = metadata;
  }

  const { data, error } = await supabase
    .from("webbrain_project_artifacts")
    .update(patch)
    .eq("id", artifactId)
    .eq("client_id", clientId)
    .select("id,project_id,chat_id,kind,path,title,content,status,metadata,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  return data as WebBrainProjectArtifact;
}

export async function getSupabaseConnectionArtifactStatus(clientId: string, projectId: string): Promise<WebBrainArtifactStatus> {
  const readiness = await getSupabaseConnectionReadiness(clientId, projectId);

  return readiness === "ready" ? "prepared" : "needs_connection";
}

export type WebBrainSupabaseConnectionReadiness = "ready" | "needs_project" | "needs_oauth";

export async function getSupabaseConnectionReadiness(
  clientId: string,
  projectId: string,
): Promise<WebBrainSupabaseConnectionReadiness> {
  const supabase = createSupabaseAdmin();
  const { data: projectConnection, error: projectError } = await supabase
    .from("webbrain_supabase_connections")
    .select("status,supabase_project_ref")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (projectError) {
    if (isMissingSchemaError(projectError)) return "needs_oauth";
    throw projectError;
  }

  if (projectConnection?.status === "connected" && projectConnection.supabase_project_ref) return "ready";

  const { data: accountConnection, error: accountError } = await supabase
    .from("webbrain_supabase_connections")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accountError) {
    if (isMissingSchemaError(accountError)) return "needs_oauth";
    throw accountError;
  }

  return accountConnection ? "needs_project" : "needs_oauth";
}
