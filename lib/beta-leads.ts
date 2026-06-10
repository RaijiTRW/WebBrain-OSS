import { randomBytes } from "crypto";

import { createSupabaseAdmin } from "./supabase-admin";

export const BETA_SEED_COUNT = 23;
export const BETA_TOTAL_SPOTS = 100;

export type BetaLead = {
  id: string;
  email: string;
  position: number;
  source: string | null;
  page: string;
  status: "waiting" | "telegram_started" | "invited" | "cancelled";
  telegram_start_token: string;
  telegram_chat_id: number | null;
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_started_at: string | null;
  admin_notified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TelegramLeadUser = {
  chatId: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type BetaLeadFallbackStore = Map<string, BetaLead>;
type BetaLeadFallbackEmailStore = Map<string, BetaLead>;

declare global {
  var __webbrainBetaLeadFallback: BetaLeadFallbackStore | undefined;
  var __webbrainBetaLeadFallbackByEmail: BetaLeadFallbackEmailStore | undefined;
}

function getFallbackStore() {
  globalThis.__webbrainBetaLeadFallback ??= new Map<string, BetaLead>();
  return globalThis.__webbrainBetaLeadFallback;
}

function getFallbackEmailStore() {
  globalThis.__webbrainBetaLeadFallbackByEmail ??= new Map<string, BetaLead>();
  return globalThis.__webbrainBetaLeadFallbackByEmail;
}

function createFallbackLead(input: {
  email: string;
  source?: string;
  page?: string;
  startToken: string;
  error: string;
}) {
  const existing = getFallbackEmailStore().get(input.email);
  if (existing) {
    existing.telegram_start_token = input.startToken;
    existing.source = input.source || existing.source;
    existing.page = input.page || existing.page;
    existing.updated_at = new Date().toISOString();
    getFallbackStore().set(input.startToken, existing);
    return existing;
  }

  const now = new Date().toISOString();
  const position = Math.min(BETA_TOTAL_SPOTS, BETA_SEED_COUNT + getFallbackEmailStore().size + 1);
  const lead: BetaLead = {
    id: input.startToken,
    email: input.email,
    position,
    source: input.source || null,
    page: input.page || "landing-beta",
    status: "waiting",
    telegram_start_token: input.startToken,
    telegram_chat_id: null,
    telegram_user_id: null,
    telegram_username: null,
    telegram_first_name: null,
    telegram_last_name: null,
    telegram_started_at: null,
    admin_notified_at: null,
    metadata: {
      fallback: true,
      fallback_reason: input.error
    },
    created_at: now,
    updated_at: now
  };

  getFallbackStore().set(input.startToken, lead);
  getFallbackEmailStore().set(input.email, lead);
  return lead;
}

export function createTelegramStartToken() {
  return `beta_${randomBytes(12).toString("hex")}`;
}

export function buildTelegramBotUrl(startToken?: string) {
  const base =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim() ||
    process.env.TELEGRAM_BOT_URL?.trim() ||
    "https://t.me/webbrainai_bot";

  if (!startToken) return base;

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}start=${encodeURIComponent(startToken)}`;
}

function isMissingSupabaseError(error: unknown) {
  return error instanceof Error && error.message === "Supabase server env is missing";
}

export async function createOrUpdateBetaLead(input: {
  email: string;
  source?: string;
  page?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const startToken = createTelegramStartToken();

  try {
    const supabase = createSupabaseAdmin();

    const { data: existingLead, error: existingError } = await supabase
      .from("webbrain_beta_leads")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      const fallbackLead = createFallbackLead({
        email,
        source: input.source,
        page: input.page,
        startToken,
        error: existingError.message
      });

      return { lead: fallbackLead, error: existingError.message, startToken };
    }

    if (existingLead) {
      const { data, error } = await supabase
        .from("webbrain_beta_leads")
        .update({
          source: input.source || null,
          page: input.page || "landing-beta",
          status: "waiting",
          telegram_start_token: startToken,
          metadata: {
            last_source: input.source || null,
            last_request_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", existingLead.id)
        .select("*")
        .single();

      if (error) {
        return { lead: existingLead as BetaLead, error: error.message, startToken };
      }

      return { lead: data as BetaLead, error: null, startToken };
    }

    const { data, error } = await supabase
      .from("webbrain_beta_leads")
      .insert(
        {
          email,
          source: input.source || null,
          page: input.page || "landing-beta",
          status: "waiting",
          telegram_start_token: startToken,
          metadata: {
            last_source: input.source || null,
            last_request_at: new Date().toISOString()
          }
        }
      )
      .select("*")
      .single();

    if (error) {
      const fallbackLead = createFallbackLead({
        email,
        source: input.source,
        page: input.page,
        startToken,
        error: error.message
      });

      return { lead: fallbackLead, error: error.message, startToken };
    }

    return { lead: data as BetaLead, error: null, startToken };
  } catch (error) {
    if (isMissingSupabaseError(error)) {
      const fallbackLead = createFallbackLead({
        email,
        source: input.source,
        page: input.page,
        startToken,
        error: "supabase_not_configured"
      });

      return { lead: fallbackLead, error: "supabase_not_configured", startToken };
    }

    throw error;
  }
}

export async function getBetaLeadStats() {
  try {
    const supabase = createSupabaseAdmin();
    const { count, error } = await supabase
      .from("webbrain_beta_leads")
      .select("id", { count: "exact", head: true });

    if (error) {
      const submittedCount = getFallbackEmailStore().size;
      return createStats(submittedCount, error.message);
    }

    return createStats(Math.max(count ?? 0, getFallbackEmailStore().size), null);
  } catch (error) {
    if (isMissingSupabaseError(error)) {
      return createStats(getFallbackEmailStore().size, "supabase_not_configured");
    }

    throw error;
  }
}

function createStats(submittedCount: number, error: string | null) {
  const claimedCount = Math.min(BETA_TOTAL_SPOTS, BETA_SEED_COUNT + submittedCount);
  const spotsLeft = Math.max(0, BETA_TOTAL_SPOTS - claimedCount);

  return {
    totalSpots: BETA_TOTAL_SPOTS,
    seedCount: BETA_SEED_COUNT,
    submittedCount,
    claimedCount,
    spotsLeft,
    nextPosition: spotsLeft > 0 ? claimedCount + 1 : null,
    isFull: spotsLeft <= 0,
    error
  };
}

export async function findBetaLeadByStartToken(startToken: string) {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("webbrain_beta_leads")
      .select("*")
      .eq("telegram_start_token", startToken)
      .maybeSingle();

    if (error) {
      return { lead: getFallbackStore().get(startToken) ?? null, error: error.message };
    }

    return { lead: (data as BetaLead | null) ?? getFallbackStore().get(startToken) ?? null, error: null };
  } catch (error) {
    if (isMissingSupabaseError(error)) {
      return { lead: getFallbackStore().get(startToken) ?? null, error: "supabase_not_configured" };
    }

    throw error;
  }
}

export async function attachTelegramToBetaLead(startToken: string, user: TelegramLeadUser) {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("webbrain_beta_leads")
      .update({
        status: "telegram_started",
        telegram_chat_id: user.chatId,
        telegram_user_id: user.userId ?? null,
        telegram_username: user.username ?? null,
        telegram_first_name: user.firstName ?? null,
        telegram_last_name: user.lastName ?? null,
        telegram_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("telegram_start_token", startToken)
      .select("*")
      .maybeSingle();

    if (error) {
      const fallbackLead = getFallbackStore().get(startToken) ?? null;
      if (fallbackLead) {
        fallbackLead.status = "telegram_started";
        fallbackLead.telegram_chat_id = user.chatId;
        fallbackLead.telegram_user_id = user.userId ?? null;
        fallbackLead.telegram_username = user.username ?? null;
        fallbackLead.telegram_first_name = user.firstName ?? null;
        fallbackLead.telegram_last_name = user.lastName ?? null;
        fallbackLead.telegram_started_at = new Date().toISOString();
        fallbackLead.updated_at = new Date().toISOString();
      }

      return { lead: fallbackLead, error: error.message };
    }

    return { lead: (data as BetaLead | null) ?? getFallbackStore().get(startToken) ?? null, error: null };
  } catch (error) {
    if (isMissingSupabaseError(error)) {
      const fallbackLead = getFallbackStore().get(startToken) ?? null;
      if (fallbackLead) {
        fallbackLead.status = "telegram_started";
        fallbackLead.telegram_chat_id = user.chatId;
        fallbackLead.telegram_user_id = user.userId ?? null;
        fallbackLead.telegram_username = user.username ?? null;
        fallbackLead.telegram_first_name = user.firstName ?? null;
        fallbackLead.telegram_last_name = user.lastName ?? null;
        fallbackLead.telegram_started_at = new Date().toISOString();
        fallbackLead.updated_at = new Date().toISOString();
      }

      return { lead: fallbackLead, error: "supabase_not_configured" };
    }

    throw error;
  }
}

export async function markBetaLeadAdminNotified(email: string) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("webbrain_beta_leads")
      .update({
        admin_notified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("email", email.trim().toLowerCase());
  } catch (error) {
    if (!isMissingSupabaseError(error)) throw error;
  }
}
