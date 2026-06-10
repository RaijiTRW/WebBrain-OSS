import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import {
  getAllowedSpaceModelIds,
  getTierConfig,
  resolveWebBrainTierId,
  type WebBrainTierId,
} from "@/lib/webbrain-ai/credits";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status: getApiErrorStatus(error, status) });
}

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

async function countRows(
  table: string,
  clientId: string,
  filters: Array<{ column: string; value: string }> = [],
) {
  const supabase = createSupabaseAdmin();
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("client_id", clientId);

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date;
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

function normalizePlanKey(value: unknown) {
  return value === "pro" || value === "pro-plus" || value === "business" ? value : "start";
}

type ProfileLimitOverride = {
  tierOverride: WebBrainTierId | null;
  monthlyCreditLimit: number | null;
  weeklyCreditLimit: number | null;
  fiveHourCreditLimit: number | null;
  resetUsageBefore: Date | null;
};

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

function applyActivityFloor(windowStart: Date, floor: Date | null) {
  return floor && floor > windowStart ? floor : windowStart;
}

async function getBillingSubscription(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_billing_subscriptions")
    .select("plan_key,status,current_period_start,current_period_end,cancel_at_period_end,trial_ends_at,billing_provider")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        planKey: "start",
        status: "active",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        billingProvider: "manual",
      };
    }

    throw error;
  }

  return {
    planKey: normalizePlanKey(data?.plan_key),
    status: typeof data?.status === "string" ? data.status : "active",
    currentPeriodStart: typeof data?.current_period_start === "string" ? data.current_period_start : null,
    currentPeriodEnd: typeof data?.current_period_end === "string" ? data.current_period_end : null,
    cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end),
    trialEndsAt: typeof data?.trial_ends_at === "string" ? data.trial_ends_at : null,
    billingProvider: typeof data?.billing_provider === "string" ? data.billing_provider : "manual",
  };
}

async function getProfileAdminStatus(clientId: string) {
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

async function getProfileLimitOverride(clientId: string): Promise<ProfileLimitOverride | null> {
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

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const supabase = createSupabaseAdmin();
    const token = bearerToken(request);
    const userResult = token ? await supabase.auth.getUser(token).catch(() => null) : null;
    const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fiveHoursStart = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const todayStart = startOfToday();

    const [
      projects,
      chats,
      sites,
      draftSites,
      publishedSites,
      activePublishedSites,
      creditEvents,
      subscription,
      isAdmin,
      limitOverride,
    ] = await Promise.all([
      countRows("webbrain_projects", clientId),
      countRows("webbrain_chats", clientId),
      countRows("webbrain_sites", clientId),
      countRows("webbrain_sites", clientId, [{ column: "status", value: "draft" }]),
      countRows("webbrain_published_sites", clientId),
      countRows("webbrain_published_sites", clientId, [{ column: "status", value: "active" }]),
      supabase
        .from("webbrain_ai_credit_events")
        .select("credits,cost_usd,created_at")
        .eq("client_id", clientId)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(3000),
      getBillingSubscription(clientId),
      getProfileAdminStatus(clientId),
      getProfileLimitOverride(clientId),
    ]);

    if (creditEvents.error) {
      if (isMissingSchemaError(creditEvents.error)) {
        throw new Error("Не найдена таблица учета AI-кредитов. Примените миграцию webbrain_ai_credit_events, иначе лимиты нельзя показывать точно.");
      }

      throw creditEvents.error;
    }

    const tierId: WebBrainTierId = isAdmin
      ? "business"
      : limitOverride?.tierOverride ?? resolveWebBrainTierId(subscription.planKey);
    const tier = getTierConfig(tierId);
    const effectiveCreditLimits = {
      monthlyCredits: limitOverride?.monthlyCreditLimit ?? (
        tier.limitWindows.includes("monthly") ? tier.monthlyCredits : null
      ),
      weeklyCredits: limitOverride?.weeklyCreditLimit ?? (
        tier.limitWindows.includes("weekly") ? tier.weeklyCredits : null
      ),
      fiveHourCredits: limitOverride?.fiveHourCreditLimit ?? (
        tier.limitWindows.includes("five_hour") ? tier.fiveHourCredits ?? null : null
      ),
    };
    const resetUsageBefore = limitOverride?.resetUsageBefore ?? null;
    const effectiveMonthStart = applyActivityFloor(monthStart, resetUsageBefore);
    const effectiveWeekStart = applyActivityFloor(weekStart, resetUsageBefore);
    const effectiveFiveHoursStart = applyActivityFloor(fiveHoursStart, resetUsageBefore);
    const effectiveTodayStart = applyActivityFloor(todayStart, resetUsageBefore);

    const creditActivity = {
      credits: {
        fiveHours: 0,
        day: 0,
        week: 0,
        month: 0,
      },
      costUsd: {
        fiveHours: 0,
        day: 0,
        week: 0,
        month: 0,
      },
    };

    for (const row of creditEvents.data ?? []) {
      const createdAt = new Date(String(row.created_at));
      const credits = Math.max(0, Number(row.credits) || 0);
      const costUsd = Math.max(0, Number(row.cost_usd) || 0);

      if (createdAt >= effectiveMonthStart) {
        creditActivity.credits.month += credits;
        creditActivity.costUsd.month += costUsd;
      }
      if (createdAt >= effectiveWeekStart) {
        creditActivity.credits.week += credits;
        creditActivity.costUsd.week += costUsd;
      }
      if (createdAt >= effectiveFiveHoursStart) {
        creditActivity.credits.fiveHours += credits;
        creditActivity.costUsd.fiveHours += costUsd;
      }
      if (createdAt >= effectiveTodayStart) {
        creditActivity.credits.day += credits;
        creditActivity.costUsd.day += costUsd;
      }
    }

    return NextResponse.json({
      user: {
        id: clientId,
        email: userResult?.data.user?.email ?? null,
        name:
          (userResult?.data.user?.user_metadata?.full_name as string | undefined) ||
          (userResult?.data.user?.user_metadata?.name as string | undefined) ||
          null,
      },
      activity: creditActivity.credits,
      spending: creditActivity.costUsd,
      subscription,
      access: {
        isAdmin,
        tierId,
        allowedSpaceModels: getAllowedSpaceModelIds(tier),
        effectiveCreditLimits,
      },
      stats: {
        projects,
        chats,
        sites,
        draftSites,
        publishedSites,
        activePublishedSites,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
