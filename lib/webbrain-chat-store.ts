import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ApiHttpError } from "@/lib/api-error";
import type { NextRequest } from "next/server";
import {
  runWebBrainAiTurn,
  type WebBrainAiAssistantMessage,
  type WebBrainAiTurnResult,
} from "@/lib/webbrain-ai/orchestrator";
import {
  createAiRun,
  updateAiRun,
  updateAiRunFromAssistantPayload,
} from "@/lib/webbrain-ai-run-store";
import {
  getTierConfig,
  resolveWebBrainTierId,
  type WebBrainCreditOperation,
  type WebBrainTierConfig,
  type WebBrainTierId,
} from "@/lib/webbrain-ai/credits";
import { getWebBrainPricingPlan } from "@/lib/webbrain-pricing-plans";
import type { TokenMeterTotals } from "@/lib/webbrain-ai/pricing";
import type { WebBrainAttachmentContext } from "@/lib/webbrain-ai/attachment-context";
import type { WebBrainMessagePayload } from "@/lib/webbrain-ai-types";
import type { WebBrainSite, WebBrainSitePage } from "@/lib/webbrain-site-store";

export type WebBrainProject = {
  id: string;
  name: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type WebBrainChat = {
  id: string;
  project_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type WebBrainArchivedChat = WebBrainChat & {
  project_name: string;
};

export type WebBrainMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  status: string | null;
  payload: WebBrainMessagePayload | null;
  created_at: string;
};

const CHAT_TITLE_MAX_LENGTH = 36;
const PROJECT_NAME_MAX_LENGTH = 44;
const GENERIC_PROJECT_NAMES = new Set(["webbrain", "новый проект", "без проекта"]);

type ClientLimitOverride = {
  tierOverride: WebBrainTierId | null;
  monthlyCreditLimit: number | null;
  weeklyCreditLimit: number | null;
  fiveHourCreditLimit: number | null;
  resetUsageBefore: Date | null;
};

export const seedAssistantMessage = {
  role: "assistant" as const,
  text: "Опишите бизнес, стиль и цель страницы. Я соберу структуру сайта, первый экран, блоки и подготовлю черновик для визуального редактора.",
  status: "Готов к сборке сайта"
};

export function validateClientId(value: string | null) {
  const clientId = value?.trim();

  if (!clientId || clientId.length < 12 || clientId.length > 96) {
    throw new ApiHttpError("Требуется вход в аккаунт", 401);
  }

  return clientId;
}

export async function validateRequestClientId(request: NextRequest) {
  const clientId = validateClientId(request.headers.get("x-webbrain-client-id"));
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!token) {
    throw new ApiHttpError("Требуется вход в аккаунт", 401);
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiHttpError("Сессия истекла. Войдите снова.", 401);
  }

  if (data.user.id !== clientId) {
    throw new ApiHttpError("Сессия не совпадает с пользователем", 403);
  }

  const { data: profile, error: profileError } = await supabase
    .from("webbrain_profiles")
    .select("is_banned,ban_reason,access_denied,access_denied_reason")
    .eq("id", clientId)
    .maybeSingle();

  if (profileError) {
    if (!isMissingSchemaError(profileError)) throw profileError;
  } else if (profile?.is_banned === true || profile?.access_denied === true) {
    const reason = profile.is_banned === true ? profile.ban_reason : profile.access_denied_reason;
    throw new ApiHttpError(reason ? `Доступ запрещен: ${reason}` : "Доступ к WebBrain запрещен", 403);
  }

  return data.user.id;
}

export function makeChatTitle(text: string) {
  const clean = makeHumanWorkTitle(text);

  if (!clean) return "Новый чат";

  return limitChatTitle(clean);
}

export function makeProjectNameFromPrompt(text: string) {
  const title = makeHumanWorkTitle(text);

  return normalizeName(title || "Проект сайта", "Проект сайта");
}

