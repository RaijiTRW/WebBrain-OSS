import type { ReasoningEffort } from "@/lib/webbrain-ai/pricing";

export type WebBrainTierId = "start" | "pro" | "pro_plus" | "business";
export type WebBrainSpaceModelId = "Space-1" | "Space-2" | "Space-3" | "Space-4";
export type WebBrainLimitWindow = "five_hour" | "weekly" | "monthly";
export type WebBrainCreditOperation =
  | "direct_answer"
  | "brief_round"
  | "plan"
  | "site_generation"
  | "site_revision"
  | "component_edit"
  | "data_change"
  | "research";

export type WebBrainTierConfig = {
  id: WebBrainTierId;
  label: string;
  modelId: string;
  maxSpaceModelId: WebBrainSpaceModelId;
  maxReasoningEffort: ReasoningEffort;
  temperature: number;
  monthlyCostBudgetUsd: number;
  monthlyCredits: number;
  weeklyCostBudgetUsd: number;
  weeklyCredits: number;
  fiveHourCostBudgetUsd: number | null;
  fiveHourCredits: number | null;
  limitWindows: WebBrainLimitWindow[];
  deepDesignReview: boolean;
  maxRebuildAttempts: number;
};

export type WebBrainSpaceModelConfig = {
  id: WebBrainSpaceModelId;
  label: WebBrainSpaceModelId;
  modelId: string;
  minTierId: WebBrainTierId;
};

const SPACE_MODEL_ORDER: WebBrainSpaceModelId[] = ["Space-1", "Space-2", "Space-3", "Space-4"];

export const SPACE_MODEL_CONFIGS: Record<WebBrainSpaceModelId, WebBrainSpaceModelConfig> = {
  "Space-1": { id: "Space-1", label: "Space-1", modelId: "public/stub-model", minTierId: "start" },
  "Space-2": { id: "Space-2", label: "Space-2", modelId: "public/stub-model", minTierId: "pro" },
  "Space-3": { id: "Space-3", label: "Space-3", modelId: "public/stub-model", minTierId: "pro_plus" },
  "Space-4": { id: "Space-4", label: "Space-4", modelId: "public/stub-model", minTierId: "business" },
};

const tierConfigs: Record<WebBrainTierId, WebBrainTierConfig> = {
  start: makeTier("start", "Start", "Space-1", "none", ["monthly"]),
  pro: makeTier("pro", "Pro", "Space-2", "low", ["five_hour", "weekly"]),
  pro_plus: makeTier("pro_plus", "Pro Plus", "Space-3", "medium", ["five_hour", "weekly"]),
  business: makeTier("business", "Business", "Space-4", "high", ["five_hour", "weekly"]),
};

function makeTier(
  id: WebBrainTierId,
  label: string,
  maxSpaceModelId: WebBrainSpaceModelId,
  maxReasoningEffort: ReasoningEffort,
  limitWindows: WebBrainLimitWindow[],
): WebBrainTierConfig {
  return {
    id,
    label,
    modelId: SPACE_MODEL_CONFIGS[maxSpaceModelId].modelId,
    maxSpaceModelId,
    maxReasoningEffort,
    temperature: 0.4,
    monthlyCostBudgetUsd: 0,
    monthlyCredits: 0,
    weeklyCostBudgetUsd: 0,
    weeklyCredits: 0,
    fiveHourCostBudgetUsd: limitWindows.includes("five_hour") ? 0 : null,
    fiveHourCredits: limitWindows.includes("five_hour") ? 0 : null,
    limitWindows,
    deepDesignReview: false,
    maxRebuildAttempts: 1,
  };
}

export function normalizeSpaceModelId(value: string | null | undefined): WebBrainSpaceModelId {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalized === "space2") return "Space-2";
  if (normalized === "space3") return "Space-3";
  if (normalized === "space4") return "Space-4";
  return "Space-1";
}

export function getAllowedSpaceModelIds(tier: WebBrainTierConfig): WebBrainSpaceModelId[] {
  const maxRank = SPACE_MODEL_ORDER.indexOf(tier.maxSpaceModelId);
  return SPACE_MODEL_ORDER.filter((item) => SPACE_MODEL_ORDER.indexOf(item) <= maxRank);
}

export function resolveAllowedSpaceModel(tier: WebBrainTierConfig, requested: string | null | undefined): WebBrainSpaceModelConfig {
  const modelId = normalizeSpaceModelId(requested);
  return getAllowedSpaceModelIds(tier).includes(modelId)
    ? SPACE_MODEL_CONFIGS[modelId]
    : SPACE_MODEL_CONFIGS[tier.maxSpaceModelId];
}

export function getTierConfig(tierId: WebBrainTierId): WebBrainTierConfig {
  return tierConfigs[tierId] ?? tierConfigs.start;
}

export function getAllTierConfigs(): Record<WebBrainTierId, WebBrainTierConfig> {
  return { ...tierConfigs };
}

export function resolveWebBrainTierId(slug: string | null | undefined): WebBrainTierId {
  const normalized = String(slug ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized === "pro") return "pro";
  if (normalized === "pro_plus" || normalized === "proplus") return "pro_plus";
  if (normalized === "business" || normalized === "biz") return "business";
  return "start";
}

export function estimateOperationCost() {
  return 0;
}

export function estimateFullSiteCreationCost() {
  return 0;
}

export function formatCreditsForUser(remaining: number, total: number): string {
  return total > 0 ? `${remaining} / ${total}` : "not metered in OSS stub";
}

export function explainCreditCost() {
  return "AI metering is intentionally omitted from the public OSS build.";
}

export function describeTierLimits(tier: WebBrainTierConfig): string {
  return `${tier.label}: public OSS limit metadata only.`;
}
