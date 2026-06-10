export type ReasoningEffort = "none" | "low" | "medium" | "high";

export type RawUsage = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
} & Record<string, unknown>;

export type TokenMeterTotals = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  credits: number;
  byModel: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }>;
};

export type TokenMeter = {
  record(modelId: string, usage: RawUsage | null | undefined, realCostUsd?: number): void;
  ensureMinimumCostUsd(costUsd: number, modelId?: string): void;
  credits(): number;
  totals(): TokenMeterTotals;
};

export function normalizeUsage(usage: RawUsage | null | undefined) {
  const inputTokens = Number(usage?.inputTokens ?? usage?.promptTokens ?? 0) || 0;
  const outputTokens = Number(usage?.outputTokens ?? usage?.completionTokens ?? 0) || 0;
  const reasoningTokens = Number(usage?.reasoningTokens ?? 0) || 0;
  return { inputTokens, outputTokens: outputTokens + reasoningTokens };
}

export function createTokenMeter(): TokenMeter {
  const totals: TokenMeterTotals = { inputTokens: 0, outputTokens: 0, costUsd: 0, credits: 0, byModel: {} };
  return {
    record(modelId, usage, realCostUsd = 0) {
      const normalized = normalizeUsage(usage);
      totals.inputTokens += normalized.inputTokens;
      totals.outputTokens += normalized.outputTokens;
      totals.costUsd += Math.max(0, realCostUsd);
      totals.byModel[modelId] = totals.byModel[modelId] ?? { inputTokens: 0, outputTokens: 0, costUsd: 0 };
      totals.byModel[modelId].inputTokens += normalized.inputTokens;
      totals.byModel[modelId].outputTokens += normalized.outputTokens;
      totals.byModel[modelId].costUsd += Math.max(0, realCostUsd);
    },
    ensureMinimumCostUsd(costUsd) {
      totals.costUsd = Math.max(totals.costUsd, costUsd);
    },
    credits() {
      return totals.credits;
    },
    totals() {
      return { ...totals, byModel: { ...totals.byModel } };
    },
  };
}

export function clampReasoning(maxEffort: ReasoningEffort, requested: ReasoningEffort | string | undefined): ReasoningEffort {
  const order: ReasoningEffort[] = ["none", "low", "medium", "high"];
  const normalized = order.includes(requested as ReasoningEffort) ? requested as ReasoningEffort : "none";
  return order.indexOf(normalized) <= order.indexOf(maxEffort) ? normalized : maxEffort;
}

export function estimateOperationCredits() {
  return 0;
}