function makeHumanWorkTitle(text: string) {
  const clean = text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[<>`*_#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "";

  const lower = clean.toLocaleLowerCase("ru-RU");
  const domainTitle = inferDomainTitle(lower);
  if (domainTitle) return domainTitle;

  const firstSentence = clean.split(/[.!?\n]/)[0] ?? clean;
  const stripped = firstSentence
    .replace(/^(пожалуйста|плиз|срочно|короче|так|слушай|смотри)[,\s]+/i, "")
    .replace(/^(создай|сделай|собери|сгенерируй|разработай|нужно|надо|хочу|давай)\s+/i, "")
    .replace(/^(мне|нам)\s+/i, "")
    .replace(/^(сайт|лендинг|страницу|проект)\s+(для|под|про)?\s*/i, "")
    .replace(/^(для|под|про)\s+/i, "")
    .trim();
  const words = stripped.split(/\s+/).filter(Boolean).slice(0, 5);
  const title = words.join(" ").replace(/[:,;]+$/g, "").trim();

  if (!title) return "";

  return title.charAt(0).toLocaleUpperCase("ru-RU") + title.slice(1);
}

function inferDomainTitle(lower: string) {
  const namedMatch = lower.match(/(?:для|под|про)\s+([a-zа-яё0-9][a-zа-яё0-9\s-]{2,42})/i);
  const named = namedMatch?.[1]?.replace(/[.,;:!?].*$/, "").trim();

  if (/(кофе|кофейн|coffee|cafe|кафе)/i.test(lower)) return named ? titleCaseCompact(named, "Кофейня") : "Сайт кофейни";
  if (/(ресторан|столик|брон|бар\b)/i.test(lower)) return named ? titleCaseCompact(named, "Ресторан") : "Бронь столиков";
  if (/(отел|гостиниц|номер|hotel)/i.test(lower)) return named ? titleCaseCompact(named, "Отель") : "Сайт отеля";
  if (/(салон|красот|маникюр|barber|барбершоп)/i.test(lower)) return named ? titleCaseCompact(named, "Салон") : "Сайт салона";
  if (/(услуг|заявк|форма|лид)/i.test(lower)) return named ? titleCaseCompact(named, "Услуги") : "Сайт услуг";
  if (/(магазин|каталог|товар|e-?commerce|заказ)/i.test(lower)) return named ? titleCaseCompact(named, "Магазин") : "Интернет-магазин";

  return "";
}

function titleCaseCompact(value: string, fallback: string) {
  const clean = value
    .replace(/^(сайт|лендинг|страниц[ау]|проект)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return fallback;

  const words = clean.split(/\s+/).slice(0, 4);
  const title = words.join(" ");

  return title.charAt(0).toLocaleUpperCase("ru-RU") + title.slice(1);
}

async function getClientTierId(clientId: string): Promise<WebBrainTierId> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_billing_subscriptions")
    .select("plan_key")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return "start";
    throw error;
  }

  return resolveWebBrainTierId(typeof data?.plan_key === "string" ? data.plan_key : "start");
}

function planKeyFromTierId(tierId: WebBrainTierId) {
  return tierId === "pro_plus" ? "pro-plus" : tierId;
}

async function getClientAdminStatus(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_profiles")
    .select("is_admin")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return false;
    throw error;
  }

  return data?.is_admin === true;
}

async function countClientSites(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("webbrain_sites")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw error;
  }

  return count ?? 0;
}

async function countClientProjects(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("webbrain_projects")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw error;
  }

  return count ?? 0;
}

export async function getClientSiteLimitContext(clientId: string) {
  const isAdmin = await getClientAdminStatus(clientId);

  if (isAdmin) {
    return {
      canCreateSite: true,
      sitesUsed: 0,
      sitesLimit: null,
    };
  }

  const [tierId, sitesUsed] = await Promise.all([
    getClientTierId(clientId),
    countClientSites(clientId),
  ]);
  const plan = getWebBrainPricingPlan(planKeyFromTierId(tierId));
  const sitesLimit = Math.max(0, plan.limits.sites);

  return {
    canCreateSite: sitesUsed < sitesLimit,
    sitesUsed,
    sitesLimit,
  };
}

export async function assertClientCanCreateSite(clientId: string) {
  const limits = await getClientSiteLimitContext(clientId);

  if (!limits.canCreateSite) {
    throw new Error(`Достигнут лимит сайтов: ${limits.sitesUsed} / ${limits.sitesLimit ?? "без лимита"}. Обновите план.`);
  }

  return limits;
}

export async function getClientProjectLimitContext(clientId: string) {
  const isAdmin = await getClientAdminStatus(clientId);

  if (isAdmin) {
    return {
      canCreateProject: true,
      projectsUsed: 0,
      projectsLimit: null,
    };
  }

  const [tierId, projectsUsed] = await Promise.all([
    getClientTierId(clientId),
    countClientProjects(clientId),
  ]);
  const plan = getWebBrainPricingPlan(planKeyFromTierId(tierId));
  const projectsLimit = Math.max(0, plan.limits.sites);

  return {
    canCreateProject: projectsUsed < projectsLimit,
    projectsUsed,
    projectsLimit,
  };
}

export async function assertClientCanCreateProject(clientId: string) {
  const limits = await getClientProjectLimitContext(clientId);

  if (!limits.canCreateProject) {
    throw new Error(`Достигнут лимит проектов: ${limits.projectsUsed} / ${limits.projectsLimit ?? "без лимита"}. Обновите план.`);
  }

  return limits;
}

function normalizeOptionalCreditLimit(value: unknown) {
  if (value == null) return null;

  const credits = Math.floor(Number(value));

  return Number.isFinite(credits) && credits >= 0 ? credits : null;
}

function normalizeOptionalDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function getClientLimitOverride(clientId: string): Promise<ClientLimitOverride | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_ai_limit_overrides")
    .select("enabled,tier_override,monthly_credit_limit,weekly_credit_limit,five_hour_credit_limit,reset_usage_before")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  if (!data || data.enabled === false) return null;

  return {
    tierOverride: data.tier_override ? resolveWebBrainTierId(String(data.tier_override)) : null,
    monthlyCreditLimit: normalizeOptionalCreditLimit(data.monthly_credit_limit),
    weeklyCreditLimit: normalizeOptionalCreditLimit(data.weekly_credit_limit),
    fiveHourCreditLimit: normalizeOptionalCreditLimit(data.five_hour_credit_limit),
    resetUsageBefore: normalizeOptionalDate(data.reset_usage_before),
  };
}

function applyActivityFloor(windowStart: Date, floor: Date | null) {
  return floor && floor > windowStart ? floor : windowStart;
}

async function getClientCreditActivity(clientId: string, resetUsageBefore: Date | null = null) {
  const supabase = createSupabaseAdmin();
  const monthStart = applyActivityFloor(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), resetUsageBefore);
  const weekStart = applyActivityFloor(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), resetUsageBefore);
  const fiveHoursStart = applyActivityFloor(new Date(Date.now() - 5 * 60 * 60 * 1000), resetUsageBefore);
  const oldestWindowStart = [monthStart, weekStart, fiveHoursStart].reduce((oldest, date) =>
    date < oldest ? date : oldest,
  );
  const { data, error } = await supabase
    .from("webbrain_ai_credit_events")
    .select("credits,created_at")
    .eq("client_id", clientId)
    .gte("created_at", oldestWindowStart.toISOString())
    .order("created_at", { ascending: true })
    .limit(3000);

  if (error) {
    if (isMissingSchemaError(error)) {
      throw new Error("Не найдена таблица учета AI-кредитов. Примените миграцию webbrain_ai_credit_events перед запуском генерации.");
    }

    throw error;
  }

  return (data ?? []).reduce(
    (activity, row) => {
      const createdAt = new Date(String(row.created_at));
      const credits = Math.max(0, Number(row.credits) || 0);

      if (createdAt >= monthStart) activity.month += credits;
      if (createdAt >= weekStart) activity.week += credits;
      if (createdAt >= fiveHoursStart) activity.fiveHours += credits;

      return activity;
    },
    { fiveHours: 0, week: 0, month: 0 },
  );
}

async function recordAiCreditEvent(input: {
  clientId: string;
  projectId: string | null;
  chatId: string;
  runId: string;
  operation: WebBrainCreditOperation;
  totals: TokenMeterTotals;
}) {
  if (input.totals.credits <= 0) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("webbrain_ai_credit_events")
    .insert({
      client_id: input.clientId,
      project_id: input.projectId,
      chat_id: input.chatId,
      run_id: input.runId,
      operation: input.operation,
      credits: input.totals.credits,
      input_tokens: input.totals.inputTokens,
      output_tokens: input.totals.outputTokens,
      cost_usd: input.totals.costUsd,
      model_breakdown: input.totals.byModel,
    });

  if (error) {
    if (isMissingSchemaError(error)) {
      console.error("[webbrain] AI credit event table is missing. Apply Supabase migrations before using paid limits.");
      return;
    }

    throw error;
  }
}

function getCreditLimitsForTier(
  tier: WebBrainTierConfig,
  activity: { fiveHours: number; week: number; month: number },
  override: ClientLimitOverride | null = null,
) {
  const monthlyCredits = override?.monthlyCreditLimit ?? (
    tier.limitWindows.includes("monthly") ? tier.monthlyCredits : undefined
  );
  const fiveHourCredits = override?.fiveHourCreditLimit ?? (
    tier.limitWindows.includes("five_hour") ? tier.fiveHourCredits ?? undefined : undefined
  );
  const weeklyCredits = override?.weeklyCreditLimit ?? (
    tier.limitWindows.includes("weekly") ? tier.weeklyCredits : undefined
  );

  return {
    monthlyRemainingCredits: monthlyCredits != null
      ? Math.max(0, monthlyCredits - activity.month)
      : undefined,
    fiveHourRemainingCredits: fiveHourCredits != null
      ? Math.max(0, fiveHourCredits - activity.fiveHours)
      : undefined,
    weeklyRemainingCredits: weeklyCredits != null
      ? Math.max(0, weeklyCredits - activity.week)
      : undefined,
  };
}

/**
 * Dev/test affordance for verifying the credit system on an admin account. Set in
 * .env.local:
 *   WEBBRAIN_ADMIN_FORCE_TIER=start      → run the admin as a real, ENFORCED Start tier
 *                                          (metering, rolling windows + the upgrade card
 *                                          all behave exactly like a paying user).
 *   WEBBRAIN_ADMIN_FORCE_CREDIT_CAP=1    → (optional) clamp every window to N credits so
 *                                          the very next generation is blocked BEFORE any
 *                                          model call — an instant, $0 card test.
 * Unset both to return the admin to unlimited internal use.
 */
function readAdminTestForcing(): { tierId: WebBrainTierId; cap: number | null } | null {
  const tierRaw = process.env.WEBBRAIN_ADMIN_FORCE_TIER?.trim();
  if (!tierRaw) return null;
  const capRaw = process.env.WEBBRAIN_ADMIN_FORCE_CREDIT_CAP?.trim();
  const capNum = capRaw ? Number(capRaw) : Number.NaN;
  const cap = Number.isFinite(capNum) ? Math.max(0, Math.floor(capNum)) : null;
  return { tierId: resolveWebBrainTierId(tierRaw), cap };
}

async function getClientAiCreditContext(clientId: string): Promise<{
  tierId: WebBrainTierId;
  limits: ReturnType<typeof getCreditLimitsForTier> | undefined;
}> {
  const [isAdmin, billingTierId, override] = await Promise.all([
    getClientAdminStatus(clientId),
    getClientTierId(clientId),
    getClientLimitOverride(clientId),
  ]);

  // An admin with NO explicit override keeps unlimited internal use. But the moment an
  // override sets a tier or any per-window credit cap, we ENFORCE it. That is how we
  // (a) actually reach the "limit reached" upgrade card on a test account and
  // (b) guarantee real spend never runs past the budget. Normal users always enforce.
  const hasExplicitOverride =
    !!override &&
    (override.tierOverride != null ||
      override.monthlyCreditLimit != null ||
      override.fiveHourCreditLimit != null ||
      override.weeklyCreditLimit != null);

  const adminTest = isAdmin ? readAdminTestForcing() : null;

  if (isAdmin && !hasExplicitOverride && !adminTest) {
    return {
      tierId: "business" satisfies WebBrainTierId,
      limits: undefined,
    };
  }

  const tierId = override?.tierOverride ?? adminTest?.tierId ?? billingTierId;
  const tier = getTierConfig(tierId);
  const activity = await getClientCreditActivity(clientId, override?.resetUsageBefore ?? null);

  // A forced admin cap clamps every window so the next generation is blocked BEFORE the
  // model call — an instant, $0 way to verify the "limit reached" upgrade card. A real
  // per-client DB override always wins over the env affordance.
  const effectiveOverride: ClientLimitOverride | null =
    adminTest?.cap != null && !hasExplicitOverride
      ? {
          tierOverride: tierId,
          monthlyCreditLimit: adminTest.cap,
          weeklyCreditLimit: adminTest.cap,
          fiveHourCreditLimit: adminTest.cap,
          resetUsageBefore: override?.resetUsageBefore ?? null,
        }
      : override;

  return {
    tierId,
    limits: getCreditLimitsForTier(tier, activity, effectiveOverride),
  };
}

export function makeLocalAssistantReply(text: string) {
  const lowered = text.toLowerCase();

  if (lowered.includes("кафе") || lowered.includes("кофе")) {
    return {
      text: "Принял. Собираю страницу для кофейни: герой с фото-фоном, CTA на бронь, карточки меню, преимущества и блок контактов. После генерации можно будет открыть редактор и двигать секции визуально.",
      status: "Черновик структуры создан"
    };
  }

  return {
    text: "Добавил запрос в текущий черновик. Пока это демо-чат без генерации через модель, но сообщения уже сохраняются в Supabase и останутся в выбранном чате.",
    status: "Сообщение сохранено"
  };
}

function toAssistantRows(
  chatId: string,
  clientId: string,
  messages: WebBrainAiAssistantMessage[],
) {
  return messages.map((message) => ({
    chat_id: chatId,
    client_id: clientId,
    role: "assistant" as const,
    text: message.text,
    status: message.status,
    payload: message.payload ?? null,
  }));
}

async function appendAssistantMessage(
  clientId: string,
  chatId: string,
  message: WebBrainAiAssistantMessage,
  runId?: string,
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_messages")
    .insert({
      chat_id: chatId,
      client_id: clientId,
      role: "assistant",
      text: message.text,
      status: message.status,
      payload: message.payload ?? null,
    })
    .select(messageColumns)
    .single();

  if (error) {
    if (!isMissingPayloadColumnError(error)) throw error;

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("webbrain_messages")
      .insert({
        chat_id: chatId,
        client_id: clientId,
        role: "assistant",
        text: message.text,
        status: message.status,
      })
      .select(messageColumnsWithoutPayload)
      .single();

    if (fallbackError) throw fallbackError;
    await updateAiRunFromAssistantPayload(clientId, runId, message.payload, message.status);

    return withEmptyPayload(fallbackData) as WebBrainMessage;
  }

  await updateAiRunFromAssistantPayload(clientId, runId, message.payload, message.status);

  return data as WebBrainMessage;
}

function normalizeName(value: string | undefined, fallback: string) {
  const name = value?.replace(/\s+/g, " ").trim();

  if (!name) return fallback;
  if (name.length <= PROJECT_NAME_MAX_LENGTH) return name;

  return Array.from(name).slice(0, PROJECT_NAME_MAX_LENGTH).join("");
}

function normalizeChatTitle(value: string | undefined) {
  const title = value?.replace(/\s+/g, " ").trim();

  if (!title) return "Новый чат";

  return limitChatTitle(title);
}

function limitChatTitle(value: string) {
  return Array.from(value).slice(0, CHAT_TITLE_MAX_LENGTH).join("");
}

function isGenericProjectName(value: string | null | undefined) {
  return GENERIC_PROJECT_NAMES.has((value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU"));
}

function isMissingSchemaError(error: unknown) {
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

const messageColumns = "id,role,text,status,payload,created_at";
const messageColumnsWithoutPayload = "id,role,text,status,created_at";

function isMissingPayloadColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "42703" || code === "PGRST204" || message.includes("payload");
}

function withEmptyPayload<T extends Record<string, unknown>>(row: T): T & { payload: null } {
  return {
    ...row,
    payload: null,
  };
}

async function selectMessagesForChat(clientId: string, chatId: string) {
  const supabase = createSupabaseAdmin();
  const request = supabase
    .from("webbrain_messages")
    .select(messageColumns)
    .eq("chat_id", chatId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  const { data, error } = await request;

  if (!error) return (data ?? []) as WebBrainMessage[];
  if (!isMissingPayloadColumnError(error)) throw error;

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("webbrain_messages")
    .select(messageColumnsWithoutPayload)
    .eq("chat_id", chatId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (fallbackError) throw fallbackError;

  return ((fallbackData ?? []) as Record<string, unknown>[]).map(withEmptyPayload) as WebBrainMessage[];
}

export async function listProjects(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_projects")
    .select("id,name,is_pinned,created_at,updated_at")
    .eq("client_id", clientId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];

    throw error;
  }

  return (data ?? []) as WebBrainProject[];
}

export async function createProject(clientId: string, name = "Проект сайта") {
  await assertClientCanCreateProject(clientId);

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_projects")
    .insert({
      client_id: clientId,
      name: normalizeName(name, "Проект сайта")
    })
    .select("id,name,is_pinned,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as WebBrainProject;
}

export async function updateProject(
  clientId: string,
  projectId: string,
  changes: {
    name?: string;
    is_pinned?: boolean;
  }
) {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, string | boolean> = {
    updated_at: new Date().toISOString()
  };

  if (changes.name !== undefined) {
    patch.name = normalizeName(changes.name, "Проект сайта");
  }

  if (changes.is_pinned !== undefined) {
    patch.is_pinned = changes.is_pinned;
  }

  const { data, error } = await supabase
    .from("webbrain_projects")
    .update(patch)
    .eq("id", projectId)
    .eq("client_id", clientId)
    .select("id,name,is_pinned,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as WebBrainProject;
}

export async function deleteProject(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("webbrain_projects").delete().eq("id", projectId).eq("client_id", clientId);

  if (error) throw error;
}

export async function listProjectChats(clientId: string, projectId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_chats")
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("project_id", projectId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as WebBrainChat[];
}

export async function listActiveChats(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_chats")
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as WebBrainChat[];
}

export async function listArchivedChats(clientId: string): Promise<WebBrainArchivedChat[]> {
  const supabase = createSupabaseAdmin();
  const { data: chats, error } = await supabase
    .from("webbrain_chats")
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .eq("client_id", clientId)
    .eq("is_archived", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const safeChats = (chats ?? []) as WebBrainChat[];
  const projectIds = [...new Set(safeChats.map((chat) => chat.project_id).filter(Boolean))];

  if (projectIds.length === 0) {
    return safeChats.map((chat) => ({ ...chat, project_name: "Без проекта" }));
  }

  const { data: projects, error: projectsError } = await supabase
    .from("webbrain_projects")
    .select("id,name")
    .eq("client_id", clientId)
    .in("id", projectIds);

  if (projectsError) throw projectsError;

  const projectNames = new Map((projects ?? []).map((project) => [String(project.id), String(project.name ?? "Без проекта")]));

  return safeChats.map((chat) => ({
    ...chat,
    project_name: projectNames.get(chat.project_id) ?? "Без проекта",
  }));
}

export async function createProjectChat(clientId: string, projectId: string, title = "Новый чат", withSeedMessage = true) {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: project, error: projectError } = await supabase
    .from("webbrain_projects")
    .select("id")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();

  if (projectError) throw projectError;
  if (!project) throw new Error("Project not found");

  const { data: chat, error: chatError } = await supabase
    .from("webbrain_chats")
    .insert({
      client_id: clientId,
      project_id: projectId,
      title: normalizeChatTitle(title),
      is_archived: false,
      updated_at: now
    })
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .single();

  if (chatError) throw chatError;

  let messages: WebBrainMessage[] = [];

  if (withSeedMessage) {
    const { data, error: messageError } = await supabase
      .from("webbrain_messages")
      .insert({
        chat_id: chat.id,
        client_id: clientId,
        role: seedAssistantMessage.role,
        text: seedAssistantMessage.text,
        status: seedAssistantMessage.status,
        payload: null
      })
      .select(messageColumns);

    if (messageError) {
      if (!isMissingPayloadColumnError(messageError)) throw messageError;

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("webbrain_messages")
        .insert({
          chat_id: chat.id,
          client_id: clientId,
          role: seedAssistantMessage.role,
          text: seedAssistantMessage.text,
          status: seedAssistantMessage.status
        })
        .select(messageColumnsWithoutPayload);

      if (fallbackError) throw fallbackError;
      messages = ((fallbackData ?? []) as Record<string, unknown>[]).map(withEmptyPayload) as WebBrainMessage[];
    } else {
      messages = (data ?? []) as WebBrainMessage[];
    }
  }

  await updateProject(clientId, projectId, {});

  return {
    chat: chat as WebBrainChat,
    messages
  };
}

export async function updateChat(clientId: string, chatId: string, changes: { title?: string; isArchived?: boolean }) {
  const supabase = createSupabaseAdmin();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (typeof changes.title === "string") {
    patch.title = normalizeChatTitle(changes.title);
  }

  if (typeof changes.isArchived === "boolean") {
    patch.is_archived = changes.isArchived;
  }

  const { data, error } = await supabase
    .from("webbrain_chats")
    .update(patch)
    .eq("id", chatId)
    .eq("client_id", clientId)
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as WebBrainChat;
}

export async function deleteChat(clientId: string, chatId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("webbrain_chats").delete().eq("id", chatId).eq("client_id", clientId);

  if (error) throw error;
}

export async function listMessages(clientId: string, chatId: string) {
  const supabase = createSupabaseAdmin();

  const { data: chat, error: chatError } = await supabase
    .from("webbrain_chats")
    .select("id")
    .eq("id", chatId)
    .eq("client_id", clientId)
    .single();

  if (chatError) throw chatError;
  if (!chat) throw new Error("Chat not found");

  return selectMessagesForChat(clientId, chatId);
}

export type AppendUserMessageOptions = {
  onAssistantMessage?: (message: WebBrainMessage) => Promise<void> | void;
  visibleUserMessage?: boolean;
  aiUserText?: string;
  attachmentContexts?: WebBrainAttachmentContext[];
  action?: string;
  runId?: string | null;
  spaceModel?: string | null;
  planMode?: boolean;
  editorSelection?: {
    pageId?: string;
    pageSlug?: string;
    componentId?: string;
    componentType?: string;
    componentName?: string;
  } | null;
  signal?: AbortSignal;
};

export async function appendUserMessage(
  clientId: string,
  chatId: string,
  text: string,
  options: AppendUserMessageOptions = {},
) {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: chat, error: chatError } = await supabase
    .from("webbrain_chats")
    .select("id,project_id,title,is_archived,created_at,updated_at")
    .eq("id", chatId)
    .eq("client_id", clientId)
    .eq("is_archived", false)
    .single();

  if (chatError) throw chatError;
  if (!chat) throw new Error("Chat not found");

  const previousMessages = await selectMessagesForChat(clientId, chatId);

  const shouldShowUserMessage = options.visibleUserMessage !== false;
  const userPayload: WebBrainMessagePayload | null = options.action
    ? {
        kind: "status",
        version: 1,
        runId: options.runId ?? undefined,
        action: options.action,
        spaceModel: options.spaceModel ?? undefined,
        planMode: options.planMode === true,
        editorSelection: options.editorSelection ?? undefined,
        attachmentContexts: options.attachmentContexts ?? undefined,
      }
    : options.editorSelection
      ? {
          kind: "status",
          version: 1,
          spaceModel: options.spaceModel ?? undefined,
          planMode: options.planMode === true,
          editorSelection: options.editorSelection,
          attachmentContexts: options.attachmentContexts ?? undefined,
        }
      : options.attachmentContexts?.length
        ? {
            kind: "status",
            version: 1,
            attachmentContexts: options.attachmentContexts,
          }
        : null;
  const { data: userMessageRows, error: userMessageError } = await supabase
    .from("webbrain_messages")
    .insert({
      chat_id: chatId,
      client_id: clientId,
      role: "user",
      text,
      status: shouldShowUserMessage ? null : "internal_action",
      payload: userPayload
    })
    .select(messageColumns);

  let normalizedUserRows: WebBrainMessage[];

  if (userMessageError) {
    if (!isMissingPayloadColumnError(userMessageError)) throw userMessageError;

    const { data: fallbackUserRows, error: fallbackUserError } = await supabase
      .from("webbrain_messages")
      .insert({
        chat_id: chatId,
        client_id: clientId,
        role: "user",
        text,
        status: shouldShowUserMessage ? null : "internal_action"
      })
      .select(messageColumnsWithoutPayload);

    if (fallbackUserError) throw fallbackUserError;
    normalizedUserRows = ((fallbackUserRows ?? []) as Record<string, unknown>[]).map(withEmptyPayload) as WebBrainMessage[];
  } else {
    normalizedUserRows = (userMessageRows ?? []) as WebBrainMessage[];
  }

  const userMessages = normalizedUserRows;
  const aiRun = await createAiRun(clientId, chatId, options.runId ?? null);

  const currentHistory = [
    ...previousMessages,
    ...userMessages,
  ];
  const streamedAssistantMessages: WebBrainMessage[] = [];
  let aiResult: WebBrainAiTurnResult;
  let meteredOperation: WebBrainCreditOperation = "direct_answer";

  try {
    const [creditContext, siteLimitContext] = await Promise.all([
      getClientAiCreditContext(clientId),
      getClientSiteLimitContext(clientId),
    ]);

    aiResult = await runWebBrainAiTurn({
      clientId,
      chat: chat as WebBrainChat,
      userText: options.aiUserText?.trim() || text,
      history: currentHistory,
      runId: aiRun.id,
      tierId: creditContext.tierId,
      limits: creditContext.limits,
      productLimits: siteLimitContext,
      spaceModelId: options.spaceModel ?? null,
      planMode: options.planMode === true,
      editorSelection: options.editorSelection ?? null,
      signal: options.signal,
      onCreditsUsed: (operation) => {
        meteredOperation = operation;
      },
      onUsageMetered: async (totals) => {
        await recordAiCreditEvent({
          clientId,
          projectId: chat.project_id,
          chatId,
          runId: aiRun.id,
          operation: meteredOperation,
          totals,
        });
      },
      onAssistantMessage: options.onAssistantMessage
        ? async (message) => {
            const assistantMessage = await appendAssistantMessage(
              clientId,
              chatId,
              message,
              aiRun.id,
            );
            streamedAssistantMessages.push(assistantMessage);
            await options.onAssistantMessage?.(assistantMessage);
          }
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    const assistantErrorMessage: WebBrainAiAssistantMessage = {
      status: "Ошибка",
      text: `Не получилось закончить этот шаг. ${message}`,
    };

    if (options.onAssistantMessage) {
      const assistantMessage = await appendAssistantMessage(
        clientId,
        chatId,
        assistantErrorMessage,
        aiRun.id,
      );
      streamedAssistantMessages.push(assistantMessage);
      await options.onAssistantMessage?.(assistantMessage);
    }

    await updateAiRun(clientId, aiRun.id, {
      status: "error",
      phase: "error",
      waiting_for: null,
    });

    aiResult = {
      assistantMessages: [assistantErrorMessage],
    };
  }

  let assistantMessages = streamedAssistantMessages;

  try {
    if (!options.onAssistantMessage) {
      const assistantRows = toAssistantRows(
        chatId,
        clientId,
        aiResult.assistantMessages,
      );
      const { data, error: assistantMessageError } = await supabase
        .from("webbrain_messages")
        .insert(assistantRows)
        .select(messageColumns);

      if (assistantMessageError) {
        if (!isMissingPayloadColumnError(assistantMessageError)) throw assistantMessageError;

        const fallbackRows = assistantRows.map((row) => {
          const { payload, ...rowWithoutPayload } = row;
          void payload;
          return rowWithoutPayload;
        });
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("webbrain_messages")
          .insert(fallbackRows)
          .select(messageColumnsWithoutPayload);

        if (fallbackError) throw fallbackError;
        assistantMessages = ((fallbackData ?? []) as Record<string, unknown>[]).map(withEmptyPayload) as WebBrainMessage[];
      } else {
        assistantMessages = (data ?? []) as WebBrainMessage[];
      }

      for (const message of aiResult.assistantMessages) {
        await updateAiRunFromAssistantPayload(clientId, aiRun.id, message.payload, message.status);
      }
    }

    const title = shouldShowUserMessage && chat.title === "Новый чат" ? makeChatTitle(text) : normalizeChatTitle(chat.title);
    const { data: updatedChat, error: updateError } = await supabase
      .from("webbrain_chats")
      .update({ title, updated_at: now })
      .eq("id", chatId)
      .eq("client_id", clientId)
      .select("id,project_id,title,is_archived,created_at,updated_at")
      .single();

    if (updateError) throw updateError;

    let site: WebBrainSite | null = null;
    let project: WebBrainProject | null = null;

    if (updatedChat.project_id) {
      const { data: currentProject } = await supabase
        .from("webbrain_projects")
        .select("id,name,is_pinned,created_at,updated_at")
        .eq("id", updatedChat.project_id)
        .eq("client_id", clientId)
        .maybeSingle();
      const nextProjectName = shouldShowUserMessage && isGenericProjectName(String(currentProject?.name ?? ""))
        ? makeProjectNameFromPrompt(text)
        : undefined;
      project = await updateProject(clientId, updatedChat.project_id, nextProjectName ? { name: nextProjectName } : {});
      site = aiResult.site ?? null;
    }

    const lastAssistantStatus = aiResult.assistantMessages.at(-1)?.status;
    if (lastAssistantStatus && !["Вопрос", "План"].includes(lastAssistantStatus)) {
      await updateAiRun(clientId, aiRun.id, {
        status: lastAssistantStatus === "Ошибка" ? "error" : lastAssistantStatus === "Остановлено" ? "stopped" : "completed",
        phase: lastAssistantStatus === "Ошибка" ? "error" : lastAssistantStatus === "Остановлено" ? "stopped" : "done",
        waiting_for: null,
      });
    }

    return {
      chat: updatedChat as WebBrainChat,
      messages: [
        ...(shouldShowUserMessage ? userMessages : []),
        ...((assistantMessages ?? []) as WebBrainMessage[]),
      ],
      site,
      project,
      pages: aiResult.pages as WebBrainSitePage[] | undefined,
      limitReached: aiResult.limitReached,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI finalization error";
    const assistantErrorMessage: WebBrainAiAssistantMessage = {
      status: "Ошибка",
      text: `Не получилось завершить и сохранить этот шаг. ${message}`,
    };

    try {
      const alreadyHasError = assistantMessages.some((item) => item.role === "assistant" && item.status === "Ошибка");
      if (!alreadyHasError) {
        const assistantMessage = await appendAssistantMessage(clientId, chatId, assistantErrorMessage, aiRun.id);
        assistantMessages = [...assistantMessages, assistantMessage];
        await options.onAssistantMessage?.(assistantMessage);
      }
    } catch (assistantMessageError) {
      console.error("[webbrain] failed to persist finalization error message:", assistantMessageError);
    }

    try {
      await updateAiRun(clientId, aiRun.id, {
        status: "error",
        phase: "error",
        waiting_for: null,
      });
    } catch (runError) {
      console.error("[webbrain] failed to close failed AI run:", runError);
    }

    return {
      chat: chat as WebBrainChat,
      messages: [
        ...(shouldShowUserMessage ? userMessages : []),
        ...assistantMessages,
      ],
      site: aiResult.site ?? null,
      project: null,
      pages: aiResult.pages as WebBrainSitePage[] | undefined,
      limitReached: aiResult.limitReached,
    };
  }
}
