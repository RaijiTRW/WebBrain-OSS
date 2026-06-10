import type { WebBrainChat, WebBrainMessage } from "@/lib/webbrain-chat-store";
import type { WebBrainSite, WebBrainSitePage } from "@/lib/webbrain-site-store";
import type { WebBrainCreditOperation, WebBrainLimitWindow, WebBrainTierConfig, WebBrainTierId } from "@/lib/webbrain-ai/credits";
import type { TokenMeterTotals } from "@/lib/webbrain-ai/pricing";
import type { WebBrainMessagePayload } from "@/lib/webbrain-ai-types";

export type WebBrainAiAssistantMessage = {
  text: string;
  status: string;
  payload?: WebBrainMessagePayload | null;
};

export type WebBrainCreditLimitInfo = {
  window: WebBrainLimitWindow | null;
  operation: WebBrainCreditOperation;
  needed: number;
  remaining: number;
  tierId: WebBrainTierId;
};

export type WebBrainAiTurnResult = {
  assistantMessages: WebBrainAiAssistantMessage[];
  site?: WebBrainSite | null;
  pages?: WebBrainSitePage[];
  creditsUsed?: number;
  limitReached?: WebBrainCreditLimitInfo;
};

export type WebBrainAiTurnEventHandler = (message: WebBrainAiAssistantMessage) => Promise<void> | void;

export async function runWebBrainAiTurn(input: {
  clientId: string;
  chat: WebBrainChat;
  userText: string;
  history: WebBrainMessage[];
  runId?: string;
  tierId?: WebBrainTierId;
  limits?: WebBrainTierConfig;
  productLimits?: unknown;
  spaceModelId?: string | null;
  planMode?: boolean;
  editorSelection?: unknown;
  signal?: AbortSignal;
  onCreditsUsed?: (operation: WebBrainCreditOperation) => void;
  onUsageMetered?: (totals: TokenMeterTotals) => Promise<void> | void;
  onAssistantMessage?: WebBrainAiTurnEventHandler;
}): Promise<WebBrainAiTurnResult> {
  void input;
  const message: WebBrainAiAssistantMessage = {
    status: "Недоступно",
    text: "AI orchestration is not included in the public OSS build. Connect your own AI service through this facade or use WebBrain's private deployment.",
  };
  await input.onAssistantMessage?.(message);
  return { assistantMessages: [message], site: null, pages: [] };
}
