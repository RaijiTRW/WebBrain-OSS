"use client";

import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject, TouchEvent as ReactTouchEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AiOrbShader } from "@/components/AiOrbShader";
import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  accountSubscriptionPlans,
  type AccountSubscriptionPlan,
  type AccountSubscriptionPlanKey,
} from "@/lib/webbrain-pricing-plans";
import {
  getAllowedSpaceModelIds,
  getTierConfig,
  type WebBrainLimitWindow,
  type WebBrainSpaceModelId,
  type WebBrainTierConfig,
} from "@/lib/webbrain-ai/credits";
import {
  componentDisplayName,
  componentInspectorSchemas,
  findWebBrainComponent,
  getComponentChildren,
  normalizeWebBrainDocument,
  moveWebBrainComponent,
  moveWebBrainComponentToSide,
  patchWebBrainComponent,
  removeWebBrainComponent,
  renderWebBrainComponentHtml,
  renderWebBrainDocument,
  type InspectorControl,
  type WebBrainComponent,
  type WebBrainComponentType,
  type WebBrainDocument,
  type WebBrainEffects,
  type WebBrainProps,
  type WebBrainStyle,
  type WebBrainTransition,
  type WebBrainTransform
} from "@/lib/webbrain-document";
import {
  ALargeSmall,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ArrowRight,
  ArrowUpRight,
  Bold,
  BedDouble,
  Box,
  BrainCircuit,
  BriefcaseBusiness,
  CaseUpper,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  CircleHelp,
  CircleStop,
  ClipboardList,
  Coffee,
  Copy,
  CreditCard,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  ImageIcon,
  Italic,
  KeyRound,
  Laptop,
  LetterText,
  Link2,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageCircleReply,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Monitor,
  MousePointer2,
  PanelLeft,
  PanelsTopLeft,
  Paperclip,
  Pencil,
  Pin,
  Palette,
  PenLine,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Strikethrough,
  Table2,
  Tablet,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
  Underline,
  UserRound,
  Wand2,
  X
} from "lucide-react";
import type {
  WebBrainMessagePayload,
  WebBrainProjectArtifact,
  WebBrainSiteBriefPayload,
  WebBrainSitePlanPayload,
  WebBrainSupabaseGatePayload,
} from "@/lib/webbrain-ai-types";
import {
  getEditorNodeManifest,
  normalizeEditorManifest,
  type WebBrainEditorBinding,
  type WebBrainEditorControl,
  type WebBrainEditorNodeManifest,
} from "@/lib/webbrain-editor-manifest";
import type {
  WebBrainCodegenElement,
  WebBrainCodegenElementMap,
  WebBrainCodegenFile,
  WebBrainCodegenContentKind,
  WebBrainCodegenSettingField,
  WebBrainCodegenSettings,
  WebBrainCodegenSettingValue,
  WebBrainCodegenStyleValue,
  WebBrainCodegenViewport,
  WebBrainRenderEngine,
} from "@/lib/webbrain-codegen/types";
import type {
  WebBrainSupabaseConnectionStatus,
  WebBrainSupabaseOrganizationOption,
  WebBrainSupabaseProjectOption,
  WebBrainSupabaseSqlResult,
  WebBrainSupabaseTablePreview,
  WebBrainSupabaseTableOption,
} from "@/lib/webbrain-supabase-store";

type ChatMessage =
  | {
      role: "assistant";
      text: string;
      status?: string;
      payload?: WebBrainMessagePayload | null;
      eyebrow?: string;
      transient?: boolean;
    }
  | {
      role: "user";
      text: string;
      hidden?: boolean;
      status?: string | null;
      payload?: WebBrainMessagePayload | null;
    };

type ChatDisplayItem = {
  message: ChatMessage;
  originalIndex: number;
  workSteps: ChatMessage[];
};

type StoredProject = {
  id: string;
  name: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type EditorDocumentHistoryState = {
  pageId: string | null;
  past: WebBrainDocument[];
  future: WebBrainDocument[];
};

type SitePagesUpdater = StoredSitePage[] | ((pages: StoredSitePage[]) => StoredSitePage[]);

type StoredChat = {
  id: string;
  project_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

type ChatRunSummary = {
  chat_id: string;
  run_id: string;
  phase: string;
  status: string;
  waiting_for: string | null;
  updated_at: string;
};

type ArchivedChat = StoredChat & {
  project_name: string;
};

type ComposerAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: "file" | "photo" | "video";
  dataUrl: string;
  previewUrl?: string;
};

type ChatAttachmentPayload = {
  name: string;
  size: number;
  mimeType: string;
  kind: ComposerAttachment["kind"];
  dataUrl: string;
};

type CreateSupabaseProjectInput = {
  name: string;
  organizationSlug?: string;
  organizationId?: string;
  region?: string;
  dbPass?: string;
};

const SUPABASE_REGION_OPTIONS = [
  { value: "eu-central-1", label: "Европа, Франкфурт", hint: "eu-central-1", flag: "🇩🇪" },
  { value: "eu-west-1", label: "Европа, Ирландия", hint: "eu-west-1", flag: "🇮🇪" },
  { value: "eu-west-2", label: "Европа, Лондон", hint: "eu-west-2", flag: "🇬🇧" },
  { value: "eu-west-3", label: "Европа, Париж", hint: "eu-west-3", flag: "🇫🇷" },
  { value: "us-east-1", label: "США, Восток", hint: "us-east-1", flag: "🇺🇸" },
  { value: "us-west-1", label: "США, Запад", hint: "us-west-1", flag: "🇺🇸" },
  { value: "ap-southeast-1", label: "Азия, Сингапур", hint: "ap-southeast-1", flag: "🇸🇬" },
  { value: "ap-northeast-1", label: "Азия, Токио", hint: "ap-northeast-1", flag: "🇯🇵" },
  { value: "ap-south-1", label: "Азия, Мумбаи", hint: "ap-south-1", flag: "🇮🇳" },
  { value: "sa-east-1", label: "Южная Америка, Сан-Паулу", hint: "sa-east-1", flag: "🇧🇷" },
];

function generateSupabaseDbPassword(length = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-+=";
  const values = new Uint32Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * chars.length);
    }
  }

  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

function formatSupabaseCellValue(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type StoredMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  status: string | null;
  payload: WebBrainMessagePayload | null;
  created_at: string;
};

const assistantStatusIcons: Record<string, typeof Wand2> = {
  Думает: BrainCircuit,
  Поиск: Search,
  План: ClipboardList,
  Вопрос: CircleHelp,
  Ответ: MessageCircleReply,
  Редактирование: PenLine,
  Проверка: ShieldCheck,
  Подключение: Database,
  Готово: CheckCircle2,
  Ошибка: TriangleAlert,
  Остановлено: CircleStop,
};

const activeEditingStatusSequence = [
  "Генерирую hero",
  "Расставляю секции",
  "Переписываю текст",
  "Настраиваю CTA",
  "Добавляю эффекты",
  "Проверяю адаптив",
];

function getAssistantStatusLabel(status: string, text = "") {
  const normalizedText = text.toLowerCase();

  if (status === "Думает") return "Планирую шаг";
  if (status === "Поиск") return normalizedText.includes("изображ") ? "Ищу изображения" : "Ищу материалы";
  if (status === "Проверка") {
    if (normalizedText.includes("дизайн")) return "Проверяю дизайн";
    if (normalizedText.includes("backend") || normalizedText.includes("artifacts") || normalizedText.includes("заявк") || normalizedText.includes("данн")) return "Проверяю заявки";
    return "Проверяю результат";
  }
  if (status === "Редактирование") {
    if (/(hero|херо|перв(ый|ого) экран)/i.test(text)) return "Генерирую hero";
    if (/(секци|структур|композици)/i.test(text)) return "Расставляю секции";
    if (/(текст|copy|копирайт|заголов|описан)/i.test(text)) return "Переписываю текст";
    if (/(cta|кноп|форм|заявк)/i.test(text)) return "Настраиваю CTA";
    if (/(эффект|motion|анимац|hover)/i.test(text)) return "Добавляю эффекты";
    if (/(backend|api|sql|source|artifact|заявк|данн|форм)/i.test(text)) return "Готовлю заявки";
    if (/(document_json|генерирую|собираю|создаю|выстраиваю)/i.test(text)) return "Выстраиваю сайт";

    return "Редактирую сайт";
  }

  return status;
}

function shouldCycleEditingStatus(status: string, text = "") {
  return status === "Редактирование" && /(document_json|генерирую|собираю|создаю|выстраиваю|композици|типограф|cta|эффект)/i.test(text);
}

function AssistantStatusBadge({ status, text, active }: { status: string; text?: string; active?: boolean }) {
  const Icon = assistantStatusIcons[status] ?? Sparkles;
  const baseLabel = getAssistantStatusLabel(status, text);
  const [cycleIndex, setCycleIndex] = useState(0);
  const shouldCycle = Boolean(active && shouldCycleEditingStatus(status, text));
  const label = shouldCycle ? activeEditingStatusSequence[cycleIndex % activeEditingStatusSequence.length] : baseLabel;

  useEffect(() => {
    if (!shouldCycle) {
      return;
    }

    const timer = window.setInterval(() => {
      setCycleIndex((index) => index + 1);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [shouldCycle, status, text]);

  return (
    <span
      aria-label={`Статус: ${label}`}
      className={`webbrain-status-badge pointer-events-none mt-4 inline-flex w-fit select-none items-center gap-1.5 rounded-full border border-white/[0.055] bg-white/[0.025] px-2.5 py-1 text-[0.72rem] font-medium leading-none text-white/36 ${active ? "is-active" : ""}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/32" strokeWidth={1.8} />
      <motion.span
        key={label}
        initial={active ? { opacity: 0, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {label}
      </motion.span>
    </span>
  );
}

const visibleAssistantFinalStatuses = new Set(["Готово", "Ответ", "Ошибка", "Остановлено"]);

function getLatestLiveAssistantMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    if (!message.status) continue;
    if (visibleAssistantFinalStatuses.has(message.status)) continue;
    if (message.status === "План" || message.status === "Вопрос" || message.status === "Подтверждение") continue;

    return message;
  }

  return null;
}

function isTechnicalAssistantStep(message: ChatMessage, messageIndex: number, openInteractiveIndexes: Set<number>) {
  if (message.role !== "assistant") return false;
  if (openInteractiveIndexes.has(messageIndex)) return false;
  if (message.payload?.kind === "supabase_connection_gate") return true;
  if (!message.status) return false;
  if (visibleAssistantFinalStatuses.has(message.status)) return false;

  return true;
}

function shouldAttachWorkSteps(message: ChatMessage) {
  if (message.role !== "assistant") return false;
  if (message.payload?.kind === "supabase_connection_gate") return false;
  if (!message.status) return true;

  return visibleAssistantFinalStatuses.has(message.status);
}

function buildChatDisplayItems(messages: ChatMessage[], openInteractiveIndexes: Set<number>): ChatDisplayItem[] {
  const items: ChatDisplayItem[] = [];
  let pendingWorkSteps: ChatMessage[] = [];

  // Steps fold into the collapsed "ход работы" ONLY once their run has finished (a
  // final-status message exists after them). The live tail of an in-progress run stays
  // visible as individual sequential messages.
  let lastFinalIndex = -1;
  messages.forEach((message, index) => {
    if (message.role === "assistant" && message.status && visibleAssistantFinalStatuses.has(message.status)) {
      lastFinalIndex = index;
    }
  });

  messages.forEach((message, originalIndex) => {
    if (originalIndex < lastFinalIndex && isTechnicalAssistantStep(message, originalIndex, openInteractiveIndexes)) {
      pendingWorkSteps = [...pendingWorkSteps, message];
      return;
    }

    if (message.role === "user") {
      if (message.hidden) return;

      pendingWorkSteps = [];
      items.push({ message, originalIndex, workSteps: [] });
      return;
    }

    const workSteps = shouldAttachWorkSteps(message) ? pendingWorkSteps : [];
    if (shouldAttachWorkSteps(message) || openInteractiveIndexes.has(originalIndex)) {
      pendingWorkSteps = [];
    }
    items.push({ message, originalIndex, workSteps });
  });

  return items;
}

function stripMarkdownListMarker(line: string) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function compactAiWorkingSummary(text?: string) {
  const lines = (text ?? "")
    .trim()
    .split("\n")
    .map((line) => stripMarkdownListMarker(line.trim()))
    .filter(Boolean);
  const meaningfulLine = lines.find((line) => !/^(готово|ошибка|остановлено)\b/i.test(line));
  const summary = meaningfulLine || "Собираю страницу, обновляю редактор и проверяю результат.";

  if (summary.length <= 132) return summary;

  return `${summary.slice(0, 129).trim()}...`;
}

// AI work stages render as individual messages in the chat stream (see
// isTechnicalAssistantStep): the AI narrates each step right in the conversation.

function AssistantRichText({
  text,
  className = "text-[0.94rem] leading-7 text-white/[0.88]",
}: {
  text: string;
  className?: string;
}) {
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((line) => /^\s*[-*•]\s+/.test(line));
        const isNumberedList = lines.length > 0 && lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

        if (isBulletList) {
          return (
            <ul key={`bullet-${blockIndex}`} className="list-disc space-y-1.5 pl-5 marker:text-white/30">
              {lines.map((line, lineIndex) => (
                <li key={`${blockIndex}-${lineIndex}`}>{stripMarkdownListMarker(line)}</li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={`numbered-${blockIndex}`} className="list-decimal space-y-1.5 pl-5 marker:text-white/30">
              {lines.map((line, lineIndex) => (
                <li key={`${blockIndex}-${lineIndex}`}>{stripMarkdownListMarker(line)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

type AssistantPreviewScreenshot = {
  viewport: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
  dataUrl: string;
};

type AssistantPreviewPayload = {
  screenshots: AssistantPreviewScreenshot[];
  skippedReason?: string;
  review?: {
    score?: number;
    decision?: "pass" | "repair";
    summary?: string;
    issues?: Array<{
      severity?: string;
      target?: string;
      reason?: string;
      fix?: string;
    }>;
  };
};

function readAssistantPreviewPayload(payload: WebBrainMessagePayload | null | undefined): AssistantPreviewPayload | null {
  if (!payload || payload.kind !== "status" || payload.visualKind !== "codegen_preview_screenshots") return null;

  const screenshots = Array.isArray(payload.screenshots)
    ? payload.screenshots
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const source = item as Record<string, unknown>;
          const viewport = source.viewport;
          const dataUrl = source.dataUrl;
          const width = Number(source.width);
          const height = Number(source.height);

          if (
            (viewport !== "desktop" && viewport !== "tablet" && viewport !== "mobile") ||
            typeof dataUrl !== "string" ||
            !dataUrl.startsWith("data:image/") ||
            !Number.isFinite(width) ||
            !Number.isFinite(height)
          ) {
            return null;
          }

          return { viewport, width, height, dataUrl };
        })
        .filter((item): item is AssistantPreviewScreenshot => Boolean(item))
    : [];
  const review = payload.review && typeof payload.review === "object" ? payload.review as AssistantPreviewPayload["review"] : undefined;

  return {
    screenshots,
    skippedReason: typeof payload.skippedReason === "string" ? payload.skippedReason : undefined,
    review,
  };
}

function previewViewportLabel(viewport: AssistantPreviewScreenshot["viewport"]) {
  if (viewport === "desktop") return "Desktop";
  if (viewport === "tablet") return "Tablet";
  return "Mobile";
}

function AssistantPreviewFrames({ payload }: { payload: AssistantPreviewPayload | null }) {
  if (!payload) return null;

  if (!payload.screenshots.length) {
    return payload.skippedReason ? (
      <p className="mt-2 rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[0.74rem] leading-5 text-white/36">
        Кадры preview недоступны: {payload.skippedReason}
      </p>
    ) : null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {payload.screenshots.map((screenshot) => (
          <figure key={screenshot.viewport} className="min-w-0 overflow-hidden rounded-[12px] border border-white/[0.07] bg-black/24">
            <div
              className="aspect-[4/3] bg-cover bg-top"
              style={{ backgroundImage: `url(${screenshot.dataUrl})` }}
              aria-label={`Preview screenshot ${previewViewportLabel(screenshot.viewport)}`}
            />
            <figcaption className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-2.5 py-2 text-[0.68rem] font-semibold text-white/42">
              <span>{previewViewportLabel(screenshot.viewport)}</span>
              <span className="text-white/28">{screenshot.width}x{screenshot.height}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {payload.review ? (
        <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
          <p className="text-[0.74rem] font-semibold text-white/54">
            Оценка: {typeof payload.review.score === "number" ? `${payload.review.score}/100` : "готово"}
            {payload.review.decision === "repair" ? " · нужна правка" : payload.review.decision === "pass" ? " · ок" : ""}
          </p>
          {payload.review.summary ? (
            <p className="mt-1 text-[0.74rem] leading-5 text-white/38">{payload.review.summary}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkLogStatusCard({ step, children }: { step: Extract<ChatMessage, { role: "assistant" }>; children?: ReactNode }) {
  const Icon = assistantStatusIcons[step.status ?? ""] ?? Sparkles;
  const previewPayload = readAssistantPreviewPayload(step.payload);

  return (
    <div className="mt-2 max-w-[620px] overflow-hidden rounded-[16px] border border-white/[0.07] bg-[radial-gradient(circle_at_8%_0%,rgba(190,255,76,0.075),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-3.5 shadow-[0_14px_42px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="flex gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-lime/[0.10] text-lime">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <AssistantRichText
            text={step.text}
            className="text-[0.8rem] leading-5 text-white/58"
          />
          {children}
          <AssistantPreviewFrames payload={previewPayload} />
        </div>
      </div>
    </div>
  );
}

function AssistantBackendArtifactsCard({ payload }: { payload: Extract<WebBrainMessagePayload, { kind: "backend_artifacts" }> }) {
  const visibleArtifacts = payload.artifacts.slice(0, 5);
  const hiddenCount = Math.max(0, payload.artifacts.length - visibleArtifacts.length);
  const isWaitingConnection = payload.status === "needs_connection";

  return (
    <div className="mt-2 max-w-[620px] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_10%_0%,rgba(62,207,142,0.11),transparent_38%),linear-gradient(180deg,rgba(17,25,22,0.92),rgba(11,13,13,0.86))] p-3.5 shadow-[0_14px_42px_rgba(0,0,0,0.22)]">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[#3ecf8e]/10 text-[#3ecf8e]">
          <Database className="h-4.5 w-4.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#3ecf8e]/10 px-2.5 text-[0.68rem] font-bold text-[#3ecf8e]/78">
              <Database className="h-3 w-3" />
              Данные сайта
            </span>
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-[0.66rem] font-bold ${
                isWaitingConnection
                  ? "bg-amber-300/[0.08] text-amber-100/66"
                  : "bg-lime/[0.08] text-lime/72"
              }`}
            >
              {isWaitingConnection ? "ждет подключение" : "подготовлено"}
            </span>
          </div>
          <h4 className="text-[0.92rem] font-semibold leading-6 text-white/88">{payload.title}</h4>
          {payload.summary.length ? (
            <div className="mt-2 space-y-1.5 text-[0.78rem] leading-5 text-white/52">
              {payload.summary.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>
          ) : null}
          {visibleArtifacts.length ? (
            <div className="mt-3 space-y-1.5">
              {visibleArtifacts.map((artifact) => (
                <div
                  key={`${artifact.kind}-${artifact.path}-${artifact.title}`}
                  className="flex min-w-0 items-center gap-2 rounded-[10px] bg-white/[0.045] px-2.5 py-2"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-white/34" />
                  <span className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold text-white/58">
                    {artifactKindLabel(artifact.kind)} · {artifact.title}
                  </span>
                  <ArtifactStatusPill status={artifact.status} />
                </div>
              ))}
              {hiddenCount ? (
                <p className="px-1 text-[0.68rem] font-semibold text-white/30">
                  Еще {hiddenCount} подготовлено в разделе «Заявки и данные».
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssistantWorkStepBody({ step }: { step: Extract<ChatMessage, { role: "assistant" }> }) {
  const payload = step.payload;

  if (payload?.kind === "site_plan") {
    return (
      <div className="mt-2 max-w-[620px]">
        <AssistantPlanCard
          text={step.text}
          payload={payload}
          disabled
          showActions={false}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </div>
    );
  }

  if (payload?.kind === "site_brief") {
    return (
      <div className="mt-2 max-w-[620px]">
        <AssistantBriefCard
          payload={payload}
          disabled
          showActions={false}
          onAnswer={() => undefined}
        />
      </div>
    );
  }

  if (step.status === "План") {
    return (
      <div className="mt-2 max-w-[620px]">
        <AssistantPlanCard
          text={step.text}
          payload={null}
          disabled
          showActions={false}
          onApprove={() => undefined}
          onReject={() => undefined}
        />
      </div>
    );
  }

  if (step.status === "Вопрос") {
    return (
      <div className="mt-2 max-w-[620px]">
        <AssistantClarificationCard
          text={step.text}
          disabled
          showActions={false}
          onAnswer={() => undefined}
        />
      </div>
    );
  }

  if (payload?.kind === "supabase_connection_gate") {
    return (
      <div className="mt-2 max-w-[620px]">
        <AssistantSupabaseGateCard
          payload={payload}
          disabled
          showActions={false}
          onConnect={() => undefined}
          onDefer={() => undefined}
          onRetry={() => undefined}
        />
      </div>
    );
  }

  if (payload?.kind === "backend_artifacts") {
    return <AssistantBackendArtifactsCard payload={payload} />;
  }

  return <WorkLogStatusCard step={step} />;
}

function formatWorkStepCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} этап`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} этапа`;

  return `${count} этапов`;
}

function AssistantWorkLogDisclosure({ steps, className = "mt-4" }: { steps: ChatMessage[]; className?: string }) {
  if (steps.length === 0) return null;

  return (
    <details className={`group max-w-[660px] rounded-[16px] border border-white/[0.07] bg-white/[0.025] ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[0.78rem] font-semibold text-white/52 transition hover:text-white/72 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" strokeWidth={2} />
        <span>Ход работы</span>
        <span className="ml-auto text-white/32">{formatWorkStepCount(steps.length)}</span>
      </summary>
      <ol className="space-y-3 border-t border-white/[0.06] px-3.5 py-3.5">
        {steps.map((step, index) => {
          if (step.role !== "assistant") return null;

          const label = getAssistantStatusLabel(step.status ?? "Этап", step.text);

          return (
            <li key={`${step.status ?? "step"}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.08] bg-black/20 text-[0.66rem] font-semibold text-white/36">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[0.78rem] font-semibold text-white/60">{label}</p>
                <AssistantWorkStepBody step={step} />
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}

const quickSitePrompts: Array<{
  label: string;
  prompt: string;
  icon: typeof Wand2;
}> = [
  {
    label: "Создать сайт для отеля",
    prompt: "Создать сайт для отеля: первый экран, номера, преимущества, бронирование и контакты.",
    icon: BedDouble,
  },
  {
    label: "Создать сайт для кофейни",
    prompt: "Создать сайт для кофейни: атмосфера, меню, преимущества, карта и кнопка для заявки.",
    icon: Coffee,
  },
  {
    label: "Создать сайт для услуг",
    prompt: "Создать сайт для услуг: оффер, преимущества, этапы работы, отзывы и форма заявки.",
    icon: BriefcaseBusiness,
  },
];

const CHAT_TITLE_MAX_LENGTH = 36;
const SUPABASE_GATE_RESUME_ACTION_PREFIX = "webbrain:supabaseGateResume:";

function limitChatTitle(value: string) {
  return Array.from(value).slice(0, CHAT_TITLE_MAX_LENGTH).join("");
}

function makeLocalWorkTitle(text: string) {
  const clean = text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[<>`*_#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "Проект сайта";

  const lower = clean.toLocaleLowerCase("ru-RU");
  if (/(кофе|кофейн|coffee|cafe|кафе)/i.test(lower)) return "Сайт кофейни";
  if (/(ресторан|столик|брон|бар\b)/i.test(lower)) return "Бронь столиков";
  if (/(отел|гостиниц|номер|hotel)/i.test(lower)) return "Сайт отеля";
  if (/(салон|красот|маникюр|barber|барбершоп)/i.test(lower)) return "Сайт салона";
  if (/(магазин|каталог|товар|заказ)/i.test(lower)) return "Интернет-магазин";

  const stripped = clean
    .split(/[.!?\n]/)[0]
    .replace(/^(пожалуйста|плиз|срочно|короче|так|слушай|смотри)[,\s]+/i, "")
    .replace(/^(создай|сделай|собери|сгенерируй|разработай|нужно|надо|хочу|давай)\s+/i, "")
    .replace(/^(мне|нам)\s+/i, "")
    .replace(/^(сайт|лендинг|страницу|проект)\s+(для|под|про)?\s*/i, "")
    .replace(/^(для|под|про)\s+/i, "")
    .trim();
  const title = stripped.split(/\s+/).filter(Boolean).slice(0, 5).join(" ").replace(/[:,;]+$/g, "").trim();

  if (!title) return "Проект сайта";

  return title.charAt(0).toLocaleUpperCase("ru-RU") + title.slice(1);
}

function supabaseGateResumeActionKey(projectId: string) {
  return `${SUPABASE_GATE_RESUME_ACTION_PREFIX}${projectId}`;
}

function readSupabaseGateResumeAction(projectId: string): WebBrainSupabaseGatePayload["resumeAction"] | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(supabaseGateResumeActionKey(projectId));

  return value === "continue_after_supabase_connection" || value === "connect_database" ? value : null;
}

function writeSupabaseGateResumeAction(projectId: string, action: WebBrainSupabaseGatePayload["resumeAction"]) {
  if (typeof window === "undefined" || !action) return;

  window.localStorage.setItem(supabaseGateResumeActionKey(projectId), action);
}

function clearSupabaseGateResumeAction(projectId: string) {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(supabaseGateResumeActionKey(projectId));
}

function parsePlanMessage(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || "План сайта";
  const steps: string[] = [];
  const assumptions: string[] = [];
  const notes: string[] = [];
  let section: "steps" | "assumptions" | "notes" = "steps";

  for (const line of lines.slice(1)) {
    if (/^допущения:?$/i.test(line)) {
      section = "assumptions";
      continue;
    }

    if (/подтвердите план/i.test(line)) {
      notes.push(line);
      section = "notes";
      continue;
    }

    const stepMatch = line.match(/^\d+\.\s*(.+)$/);
    const assumptionMatch = line.match(/^-\s*(.+)$/);

    if (section === "steps" && stepMatch) {
      steps.push(stepMatch[1]);
      continue;
    }

    if (section === "assumptions" && assumptionMatch) {
      assumptions.push(assumptionMatch[1]);
      continue;
    }

    if (section === "assumptions") {
      assumptions.push(line);
      continue;
    }

    notes.push(line);
  }

  return { title, steps, assumptions, notes };
}

type ClarificationChoice = {
  label: string;
  text: string;
  recommended: boolean;
};

function defaultClarificationChoices(question: string): ClarificationChoice[] {
  return [
    {
      label: "Доверяю WebBrain",
      text: `Выбираю рекомендованный вариант. Ответ на вопрос: ${question}. Подбери лучший стиль, структуру и акценты сам.`,
      recommended: true,
    },
    {
      label: "Премиально и спокойно",
      text: "Хочу премиальный спокойный сайт: чистая типографика, доверие, сильный первый экран, понятные блоки и аккуратные CTA.",
      recommended: false,
    },
    {
      label: "Ярко и продающе",
      text: "Хочу яркий коммерческий сайт: больше акцента на заявке, бронировании или покупке, выразительные секции и заметные кнопки.",
      recommended: false,
    },
  ];
}

function parseClarificationMessage(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const questionLabelIndex = lines.findIndex((line) => /^вопрос:?$/i.test(line));
  const optionsLabelIndex = lines.findIndex((line) => /^варианты ответа:?$/i.test(line));
  const legacyQuestion = lines.find((line) => /^\d+\.\s+/.test(line))?.replace(/^\d+\.\s+/, "");
  const question =
    questionLabelIndex >= 0
      ? lines[questionLabelIndex + 1] ?? "Что уточнить перед планом?"
      : legacyQuestion ?? "Что уточнить перед планом?";
  const feedback =
    questionLabelIndex > 0
      ? lines.slice(0, questionLabelIndex).join(" ")
      : legacyQuestion
        ? lines.filter((line) => !/^\d+\.\s+/.test(line)).join(" ")
        : lines[0] ?? "";
  const choices: ClarificationChoice[] = [];

  if (optionsLabelIndex >= 0) {
    for (let index = optionsLabelIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      const choiceMatch = line.match(/^\d+\.\s*(\[Рекомендуется\]\s*)?(.+)$/i);
      const answerMatch = line.match(/^Ответ:\s*(.+)$/i);

      if (choiceMatch) {
        choices.push({
          label: choiceMatch[2].trim(),
          text: choiceMatch[2].trim(),
          recommended: Boolean(choiceMatch[1]),
        });
        continue;
      }

      if (answerMatch && choices.length > 0) {
        choices[choices.length - 1] = {
          ...choices[choices.length - 1],
          text: answerMatch[1].trim(),
        };
      }
    }
  }

  const normalizedChoices = choices.length ? choices.slice(0, 3) : defaultClarificationChoices(question);
  const recommendedIndex = normalizedChoices.findIndex((choice) => choice.recommended);

  return {
    feedback,
    question,
    choices: normalizedChoices.map((choice, index) => ({
      ...choice,
      recommended: recommendedIndex === -1 ? index === 0 : index === recommendedIndex,
    })),
  };
}

function AssistantClarificationCard({
  text,
  disabled,
  showActions,
  onAnswer,
}: {
  text: string;
  disabled: boolean;
  showActions: boolean;
  onAnswer: (answer: string) => void;
}) {
  const clarification = parseClarificationMessage(text);
  const [customAnswer, setCustomAnswer] = useState("");

  function submitCustomAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = customAnswer.trim();

    if (!value || disabled || !showActions) return;

    onAnswer(value);
    setCustomAnswer("");
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-white/[0.085] bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.024))] shadow-[0_18px_54px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/[0.06] px-4 py-3.5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[0.68rem] font-semibold text-white/44">
          <CircleHelp className="h-3 w-3" />
          Вопрос
        </div>
        {clarification.feedback ? (
          <p className="mb-2.5 text-[0.82rem] leading-5 text-white/48">{clarification.feedback}</p>
        ) : null}
        <h3 className="text-[0.96rem] font-semibold leading-6 text-white/90">{clarification.question}</h3>
      </div>

      <div className="space-y-3.5 px-4 py-4">
        <div className="grid gap-2">
          {clarification.choices.map((choice, index) => (
            <button
              key={`${choice.label}-${index}`}
              type="button"
              onClick={() => onAnswer(choice.text)}
              disabled={disabled || !showActions}
              className={`group flex min-h-11 items-center justify-between gap-3 rounded-[12px] border px-3 py-2.5 text-left transition ${
                choice.recommended
                  ? "border-lime/22 bg-lime/[0.065] hover:border-lime/42 hover:bg-lime/[0.09]"
                  : "border-white/[0.065] bg-black/[0.13] hover:border-white/[0.13] hover:bg-white/[0.045]"
              } disabled:cursor-not-allowed disabled:opacity-48`}
            >
              <span className="min-w-0">
                <span className="block text-[0.84rem] font-semibold leading-5 text-white/78">{choice.label}</span>
                <span className="mt-0.5 block text-[0.74rem] leading-5 text-white/42">{choice.text}</span>
              </span>
              {choice.recommended ? (
                <span className="shrink-0 rounded-full border border-lime/20 bg-lime/[0.08] px-2 py-1 text-[0.64rem] font-semibold text-lime/74">
                  Рекомендовано
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {showActions ? (
          <form onSubmit={submitCustomAnswer} className="flex flex-col gap-2 border-t border-white/[0.055] pt-3.5 sm:flex-row">
            <input
              value={customAnswer}
              onChange={(event) => setCustomAnswer(event.target.value)}
              disabled={disabled}
              placeholder="Или напишите свой ответ..."
              className="min-h-9 min-w-0 flex-1 rounded-[11px] border border-white/[0.07] bg-black/[0.16] px-3 text-[0.84rem] text-white outline-none transition placeholder:text-white/30 focus:border-lime/60 disabled:cursor-not-allowed disabled:opacity-48"
            />
            <button
              type="submit"
              disabled={disabled || !customAnswer.trim()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[11px] bg-white px-3.5 text-[0.84rem] font-semibold text-black transition hover:bg-lime disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="h-3.5 w-3.5" />
              Ответить
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function AssistantBriefCard({
  payload,
  disabled,
  showActions,
  onAnswer,
}: {
  payload: WebBrainSiteBriefPayload;
  disabled: boolean;
  showActions: boolean;
  onAnswer: (answer: string, runId?: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      payload.questions.map((question) => [
        question.id,
        question.options.find((option) => option.recommended)?.text ?? "",
      ]),
    ),
  );
  const [customAnswer, setCustomAnswer] = useState("");
  const requiredQuestions = payload.questions.filter((question) => question.required !== false);
  const canSubmit = requiredQuestions.every((question) => answers[question.id]?.trim());
  const stageLabel =
    payload.stageTitle ??
    (payload.stage === "business_qualification"
      ? "Квалификация бизнеса"
      : payload.stage === "site_logic"
        ? "Логика сайта"
        : payload.stage === "design_direction"
          ? "Дизайн сайта"
      : payload.stage === "critical_followup"
        ? "Уточнение"
        : "Brief");

  function submitBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !showActions || !canSubmit) return;

    const lines = payload.questions.map((question) => {
      const value = answers[question.id]?.trim() || question.options.find((option) => option.recommended)?.text || "Используй рекомендованный вариант WebBrain.";
      return `- ${question.title}: ${value}`;
    });
    const custom = customAnswer.trim();

    onAnswer(
      [
        "Ответы на brief:",
        ...lines,
        custom ? `Дополнение: ${custom}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      payload.runId,
    );
  }

  return (
    <form onSubmit={submitBrief} className="overflow-hidden rounded-[16px] border border-white/[0.085] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.026))] shadow-[0_20px_60px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="border-b border-white/[0.065] px-4 py-3.5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lime/15 bg-lime/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-lime/70">
          <CircleHelp className="h-3 w-3" />
          {stageLabel}
        </div>
        <p className="text-[0.86rem] leading-5 text-white/52">{payload.feedback}</p>
        {payload.stageSummary ? <p className="mt-2 text-[0.76rem] leading-5 text-white/40">{payload.stageSummary}</p> : null}
        {payload.summary ? <p className="mt-2 text-[0.76rem] leading-5 text-white/34">{payload.summary}</p> : null}
      </div>

      <div className="space-y-3.5 px-4 py-4">
        {payload.questions.map((question) => (
          <div key={question.id} className="rounded-[14px] border border-white/[0.06] bg-black/[0.13] p-3">
            <div className="mb-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/34">
                  {question.title}
                </span>
                {question.required !== false ? <span className="text-[0.62rem] font-semibold text-lime/55">обязательно</span> : null}
              </div>
              <h3 className="text-[0.92rem] font-semibold leading-5 text-white/86">{question.question}</h3>
              {question.helper ? <p className="mt-1 text-[0.74rem] leading-5 text-white/38">{question.helper}</p> : null}
            </div>

            <div className="grid gap-2">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === option.text;
                return (
                  <button
                    key={`${question.id}-${option.label}-${index}`}
                    type="button"
                    disabled={disabled || !showActions}
                    onClick={() => setAnswers((items) => ({ ...items, [question.id]: option.text }))}
                    className={`group flex min-h-10 items-center justify-between gap-3 rounded-[11px] border px-3 py-2 text-left transition ${
                      selected
                        ? "border-lime/55 bg-lime/[0.095] text-white shadow-[inset_0_1px_0_rgba(190,255,76,0.12)]"
                        : "border-white/[0.055] bg-white/[0.02] text-white/60 hover:border-white/[0.12] hover:bg-white/[0.045]"
                    } disabled:cursor-not-allowed disabled:opacity-48`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.84rem] font-semibold leading-5">{option.label}</span>
                      <span className="mt-0.5 block text-[0.74rem] leading-5 text-white/38">{option.text}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {option.recommended ? (
                        <span className="rounded-full border border-lime/20 bg-lime/[0.08] px-2 py-1 text-[0.62rem] font-semibold text-lime/72">
                          Рекомендовано
                        </span>
                      ) : null}
                      {selected ? <CheckCircle2 className="h-3.5 w-3.5 text-lime" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {showActions ? (
          <div className="space-y-3 border-t border-white/[0.055] pt-3.5">
            <textarea
              value={customAnswer}
              onChange={(event) => setCustomAnswer(event.target.value)}
              disabled={disabled}
              placeholder="Можно добавить свой ответ или важные детали..."
              className="min-h-16 w-full resize-none rounded-[12px] border border-white/[0.07] bg-black/[0.16] px-3 py-2.5 text-[0.84rem] leading-5 text-white outline-none transition placeholder:text-white/30 focus:border-lime/60 disabled:cursor-not-allowed disabled:opacity-48"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={disabled || !canSubmit}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-lime px-3.5 text-[0.84rem] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-3.5 w-3.5" />
                Ответить и продолжить
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setAnswers(
                    Object.fromEntries(
                      payload.questions.map((question) => [
                        question.id,
                        question.options.find((option) => option.recommended)?.text ?? "",
                      ]),
                    ),
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 text-[0.84rem] font-semibold text-white/58 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Рекомендованные ответы
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function AssistantPlanCard({
  text,
  payload,
  disabled,
  showActions,
  onApprove,
  onReject,
}: {
  text: string;
  payload?: WebBrainSitePlanPayload | null;
  disabled: boolean;
  showActions: boolean;
  onApprove: (runId?: string) => void;
  onReject: (runId?: string) => void;
}) {
  const plan = parsePlanMessage(text);
  const sections = payload?.sections ?? [];
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isRevealStarted, setIsRevealStarted] = useState(false);

  useEffect(() => {
    if (isRevealStarted) return;

    const element = cardRef.current;
    if (!element) return;

    // Safety net: the card body is clipped + blurred until revealed, so it must
    // never stay stuck. The IntersectionObserver below can legitimately never
    // fire — e.g. the latest plan card is pinned to the bottom of the chat and
    // lands inside the rootMargin exclusion zone, so a tall card never reaches
    // the threshold. This timer guarantees the reveal always runs.
    const fallback = window.setTimeout(() => setIsRevealStarted(true), 500);

    if (typeof IntersectionObserver === "undefined") {
      window.clearTimeout(fallback);
      const frame = window.requestAnimationFrame(() => setIsRevealStarted(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setIsRevealStarted(true);
        observer.disconnect();
      },
      {
        root: null,
        threshold: 0.22,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(element);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [isRevealStarted]);

  return (
    <motion.div
      ref={cardRef}
      initial={false}
      animate={{
        opacity: isRevealStarted ? 1 : 0.28,
        filter: isRevealStarted ? "blur(0px)" : "blur(10px)",
      }}
      transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[16px] border border-white/[0.085] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.026))] shadow-[0_18px_54px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      {isRevealStarted ? <PlanParticleBuildEffect /> : null}
      <motion.div
        initial={false}
        animate={{
          clipPath: isRevealStarted
            ? "polygon(0 0, 150% 0, 100% 150%, 0 100%)"
            : "polygon(0 0, 0 0, 0 0, 0 0)",
          opacity: isRevealStarted ? 1 : 0.42,
        }}
        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <div className="border-b border-white/[0.065] px-4 py-3.5">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-lime/15 bg-lime/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-lime/70">
            <ClipboardList className="h-3 w-3" />
            План
          </div>
          <h3 className="text-[1rem] font-semibold leading-6 text-white/92">{payload?.title ?? plan.title}</h3>
          {payload?.backendApplyStatus ? (
            <p className="mt-2 text-[0.74rem] leading-5 text-white/38">
              Заявки и данные: {payload.backendApplyStatus === "needs_connection" ? "подключим отдельным этапом" : payload.backendApplyStatus === "not_required" ? "не требуются" : "подготовим и включим"}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 px-4 py-4">
          {sections.length ? (
            <div className="grid gap-2.5">
              {sections.map((section) => (
                <div key={section.id} className="rounded-[13px] border border-white/[0.06] bg-black/[0.15] px-3.5 py-2.5">
                  <p className="mb-2 text-[0.86rem] font-semibold text-white/82">{section.title}</p>
                  <ul className="space-y-1.5 text-[0.82rem] leading-5 text-white/62">
                    {section.items.map((item, index) => (
                      <li key={`${section.id}-${item}-${index}`} className="flex gap-2">
                        <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-lime/55" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : plan.steps.length ? (
            <ol className="space-y-2.5">
              {plan.steps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-2.5 text-[0.86rem] leading-6 text-white/76">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[0.68rem] font-semibold text-white/46">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="whitespace-pre-line text-[0.86rem] leading-6 text-white/74">{text}</p>
          )}

          {(payload?.assumptions.length || plan.assumptions.length) ? (
            <div className="rounded-[13px] border border-white/[0.06] bg-black/[0.16] px-3.5 py-2.5">
              <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/34">Допущения</p>
              <ul className="space-y-1.5 text-[0.82rem] leading-5 text-white/62">
                {(payload?.assumptions ?? plan.assumptions).map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2">
                    <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-lime/55" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {plan.notes.length ? <p className="text-[0.82rem] leading-5 text-white/48">{plan.notes.join(" ")}</p> : null}

          {showActions ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => onApprove(payload?.runId)}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-lime px-3.5 text-[0.84rem] font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Подтвердить план
              </button>
              <button
                type="button"
                onClick={() => onReject(payload?.runId)}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 text-[0.84rem] font-semibold text-white/62 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <X className="h-3.5 w-3.5" />
                Отклонить
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlanParticleBuildEffect() {
  const particles = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => {
        const column = index % 11;
        const row = Math.floor(index / 11);
        const stagger = (column + row) * 0.045;

        return {
          id: index,
          left: 5 + column * 9 + ((row * 7) % 5),
          top: 8 + row * 22 + ((column * 5) % 8),
          size: 2 + ((index * 3) % 4),
          delay: stagger,
          driftX: 12 + ((index * 11) % 28),
          driftY: 8 + ((index * 7) % 24),
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <motion.div
        className="absolute -left-1/3 -top-1/2 h-[88%] w-[52%] rotate-[-22deg] bg-[linear-gradient(90deg,transparent,rgba(190,255,76,0.18),rgba(255,255,255,0.16),transparent)] blur-xl"
        initial={{ x: "-65%", y: "-35%", opacity: 0 }}
        animate={{ x: "260%", y: "150%", opacity: [0, 0.72, 0] }}
        transition={{ duration: 1.18, ease: [0.16, 1, 0.3, 1] }}
      />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-lime shadow-[0_0_18px_rgba(190,255,76,0.55)]"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
          }}
          initial={{
            x: -particle.driftX,
            y: -particle.driftY,
            opacity: 0,
            scale: 0.15,
          }}
          animate={{
            x: [ -particle.driftX, 0, particle.driftX * 0.18 ],
            y: [ -particle.driftY, 0, particle.driftY * 0.16 ],
            opacity: [0, 0.95, 0.58, 0],
            scale: [0.15, 1.25, 0.82, 0.35],
          }}
          transition={{
            duration: 0.95,
            delay: particle.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </div>
  );
}

function AssistantSupabaseGateCard({
  payload,
  disabled,
  showActions,
  onConnect,
  onDefer,
  onRetry,
}: {
  payload: WebBrainSupabaseGatePayload;
  disabled: boolean;
  showActions: boolean;
  onConnect: (payload: WebBrainSupabaseGatePayload) => void;
  onDefer: (runId?: string) => void;
  onRetry: (runId?: string) => void;
}) {
  const isDone = payload.state === "done";
  const isError = payload.state === "error";
  const isApplying = payload.state === "applying";
  const canConnect = !isDone && !isApplying;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-[16px] border px-4 py-4 shadow-[0_18px_54px_rgba(0,0,0,0.22)] ${
        isError
          ? "border-transparent bg-[linear-gradient(180deg,rgba(96,24,29,0.18),rgba(12,13,13,0.78))]"
          : "border-transparent bg-[radial-gradient(circle_at_18%_0%,rgba(62,207,142,0.11),transparent_36%),linear-gradient(180deg,rgba(18,25,23,0.92),rgba(12,13,13,0.82))]"
      }`}
    >
      <div className="relative z-10 flex gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[13px] ${
            isError ? "bg-red-400/[0.09] text-red-100" : "bg-[#3ecf8e]/10 text-[#3ecf8e]"
          }`}
        >
          {isError ? <TriangleAlert className="h-5 w-5" /> : isDone ? <CheckCircle2 className="h-5 w-5" /> : <Database className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#34422f] bg-lime/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-lime/70">
            <Database className="h-3 w-3" />
            Данные сайта
          </div>
          <h3 className="text-[1rem] font-semibold leading-6 text-white/92">{payload.title}</h3>
          <div className="mt-2 space-y-1 text-[0.84rem] leading-5 text-white/56">
            {payload.summary.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
          {canConnect && showActions ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onConnect(payload)}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#3ecf8e] px-3.5 text-[0.84rem] font-semibold text-[#06140f] transition hover:bg-[#56eba4] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {payload.state === "error" || payload.state === "project_select" ? "Выбрать проект" : "Подключить Supabase"}
              </button>
              {payload.canDefer ? (
                <button
                  type="button"
                  onClick={() => onDefer(payload.runId)}
                  disabled={disabled}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-[#2d3231] bg-[#171a19] px-3.5 text-[0.84rem] font-semibold text-white/48 transition hover:bg-[#1d2220] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Позже
                </button>
              ) : null}
              {isError ? (
                <button
                  type="button"
                  onClick={() => onRetry(payload.runId)}
                  disabled={disabled}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-lime/18 bg-lime/[0.06] px-3.5 text-[0.84rem] font-semibold text-lime transition hover:bg-lime/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Повторить
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function BackendPanel({
  open,
  loading,
  artifacts,
  projectName,
  connectionStatus,
  loadingConnection,
  supabaseProjects,
  supabaseOrganizations,
  supabaseTables,
  loadingSupabaseProjects,
  loadingSupabaseTables,
  supabaseTablesError,
  creatingSupabaseProject,
  createSupabaseProjectError,
  disconnectingSupabase,
  selectingSupabaseProject,
  onConnectSupabase,
  onDisconnectSupabase,
  onCreateSupabaseProject,
  onSelectSupabaseProject,
  onRefreshSupabaseTables,
  onLoadSupabaseTablePreview,
  onExecuteSupabaseSql,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  artifacts: WebBrainProjectArtifact[];
  projectName?: string;
  connectionStatus: WebBrainSupabaseConnectionStatus | null;
  loadingConnection: boolean;
  supabaseProjects: WebBrainSupabaseProjectOption[];
  supabaseOrganizations: WebBrainSupabaseOrganizationOption[];
  supabaseTables: WebBrainSupabaseTableOption[];
  loadingSupabaseProjects: boolean;
  loadingSupabaseTables: boolean;
  supabaseTablesError: string | null;
  creatingSupabaseProject: boolean;
  createSupabaseProjectError: string | null;
  disconnectingSupabase: boolean;
  selectingSupabaseProject: boolean;
  onConnectSupabase: () => void;
  onDisconnectSupabase: () => void;
  onCreateSupabaseProject: (input: CreateSupabaseProjectInput) => void;
  onSelectSupabaseProject: (project: WebBrainSupabaseProjectOption) => void;
  onRefreshSupabaseTables: () => void;
  onLoadSupabaseTablePreview: (table: WebBrainSupabaseTableOption) => Promise<WebBrainSupabaseTablePreview>;
  onExecuteSupabaseSql: (query: string) => Promise<WebBrainSupabaseSqlResult>;
  onClose: () => void;
}) {
  const safeSupabaseProjects = supabaseProjects ?? [];
  const safeSupabaseOrganizations = supabaseOrganizations ?? [];
  const safeSupabaseTables = useMemo(() => supabaseTables ?? [], [supabaseTables]);
  const [activeDataTab, setActiveDataTab] = useState<"project" | "tables" | "sql">("project");
  const [tableSchemaFilter, setTableSchemaFilter] = useState("public");
  const [newSupabaseProjectName, setNewSupabaseProjectName] = useState("");
  const [newSupabaseProjectRegion, setNewSupabaseProjectRegion] = useState("eu-central-1");
  const [newSupabaseProjectPassword, setNewSupabaseProjectPassword] = useState("");
  const [selectedOrganizationSlug, setSelectedOrganizationSlug] = useState("");
  const [artifactsPanelOpen, setArtifactsPanelOpen] = useState(false);
  const [createProjectPanelOpen, setCreateProjectPanelOpen] = useState(false);
  const [regionListOpen, setRegionListOpen] = useState(false);
  const [openedSupabaseProjectRef, setOpenedSupabaseProjectRef] = useState("");
  const [openedSupabaseTable, setOpenedSupabaseTable] = useState<WebBrainSupabaseTableOption | null>(null);
  const [supabaseTablePreview, setSupabaseTablePreview] = useState<WebBrainSupabaseTablePreview | null>(null);
  const [loadingSupabaseTablePreview, setLoadingSupabaseTablePreview] = useState(false);
  const [supabaseTablePreviewError, setSupabaseTablePreviewError] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState("select *\nfrom public.\nlimit 100;");
  const [sqlResult, setSqlResult] = useState<WebBrainSupabaseSqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isRunningSql, setIsRunningSql] = useState(false);
  const supabaseConnected = Boolean(connectionStatus?.connected);
  const selectedProject = connectionStatus?.connection?.projectRef
    ? safeSupabaseProjects.find((project) => project.ref === connectionStatus.connection?.projectRef) ?? null
    : null;
  const openedProject = openedSupabaseProjectRef
    ? safeSupabaseProjects.find((project) => project.ref === openedSupabaseProjectRef) ?? selectedProject
    : selectedProject;
  const selectedOrganization = safeSupabaseOrganizations.find((organization) => organization.slug === selectedOrganizationSlug) ?? safeSupabaseOrganizations[0] ?? null;
  const selectedRegion = SUPABASE_REGION_OPTIONS.find((region) => region.value === newSupabaseProjectRegion) ?? SUPABASE_REGION_OPTIONS[0];
  const customDbPassword = newSupabaseProjectPassword.trim();
  const dbPasswordTooShort = customDbPassword.length > 0 && customDbPassword.length < 12;
  const tableSchemaOptions = useMemo(() => {
    const schemaCounts = safeSupabaseTables.reduce<Record<string, number>>((counts, table) => {
      counts[table.schema] = (counts[table.schema] ?? 0) + 1;
      return counts;
    }, {});
    const schemas = Object.keys(schemaCounts).sort((left, right) => {
      if (left === "public") return -1;
      if (right === "public") return 1;
      return left.localeCompare(right);
    });
    const normalizedSchemas = schemas.includes("public") ? schemas : ["public", ...schemas];

    return normalizedSchemas.map((schema) => ({
      schema,
      count: schemaCounts[schema] ?? 0,
    }));
  }, [safeSupabaseTables]);
  const filteredSupabaseTables = useMemo(
    () => safeSupabaseTables.filter((table) => table.schema === tableSchemaFilter),
    [safeSupabaseTables, tableSchemaFilter]
  );
  const previewColumns = supabaseTablePreview?.columns ?? [];
  const sqlResultColumns = sqlResult?.columns ?? [];
  const dashboardBaseUrl = connectionStatus?.connection?.projectRef ? `https://supabase.com/dashboard/project/${connectionStatus.connection.projectRef}` : "";
  const openedProjectDashboardUrl = openedProject?.ref ? `https://supabase.com/dashboard/project/${openedProject.ref}` : dashboardBaseUrl;
  const tableEditorUrl = openedProjectDashboardUrl ? `${openedProjectDashboardUrl}/editor` : "";
  const sqlEditorUrl = openedProjectDashboardUrl ? `${openedProjectDashboardUrl}/sql/new` : "";
  const enterSupabaseProject = (project: WebBrainSupabaseProjectOption) => {
    if (connectionStatus?.connection?.projectRef !== project.ref) {
      onSelectSupabaseProject(project);
    }

    setOpenedSupabaseProjectRef(project.ref);
    setTableSchemaFilter("public");
    setActiveDataTab("tables");
  };
  const returnToSupabaseProjects = () => {
    setOpenedSupabaseProjectRef("");
    setActiveDataTab("project");
  };
  const openSupabaseTablePreview = async (table: WebBrainSupabaseTableOption) => {
    setOpenedSupabaseTable(table);
    setSupabaseTablePreview(null);
    setSupabaseTablePreviewError(null);
    setLoadingSupabaseTablePreview(true);

    try {
      const preview = await onLoadSupabaseTablePreview(table);
      setSupabaseTablePreview(preview);
    } catch (error) {
      setSupabaseTablePreviewError(error instanceof Error ? error.message : "Не удалось открыть таблицу.");
    } finally {
      setLoadingSupabaseTablePreview(false);
    }
  };
  const closeSupabaseTablePreview = () => {
    setOpenedSupabaseTable(null);
    setSupabaseTablePreview(null);
    setSupabaseTablePreviewError(null);
    setLoadingSupabaseTablePreview(false);
  };
  const runSupabaseSql = async () => {
    const query = sqlQuery.trim();

    if (!query) {
      setSqlError("Напишите SQL-запрос перед запуском.");
      return;
    }

    const mutatingQuery = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|security|policy)\b/i.test(query);

    if (mutatingQuery && !window.confirm("Этот SQL может изменить базу данных. Запустить запрос?")) {
      return;
    }

    setIsRunningSql(true);
    setSqlError(null);

    try {
      const result = await onExecuteSupabaseSql(query);
      setSqlResult(result);
      void onRefreshSupabaseTables();
    } catch (error) {
      setSqlResult(null);
      setSqlError(error instanceof Error ? error.message : "Не удалось выполнить SQL-запрос.");
    } finally {
      setIsRunningSql(false);
    }
  };
  const artifactGroups = useMemo(() => {
    return artifacts.reduce<Record<string, WebBrainProjectArtifact[]>>((groups, artifact) => {
      const key = artifact.kind;
      groups[key] = [...(groups[key] ?? []), artifact];
      return groups;
    }, {});
  }, [artifacts]);
  const effectiveDataTab = supabaseConnected ? activeDataTab : "project";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Закрыть панель заявок и данных"
            className="fixed inset-0 z-40 cursor-default bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-[24px] border border-transparent bg-[#181a1b]/96 shadow-[0_28px_90px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(62,207,142,0.045)] backdrop-blur-2xl md:inset-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#3ecf8e]/[0.045] px-5 py-4 md:px-7">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#3ecf8e]/20 bg-[#3ecf8e]/10 px-2.5 py-1 text-[0.72rem] font-bold text-[#3ecf8e]/80">
                  <Database className="h-3.5 w-3.5" />
                  Заявки и данные
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl font-semibold tracking-[-0.01em] text-white">Данные сайта</h2>
                  {projectName ? <span className="rounded-full bg-white/[0.035] px-2.5 py-1 text-xs font-semibold text-white/42">{projectName}</span> : null}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/46">Подключите проект для заявок, форм и рабочих данных. Таблицы и SQL доступны внутри выбранного проекта.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {dashboardBaseUrl ? (
                  <a href={dashboardBaseUrl} target="_blank" rel="noreferrer" aria-label="Открыть проект в Supabase" title="Открыть проект в Supabase" className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#3ecf8e]/10 text-[#3ecf8e] transition hover:bg-[#3ecf8e]/16">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-8 w-8 place-items-center rounded-[9px] text-white/42 transition hover:bg-white/[0.07] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 md:px-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {effectiveDataTab === "project" ? (
                    <span className="inline-flex h-10 items-center rounded-[12px] bg-[#1f2b26] px-4 text-sm font-semibold text-[#b8f7dc]">
                      Проекты
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={returnToSupabaseProjects}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#202223]/55 px-3.5 text-sm font-semibold text-white/56 transition hover:bg-[#242827] hover:text-white/78"
                      >
                        <LogIn className="h-4 w-4 rotate-180" />
                        Назад
                      </button>
                      <span className="max-w-[220px] truncate px-2 text-sm font-semibold text-white/70">
                        {openedProject?.name || "Проект данных"}
                      </span>
                      {[
                        { key: "tables" as const, label: "Таблицы" },
                        { key: "sql" as const, label: "SQL редактор" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveDataTab(tab.key)}
                          className={`h-10 rounded-[12px] px-4 text-sm font-semibold transition ${
                            effectiveDataTab === tab.key
                              ? "bg-[#1f2b26] text-[#b8f7dc]"
                              : "bg-[#202223]/55 text-white/46 hover:bg-[#242827] hover:text-white/72"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setArtifactsPanelOpen(true)}
                    aria-label="Открыть подготовленные настройки"
                    title="Подготовленные настройки"
                    className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-white/[0.025] text-white/46 transition hover:bg-[#1f2926] hover:text-[#b8f7dc]"
                  >
                    <FileCode2 className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#202223] px-1 text-[0.62rem] font-bold leading-none text-white/70">
                      {artifacts.length}
                    </span>
                  </button>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-[11px] transition ${
                      loadingConnection
                        ? "bg-white/[0.025] text-white/48"
                        : connectionStatus?.connected
                          ? "bg-[#3ecf8e]/10 text-[#3ecf8e]"
                          : "bg-white/[0.025] text-white/45"
                    }`}
                    title={loadingConnection ? "Проверяю подключение" : connectionStatus?.connected ? "Supabase подключен" : "Supabase не подключен"}
                  >
                    {loadingConnection ? <Database className="h-4 w-4 animate-pulse" /> : connectionStatus?.connected ? <CheckCircle2 className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                  </span>
                  {connectionStatus?.connected ? (
                    <button
                      type="button"
                      onClick={onDisconnectSupabase}
                      disabled={disconnectingSupabase}
                      aria-label="Выйти из Supabase"
                      title="Выйти из Supabase"
                      className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/[0.025] text-white/42 transition hover:bg-red-400/[0.08] hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnectSupabase}
                      aria-label="Подключить Supabase"
                      title="Подключить Supabase"
                      className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#3ecf8e]/10 text-[#3ecf8e] transition hover:bg-[#3ecf8e]/16"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <div className="space-y-4">
                  {connectionStatus && !connectionStatus.configured ? (
                    <div className="rounded-[14px] border border-transparent bg-black/20 px-3 py-2 text-xs leading-5 text-white/42 shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                      Подключение еще не настроено на стороне проекта.
                    </div>
                  ) : null}

              {effectiveDataTab === "project" && !loadingConnection && !supabaseConnected ? (
                <div className="grid min-h-[min(52vh,520px)] place-items-center rounded-[18px] border border-transparent bg-black/[0.16] px-6 py-12 text-center shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                  <div className="mx-auto flex max-w-md flex-col items-center">
                    <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-[18px] bg-[#3ecf8e]/10 text-[#3ecf8e] shadow-[0_0_54px_rgba(62,207,142,0.16),inset_0_0_0_1px_rgba(62,207,142,0.18)]">
                      <Database className="h-7 w-7" />
                      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#111313] bg-[#ef4444]" />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">База данных не подключена</h3>
                    <p className="mt-3 text-sm leading-6 text-white/46">
                      Подключите Supabase, чтобы WebBrain мог сохранять заявки, формы и рабочие данные этого сайта.
                    </p>
                    <button
                      type="button"
                      onClick={onConnectSupabase}
                      className="mt-7 inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#3ecf8e] px-5 text-sm font-extrabold text-[#06140f] shadow-[0_18px_46px_rgba(62,207,142,0.2)] transition hover:bg-[#56eba4] active:scale-[0.99]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Подключить
                    </button>
                  </div>
                </div>
              ) : null}

              {effectiveDataTab === "project" && (supabaseConnected || loadingConnection || loadingSupabaseProjects) ? (
                <div className="rounded-[16px] border border-transparent bg-black/[0.16] p-4 shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white/86">Проект для данных сайта</p>
                      <p className="mt-1 text-sm leading-5 text-white/42">
                        Сюда будут сохраняться заявки, формы и рабочие данные.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateProjectPanelOpen(true)}
                      aria-label="Создать проект для данных"
                      title="Создать проект для данных"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#3ecf8e]/10 text-[#3ecf8e] transition hover:bg-[#3ecf8e]/16"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {loadingConnection || loadingSupabaseProjects ? (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-28 animate-pulse rounded-[15px] bg-white/[0.025]" />
                      ))}
                    </div>
                  ) : safeSupabaseProjects.length ? (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {safeSupabaseProjects.map((project) => {
                        const selected = connectionStatus?.connection?.projectRef === project.ref;

                        return (
                          <div
                            key={`${project.organizationSlug ?? "org"}-${project.ref}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectSupabaseProject(project)}
                            onDoubleClick={() => enterSupabaseProject(project)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                enterSupabaseProject(project);
                              }
                            }}
                            className={`group flex min-h-28 flex-col justify-between rounded-[15px] border border-transparent p-4 text-left transition disabled:cursor-not-allowed ${
                              selected
                                ? "cursor-default bg-[#10241d] text-white shadow-[inset_0_0_0_1px_rgba(62,207,142,0.26),0_14px_34px_rgba(0,0,0,0.16)]"
                                : "cursor-pointer bg-white/[0.025] text-white/62 hover:bg-[#1b2421] hover:text-white"
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block truncate text-base font-semibold">{project.name}</span>
                                <span className="mt-1 block truncate text-xs text-white/34">{project.organizationName || project.organizationSlug || "Supabase"}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  enterSupabaseProject(project);
                                }}
                                disabled={selectingSupabaseProject}
                                aria-label={`Войти в проект ${project.name}`}
                                title="Войти в проект"
                                className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/[0.045] text-white/48 transition hover:bg-[#3ecf8e]/12 hover:text-[#3ecf8e] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <LogIn className="h-4 w-4" />
                              </button>
                              <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${selected ? "bg-[#3ecf8e]/12 text-[#3ecf8e]" : "bg-white/[0.035] text-white/32 group-hover:text-[#b8f7dc]"}`}>
                                {selected ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                              </span>
                              </span>
                            </span>
                            <span className="mt-4 block truncate text-xs font-medium text-white/30">{project.ref}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreateProjectPanelOpen(true)}
                      className="flex min-h-28 w-full items-center justify-center gap-3 rounded-[15px] border border-dashed border-[#3ecf8e]/16 bg-[#3ecf8e]/[0.035] px-4 text-sm font-semibold text-[#b8f7dc]/78 transition hover:bg-[#3ecf8e]/[0.055] hover:text-[#b8f7dc]"
                    >
                      <Plus className="h-4 w-4" />
                      Создать первый проект для данных
                    </button>
                  )}

                  {createSupabaseProjectError ? (
                    <p className="mt-3 rounded-[12px] border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-sm leading-6 text-red-100/78">
                      {createSupabaseProjectError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {effectiveDataTab === "tables" ? (
                <div className="rounded-[16px] border border-transparent bg-black/[0.16] p-4 shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white/86">Таблицы сайта</p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/44">По умолчанию показана схема public. Системные схемы можно открыть фильтром.</p>
                    </div>
                    {tableEditorUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onRefreshSupabaseTables}
                          disabled={loadingSupabaseTables}
                          aria-label="Обновить список таблиц"
                          title="Обновить список таблиц"
                          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.045] text-white/58 transition hover:bg-[#1f2926] hover:text-[#b8f7dc] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingSupabaseTables ? "animate-spin" : ""}`} />
                        </button>
                        <a href={tableEditorUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-transparent bg-white/[0.045] px-4 text-sm font-semibold text-white/76 transition hover:bg-[#1f2926] hover:text-[#b8f7dc]">
                          <ExternalLink className="h-4 w-4" />
                          Открыть таблицы
                        </a>
                      </div>
                    ) : null}
                  </div>
                  {!supabaseTablesError && !loadingSupabaseTables ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {tableSchemaOptions.map((option) => {
                        const active = tableSchemaFilter === option.schema;

                        return (
                          <button
                            key={option.schema}
                            type="button"
                            onClick={() => setTableSchemaFilter(option.schema)}
                            className={`inline-flex h-9 items-center gap-2 rounded-[11px] px-3 text-xs font-semibold transition ${
                              active
                                ? "bg-[#1f2b26] text-[#b8f7dc] shadow-[inset_0_0_0_1px_rgba(62,207,142,0.12)]"
                                : "bg-white/[0.035] text-white/44 hover:bg-white/[0.055] hover:text-white/72"
                            }`}
                          >
                            <span>{option.schema}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${active ? "bg-[#3ecf8e]/12 text-[#b8f7dc]/82" : "bg-white/[0.045] text-white/34"}`}>
                              {option.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {supabaseTablesError ? (
                    <div className="mt-4 rounded-[14px] border border-red-400/16 bg-red-400/[0.06] px-4 py-4 text-sm leading-6 text-red-100/72">
                      {supabaseTablesError}
                    </div>
                  ) : loadingSupabaseTables ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[0, 1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="h-24 animate-pulse rounded-[14px] bg-white/[0.025]" />
                      ))}
                    </div>
                  ) : filteredSupabaseTables.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {filteredSupabaseTables.map((table) => (
                        <div
                          key={`${table.schema}.${table.name}`}
                          role="button"
                          tabIndex={0}
                          onDoubleClick={() => void openSupabaseTablePreview(table)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              void openSupabaseTablePreview(table);
                            }
                          }}
                          className="group rounded-[14px] bg-white/[0.025] p-4 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)] transition hover:bg-white/[0.04] focus:outline-none focus-visible:shadow-[inset_0_0_0_1px_rgba(147,197,253,0.75),0_0_0_4px_rgba(147,197,253,0.12)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white/86">{table.name}</p>
                              <p className="mt-1 truncate text-xs text-white/34">{table.schema}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void openSupabaseTablePreview(table)}
                              aria-label={`Открыть таблицу ${table.schema}.${table.name}`}
                              title="Открыть таблицу"
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#3ecf8e]/10 text-[#3ecf8e] transition hover:bg-[#3ecf8e]/16 group-hover:scale-[1.03]"
                            >
                              <Table2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 text-[0.72rem] font-semibold text-white/42">
                            <span className="rounded-full bg-white/[0.04] px-2 py-1">{table.columnCount} колонок</span>
                            <span className="rounded-full bg-white/[0.04] px-2 py-1">{table.rowEstimate} строк</span>
                            {table.type === "partitioned_table" ? <span className="rounded-full bg-[#3ecf8e]/10 px-2 py-1 text-[#b8f7dc]">partitioned</span> : null}
                          </div>
                          {table.comment ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/34">{table.comment}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[14px] border border-transparent bg-white/[0.025] px-4 py-5 text-sm leading-6 text-white/42">
                      {openedProject ? `В схеме ${tableSchemaFilter} пока нет таблиц.` : "Сначала войдите в проект для данных сайта."}
                    </div>
                  )}
                </div>
              ) : null}

              {effectiveDataTab === "sql" ? (
                <div className="overflow-hidden rounded-[16px] border border-transparent bg-black/[0.16] shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.045] p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white/86">SQL редактор</p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/44">Пишите SQL и запускайте его в выбранном проекте. Для сложных настроек рядом остается Supabase.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {sqlEditorUrl ? (
                        <a href={sqlEditorUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-transparent bg-white/[0.045] px-4 text-sm font-semibold text-white/70 transition hover:bg-[#1f2926] hover:text-[#b8f7dc]">
                          <ExternalLink className="h-4 w-4" />
                          Открыть в Supabase
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void runSupabaseSql()}
                        disabled={!openedProject || isRunningSql || !sqlQuery.trim()}
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11844d] px-4 text-sm font-bold text-white transition hover:bg-[#15945a] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Play className={`h-4 w-4 ${isRunningSql ? "animate-pulse" : "fill-current"}`} />
                        {isRunningSql ? "Выполняю" : "Run"}
                      </button>
                    </div>
                  </div>

                  <div className="grid min-h-[520px] lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="border-b border-white/[0.045] bg-white/[0.018] p-4 lg:border-b-0 lg:border-r">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/34">Быстрые запросы</p>
                      <div className="mt-3 space-y-2">
                        {[
                          { label: "Показать таблицы", query: "select table_schema, table_name\nfrom information_schema.tables\nwhere table_schema = 'public'\norder by table_name;" },
                          { label: "Колонки public", query: "select table_name, column_name, data_type\nfrom information_schema.columns\nwhere table_schema = 'public'\norder by table_name, ordinal_position;" },
                          { label: "Проверить RLS", query: "select schemaname, tablename, rowsecurity\nfrom pg_tables\nwhere schemaname = 'public'\norder by tablename;" },
                        ].map((template) => (
                          <button
                            key={template.label}
                            type="button"
                            onClick={() => setSqlQuery(template.query)}
                            className="block w-full rounded-[12px] bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-white/52 transition hover:bg-[#1f2b26] hover:text-[#b8f7dc]"
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 rounded-[13px] bg-[#3ecf8e]/[0.045] px-3 py-3 text-xs leading-5 text-[#b8f7dc]/62">
                        Изменяющие запросы попросят подтверждение перед запуском.
                      </div>
                    </aside>

                    <div className="flex min-w-0 flex-col">
                      <div className="border-b border-white/[0.045] bg-[#111313]">
                        <textarea
                          value={sqlQuery}
                          onChange={(event) => setSqlQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                              event.preventDefault();
                              void runSupabaseSql();
                            }
                          }}
                          spellCheck={false}
                          className="h-64 w-full resize-none bg-transparent px-4 py-4 font-mono text-sm leading-6 text-white/78 outline-none placeholder:text-white/22"
                          placeholder="select * from public.your_table limit 100;"
                        />
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col bg-black/18">
                        <div className="flex items-center justify-between gap-3 border-b border-white/[0.045] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-white/78">Results</span>
                            {sqlResult ? <span className="rounded-full bg-white/[0.045] px-2 py-1 text-[0.68rem] font-bold text-white/42">{sqlResult.rowCount} строк</span> : null}
                          </div>
                          <span className="text-xs text-white/28">Cmd/Ctrl + Enter</span>
                        </div>

                        {sqlError ? (
                          <div className="m-4 rounded-[14px] border border-red-400/16 bg-red-400/[0.06] px-4 py-4 text-sm leading-6 text-red-100/72">
                            {sqlError}
                          </div>
                        ) : !openedProject ? (
                          <div className="m-4 rounded-[14px] bg-white/[0.025] px-4 py-5 text-sm leading-6 text-white/42">
                            Сначала войдите в проект для данных сайта.
                          </div>
                        ) : isRunningSql ? (
                          <div className="m-4 h-28 animate-pulse rounded-[14px] bg-white/[0.025]" />
                        ) : sqlResult ? (
                          sqlResultColumns.length ? (
                            <div className="max-h-72 overflow-auto">
                              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                                <thead className="sticky top-0 bg-[#151817]/95 backdrop-blur">
                                  <tr>
                                    {sqlResultColumns.map((column) => (
                                      <th key={column} className="border-b border-white/[0.055] px-3 py-2 font-semibold text-white/72">
                                        {column}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sqlResult.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="odd:bg-white/[0.015]">
                                      {sqlResultColumns.map((column) => {
                                        const value = row[column];
                                        const text = formatSupabaseCellValue(value);

                                        return (
                                          <td key={column} className="max-w-[260px] border-b border-white/[0.035] px-3 py-2 text-white/58">
                                            <span className={`block truncate ${value === null || value === undefined ? "text-white/28" : ""}`} title={text}>
                                              {text}
                                            </span>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="m-4 rounded-[14px] bg-[#3ecf8e]/[0.045] px-4 py-5 text-sm leading-6 text-[#b8f7dc]/70">
                              Запрос выполнен. Строк для отображения нет.
                            </div>
                          )
                        ) : (
                          <div className="m-4 rounded-[14px] bg-white/[0.025] px-4 py-5 text-sm leading-6 text-white/42">
                            Нажмите Run, чтобы выполнить запрос.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
            </div>
            <AnimatePresence>
              {openedSupabaseTable ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="Закрыть просмотр таблицы"
                    className="absolute inset-0 z-40 cursor-default bg-[#050606]/88 backdrop-blur-[10px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeSupabaseTablePreview}
                  />
                  <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center p-4 md:p-8">
                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-label={`Таблица ${openedSupabaseTable.schema}.${openedSupabaseTable.name}`}
                      initial={{ y: 18, scale: 0.985, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={{ y: 18, scale: 0.985, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-auto flex max-h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-[22px] bg-[#111414] shadow-[0_32px_100px_rgba(0,0,0,0.82),0_0_0_1px_rgba(62,207,142,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-[#3ecf8e]/[0.075] bg-[#131817] px-5 py-4">
                        <div className="min-w-0">
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#3ecf8e]/10 px-2.5 py-1 text-[0.68rem] font-bold text-[#b8f7dc]/78">
                            <Table2 className="h-3.5 w-3.5" />
                            {openedSupabaseTable.schema}
                          </div>
                          <h3 className="truncate text-xl font-semibold tracking-[-0.01em] text-white">{openedSupabaseTable.name}</h3>
                          <p className="mt-1 text-sm text-white/42">
                            Колонки, типы и первые записи таблицы.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={closeSupabaseTablePreview}
                          aria-label="Закрыть"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/[0.035] text-white/46 transition hover:bg-white/[0.07] hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {loadingSupabaseTablePreview ? (
                        <div className="space-y-3 p-5">
                          <div className="h-11 animate-pulse rounded-[12px] bg-white/[0.035]" />
                          <div className="h-60 animate-pulse rounded-[14px] bg-white/[0.025]" />
                        </div>
                      ) : supabaseTablePreviewError ? (
                        <div className="m-5 rounded-[14px] border border-red-400/16 bg-red-400/[0.06] px-4 py-4 text-sm leading-6 text-red-100/72">
                          {supabaseTablePreviewError}
                        </div>
                      ) : supabaseTablePreview ? (
                        <div className="min-h-0 flex-1 overflow-hidden p-5">
                          <div className="mb-4 flex flex-wrap gap-2 text-[0.72rem] font-semibold text-white/46">
                            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{previewColumns.length} колонок</span>
                            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">{supabaseTablePreview.rows.length} записей показано</span>
                            <span className="rounded-full bg-white/[0.04] px-2.5 py-1">лимит {supabaseTablePreview.rowLimit}</span>
                          </div>
                          <div className="max-h-[58vh] overflow-auto rounded-[14px] bg-[#090b0b] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                              <thead className="sticky top-0 z-10 bg-[#171b1a]">
                                <tr>
                                  {previewColumns.map((column) => (
                                    <th key={column.name} className="border-b border-white/[0.055] px-3 py-3 align-top">
                                      <div className="max-w-[220px]">
                                        <p className="truncate font-semibold text-white/84">{column.name}</p>
                                        <p className="mt-1 truncate text-[0.68rem] font-medium text-white/36">
                                          {column.dataType}{column.primaryKey ? " · key" : ""}{column.nullable ? "" : " · required"}
                                        </p>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {supabaseTablePreview.rows.length ? (
                                  supabaseTablePreview.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="odd:bg-white/[0.015]">
                                      {previewColumns.map((column) => {
                                        const value = row[column.name];
                                        const text = formatSupabaseCellValue(value);

                                        return (
                                          <td key={column.name} className="max-w-[260px] border-b border-white/[0.035] px-3 py-3 align-top text-white/62">
                                            <span className={`block truncate ${value === null || value === undefined ? "text-white/28" : ""}`} title={text}>
                                              {text}
                                            </span>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={Math.max(previewColumns.length, 1)} className="px-4 py-8 text-center text-sm text-white/38">
                                      В таблице пока нет записей.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  </div>
                </>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {createProjectPanelOpen ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="Закрыть создание проекта"
                    className="absolute inset-0 z-20 cursor-default bg-black/58 backdrop-blur-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setCreateProjectPanelOpen(false)}
                  />
                  <div className="absolute inset-0 z-30 grid place-items-center p-5 pointer-events-none">
                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Создать проект для данных"
                      initial={{ y: 18, scale: 0.98, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={{ y: 18, scale: 0.98, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-auto flex max-h-[min(720px,calc(100%-24px))] w-[min(520px,calc(100vw-64px))] flex-col overflow-hidden rounded-[22px] bg-[#101313] shadow-[0_30px_110px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(62,207,142,0.12)]"
                    >
                    <div className="flex items-start justify-between gap-4 border-b border-[#3ecf8e]/[0.08] bg-[#121616] px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white/88">Создать проект для данных</p>
                        <p className="mt-1 text-sm leading-5 text-white/42">WebBrain создаст проект в вашем аккаунте Supabase и выберет его для этого сайта.</p>
                      </div>
                      <button type="button" onClick={() => setCreateProjectPanelOpen(false)} aria-label="Закрыть" className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/[0.04] text-white/52 transition hover:bg-white/[0.08] hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-[#0f1111] px-5 py-5">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-white/34">Название</span>
                          <input
                            value={newSupabaseProjectName}
                            onChange={(event) => setNewSupabaseProjectName(event.target.value)}
                            placeholder={`${projectName || "WebBrain"} data`}
                            className="h-11 w-full rounded-[12px] border border-transparent bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:bg-black/35 focus:ring-1 focus:ring-[#3ecf8e]/20"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-white/34">Регион</span>
                          <div className="relative">
                            <button
                              type="button"
                              aria-expanded={regionListOpen}
                              onClick={() => setRegionListOpen((value) => !value)}
                              className={`flex h-11 w-full items-center justify-between gap-3 rounded-[12px] border border-transparent bg-black/30 px-3 text-left text-sm text-white outline-none transition hover:bg-black/35 ${
                                regionListOpen ? "ring-1 ring-[#3ecf8e]/22" : ""
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <span className="grid h-7 w-8 shrink-0 place-items-center rounded-[8px] bg-white/[0.06] text-[1.05rem] leading-none">
                                  {selectedRegion.flag}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-white/82">{selectedRegion.label}</span>
                                  <span className="block truncate text-[0.72rem] text-white/34">{selectedRegion.hint}</span>
                                </span>
                              </span>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-white/34 transition ${regionListOpen ? "rotate-180 text-[#b8f7dc]" : ""}`} />
                            </button>
                            <AnimatePresence>
                              {regionListOpen ? (
                                <motion.div
                                  initial={{ y: -4, opacity: 0, scale: 0.98 }}
                                  animate={{ y: 0, opacity: 1, scale: 1 }}
                                  exit={{ y: -4, opacity: 0, scale: 0.98 }}
                                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-y-auto rounded-[14px] bg-[#141717] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(62,207,142,0.1)]"
                                >
                                  {SUPABASE_REGION_OPTIONS.map((region) => {
                                    const selected = region.value === newSupabaseProjectRegion;

                                    return (
                                      <button
                                        key={region.value}
                                        type="button"
                                        onClick={() => {
                                          setNewSupabaseProjectRegion(region.value);
                                          setRegionListOpen(false);
                                        }}
                                        className={`flex min-h-11 w-full items-center gap-2.5 rounded-[11px] px-2.5 text-left transition ${
                                          selected
                                            ? "bg-[#1f2b26] text-[#b8f7dc]"
                                            : "text-white/62 hover:bg-white/[0.045] hover:text-white"
                                        }`}
                                      >
                                        <span className={`grid h-7 w-8 shrink-0 place-items-center rounded-[8px] text-[1.05rem] leading-none ${selected ? "bg-[#3ecf8e]/14" : "bg-white/[0.055]"}`}>
                                          {region.flag}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-sm font-semibold">{region.label}</span>
                                          <span className="block truncate text-[0.72rem] text-white/34">{region.hint}</span>
                                        </span>
                                        {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3ecf8e]" /> : null}
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                          <span className="mt-2 block text-xs leading-5 text-white/34">Лучше выбирать ближе к вашим клиентам. После создания регион меняется только через перенос проекта.</span>
                        </label>
                        <div className="block">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/34">Пароль базы данных</span>
                            <button
                              type="button"
                              onClick={() => setNewSupabaseProjectPassword(generateSupabaseDbPassword())}
                              className="inline-flex h-7 items-center gap-1.5 rounded-[9px] bg-white/[0.045] px-2.5 text-xs font-semibold text-white/54 transition hover:bg-[#1f2926] hover:text-[#b8f7dc]"
                            >
                              <Redo2 className="h-3.5 w-3.5" />
                              Сгенерировать
                            </button>
                          </div>
                          <input
                            value={newSupabaseProjectPassword}
                            onChange={(event) => setNewSupabaseProjectPassword(event.target.value)}
                            placeholder="Можно оставить пустым"
                            className={`h-11 w-full rounded-[12px] border border-transparent bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:bg-black/35 ${
                              dbPasswordTooShort ? "ring-1 ring-red-400/35" : "focus:ring-1 focus:ring-[#3ecf8e]/20"
                            }`}
                          />
                          <span className={`mt-2 block text-xs leading-5 ${dbPasswordTooShort ? "text-red-100/70" : "text-white/34"}`}>
                            {dbPasswordTooShort ? "Минимум 12 символов." : "Если поле пустое, WebBrain создаст надежный пароль сам."}
                          </span>
                        </div>
                        {safeSupabaseOrganizations.length > 1 ? (
                          <label className="block">
                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-white/34">Аккаунт Supabase</span>
                            <select
                              value={selectedOrganizationSlug || safeSupabaseOrganizations[0]?.slug || ""}
                              onChange={(event) => setSelectedOrganizationSlug(event.target.value)}
                              className="h-11 w-full rounded-[12px] border border-transparent bg-black/30 px-3 text-sm text-white outline-none transition focus:bg-black/35 focus:ring-1 focus:ring-[#3ecf8e]/20"
                            >
                              {safeSupabaseOrganizations.map((organization) => (
                                <option key={organization.slug} value={organization.slug}>
                                  {organization.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {selectedOrganization ? (
                          <div className="rounded-[13px] bg-[#181b1b] px-3 py-3 text-sm leading-5 text-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]">
                            Проект будет создан в аккаунте {selectedOrganization.name}.
                          </div>
                        ) : null}
                      </div>
                      {createSupabaseProjectError ? (
                        <p className="mt-4 rounded-[12px] border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-sm leading-6 text-red-100/78">
                          {createSupabaseProjectError}
                        </p>
                      ) : null}
                    </div>
                    <div className="border-t border-[#3ecf8e]/[0.08] bg-[#121616] px-5 py-4">
                      <button
                        type="button"
                        disabled={creatingSupabaseProject || dbPasswordTooShort}
                        onClick={() =>
                          onCreateSupabaseProject({
                            name: newSupabaseProjectName.trim() || `${projectName || "WebBrain"} data`,
                            organizationSlug: selectedOrganization?.slug,
                            organizationId: selectedOrganization?.id,
                            region: newSupabaseProjectRegion,
                            dbPass: customDbPassword || undefined,
                          })
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-transparent bg-[#3ecf8e]/12 px-4 text-sm font-semibold text-[#b8f7dc] transition hover:bg-[#3ecf8e]/18 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus className="h-4 w-4" />
                        {creatingSupabaseProject ? "Создаю..." : "Создать проект"}
                      </button>
                    </div>
                    </motion.div>
                  </div>
                </>
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {artifactsPanelOpen ? (
                <>
                  <motion.button
                    type="button"
                    aria-label="Закрыть подготовленные настройки"
                    className="absolute inset-0 z-20 cursor-default bg-black/58 backdrop-blur-[3px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setArtifactsPanelOpen(false)}
                  />
                  <motion.aside
                    initial={{ x: 34, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 34, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-3 right-3 top-3 z-30 flex w-[min(520px,calc(100vw-56px))] flex-col overflow-hidden rounded-[22px] bg-[#101313] shadow-[-34px_0_90px_rgba(0,0,0,0.58),0_24px_90px_rgba(0,0,0,0.46),inset_0_0_0_1px_rgba(62,207,142,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[#3ecf8e]/[0.08] bg-[#121616] px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-white/88">Подготовленные настройки</p>
                        <p className="mt-1 text-sm leading-5 text-white/42">Таблицы, формы и действия ИИ перед применением.</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="grid h-8 min-w-8 place-items-center rounded-[10px] bg-white/[0.035] px-2 text-xs font-bold text-white/58">
                          {artifacts.length}
                        </span>
                        <button type="button" onClick={() => setArtifactsPanelOpen(false)} aria-label="Закрыть" className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/[0.04] text-white/52 transition hover:bg-white/[0.08] hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-[#0f1111] px-5 py-5">
                      {loading ? <p className="rounded-[14px] border border-transparent bg-white/[0.025] px-4 py-3 text-sm text-white/42">Загружаю настройки...</p> : null}

                      {!loading && artifacts.length === 0 ? (
                        <div className="rounded-[16px] border border-transparent bg-[#181b1b] px-4 py-5 text-sm leading-6 text-white/56 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]">
                          Настроек для заявок и данных пока нет. Они появятся после подтверждения плана и создания сайта.
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {Object.entries(artifactGroups).map(([kind, group]) => (
                          <div key={kind} className="overflow-hidden rounded-[16px] border border-transparent bg-black/[0.14] shadow-[inset_0_0_0_1px_rgba(62,207,142,0.035)]">
                            <div className="flex items-center gap-2 border-b border-[#3ecf8e]/[0.055] px-4 py-3">
                              <FileCode2 className="h-4 w-4 text-white/42" />
                              <p className="text-sm font-semibold text-white/76">{artifactKindLabel(kind)}</p>
                            </div>
                            <div className="divide-y divide-white/[0.045]">
                              {group.map((artifact, index) => (
                                <div key={`${artifact.kind}-${artifact.path}-${index}`} className="px-4 py-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-white/76">{artifact.title}</p>
                                      <p className="mt-1 truncate text-xs text-white/34">{artifact.path}</p>
                                    </div>
                                    <ArtifactStatusPill status={artifact.status} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.aside>
                </>
              ) : null}
            </AnimatePresence>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function SupabaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 109 113" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M63.708 110.284c-2.86 3.595-8.649 1.627-8.718-2.966l-.9-60.21h40.48c8.19 0 12.758 9.47 7.665 15.882l-38.527 47.294Z"
        fill="currentColor"
      />
      <path
        d="M45.317 2.071c2.86-3.595 8.649-1.627 8.718 2.966l.9 60.21H14.455C6.265 65.247 1.697 55.777 6.79 49.365L45.317 2.071Z"
        fill="currentColor"
        opacity="0.72"
      />
    </svg>
  );
}

function artifactKindLabel(kind: string) {
  if (kind === "document_json") return "Структура сайта";
  if (kind === "source_file") return "Файлы сайта";
  if (kind === "api_route") return "Действия сайта";
  if (kind === "sql_migration") return "Хранение данных";
  if (kind === "env_manifest") return "Настройки подключения";
  if (kind === "backend_manifest") return "Заявки и данные";
  if (kind === "test_plan") return "План проверки";

  return kind;
}

function ArtifactStatusPill({ status }: { status: WebBrainProjectArtifact["status"] }) {
  const isBlocked = status === "needs_connection" || status === "error";

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-[0.66rem] font-bold ${
        isBlocked
          ? "bg-amber-300/[0.09] text-amber-100/64"
          : "bg-[#3ecf8e]/10 text-[#3ecf8e]/70"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

type StoredSite = {
  id: string;
  client_id: string;
  project_id: string;
  chat_id: string | null;
  name: string;
  slug: string;
  html: string;
  css: string;
  js: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

type StoredSitePage = {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  html: string;
  document_json: WebBrainDocument | null;
  render_engine?: WebBrainRenderEngine;
  codegen_entry?: string | null;
  codegen_files?: WebBrainCodegenFile[] | null;
  codegen_overlay_css?: string | null;
  codegen_element_map?: WebBrainCodegenElementMap | null;
  sort_order: number;
  updated_at?: string;
};

type AdminCodeFile = {
  path: string;
  content: string;
  virtual?: boolean;
};

type ProjectsResponse = {
  projects: StoredProject[];
};

type ProjectResponse = {
  project: StoredProject;
};

type ChatsResponse = {
  chats: StoredChat[];
};

type ChatRunsResponse = {
  runs: ChatRunSummary[];
};

type ArchivedChatsResponse = {
  chats: ArchivedChat[];
};

type ChatResponse = {
  chat: StoredChat;
};

type ChatWithMessagesResponse = {
  chat: StoredChat;
  messages: StoredMessage[];
  site?: StoredSite | null;
  project?: StoredProject | null;
  pages?: StoredSitePage[];
  limitReached?: {
    window: WebBrainLimitWindow | null;
    operation: string;
    needed: number;
    remaining: number;
    tierId: "start" | "pro" | "pro_plus" | "business";
  };
};

type MessagesResponse = {
  messages: StoredMessage[];
};

type SitesResponse = {
  sites: StoredSite[];
};

type SiteResponse = {
  site: StoredSite;
};

type SitePagesResponse = {
  pages: StoredSitePage[];
};

type PublishSiteResponse = {
  publicUrl: string;
  publication: PublishedSite;
  usage: PublicationUsage;
};

type PublicationUsage = {
  visits: number;
  leads: number;
  traffic_bytes: number;
};

type PublishedSite = {
  id: string;
  slug: string;
  custom_domain: string | null;
  plan_key: HostingPlanKey;
  status: "active" | "suspended" | "draft";
  paid_until: string;
  settings: Record<string, unknown>;
  last_published_at: string;
};

type PublicationResponse = {
  publicUrl: string | null;
  publication: PublishedSite | null;
  usage: PublicationUsage | null;
};

type ProfileSummaryResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  activity: {
    fiveHours: number;
    day: number;
    week: number;
    month: number;
  };
  spending?: {
    fiveHours: number;
    day: number;
    week: number;
    month: number;
  };
  subscription: {
    planKey: AccountSubscriptionPlanKey;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: string | null;
    billingProvider: string;
  };
  access?: {
    isAdmin: boolean;
    tierId: "start" | "pro" | "pro_plus" | "business";
    allowedSpaceModels: WebBrainSpaceModelId[];
    effectiveCreditLimits?: {
      monthlyCredits: number | null;
      weeklyCredits: number | null;
      fiveHourCredits: number | null;
    };
  };
  stats: {
    projects: number;
    chats: number;
    sites: number;
    draftSites: number;
    publishedSites: number;
    activePublishedSites: number;
  };
};

type ProfileSecurityResponse = {
  user: {
    id: string;
    email: string | null;
    createdAt: string;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
    providers: string[];
    canDeleteAt: string;
    canDeleteNow: boolean;
    deleteDelayDays: number;
  };
};

type AdminPlatformMode = "open" | "platform_update" | "problem";
type AdminPlatformScope = "app" | "global";

type AdminPlatformState = {
  scope: AdminPlatformScope;
  mode: AdminPlatformMode;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type AdminPanelResponse = {
  platform: Record<AdminPlatformScope, AdminPlatformState>;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string;
  accessDenied: boolean;
  accessDeniedReason: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  stats: {
    projects: number;
    chats: number;
    sites: number;
    publishedSites: number;
    activePublishedSites: number;
    messages: number;
    recentRequests: Array<{
      id: string;
      chatId: string;
      text: string;
      createdAt: string | null;
    }>;
  };
};

type AdminUsersResponse = {
  users: AdminUser[];
};

type AuthenticatorEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

type ProjectArtifactsResponse = {
  artifacts: WebBrainProjectArtifact[];
};

type SupabaseConnectionResponse = {
  status: WebBrainSupabaseConnectionStatus;
};

type SupabaseProjectsResponse = {
  projects: WebBrainSupabaseProjectOption[];
  organizations: WebBrainSupabaseOrganizationOption[];
};

type SupabaseTablesResponse = {
  tables: WebBrainSupabaseTableOption[];
};

type SupabaseTablePreviewResponse = {
  preview: WebBrainSupabaseTablePreview;
};

type SupabaseSqlResponse = {
  result: WebBrainSupabaseSqlResult;
};

type CreateSupabaseProjectResponse = {
  project: WebBrainSupabaseProjectOption;
  status: WebBrainSupabaseConnectionStatus;
  projects: WebBrainSupabaseProjectOption[];
  organizations: WebBrainSupabaseOrganizationOption[];
};

type EditorSelection = {
  top: number;
  left: number;
  width: number;
  height: number;
  parentTop?: number;
  parentLeft?: number;
  parentWidth?: number;
  parentHeight?: number;
  label: string;
  componentId: string;
  componentType: string;
  childRects?: EditorSelectionChildRect[];
};

type EditorAiSelection = {
  pageId: string;
  pageSlug: string;
  componentId: string;
  componentType: string;
  componentName: string;
};

type EditorSelectionChildRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  componentId?: string;
  componentType?: string;
};

type EditorInsertionZone = {
  top: number;
  left: number;
  width: number;
  height?: number;
  orientation?: "horizontal" | "vertical";
  mode?: "insert" | "side";
  targetComponentId?: string;
  side?: "left" | "right";
  rootComponentId: string;
  index: number;
  label: string;
};

type EditorPanelKey = "components" | "pages" | "outline";

type EditorOutlineItem = {
  id: string;
  label: string;
  meta: string;
  depth: number;
  kind: "section" | "block" | "action";
};

type ChatLimitNotice = {
  tierId: "start" | "pro" | "pro_plus" | "business";
  tierLabel: string;
};

type EditorSelectionMessage =
  | {
      type: "webbrain:component-selected";
      selection: EditorSelection;
    }
  | {
      type: "webbrain:component-hovered";
      selection: EditorSelection;
    }
  | {
      type: "webbrain:component-context-menu";
      selection: EditorSelection;
      x: number;
      y: number;
    }
  | {
      type: "webbrain:component-hover-cleared";
    }
  | {
      type: "webbrain:component-selection-cleared";
    }
  | {
      type: "webbrain:insertion-zones";
      zones: EditorInsertionZone[];
    }
  | {
      type: "webbrain:insertion-zones-cleared";
    }
  | {
      type: "webbrain:component-drag-started";
    }
  | {
      type: "webbrain:component-drag-ended";
    }
  | {
      type: "webbrain:component-moved";
      componentId: string;
      parentId: string;
      index: number;
      mode?: "insert" | "side";
      targetId?: string;
      side?: "left" | "right";
      rowId?: string;
    };

type SpacingValues = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type EditorComponentToolKey =
  | "hero"
  | "heroMedia"
  | "services"
  | "benefits"
  | "process"
  | "contact"
  | "ctaBand"
  | "footer"
  | "footerColumns"
  | "footerCta"
  | "booking"
  | "menu"
  | "section"
  | "container"
  | "row"
  | "column"
  | "grid"
  | "stack"
  | "columns"
  | "heading"
  | "text"
  | "link"
  | "button"
  | "image"
  | "form";

type EditorComponentCategory = "ready" | "business" | "elements" | "layout";

type ComponentPatch = {
  props?: Partial<WebBrainProps>;
  style?: Partial<WebBrainStyle>;
  effects?: Partial<WebBrainEffects>;
  theme?: Partial<WebBrainDocument["theme"]>;
  component?: Partial<Pick<WebBrainComponent, "name">>;
};

const emptySpacingValues: SpacingValues = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

function clampEditorNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) return fallback;

  return Math.max(min, Math.min(max, Math.round(parsedValue)));
}

function normalizeEditorAnchorId(value: string) {
  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function clampEditorFloat(value: unknown, fallback: number, min: number, max: number) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) return fallback;

  return Math.max(min, Math.min(max, parsedValue));
}

function normalizeSpacingValues(value: unknown, fallback: SpacingValues = emptySpacingValues): SpacingValues {
  if (typeof value === "number" || typeof value === "string") {
    const normalizedValue = clampEditorNumber(value, fallback.top, 0, 96);

    return {
      top: normalizedValue,
      right: normalizedValue,
      bottom: normalizedValue,
      left: normalizedValue
    };
  }

  if (!value || typeof value !== "object") return fallback;

  const spacingValue = value as Partial<SpacingValues>;

  return {
    top: clampEditorNumber(spacingValue.top, fallback.top, 0, 96),
    right: clampEditorNumber(spacingValue.right, fallback.right, 0, 96),
    bottom: clampEditorNumber(spacingValue.bottom, fallback.bottom, 0, 96),
    left: clampEditorNumber(spacingValue.left, fallback.left, 0, 96)
  };
}

function hasSpacingValues(value: SpacingValues | undefined) {
  if (!value) return false;

  return value.top > 0 || value.right > 0 || value.bottom > 0 || value.left > 0;
}

function spacingStatus(value: SpacingValues | undefined) {
  if (!value || !hasSpacingValues(value)) return "нет";

  return `${value.top}/${value.right}/${value.bottom}/${value.left}px`;
}

function defaultPaddingForComponent(type: WebBrainComponentType): SpacingValues {
  if (type === "button") return { top: 12, right: 18, bottom: 12, left: 18 };
  if (type === "section") return { top: 64, right: 24, bottom: 64, left: 24 };
  if (type === "card" || type === "form" || type === "container") return { top: 24, right: 24, bottom: 24, left: 24 };

  return { top: 16, right: 16, bottom: 16, left: 16 };
}

function defaultMarginForComponent(type: WebBrainComponentType): SpacingValues {
  if (type === "heading" || type === "text") return { top: 0, right: 0, bottom: 16, left: 0 };

  return { top: 0, right: 0, bottom: 16, left: 0 };
}

type OpenMenu =
  | {
      type: "project";
      id: string;
    }
  | {
      type: "chat";
      id: string;
    }
  | null;

type RenamingItem =
  | {
      type: "project";
      id: string;
      value: string;
    }
  | {
      type: "chat";
      id: string;
      value: string;
    }
  | null;

const CLIENT_ID_STORAGE_KEY = "webbrain-client-id";
const APP_VERSION = "1.0.3";
const DEFAULT_EDITOR_BACKGROUND = "#090b0b";
const MAX_PROFILE_AVATAR_BYTES = 4 * 1024 * 1024;

async function getCurrentAuthSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

async function requireCurrentAuthSession() {
  const session = await getCurrentAuthSession();

  if (!session) {
    window.location.replace("/login");
    throw new Error("Требуется вход в аккаунт");
  }

  return session;
}

function persistAuthenticatedClientId(session: Session) {
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, session.user.id);

  return session.user.id;
}

function toChatMessages(messages: StoredMessage[]): ChatMessage[] {
  return dedupeChatMessages(messages.flatMap((message) => {
    if (message.role === "user") {
      if (message.status === "internal_action") {
        return {
          role: "user",
          text: message.text,
          hidden: true,
          status: message.status,
          payload: message.payload ?? null,
        };
      }

      return {
        role: "user",
        text: message.text
      };
    }

    if (message.status === "Лимит") return [];

    return {
      role: "assistant",
      text: message.text,
      status: message.status ?? undefined,
      payload: message.payload ?? null
    };
  }));
}

function getSupabaseGateDedupeKey(message: ChatMessage) {
  if (message.role !== "assistant" || message.payload?.kind !== "supabase_connection_gate") return null;

  const payload = message.payload;
  const stateGroup = ["needs_connection", "project_select", "deferred", "connected", "applying", "done"].includes(payload.state)
    ? "active_gate"
    : payload.state;

  return [
    payload.kind,
    stateGroup ?? "",
    payload.resumeAction ?? "",
  ].join(":");
}

function dedupeChatMessages(messages: ChatMessage[]) {
  const seenSupabaseGateKeys = new Set<string>();
  const reversed: ChatMessage[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const dedupeKey = getSupabaseGateDedupeKey(message);

    if (dedupeKey) {
      if (seenSupabaseGateKeys.has(dedupeKey)) continue;
      seenSupabaseGateKeys.add(dedupeKey);
    }

    reversed.push(message);
  }

  return reversed.reverse();
}

async function requestJson<T>(path: string, clientId: string, init: RequestInit = {}) {
  const session = await requireCurrentAuthSession();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-webbrain-client-id", clientId);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(path, {
    ...init,
    headers
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Supabase request failed");
  }

  return data as T;
}

async function requestText(path: string, clientId: string, init: RequestInit = {}) {
  const session = await requireCurrentAuthSession();
  const headers = new Headers(init.headers);
  headers.set("x-webbrain-client-id", clientId);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(path, {
    ...init,
    headers
  });
  const text = await response.text();

  if (!response.ok) {
    let parsedError: { error?: string } | null = null;
    try {
      parsedError = JSON.parse(text) as { error?: string };
    } catch {
      parsedError = null;
    }

    throw new Error(parsedError?.error || text || "Supabase request failed");
  }

  return text;
}

async function streamChatMessage(
  path: string,
  clientId: string,
  text: string,
  onAssistantMessage: (message: ChatMessage) => void,
  signal?: AbortSignal,
  options: {
    visible?: boolean;
    action?: string;
    runId?: string | null;
    spaceModel?: string | null;
    planMode?: boolean;
    editorSelection?: EditorAiSelection | null;
    attachments?: ChatAttachmentPayload[];
  } = {},
): Promise<ChatWithMessagesResponse> {
  const session = await requireCurrentAuthSession();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "x-webbrain-client-id": clientId,
      Authorization: `Bearer ${session.access_token}`,
      "x-webbrain-stream": "1"
    },
    body: JSON.stringify({
      text,
      visible: options.visible ?? true,
      action: options.action,
      runId: options.runId ?? null,
      spaceModel: options.spaceModel ?? null,
      planMode: options.planMode ?? false,
      editorSelection: options.editorSelection ?? null,
      attachments: options.attachments ?? []
    }),
    signal
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Не удалось запустить поток генерации");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const finalResults: ChatWithMessagesResponse[] = [];

  function handleEvent(rawEvent: string) {
    const lines = rawEvent.split("\n");
    const eventName = lines.find((line) => line.startsWith("event: "))?.slice(7).trim() ?? "message";
    const dataText = lines
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6))
      .join("\n");

    if (!dataText) return;

    const payload = JSON.parse(dataText) as {
      message?: StoredMessage;
      error?: string;
    } & ChatWithMessagesResponse;

    if (eventName === "assistant_message" && payload.message) {
      const [message] = toChatMessages([payload.message]);
      if (message) onAssistantMessage(message);
      return;
    }

    if (eventName === "done") {
      finalResults.push(payload);
      return;
    }

    if (eventName === "error") {
      throw new Error(payload.error || "Ошибка агентного потока");
    }
  }

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      if (event.trim()) handleEvent(event);
    }
  }

  if (buffer.trim()) {
    handleEvent(buffer);
  }

  const finalResult = finalResults.at(-1);

  if (!finalResult) {
    throw new Error("Поток генерации завершился без финального ответа");
  }

  return finalResult;
}

function sortProjects(projects: StoredProject[]) {
  return [...projects].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return Number(b.is_pinned) - Number(a.is_pinned);

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function sortChats(chats: StoredChat[]) {
  return [...chats].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function mergeProject(projects: StoredProject[], project: StoredProject) {
  return sortProjects([project, ...projects.filter((item) => item.id !== project.id)]);
}

function mergeChat(chats: StoredChat[], chat: StoredChat) {
  return sortChats([chat, ...chats.filter((item) => item.id !== chat.id)]);
}

/**
 * Optimistic (client-only) project ids look like "optimistic-project-…" and are NOT UUIDs.
 * They exist only for instant UI before the real project is persisted, and must never be
 * sent to the database (Postgres rejects them with `invalid input syntax for type uuid`).
 */
function isOptimisticProjectId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("optimistic-");
}

const EDITOR_HISTORY_LIMIT = 80;

function areEditorDocumentsEqual(first: WebBrainDocument, second: WebBrainDocument) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function trimEditorPast(items: WebBrainDocument[]) {
  return items.length > EDITOR_HISTORY_LIMIT ? items.slice(items.length - EDITOR_HISTORY_LIMIT) : items;
}

function normalizeSidebarSearch(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function normalizePageComponentPatch(patch: ComponentPatch): ComponentPatch {
  if (!patch.style) return patch;

  return {
    ...patch,
    style: {
      ...patch.style,
      backgroundImage: undefined,
      backgroundSize: undefined,
      backgroundPosition: undefined,
      backgroundRepeat: undefined,
      backgroundOverlay: undefined,
      backgroundOverlayOpacity: undefined,
      backgroundBlendMode: undefined
    }
  };
}

function normalizeEditableDocument(document: WebBrainDocument): WebBrainDocument {
  return {
    ...document,
    editorManifest: normalizeEditorManifest(document),
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isTransientAssistantMessage(message: ChatMessage) {
  return message.role === "assistant" && message.transient;
}

function isLimitAssistantMessage(message: ChatMessage) {
  return message.role === "assistant" && message.status === "Лимит";
}

function tierLabelFromId(tierId: ChatLimitNotice["tierId"]) {
  return getTierConfig(tierId).label;
}

function parseLimitNoticeFromText(text: string): ChatLimitNotice | null {
  if (!/достигнут лимит|недостаточно кредит/i.test(text)) return null;

  const tierMatch = text.match(/тарифе\s+(Start|Pro Plus|Pro|Business)|лимит\s+(Start|Pro Plus|Pro|Business)/i);
  const tierLabel = tierMatch?.[1] || tierMatch?.[2] || "Start";
  const tierId = tierLabel.toLowerCase().includes("business")
    ? "business"
    : tierLabel.toLowerCase().includes("pro plus")
      ? "pro_plus"
      : tierLabel.toLowerCase() === "pro"
        ? "pro"
        : "start";

  return {
    tierId,
    tierLabel: tierLabelFromId(tierId),
  };
}

function isProjectLimitErrorMessage(text: string) {
  return /достигнут лимит проектов/i.test(text);
}

function toProjectLimitLabel(label: string) {
  return label
    .replace(/\bсайтов\b/gi, "проектов")
    .replace(/\bсайта\b/gi, "проекта")
    .replace(/\bсайт\b/gi, "проект");
}

function countStoredAssistantMessages(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === "assistant" && !message.transient).length;
}

function mergeServerMessagesWithLiveStage(currentMessages: ChatMessage[], serverMessages: ChatMessage[]) {
  const dedupedServerMessages = dedupeChatMessages(serverMessages);
  const liveStage = currentMessages.find(isTransientAssistantMessage);
  if (!liveStage) return dedupedServerMessages;

  const liveGateKey = getSupabaseGateDedupeKey(liveStage);
  if (liveGateKey && dedupedServerMessages.some((message) => getSupabaseGateDedupeKey(message) === liveGateKey)) {
    return dedupedServerMessages;
  }

  const currentStoredMessages = currentMessages.filter((message) => !isTransientAssistantMessage(message));
  const serverHasNewAssistant = countStoredAssistantMessages(dedupedServerMessages) > countStoredAssistantMessages(currentStoredMessages);

  if (serverHasNewAssistant) return dedupedServerMessages;

  return dedupeChatMessages([...dedupedServerMessages.filter((message) => !isTransientAssistantMessage(message)), liveStage]);
}

function chatScrollSignature(messages: ChatMessage[]) {
  return messages
    .slice(-4)
    .map((message) => {
      if (message.role === "user") return `u:${message.hidden ? "h" : "v"}:${message.text.length}:${message.text.slice(-80)}`;

      const payload = message.payload;
      const payloadSignature = payload
        ? `${payload.kind}:${"stage" in payload ? String(payload.stage) : ""}:${"state" in payload ? String(payload.state) : ""}:${payload.runId ?? ""}`
        : "";

      return `a:${message.status ?? ""}:${message.transient ? "live" : "stored"}:${message.text.length}:${message.text.slice(-120)}:${payloadSignature}`;
    })
    .join("|");
}

function getEditorCanvasStatus(messages: ChatMessage[]) {
  const message = [...messages]
    .reverse()
    .find((item) => item.role === "assistant" && item.status && !["Готово", "Ошибка", "Остановлено", "План", "Вопрос", "Ответ"].includes(item.status));

  if (!message || message.role !== "assistant") return "ИИ редактирует сайт";

  const firstSentence = getAssistantStatusLabel(message.status ?? "", message.text);
  return firstSentence.length > 42 ? `${firstSentence.slice(0, 39).trim()}...` : firstSentence;
}

function formatComposerFileSize(size: number) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
}

function getTierCreditWindowLimit(tier: WebBrainTierConfig, window: WebBrainLimitWindow) {
  if (window === "five_hour") return Math.max(1, tier.fiveHourCredits ?? 1);
  if (window === "weekly") return Math.max(1, tier.weeklyCredits);
  return Math.max(1, tier.monthlyCredits);
}

function getProfileCreditWindowLimit(
  profileSummary: ProfileSummaryResponse | null,
  tier: WebBrainTierConfig,
  window: WebBrainLimitWindow,
) {
  const limits = profileSummary?.access?.effectiveCreditLimits;
  const overrideLimit =
    window === "five_hour"
      ? limits?.fiveHourCredits
      : window === "weekly"
        ? limits?.weeklyCredits
        : limits?.monthlyCredits;

  return overrideLimit != null ? Math.max(1, overrideLimit) : getTierCreditWindowLimit(tier, window);
}

function getProfileCreditWindows(profileSummary: ProfileSummaryResponse | null, tier: WebBrainTierConfig) {
  const limits = profileSummary?.access?.effectiveCreditLimits;
  const windows: WebBrainLimitWindow[] = [];

  if (limits?.fiveHourCredits != null || tier.limitWindows.includes("five_hour")) windows.push("five_hour");
  if (limits?.weeklyCredits != null || tier.limitWindows.includes("weekly")) windows.push("weekly");
  if (limits?.monthlyCredits != null || tier.limitWindows.includes("monthly")) windows.push("monthly");

  return windows;
}

function getLimitFillPercent(used: number, limit: number) {
  return Math.min(100, Math.max(0, Math.round((used / Math.max(1, limit)) * 100)));
}

function formatAccountDate(value: string | null | undefined) {
  if (!value) return "Неизвестно";

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatSecurityActionError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("manual linking")) {
    return "Google Authenticator подключается через QR-код и 6-значный код, без ручной привязки провайдера.";
  }

  if (normalized.includes("invalid") && normalized.includes("code")) {
    return "Код не подошел. Проверьте 6 цифр в Google Authenticator и попробуйте еще раз.";
  }

  if (normalized.includes("mfa_totp_enroll_not_enabled") || normalized.includes("mfa_totp_verify_not_enabled")) {
    return "TOTP-защита пока не включена в Supabase Auth. Включите Multi-Factor Authentication / TOTP в настройках проекта.";
  }

  return message || fallback;
}

function profileAvatarStorageKey(clientId: string) {
  return `webbrain-profile-avatar:${clientId}`;
}

function chatRunSeenStorageKey(clientId: string) {
  return `webbrain-chat-run-seen:${clientId}`;
}

function readSeenChatRuns(clientId: string): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(chatRunSeenStorageKey(clientId)) ?? "{}") as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSeenChatRuns(clientId: string, value: Record<string, string>) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(chatRunSeenStorageKey(clientId), JSON.stringify(value));
}

const MAX_COMPOSER_ATTACHMENT_BYTES = 80 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

async function createComposerAttachment(file: File, kind: "file" | "photo"): Promise<ComposerAttachment> {
  const isPhoto = kind === "photo" || file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const dataUrl = await readFileAsDataUrl(file);

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    kind: isPhoto ? "photo" : isVideo ? "video" : "file",
    dataUrl,
    previewUrl: isPhoto ? URL.createObjectURL(file) : undefined,
  };
}

function createChatAttachmentPayload(attachment: ComposerAttachment | null): ChatAttachmentPayload[] {
  if (!attachment) return [];

  return [{
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    kind: attachment.kind,
    dataUrl: attachment.dataUrl,
  }];
}

function composeMessageWithAttachment(text: string, attachment: ComposerAttachment | null) {
  const trimmedText = text.trim();
  if (!attachment) return trimmedText;

  const attachmentKind = attachment.kind === "photo" ? "фото" : attachment.kind === "video" ? "видео" : "файл";
  const attachmentLine = `Прикреплено: ${attachmentKind} "${attachment.name}" (${formatComposerFileSize(attachment.size)})`;
  return trimmedText ? `${trimmedText}\n\n${attachmentLine}` : attachmentLine;
}

function getFixedPopoverStyle(anchor: HTMLElement | null, width: number, align: "left" | "right" = "left"): CSSProperties | null {
  if (typeof window === "undefined" || !anchor) return null;

  const rect = anchor.getBoundingClientRect();
  const sidePadding = 12;
  const preferredLeft = align === "right" ? rect.right - width : rect.left;
  const left = Math.min(Math.max(sidePadding, preferredLeft), window.innerWidth - width - sidePadding);

  return {
    position: "fixed",
    left,
    bottom: window.innerHeight - rect.top + 8,
    width
  };
}

const composerAiModels = ["Space-1", "Space-2", "Space-3", "Space-4"] as const;
const composerAiEfforts = [
  { value: "low", label: "Low", hint: "быстрее" },
  { value: "medium", label: "Medium", hint: "баланс" },
  { value: "high", label: "High", hint: "глубже" }
] as const;

type HostingPlanKey = "basic" | "standard" | "business" | "custom";
type PublishWizardStep = "plan" | "domain";

const WEBBRAIN_PUBLIC_ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_WEBBRAIN_PUBLIC_ROOT_DOMAIN?.trim() || "webbrainflow.com";

function slugifyPublishDraft(value: string, fallback = "site") {
  const translit: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLowerCase()
    .replace(/[ъь]/g, "")
    .replace(/[а-яё]/g, (char) => translit[char] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || fallback;
}

function formatTrafficBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

const publishHostingPlans: Array<{
  key: HostingPlanKey;
  name: string;
  subtitle: string;
  icon: typeof Rocket;
  accent: string;
  price: string;
  specs: {
    address: string;
    sites: string;
    pages: string;
    traffic: string;
    leads: string;
    badge: string;
    extra: string;
  };
}> = [
  {
    key: "basic",
    name: "Базовый",
    subtitle: "Для лендинга и первых тестов",
    icon: Database,
    accent: "from-[#3ecf8e]/18 to-transparent",
    price: "Private",
    specs: {
      address: `поддомен ${WEBBRAIN_PUBLIC_ROOT_DOMAIN}`,
      sites: "1 сайт",
      pages: "до 5 страниц",
      traffic: "5 000 визитов/мес",
      leads: "50 заявок/мес",
      badge: "бейдж WebBrain остается",
      extra: "SSL + базовая публикация",
    },
  },
  {
    key: "standard",
    name: "Нормальный",
    subtitle: "Оптимально для рабочего сайта",
    icon: Rocket,
    accent: "from-lime/22 to-transparent",
    price: "Private",
    specs: {
      address: "свой домен",
      sites: "1 сайт",
      pages: "до 20 страниц",
      traffic: "50 000 визитов/мес",
      leads: "1 000 заявок/мес",
      badge: "бейдж WebBrain убран",
      extra: "CDN + формы + домен",
    },
  },
  {
    key: "business",
    name: "Бизнес",
    subtitle: "Для заявок, страниц и нагрузки",
    icon: BriefcaseBusiness,
    accent: "from-[#94a3ff]/18 to-transparent",
    price: "Private",
    specs: {
      address: "свой домен",
      sites: "5 сайтов",
      pages: "без лимита",
      traffic: "200 000 визитов/мес",
      leads: "без лимита",
      badge: "бейдж WebBrain убран",
      extra: "бэкапы + приоритет",
    },
  },
  {
    key: "custom",
    name: "Кастомный",
    subtitle: "Соберите лимиты под проект",
    icon: SlidersHorizontal,
    accent: "from-white/14 to-transparent",
    price: "Private",
    specs: {
      address: "на выбор",
      sites: "1-20 сайтов",
      pages: "гибкий лимит",
      traffic: "50-500 ГБ/мес",
      leads: "100-10 000/мес",
      badge: "на выбор",
      extra: "ручные лимиты",
    },
  },
];

function PublishHostingModal({
  open,
  projectName,
  publication,
  publicUrl,
  usage,
  onClose,
  onPublish,
  onUpdateStatus,
}: {
  open: boolean;
  projectName?: string;
  publication?: PublishedSite | null;
  publicUrl?: string | null;
  usage?: PublicationUsage | null;
  onClose: () => void;
  onPublish: (input: { planKey: HostingPlanKey; slug: string; settings: Record<string, unknown> }) => Promise<{ publicUrl: string; publication: PublishedSite; usage: PublicationUsage }>;
  onUpdateStatus: (status: PublishedSite["status"]) => Promise<void>;
}) {
  const [selectedHosting, setSelectedHosting] = useState<HostingPlanKey>("standard");
  const [wizardStep, setWizardStep] = useState<PublishWizardStep>("plan");
  const [pseudoDomain, setPseudoDomain] = useState("");
  const [customTraffic, setCustomTraffic] = useState(150);
  const [customSites, setCustomSites] = useState(3);
  const [customLeads, setCustomLeads] = useState(2500);
  const [customDomain, setCustomDomain] = useState(true);
  const [customBadgeRemoved, setCustomBadgeRemoved] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStage, setPublishStage] = useState<"idle" | "domain" | "bundle" | "deploy" | "done">("idle");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const selectedPlan = publishHostingPlans.find((plan) => plan.key === selectedHosting) ?? publishHostingPlans[1];
  const customPrice = Math.max(
    49,
    Math.round(24 + customTraffic * 0.11 + customSites * 5 + customLeads / 260 + (customDomain ? 9 : 0) + (customBadgeRemoved ? 7 : 0)),
  );
  const selectedSpecs =
    selectedHosting === "custom"
      ? {
          address: customDomain ? "свой домен" : `поддомен ${WEBBRAIN_PUBLIC_ROOT_DOMAIN}`,
          sites: `${customSites} ${customSites === 1 ? "сайт" : customSites < 5 ? "сайта" : "сайтов"}`,
          pages: customSites > 8 ? "без лимита" : "до 40 страниц",
          traffic: `${customTraffic} ГБ/мес`,
          leads: `${customLeads.toLocaleString("ru-RU")} заявок/мес`,
          badge: customBadgeRemoved ? "бейдж WebBrain убран" : "бейдж WebBrain остается",
          extra: "custom profile · private economics",
        }
      : selectedPlan.specs;
  const specItems = [
    { label: "Адрес", value: selectedSpecs.address, icon: ExternalLink },
    { label: "Сайты", value: selectedSpecs.sites, icon: Laptop },
    { label: "Страницы", value: selectedSpecs.pages, icon: FileText },
    { label: "Трафик", value: selectedSpecs.traffic, icon: Rocket },
    { label: "Заявки", value: selectedSpecs.leads, icon: ClipboardList },
    { label: "Бейдж", value: selectedSpecs.badge, icon: CheckCircle2 },
  ];
  const SelectedHostingIcon = selectedPlan.icon;

  useEffect(() => {
    if (!open) return;

    window.queueMicrotask(() => {
      setPublishError(null);
      setPublishedUrl(null);
      setPublishStage("idle");

      if (publication) {
        setSelectedHosting(publication.plan_key);
        setPseudoDomain(publication.slug);
        setWizardStep("plan");
        return;
      }

      setPseudoDomain(slugifyPublishDraft(projectName || "site"));
      setWizardStep("plan");
    });
  }, [open, projectName, publication]);

  const publishProgressItems = [
    { key: "domain", label: "Адрес подготовлен" },
    { key: "bundle", label: "Собираю страницы сайта" },
    { key: "deploy", label: "Выкладываю публикацию" },
    { key: "done", label: "Сайт опубликован" },
  ] as const;
  const currentProgressIndex = Math.max(0, publishProgressItems.findIndex((item) => item.key === publishStage));
  const submitPublish = async () => {
    if (wizardStep === "plan" && !publication) {
      setWizardStep("domain");
      setPublishError(null);
      return;
    }

    const slug = slugifyPublishDraft(pseudoDomain);
    const settings =
      selectedHosting === "custom"
        ? {
            trafficGb: customTraffic,
            sitesLimit: customSites,
            leadsLimit: customLeads,
            ownDomainEnabled: customDomain,
            webbrainBadgeRemoved: customBadgeRemoved,
            pseudoDomain: slug,
          }
        : {
            address: selectedSpecs.address,
            sites: selectedSpecs.sites,
            pages: selectedSpecs.pages,
            traffic: selectedSpecs.traffic,
            leads: selectedSpecs.leads,
            badge: selectedSpecs.badge,
            pseudoDomain: slug,
          };

    try {
      setIsPublishing(true);
      setPublishStage("domain");
      setPublishError(null);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      setPublishStage("bundle");
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      setPublishStage("deploy");
      const result = await onPublish({ planKey: selectedHosting, slug, settings });
      setPublishStage("done");
      setPublishedUrl(result.publicUrl);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Не удалось опубликовать сайт");
      setPublishStage("idle");
    } finally {
      setIsPublishing(false);
    }
  };
  const togglePublicationStatus = async () => {
    if (!publication) return;

    try {
      setIsUpdatingStatus(true);
      setPublishError(null);
      await onUpdateStatus(publication.status === "active" ? "suspended" : "active");
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Не удалось изменить статус сайта");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  const effectivePublishedUrl = publicUrl ?? publishedUrl;

  if (publication) {
    const publicationPlan = publishHostingPlans.find((plan) => plan.key === publication.plan_key) ?? publishHostingPlans[1];
    const publicationSpecs = publicationPlan.specs;
    const publicationSpecItems = [
      { label: "Адрес", value: publicationSpecs.address },
      { label: "Сайты", value: publicationSpecs.sites },
      { label: "Страницы", value: publicationSpecs.pages },
      { label: "Трафик", value: publicationSpecs.traffic },
      { label: "Заявки", value: publicationSpecs.leads },
      { label: "Бейдж", value: publicationSpecs.badge },
    ];

    return (
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Закрыть управление публикацией"
              className="fixed inset-0 z-[70] cursor-default bg-black/62 backdrop-blur-[8px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <div className="pointer-events-none fixed inset-0 z-[71] grid place-items-center p-4 md:p-8">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Мой сайт"
                initial={{ y: 24, scale: 0.985, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 18, scale: 0.985, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#111313] text-white shadow-[0_36px_120px_rgba(0,0,0,0.72),inset_0_0_0_1px_rgba(190,255,76,0.11)]"
              >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.055] bg-[radial-gradient(circle_at_75%_0%,rgba(190,255,76,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent)] px-5 py-4 md:px-7">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.08] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-lime">
                      <Rocket className="h-3.5 w-3.5" />
                      Мой сайт
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] md:text-3xl">{publication.slug}</h2>
                    <p className="mt-2 break-all text-sm leading-6 text-white/46">{effectivePublishedUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/[0.04] text-white/48 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_360px] md:p-5">
                  <section className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/34">Статус публикации</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                          {publication.status === "active" ? "Сайт открыт" : "Сайт закрыт"}
                        </h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${publication.status === "active" ? "bg-lime text-black" : "bg-red-400/16 text-red-100"}`}>
                        {publication.status === "active" ? "онлайн" : "закрыт"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: "Визиты", value: usage?.visits ?? 0 },
                        { label: "Заявки", value: usage?.leads ?? 0 },
                        { label: "Трафик", value: formatTrafficBytes(usage?.traffic_bytes ?? 0) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[15px] bg-white/[0.035] px-4 py-3">
                          <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/30">{item.label}</p>
                          <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <a
                        href={effectivePublishedUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-lime text-sm font-extrabold text-black transition hover:bg-[#d7ff74]"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Открыть сайт
                      </a>
                      <button
                        type="button"
                        onClick={() => void togglePublicationStatus()}
                        disabled={isUpdatingStatus}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-white/70 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-45"
                      >
                        {publication.status === "active" ? <LockKeyhole className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {publication.status === "active" ? "Закрыть сайт" : "Открыть сайт"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitPublish()}
                        disabled={isPublishing}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-sm font-bold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {isPublishing ? "Обновляю..." : "Обновить сайт"}
                      </button>
                    </div>
                    {publishError ? <p className="mt-3 text-xs leading-5 text-red-200/72">{publishError}</p> : null}
                  </section>

                  <aside className="rounded-[20px] border border-white/[0.07] bg-[#090a0a] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/32">Тариф публикации</p>
                    <h3 className="mt-3 text-xl font-semibold text-white">{publicationPlan.name}</h3>
                    <p className="mt-1 text-xs font-medium text-white/38">{publicationPlan.price}</p>
                    <div className="mt-4 space-y-2">
                      {publicationSpecItems.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-[12px] bg-white/[0.035] px-3 py-2 text-sm">
                          <span className="text-white/38">{item.label}</span>
                          <span className="text-right font-semibold text-white/78">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 rounded-[13px] bg-lime/[0.075] px-3 py-2 text-sm leading-5 text-lime/78">
                      Статистика считается по текущему месяцу.
                    </p>
                  </aside>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Закрыть выбор хостинга"
            className="fixed inset-0 z-[70] cursor-default bg-black/62 backdrop-blur-[8px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
              <div className="pointer-events-none fixed inset-0 z-[71] grid place-items-center p-4 md:p-8">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Выбор тарифа публикации"
              initial={{ y: 24, scale: 0.985, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.985, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#111313] text-white shadow-[0_36px_120px_rgba(0,0,0,0.72),inset_0_0_0_1px_rgba(190,255,76,0.11)]"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.055] bg-[radial-gradient(circle_at_75%_0%,rgba(190,255,76,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent)] px-5 py-4 md:px-7">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.08] px-3 py-1 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-lime">
                    <Rocket className="h-3.5 w-3.5" />
                    Публикация
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] md:text-3xl">Выберите тариф публикации</h2>
                  <p className="mt-2 text-sm leading-6 text-white/46">
                    {projectName ? `${projectName} будет опубликован с выбранными лимитами.` : "Выберите лимиты домена, трафика, страниц и заявок."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/[0.04] text-white/48 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden p-4 md:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {publishHostingPlans.map((plan) => {
                    const Icon = plan.icon;
                    const selected = selectedHosting === plan.key;

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedHosting(plan.key)}
                        className={`group relative h-[172px] overflow-hidden rounded-[17px] p-3.5 text-left transition ${
                          selected
                            ? "bg-[#1b211d] shadow-[inset_0_0_0_1px_rgba(190,255,76,0.72),0_22px_54px_rgba(0,0,0,0.28)]"
                            : "bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] hover:bg-white/[0.055]"
                        }`}
                      >
                        <span className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${plan.accent}`} />
                        <span className="relative flex items-start justify-between gap-3">
                          <span className={`grid h-10 w-10 place-items-center rounded-[13px] transition ${
                            selected ? "bg-lime text-black" : "bg-white/[0.055] text-white/68 group-hover:text-lime"
                          }`}>
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          {selected ? <CheckCircle2 className="h-5 w-5 text-lime" /> : null}
                        </span>
                        <span className="relative mt-4 block text-lg font-semibold tracking-[-0.02em]">{plan.name}</span>
                        <span className="relative mt-1.5 block text-sm leading-5 text-white/46">{plan.subtitle}</span>
                        <span className="relative mt-4 flex flex-wrap gap-2 text-[0.68rem] font-semibold text-white/46">
                          <span className="rounded-full bg-black/24 px-2.5 py-1">{plan.price}</span>
                          <span className="rounded-full bg-black/24 px-2.5 py-1">{plan.key === "custom" ? "гибкие лимиты" : plan.specs.sites}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <aside className="rounded-[19px] bg-black/[0.22] p-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[13px] bg-lime text-black">
                      <SelectedHostingIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold tracking-[-0.02em]">{selectedPlan.name}</p>
                      <p className="text-xs font-medium text-white/38">{selectedHosting === "custom" ? `Private` : selectedPlan.price}</p>
                    </div>
                  </div>

                  {selectedHosting === "custom" ? (
                    <div className="mt-3 space-y-2.5">
                      {[
                        { label: "Трафик", value: customTraffic, min: 50, max: 500, step: 10, suffix: "ГБ/мес", onChange: setCustomTraffic },
                        { label: "Сайтов", value: customSites, min: 1, max: 20, step: 1, suffix: "", onChange: setCustomSites },
                        { label: "Заявок", value: customLeads, min: 100, max: 10000, step: 100, suffix: "/мес", onChange: setCustomLeads },
                      ].map((item) => (
                        <label key={item.label} className="block rounded-[13px] bg-white/[0.035] px-3 py-2.5">
                          <span className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-white/76">{item.label}</span>
                            <span className="font-bold text-lime">{item.value.toLocaleString("ru-RU")} {item.suffix}</span>
                          </span>
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={item.value}
                            onChange={(event) => item.onChange(Number(event.target.value))}
                            className="h-2 w-full accent-lime"
                          />
                        </label>
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Свой домен", value: customDomain, onChange: setCustomDomain },
                          { label: "Убрать бейдж", value: customBadgeRemoved, onChange: setCustomBadgeRemoved },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => item.onChange(!item.value)}
                            className={`rounded-[12px] px-3 py-2 text-left text-sm font-semibold transition ${
                              item.value ? "bg-lime text-black" : "bg-white/[0.035] text-white/48 hover:bg-white/[0.055]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {specItems.slice(0, 4).map((item) => (
                        <div key={item.label} className="rounded-[13px] bg-white/[0.035] px-3 py-3">
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white/30">{item.label}</p>
                          <p className="mt-1.5 text-sm font-semibold leading-5 text-white/82">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 rounded-[14px] bg-lime/[0.075] px-3 py-2.5 text-sm leading-5 text-lime/78">
                    {selectedSpecs.extra}
                  </div>
                  {wizardStep === "domain" ? (
                    <div className="mt-3 rounded-[14px] border border-white/[0.07] bg-white/[0.035] p-3">
                      <label className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/34" htmlFor="webbrain-publish-slug">
                        Псевдодомен
                      </label>
                      <div className="mt-2 flex items-center overflow-hidden rounded-[12px] border border-white/[0.08] bg-black/24">
                        <input
                          id="webbrain-publish-slug"
                          value={pseudoDomain}
                          onChange={(event) => setPseudoDomain(slugifyPublishDraft(event.target.value, ""))}
                          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/24"
                          placeholder="my-coffee"
                        />
                        <span className="shrink-0 border-l border-white/[0.06] px-3 text-xs font-semibold text-white/32">{WEBBRAIN_PUBLIC_ROOT_DOMAIN}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-white/36">Это адрес внутри WebBrain, не внешний домен клиента.</p>
                    </div>
                  ) : null}
                  {isPublishing || publishStage === "done" ? (
                    <div className="mt-3 rounded-[14px] border border-lime/18 bg-lime/[0.055] p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime/70">Публикация сайта</p>
                      <div className="mt-3 space-y-2">
                        {publishProgressItems.map((item, index) => {
                          const done = publishStage === "done" || index <= currentProgressIndex;
                          const active = item.key === publishStage;

                          return (
                            <div key={item.key} className="flex items-center gap-2 text-xs font-semibold">
                              <span className={`grid h-5 w-5 place-items-center rounded-full ${done ? "bg-lime text-black" : "bg-white/[0.06] text-white/30"}`}>
                                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                              </span>
                              <span className={active ? "text-lime" : done ? "text-white/70" : "text-white/32"}>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {specItems.slice(4).map((item) => (
                      <div key={item.label} className="rounded-[12px] bg-white/[0.03] px-3 py-2 text-xs leading-4 text-white/52">
                        <span className="block font-semibold text-white/78">{item.label}</span>
                        {item.value}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void submitPublish()}
                    disabled={isPublishing}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-lime text-sm font-extrabold text-black transition hover:bg-[#d7ff74] active:scale-[0.99]"
                  >
                    <Rocket className="h-4 w-4" />
                    {isPublishing ? "Публикуем..." : publishedUrl ? "Открыть управление сайтом" : wizardStep === "domain" ? "Опубликовать сайт" : "Выбрать и продолжить"}
                  </button>
                  {publishError ? <p className="mt-2 text-xs leading-5 text-red-200/72">{publishError}</p> : null}
                  {publishedUrl ? (
                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 flex min-h-10 items-center justify-center rounded-[12px] bg-white/[0.04] px-3 text-center text-xs font-semibold text-white/68 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      Открыть сайт: {publishedUrl}
                    </a>
                  ) : null}
                </aside>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

type AccountSettingsSectionKey = "profile" | "subscription" | "limits" | "security" | "appearance" | "archive" | "admin";

const accountSettingsSections: Array<{
  key: AccountSettingsSectionKey;
  label: string;
  icon: typeof UserRound;
  locked?: boolean;
}> = [
  { key: "profile", label: "Профиль", icon: UserRound },
  { key: "subscription", label: "Подписка", icon: CreditCard },
  { key: "limits", label: "Лимиты", icon: Cpu },
  { key: "security", label: "Безопасность", icon: ShieldCheck },
  { key: "appearance", label: "Внешний вид", icon: Palette, locked: true },
  { key: "archive", label: "Архив чатов", icon: Archive },
  { key: "admin", label: "Админ", icon: Settings },
];

type AccountPlanTableCell = string | boolean;

const subscriptionComparisonRows: Array<{
  label: string;
  getValue: (plan: AccountSubscriptionPlan) => AccountPlanTableCell;
}> = [
  { label: "Кредиты в месяц", getValue: (plan) => plan.limits.creditsLabel },
  { label: "Проекты", getValue: (plan) => toProjectLimitLabel(plan.limits.sitesLabel) },
  { label: "Чат с ИИ", getValue: () => true },
  { label: "Визуальный редактор", getValue: () => true },
  { label: "Модель ИИ", getValue: (plan) => plan.limits.aiModel },
  { label: "Рассуждение", getValue: (plan) => plan.limits.reasoning },
  { label: "Лимит периода", getValue: (plan) => plan.limits.periodLimit },
  { label: "Публикации", getValue: (plan) => plan.limits.publishing },
  { label: "Рабочее пространство", getValue: (plan) => plan.limits.workspace },
  { label: "База данных", getValue: (plan) => plan.limits.database === "Да" || plan.limits.database === "Ранний доступ" ? plan.limits.database : false },
  { label: "API", getValue: (plan) => plan.limits.api === "Да" || plan.limits.api === "Ранний доступ" ? plan.limits.api : false },
  { label: "Поддержка", getValue: (plan) => plan.limits.support },
];

function PlanComparisonCell({ value }: { value: AccountPlanTableCell }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime/[0.12] text-lime">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    ) : (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-400/[0.08] text-red-200/56">
        <X className="h-4 w-4" />
      </span>
    );
  }

  return <span>{value}</span>;
}

function AccountSettingsModal({
  open,
  activeSection,
  clientId,
  projectsCount,
  chatsCount,
  appVersion,
  archivedChats,
  isLoadingArchivedChats,
  onSectionChange,
  onClose,
  onSignOut,
  onRestoreArchivedChat,
}: {
  open: boolean;
  activeSection: AccountSettingsSectionKey;
  clientId: string | null;
  projectsCount: number;
  chatsCount: number;
  appVersion: string;
  archivedChats: ArchivedChat[];
  isLoadingArchivedChats: boolean;
  onSectionChange: (section: AccountSettingsSectionKey) => void;
  onClose: () => void;
  onSignOut: () => void;
  onRestoreArchivedChat: (chat: ArchivedChat) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummaryResponse | null>(null);
  const [isLoadingProfileSummary, setIsLoadingProfileSummary] = useState(false);
  const [profileSummaryError, setProfileSummaryError] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileAvatarError, setProfileAvatarError] = useState<string | null>(null);
  const [copiedProfileId, setCopiedProfileId] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<ProfileSecurityResponse | null>(null);
  const [isLoadingSecurityStatus, setIsLoadingSecurityStatus] = useState(false);
  const [securityActionError, setSecurityActionError] = useState<string | null>(null);
  const [securityActionMessage, setSecurityActionMessage] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [savingSecurityAction, setSavingSecurityAction] = useState<"authenticator" | "email" | "password" | "reset" | "delete" | null>(null);
  const [authenticatorConnected, setAuthenticatorConnected] = useState(false);
  const [authenticatorEnrollment, setAuthenticatorEnrollment] = useState<AuthenticatorEnrollment | null>(null);
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [isAuthenticatorModalOpen, setIsAuthenticatorModalOpen] = useState(false);
  const [copiedAuthenticatorSecret, setCopiedAuthenticatorSecret] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<"platform" | "payments" | "users">("platform");
  const [adminPlatform, setAdminPlatform] = useState<Record<AdminPlatformScope, AdminPlatformState> | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [adminUserReasons, setAdminUserReasons] = useState<Record<string, string>>({});
  const [isLoadingAdminPanel, setIsLoadingAdminPanel] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [savingAdminAction, setSavingAdminAction] = useState<string | null>(null);
  const isAdmin = profileSummary?.access?.isAdmin === true;
  const visibleAccountSettingsSections = accountSettingsSections.filter((section) => section.key !== "admin" || isAdmin);
  const activeMeta = visibleAccountSettingsSections.find((section) => section.key === activeSection) ?? visibleAccountSettingsSections[0] ?? accountSettingsSections[0];

  useEffect(() => {
    if (!open || !clientId) return;

    const frame = window.requestAnimationFrame(() => {
      const storedAvatar = window.localStorage.getItem(profileAvatarStorageKey(clientId));
      setProfileAvatarUrl(storedAvatar || null);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [clientId, open]);

  useEffect(() => {
    if (!open || !clientId || (activeSection !== "profile" && activeSection !== "subscription" && activeSection !== "limits" && activeSection !== "admin")) return;

    let cancelled = false;
    const currentClientId = clientId;

    async function loadProfileSummary(silent = false) {
      try {
        if (!silent) setIsLoadingProfileSummary(true);
        if (!silent) setProfileSummaryError(null);
        const summary = await requestJson<ProfileSummaryResponse>("/api/profile/summary", currentClientId);

        if (!cancelled) setProfileSummary(summary);
      } catch (error) {
        if (!cancelled && !silent) {
          setProfileSummaryError(error instanceof Error ? error.message : "Не удалось загрузить профиль");
        }
      } finally {
        if (!cancelled && !silent) setIsLoadingProfileSummary(false);
      }
    }

    void loadProfileSummary();
    // Poll every 10s (silently — no spinner flicker) so usage % refreshes live while the panel
    // is open, instead of showing the stale number from the moment it was opened.
    const pollId = window.setInterval(() => void loadProfileSummary(true), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [activeSection, clientId, open]);

  async function loadAdminPanel() {
    if (!clientId) return;

    try {
      setIsLoadingAdminPanel(true);
      setAdminActionError(null);
      const [platformResponse, usersResponse] = await Promise.all([
        requestJson<AdminPanelResponse>("/api/admin/platform", clientId),
        requestJson<AdminUsersResponse>("/api/admin/users", clientId),
      ]);

      setAdminPlatform(platformResponse.platform);
      setAdminUsers(usersResponse.users);
      setSelectedAdminUserId((current) => current ?? usersResponse.users[0]?.id ?? null);
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : "Не удалось загрузить админ-панель");
    } finally {
      setIsLoadingAdminPanel(false);
    }
  }

  useEffect(() => {
    if (!open || !clientId || activeSection !== "admin" || !isAdmin) return;

    let cancelled = false;
    const currentClientId = clientId;

    async function loadPanel() {
      try {
        setIsLoadingAdminPanel(true);
        setAdminActionError(null);
        const [platformResponse, usersResponse] = await Promise.all([
          requestJson<AdminPanelResponse>("/api/admin/platform", currentClientId),
          requestJson<AdminUsersResponse>("/api/admin/users", currentClientId),
        ]);

        if (!cancelled) {
          setAdminPlatform(platformResponse.platform);
          setAdminUsers(usersResponse.users);
          setSelectedAdminUserId((current) => current ?? usersResponse.users[0]?.id ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setAdminActionError(error instanceof Error ? error.message : "Не удалось загрузить админ-панель");
        }
      } finally {
        if (!cancelled) setIsLoadingAdminPanel(false);
      }
    }

    void loadPanel();

    return () => {
      cancelled = true;
    };
  }, [activeSection, clientId, isAdmin, open]);

  async function loadSecurityStatus() {
    if (!clientId) return;

    try {
      setIsLoadingSecurityStatus(true);
      setSecurityActionError(null);
      const status = await requestJson<ProfileSecurityResponse>("/api/profile/security", clientId);
      setSecurityStatus(status);
      setNewEmail(status.user.email ?? "");
      await refreshAuthenticatorStatus();
    } catch (error) {
      setSecurityActionError(formatSecurityActionError(error, "Не удалось загрузить настройки безопасности"));
    } finally {
      setIsLoadingSecurityStatus(false);
    }
  }

  async function refreshAuthenticatorStatus() {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      setAuthenticatorConnected(Boolean(data?.totp?.some((factor) => factor.status === "verified")));
    } catch (error) {
      setAuthenticatorConnected(false);
      setSecurityActionError(formatSecurityActionError(error, "Не удалось проверить Google Authenticator"));
    }
  }

  useEffect(() => {
    if (!open || !clientId || activeSection !== "security") return;

    let cancelled = false;
    const currentClientId = clientId;

    async function loadStatus() {
      try {
        setIsLoadingSecurityStatus(true);
        setSecurityActionError(null);
        const status = await requestJson<ProfileSecurityResponse>("/api/profile/security", currentClientId);

        if (!cancelled) {
          setSecurityStatus(status);
          setNewEmail(status.user.email ?? "");
        }
        await refreshAuthenticatorStatus();
      } catch (error) {
        if (!cancelled) {
          setSecurityActionError(formatSecurityActionError(error, "Не удалось загрузить настройки безопасности"));
        }
      } finally {
        if (!cancelled) setIsLoadingSecurityStatus(false);
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [activeSection, clientId, open]);

  async function handleProfileAvatarSelected(file: File | undefined) {
    if (!file || !clientId) return;

    if (!file.type.startsWith("image/")) {
      setProfileAvatarError("Выберите изображение.");
      return;
    }

    if (file.size > MAX_PROFILE_AVATAR_BYTES) {
      setProfileAvatarError(`Изображение слишком большое. Максимум ${formatComposerFileSize(MAX_PROFILE_AVATAR_BYTES)}.`);
      return;
    }

    try {
      setProfileAvatarError(null);
      const dataUrl = await readFileAsDataUrl(file);
      window.localStorage.setItem(profileAvatarStorageKey(clientId), dataUrl);
      setProfileAvatarUrl(dataUrl);
    } catch (error) {
      setProfileAvatarError(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    }
  }

  async function handleCopyProfileId(profileId: string) {
    try {
      await navigator.clipboard.writeText(profileId);
      setCopiedProfileId(true);
      window.setTimeout(() => setCopiedProfileId(false), 1400);
    } catch {
      setProfileAvatarError("Не удалось скопировать ID.");
    }
  }

  async function handleStartAuthenticatorEnrollment() {
    try {
      setSavingSecurityAction("authenticator");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "WebBrain",
        issuer: "WebBrain",
      });

      if (error) throw error;
      setAuthenticatorEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
      setAuthenticatorCode("");
      setIsAuthenticatorModalOpen(true);
    } catch (error) {
      setSecurityActionError(formatSecurityActionError(error, "Не удалось подготовить Google Authenticator"));
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleVerifyAuthenticatorEnrollment() {
    const normalizedCode = authenticatorCode.replace(/\D/g, "");

    if (!authenticatorEnrollment) return;
    if (normalizedCode.length !== 6) {
      setSecurityActionError("Введите 6-значный код из Google Authenticator.");
      return;
    }

    try {
      setSavingSecurityAction("authenticator");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: authenticatorEnrollment.factorId,
        code: normalizedCode,
      });

      if (error) throw error;

      setAuthenticatorConnected(true);
      setAuthenticatorEnrollment(null);
      setAuthenticatorCode("");
      setIsAuthenticatorModalOpen(false);
      setSecurityActionMessage("Google Authenticator подключен. Теперь аккаунт защищен 6-значным кодом.");
      await refreshAuthenticatorStatus();
    } catch (error) {
      setSecurityActionError(formatSecurityActionError(error, "Не удалось подтвердить Google Authenticator"));
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleCancelAuthenticatorEnrollment() {
    const factorId = authenticatorEnrollment?.factorId;
    setIsAuthenticatorModalOpen(false);
    setAuthenticatorEnrollment(null);
    setAuthenticatorCode("");

    if (!factorId || authenticatorConnected) return;

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.mfa.unenroll({ factorId });
    } catch {
      // Не мешаем закрытию окна, если сервер уже убрал неподтвержденный фактор.
    }
  }

  async function handleCopyAuthenticatorSecret() {
    if (!authenticatorEnrollment?.secret) return;

    try {
      await navigator.clipboard.writeText(authenticatorEnrollment.secret);
      setCopiedAuthenticatorSecret(true);
      window.setTimeout(() => setCopiedAuthenticatorSecret(false), 1400);
    } catch {
      setSecurityActionError("Не удалось скопировать код подключения.");
    }
  }

  async function handleUpdateEmail() {
    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setSecurityActionError("Введите корректную новую почту.");
      return;
    }

    try {
      setSavingSecurityAction("email");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${window.location.origin}/app` },
      );

      if (error) throw error;

      setSecurityActionMessage("Письмо подтверждения отправлено на новую почту.");
      await loadSecurityStatus();
    } catch (error) {
      setSecurityActionError(error instanceof Error ? error.message : "Не удалось сменить почту");
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleUpdatePassword() {
    const email = securityStatus?.user.email ?? "";

    if (newPassword.length < 8) {
      setSecurityActionError("Новый пароль должен быть не короче 8 символов.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setSecurityActionError("Пароли не совпадают.");
      return;
    }

    try {
      setSavingSecurityAction("password");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      const supabase = getSupabaseBrowserClient();

      if (email && currentPassword.trim()) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (reauthError) throw reauthError;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setSecurityActionMessage("Пароль обновлен. Активная сессия сохранена.");
      await loadSecurityStatus();
    } catch (error) {
      setSecurityActionError(error instanceof Error ? error.message : "Не удалось сменить пароль");
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleSendPasswordReset() {
    const email = securityStatus?.user.email;

    if (!email) {
      setSecurityActionError("У аккаунта нет почты для восстановления.");
      return;
    }

    try {
      setSavingSecurityAction("reset");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });

      if (error) throw error;
      setSecurityActionMessage("Письмо для восстановления пароля отправлено.");
    } catch (error) {
      setSecurityActionError(error instanceof Error ? error.message : "Не удалось отправить письмо восстановления");
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleDeleteAccount() {
    if (!clientId) return;

    if (deleteConfirmValue.trim() !== "УДАЛИТЬ") {
      setSecurityActionError("Для удаления введите УДАЛИТЬ.");
      return;
    }

    try {
      setSavingSecurityAction("delete");
      setSecurityActionError(null);
      setSecurityActionMessage(null);

      await requestJson<{ deleted: true }>("/api/profile/security", clientId, { method: "DELETE" });

      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut().catch(() => undefined);
      window.localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
      window.location.assign("/login");
    } catch (error) {
      setSecurityActionError(error instanceof Error ? error.message : "Не удалось удалить аккаунт");
      await loadSecurityStatus();
    } finally {
      setSavingSecurityAction(null);
    }
  }

  async function handleUpdatePlatformState(scope: AdminPlatformScope, mode: AdminPlatformMode) {
    if (!clientId) return;

    try {
      setSavingAdminAction(`platform:${scope}`);
      setAdminActionError(null);
      const response = await requestJson<AdminPanelResponse>("/api/admin/platform", clientId, {
        method: "PATCH",
        body: JSON.stringify({
          scope,
          mode,
          message: "",
        }),
      });

      setAdminPlatform(response.platform);
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : "Не удалось обновить состояние платформы");
    } finally {
      setSavingAdminAction(null);
    }
  }

  async function handleAdminUserAction(userId: string, action: "ban" | "deny" | "restore") {
    if (!clientId) return;

    const reason = adminUserReasons[userId]?.trim() ?? "";

    if ((action === "ban" || action === "deny") && !reason) {
      setAdminActionError("Укажите причину для пользователя.");
      return;
    }

    try {
      setSavingAdminAction(`user:${userId}:${action}`);
      setAdminActionError(null);
      await requestJson<{ ok: true }>(`/api/admin/users/${encodeURIComponent(userId)}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      await loadAdminPanel();
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : "Не удалось обновить пользователя");
    } finally {
      setSavingAdminAction(null);
    }
  }

  const renderSectionContent = () => {
    if (activeSection === "profile") {
      const user = profileSummary?.user;
      const stats = profileSummary?.stats;
      const displayName = user?.name || user?.email?.split("@")[0] || "Аккаунт WebBrain";
      const profileEmail = user?.email || "Почта не найдена";
      const profileId = user?.id || clientId || "Профиль загружается";
      const profileStats = [
        { label: "Проекты", value: stats?.projects ?? projectsCount, icon: Laptop, hint: "создано в WebBrain" },
        { label: "Чаты", value: stats?.chats ?? chatsCount, icon: MessageSquare, hint: "история работы" },
        { label: "Сайты", value: stats?.sites ?? 0, icon: Monitor, hint: "собрано страниц" },
        { label: "Опубликовано", value: stats?.publishedSites ?? 0, icon: Rocket, hint: `${stats?.activePublishedSites ?? 0} активных` },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="rounded-[20px] bg-white/[0.035] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="group relative grid h-24 w-24 overflow-hidden rounded-[24px] bg-lime text-black shadow-[0_22px_54px_rgba(190,255,76,0.16),inset_0_0_0_1px_rgba(255,255,255,0.2)] outline-none transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-lime/65"
                    aria-label="Изменить изображение профиля"
                  >
                    {profileAvatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- User-selected local data URLs are not served by Next image loader. */
                      <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center">
                        <UserRound className="h-10 w-10" />
                      </span>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-black/54 text-white opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100">
                      <Pencil className="h-6 w-6" />
                    </span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleProfileAvatarSelected(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-3xl font-semibold tracking-[-0.04em] text-white">{displayName}</h4>
                  <p className="mt-1 truncate text-sm font-medium text-white/48">{profileEmail}</p>
                  <button
                    type="button"
                    onClick={() => void handleCopyProfileId(profileId)}
                    className="group mt-3 flex min-h-10 w-full items-center justify-between gap-3 rounded-[12px] bg-black/20 px-3 py-2 text-left text-xs font-medium text-white/34 outline-none transition hover:bg-black/30 hover:text-white/22 focus-visible:ring-2 focus-visible:ring-lime/50"
                    aria-label="Скопировать ID пользователя"
                    title="Скопировать ID"
                  >
                    <span className="min-w-0 break-all">ID {profileId}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-white/[0.045] text-white/34 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      {copiedProfileId ? <CheckCircle2 className="h-3.5 w-3.5 text-lime" /> : <Copy className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {profileAvatarError ? <p className="mt-2 text-xs leading-5 text-red-200/80">{profileAvatarError}</p> : null}
                  {profileSummaryError ? <p className="mt-2 text-xs leading-5 text-red-200/80">{profileSummaryError}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {profileStats.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white/42">{item.label}</p>
                    <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/[0.055] text-lime">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">{item.value.toLocaleString("ru-RU")}</p>
                  <p className="mt-1 text-xs font-medium text-white/34">{item.hint}</p>
                </div>
              );
            })}
          </div>

        </div>
      );
    }

    if (activeSection === "subscription") {
      const currentPlanKey = profileSummary?.subscription?.planKey ?? "start";
      const currentPlan = accountSubscriptionPlans.find((plan) => plan.key === currentPlanKey) ?? accountSubscriptionPlans[0];
      const currentPlanHighlights = [
        { label: "Текущий тариф", value: currentPlan.name },
        { label: "Стоимость", value: currentPlan.priceLabel },
        { label: "Статус", value: profileSummary?.subscription?.status ?? "active" },
      ];

      return (
        <div className="space-y-5">
          <div className="rounded-[20px] bg-[#1b211d] p-5 shadow-[inset_0_0_0_1px_rgba(190,255,76,0.24),0_24px_80px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">Текущий тариф</p>
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-black">
                Активен
              </span>
            </div>
            <h3 className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-white">{currentPlan.name}</h3>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/52">{currentPlan.description}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {currentPlanHighlights.map((item) => (
                <div key={item.label} className="rounded-[14px] bg-black/22 px-3 py-3">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/30">{item.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h4 className="text-2xl font-semibold tracking-[-0.03em] text-white">Все планы WebBrain</h4>
                <p className="mt-1 text-sm text-white/38">Выберите лимиты под количество проектов, токенов и командную работу.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[20px] bg-white/[0.03] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[1040px] overflow-hidden rounded-[16px]">
                <div className="grid grid-cols-[210px_repeat(4,minmax(190px,1fr))] bg-black/24">
                  <div className="px-4 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white/32">План</div>
                  {accountSubscriptionPlans.map((plan) => {
                    const isCurrent = plan.key === currentPlanKey;

                    return (
                      <div
                        key={plan.key}
                        className={`min-h-[128px] px-4 py-4 ${
                          isCurrent ? "bg-lime/[0.09]" : plan.tone === "featured" ? "bg-lime/[0.045]" : ""
                        }`}
                      >
                        <div className="flex min-h-6 items-center gap-2">
                          <p className="text-xl font-semibold tracking-[-0.03em] text-white">{plan.name}</p>
                          {isCurrent ? (
                            <span className="rounded-full bg-lime px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-black">
                              текущий
                            </span>
                          ) : plan.comingSoon ? (
                            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-white/46">
                              скоро
                            </span>
                          ) : plan.badge ? (
                            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-lime">
                              {plan.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{plan.priceLabel}</p>
                        <p className="mt-1 text-xs font-medium text-white/36">{plan.suffix}</p>
                        <button
                          type="button"
                          disabled={isCurrent || plan.comingSoon}
                          className={`mt-4 h-9 w-full rounded-[11px] text-xs font-extrabold transition ${
                            isCurrent
                              ? "cursor-default bg-white/[0.055] text-white/34"
                              : plan.comingSoon
                                ? "cursor-not-allowed bg-white/[0.035] text-white/34"
                              : plan.tone === "featured"
                                ? "bg-lime text-black hover:bg-white"
                                : "border border-white/[0.08] bg-white/[0.035] text-white/68 hover:border-lime/40 hover:bg-lime/[0.08] hover:text-lime"
                          }`}
                        >
                          {isCurrent ? "Ваш план" : plan.comingSoon ? "Скоро" : plan.cta.settings}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {subscriptionComparisonRows.map((row, rowIndex) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[210px_repeat(4,minmax(190px,1fr))] border-t border-white/[0.045] ${
                      rowIndex % 2 === 0 ? "bg-white/[0.018]" : "bg-transparent"
                    }`}
                  >
                    <div className="px-4 py-3.5 text-sm font-semibold text-white/48">{row.label}</div>
                    {accountSubscriptionPlans.map((plan) => (
                      <div
                        key={`${plan.key}-${row.label}`}
                        className={`flex min-h-12 items-center px-4 py-3 text-sm leading-5 ${
                          plan.key === currentPlanKey ? "bg-lime/[0.045] text-lime/90" : "text-white/66"
                        }`}
                      >
                        <PlanComparisonCell value={row.getValue(plan)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "limits") {
      const currentPlanKey = profileSummary?.subscription?.planKey ?? "start";
      const currentPlan = accountSubscriptionPlans.find((plan) => plan.key === currentPlanKey) ?? accountSubscriptionPlans[0];
      const currentTier = getTierConfig(profileSummary?.access?.tierId ?? currentPlan.tierId);
      const stats = profileSummary?.stats;
      const activity = profileSummary?.activity ?? { fiveHours: 0, day: 0, week: 0, month: 0 };
      const creditUsageCards = getProfileCreditWindows(profileSummary, currentTier).map((window) => {
        const meta = {
          five_hour: {
            label: "5 часов",
            hint: "за последние 5 часов",
            icon: BrainCircuit,
            used: activity.fiveHours,
          },
          weekly: {
            label: "Неделя",
            hint: "за последние 7 дней",
            icon: SlidersHorizontal,
            used: activity.week,
          },
          monthly: {
            label: "Месяц",
            hint: "за последние 30 дней",
            icon: Cpu,
            used: activity.month,
          },
        }[window];
        const windowLimit = getProfileCreditWindowLimit(profileSummary, currentTier, window);
        const progress = getLimitFillPercent(meta.used, windowLimit);

        return {
          label: meta.label,
          value: `${progress}%`,
          limit: "лимита",
          hint: meta.hint,
          icon: meta.icon,
          progress,
          kind: "credit" as const,
        };
      });
      const activePublicationCount = stats?.activePublishedSites ?? 0;
      const resourceUsageCards = [
        {
          label: "Проекты",
          value: String(stats?.projects ?? projectsCount),
          limit: `/ ${toProjectLimitLabel(currentPlan.limits.sitesLabel)}`,
          hint: "создано проектов",
          icon: Laptop,
          progress: getLimitFillPercent(stats?.projects ?? projectsCount, currentPlan.limits.sites),
          kind: "resource" as const,
          blockedAction: "новые проекты",
        },
        {
          label: "Публикации",
          value: String(activePublicationCount),
          limit: `/ ${currentPlan.limits.publishing}`,
          hint: `${stats?.publishedSites ?? 0} всего`,
          icon: Rocket,
          progress: getLimitFillPercent(activePublicationCount, currentPlan.limits.sites),
          kind: "resource" as const,
          blockedAction: "новые публикации",
        },
      ];
      const usageCards = [
        ...creditUsageCards,
        ...resourceUsageCards,
      ];
      const limitPressureCards = creditUsageCards.filter((item) => item.progress >= 90);
      const exhaustedLimitCards = limitPressureCards.filter((item) => item.progress >= 100);
      const limitAlertState = exhaustedLimitCards.length > 0 ? "exhausted" : limitPressureCards.length > 0 ? "warning" : null;
      const limitAlertLabels = (exhaustedLimitCards.length > 0 ? exhaustedLimitCards : limitPressureCards).map((item) => item.label).join(", ");
      const resourcePressureCards = resourceUsageCards.filter((item) => item.progress >= 90);
      const exhaustedResourceCards = resourcePressureCards.filter((item) => item.progress >= 100);
      const resourceAlertState = exhaustedResourceCards.length > 0 ? "exhausted" : resourcePressureCards.length > 0 ? "warning" : null;
      const resourceAlertLabels = (exhaustedResourceCards.length > 0 ? exhaustedResourceCards : resourcePressureCards).map((item) => item.label).join(", ");
      const blockedResourceActions = exhaustedResourceCards.map((item) => item.blockedAction).join(", ");
      const comparisonRows: Array<{ label: string; getValue: (plan: (typeof accountSubscriptionPlans)[number]) => string }> = [
        { label: "Кредиты", getValue: (plan) => plan.limits.creditsLabel },
        { label: "Лимит периода", getValue: (plan) => plan.limits.periodLimit },
        { label: "Проекты", getValue: (plan) => toProjectLimitLabel(plan.limits.sitesLabel) },
        { label: "Модель ИИ", getValue: (plan) => plan.limits.aiModel },
        { label: "Рассуждение", getValue: (plan) => plan.limits.reasoning },
        { label: "Публикации", getValue: (plan) => plan.limits.publishing },
        { label: "Команда", getValue: (plan) => plan.limits.workspace },
        { label: "База данных", getValue: (plan) => plan.limits.database },
        { label: "API", getValue: (plan) => plan.limits.api },
        { label: "Поддержка", getValue: (plan) => plan.limits.support },
      ];

      return (
        <div className="space-y-5">
          <div className="rounded-[20px] bg-[#1b211d] p-5 shadow-[inset_0_0_0_1px_rgba(190,255,76,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lime">Лимиты текущего тарифа</p>
                <h4 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">{currentPlan.name}</h4>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">{currentPlan.description}</p>
              </div>
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-black">
                Текущий план
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {usageCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-[16px] bg-black/22 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white/44">{item.label}</p>
                      <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-white/[0.055] text-lime">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                      <p className="text-4xl font-semibold tracking-[-0.05em] text-white">{item.value}</p>
                      <p className="pb-1.5 text-sm font-medium text-white/34">{item.limit}</p>
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/34">{item.hint}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-lime shadow-[0_0_22px_rgba(190,255,76,0.28)]" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {limitAlertState || resourceAlertState
              ? (() => {
                  // One unified card. Two separate cards (AI limits + resource limits) looked
                  // strange when both fired at once, so we merge them: shared header + CTA, with
                  // a line per active limit type. Severity = red if anything is fully exhausted.
                  const anyExhausted = limitAlertState === "exhausted" || resourceAlertState === "exhausted";
                  const onlyResource = !limitAlertState && Boolean(resourceAlertState);
                  const title = onlyResource
                    ? resourceAlertState === "exhausted"
                      ? "Лимит ресурсов достигнут"
                      : "Лимит ресурсов почти заполнен"
                    : anyExhausted
                      ? "Лимиты закончились"
                      : "Лимиты почти заполнены";
                  return (
                    <div
                      className={`mt-4 rounded-[16px] p-4 ${
                        anyExhausted
                          ? "bg-red-500/[0.1] shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]"
                          : "bg-lime/[0.08] shadow-[inset_0_0_0_1px_rgba(190,255,76,0.16)]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${
                              anyExhausted ? "bg-red-400/[0.14] text-red-100" : "bg-lime/[0.13] text-lime"
                            }`}
                          >
                            <TriangleAlert className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h5 className="text-lg font-semibold tracking-[-0.025em] text-white">{title}</h5>
                            <div className="mt-1 space-y-1 text-sm leading-6 text-white/52">
                              {limitAlertState ? (
                                <p>
                                  {limitAlertState === "exhausted"
                                    ? `Закончились лимиты ИИ: ${limitAlertLabels}.`
                                    : `Лимиты ИИ почти заполнены: ${limitAlertLabels}.`}
                                </p>
                              ) : null}
                              {resourceAlertState ? (
                                <p>
                                  {resourceAlertState === "exhausted"
                                    ? `Достигнут лимит ресурсов: ${resourceAlertLabels}. Существующие сайты и публикации останутся доступны, ${blockedResourceActions || "новые ресурсы"} — после обновления плана.`
                                    : `Ресурсы почти заполнены: ${resourceAlertLabels}.`}
                                </p>
                              ) : null}
                              <p className="text-white/40">
                                {anyExhausted ? "Обновите план, чтобы продолжить без паузы." : "Можно обновить план заранее."}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSectionChange("subscription")}
                          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] bg-lime px-4 text-sm font-extrabold text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
                        >
                          <Rocket className="h-4 w-4" />
                          Обновить план
                        </button>
                      </div>
                    </div>
                  );
                })()
              : null}

            {profileSummaryError ? <p className="mt-3 text-xs leading-5 text-red-200/80">{profileSummaryError}</p> : null}
          </div>

          <div className="rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <h4 className="text-2xl font-semibold tracking-[-0.03em] text-white">Сравнение лимитов по тарифам</h4>
                <p className="mt-1 text-sm text-white/38">Те же лимиты, что используются в публичных тарифах WebBrain.</p>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingProfileSummary ? <RefreshCw className="h-5 w-5 animate-spin text-lime/70" /> : null}
                <button
                  type="button"
                  onClick={() => onSectionChange("subscription")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-lime px-3.5 text-xs font-extrabold text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Обновить тариф
                </button>
              </div>
            </div>

            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[980px] overflow-hidden rounded-[16px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                <div className="grid grid-cols-[190px_repeat(4,minmax(170px,1fr))] bg-black/24">
                  <div className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/32">Лимит</div>
                  {accountSubscriptionPlans.map((plan) => (
                    <div
                      key={plan.key}
                      className={`px-4 py-3 text-sm font-semibold ${
                        plan.key === currentPlanKey ? "bg-lime/[0.1] text-lime" : "text-white/78"
                      }`}
                    >
                      <span>{plan.name}</span>
                      {plan.key === currentPlanKey ? <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-[0.62rem] font-extrabold uppercase text-black">текущий</span> : null}
                    </div>
                  ))}
                </div>

                {comparisonRows.map((row, rowIndex) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[190px_repeat(4,minmax(170px,1fr))] border-t border-white/[0.045] ${
                      rowIndex % 2 === 0 ? "bg-white/[0.018]" : "bg-transparent"
                    }`}
                  >
                    <div className="px-4 py-3 text-sm font-semibold text-white/46">{row.label}</div>
                    {accountSubscriptionPlans.map((plan) => (
                      <div key={`${plan.key}-${row.label}`} className={`px-4 py-3 text-sm leading-5 ${plan.key === currentPlanKey ? "text-lime/90" : "text-white/66"}`}>
                        {row.getValue(plan)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "admin") {
      const platformModes: Array<{ mode: AdminPlatformMode; label: string; hint: string }> = [
        { mode: "open", label: "Открыто", hint: "Доступ без ограничений" },
        { mode: "platform_update", label: "Идет обновление платформы", hint: "Покажет экран обновления" },
        { mode: "problem", label: "Мы решаем проблему", hint: "Покажет экран инцидента" },
      ];
      const selectedAdminUser = adminUsers.find((user) => user.id === selectedAdminUserId) ?? adminUsers[0] ?? null;

      if (!isAdmin) {
        return (
          <div className="grid min-h-[340px] place-items-center rounded-[18px] bg-white/[0.025] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
            <div className="max-w-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-white/28" />
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">Только для админов</h3>
              <p className="mt-2 text-sm leading-6 text-white/42">Этот раздел появится после подтверждения прав администратора.</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[#1b211d] p-4 shadow-[inset_0_0_0_1px_rgba(190,255,76,0.18)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">Администрирование</p>
              <h4 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">Админ-панель WebBrain</h4>
            </div>
            <button
              type="button"
              onClick={() => void loadAdminPanel()}
              disabled={isLoadingAdminPanel}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-extrabold text-white/70 transition hover:border-lime/35 hover:bg-lime/[0.08] hover:text-lime disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAdminPanel ? "animate-spin" : ""}`} />
              Обновить
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "platform", label: "Платформа" },
              { key: "payments", label: "Платежи" },
              { key: "users", label: "Пользователи" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveAdminTab(tab.key as typeof activeAdminTab)}
                className={`h-10 rounded-[12px] px-3.5 text-sm font-bold transition ${
                  activeAdminTab === tab.key ? "bg-lime text-black" : "bg-white/[0.035] text-white/56 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {adminActionError ? (
            <div className="rounded-[14px] bg-red-500/[0.1] px-4 py-3 text-sm font-semibold text-red-100 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]">
              {adminActionError}
            </div>
          ) : null}

          {activeAdminTab === "platform" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[
                { scope: "app" as const, title: "Закрыть /app", text: "Ограничивает доступ к рабочему приложению. Админы смогут зайти и снять режим." },
                { scope: "global" as const, title: "Закрыть весь сайт", text: "Закрывает публичную часть и приложение для обычных пользователей." },
              ].map((item) => {
                const state = adminPlatform?.[item.scope] ?? { mode: "open" as AdminPlatformMode, message: "" };

                return (
                  <div key={item.scope} className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">{item.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-white/42">{item.text}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold uppercase ${state.mode === "open" ? "bg-lime text-black" : "bg-red-400 text-black"}`}>
                        {state.mode === "open" ? "открыто" : "закрыто"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {platformModes.map((mode) => {
                        const active = state.mode === mode.mode;

                        return (
                          <button
                            key={mode.mode}
                            type="button"
                            disabled={savingAdminAction === `platform:${item.scope}`}
                            onClick={() => void handleUpdatePlatformState(item.scope, mode.mode)}
                            className={`flex min-h-12 items-center justify-between gap-3 rounded-[13px] px-3 py-2 text-left transition ${
                              active
                                ? "bg-lime/[0.12] text-lime shadow-[inset_0_0_0_1px_rgba(190,255,76,0.22)]"
                                : "bg-black/20 text-white/58 hover:bg-white/[0.055] hover:text-white"
                            } disabled:cursor-wait disabled:opacity-60`}
                          >
                            <span>
                              <span className="block text-sm font-bold">{mode.label}</span>
                              <span className="mt-0.5 block text-xs text-white/34">{mode.hint}</span>
                            </span>
                            {active ? <CheckCircle2 className="h-4 w-4" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeAdminTab === "payments" ? (
            <div className="rounded-[18px] bg-white/[0.035] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
              <CreditCard className="h-9 w-9 text-lime/80" />
              <h4 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-white">История платежей</h4>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/42">Подраздел подготовлен. Здесь появятся транзакции, счета, статусы подписок и фильтры по пользователям.</p>
              <div className="mt-5 rounded-[14px] bg-black/24 px-4 py-3 text-sm font-semibold text-white/42">Функциональность будет подключена после биллинга.</div>
            </div>
          ) : null}

          {activeAdminTab === "users" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
              <div className="space-y-3">
                {adminUsers.length === 0 ? (
                  <div className="rounded-[18px] bg-white/[0.035] p-5 text-sm text-white/42 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                    Пользователи не загружены.
                  </div>
                ) : null}
                {adminUsers.map((user) => {
                  const active = selectedAdminUser?.id === user.id;
                  const reason = adminUserReasons[user.id] ?? user.banReason ?? user.accessDeniedReason ?? "";

                  return (
                    <div
                      key={user.id}
                      className={`rounded-[18px] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] ${
                        active ? "bg-lime/[0.07]" : "bg-white/[0.035]"
                      }`}
                    >
                      <button type="button" onClick={() => setSelectedAdminUserId(user.id)} className="block w-full text-left">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">{user.name || user.email}</p>
                            <p className="mt-1 truncate text-xs font-medium text-white/34">{user.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {user.isAdmin ? <span className="rounded-full bg-lime px-2 py-1 text-[0.62rem] font-extrabold uppercase text-black">admin</span> : null}
                            {user.isBanned ? <span className="rounded-full bg-red-400 px-2 py-1 text-[0.62rem] font-extrabold uppercase text-black">ban</span> : null}
                            {user.accessDenied ? <span className="rounded-full bg-red-400/[0.16] px-2 py-1 text-[0.62rem] font-extrabold uppercase text-red-100">нет доступа</span> : null}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-[12px] bg-black/20 px-2 py-2">
                            <p className="text-lg font-semibold text-white">{user.stats.projects}</p>
                            <p className="text-[0.62rem] uppercase text-white/30">проекты</p>
                          </div>
                          <div className="rounded-[12px] bg-black/20 px-2 py-2">
                            <p className="text-lg font-semibold text-white">{user.stats.chats}</p>
                            <p className="text-[0.62rem] uppercase text-white/30">чаты</p>
                          </div>
                          <div className="rounded-[12px] bg-black/20 px-2 py-2">
                            <p className="text-lg font-semibold text-white">{user.stats.sites}</p>
                            <p className="text-[0.62rem] uppercase text-white/30">сайты</p>
                          </div>
                        </div>
                      </button>

                      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="text"
                          value={reason}
                          onChange={(event) => setAdminUserReasons((current) => ({ ...current, [user.id]: event.currentTarget.value }))}
                          placeholder="Причина ограничения"
                          className="h-10 rounded-[12px] border border-white/[0.07] bg-black/20 px-3 text-xs font-semibold text-white/80 outline-none transition placeholder:text-white/24 focus:border-lime/45"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingAdminAction?.startsWith(`user:${user.id}:`)}
                            onClick={() => void handleAdminUserAction(user.id, "ban")}
                            className="h-10 rounded-[12px] bg-red-400 px-3 text-xs font-extrabold text-black transition hover:bg-red-200 disabled:cursor-wait disabled:opacity-55"
                          >
                            Забанить
                          </button>
                          <button
                            type="button"
                            disabled={savingAdminAction?.startsWith(`user:${user.id}:`)}
                            onClick={() => void handleAdminUserAction(user.id, "deny")}
                            className="h-10 rounded-[12px] border border-red-200/20 bg-red-400/[0.08] px-3 text-xs font-extrabold text-red-100 transition hover:bg-red-400/[0.14] disabled:cursor-wait disabled:opacity-55"
                          >
                            Запретить доступ
                          </button>
                          <button
                            type="button"
                            disabled={savingAdminAction?.startsWith(`user:${user.id}:`)}
                            onClick={() => void handleAdminUserAction(user.id, "restore")}
                            className="h-10 rounded-[12px] border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-extrabold text-white/62 transition hover:border-lime/35 hover:text-lime disabled:cursor-wait disabled:opacity-55"
                          >
                            Вернуть
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                {selectedAdminUser ? (
                  <>
                    <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">Подробная статистика</h4>
                    <p className="mt-1 truncate text-sm text-white/38">{selectedAdminUser.email}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        { label: "Сообщения", value: selectedAdminUser.stats.messages },
                        { label: "Публикации", value: selectedAdminUser.stats.publishedSites },
                        { label: "Активные", value: selectedAdminUser.stats.activePublishedSites },
                        { label: "Последний вход", value: formatAccountDate(selectedAdminUser.lastSignInAt) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[13px] bg-black/22 px-3 py-3">
                          <p className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-white/30">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/34">Последние запросы</p>
                      <div className="mt-2 space-y-2">
                        {selectedAdminUser.stats.recentRequests.length === 0 ? (
                          <p className="rounded-[13px] bg-black/20 px-3 py-3 text-sm text-white/36">Запросов пока нет.</p>
                        ) : null}
                        {selectedAdminUser.stats.recentRequests.map((request) => (
                          <div key={request.id} className="rounded-[13px] bg-black/20 px-3 py-3">
                            <p className="line-clamp-3 text-sm leading-5 text-white/68">{request.text}</p>
                            <p className="mt-2 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-white/24">{formatAccountDate(request.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/42">Выберите пользователя.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (activeSection === "security") {
      const securityUser = securityStatus?.user;
      const providers = securityUser?.providers ?? [];
      const emailConnected = providers.includes("email") || Boolean(securityUser?.email);
      const canDeleteAccount = Boolean(securityUser?.canDeleteNow);
      const deleteAvailableAt = formatAccountDate(securityUser?.canDeleteAt);

      return (
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[#1b211d] p-4 shadow-[inset_0_0_0_1px_rgba(190,255,76,0.18)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-lime/[0.12] text-lime">
                    {isLoadingSecurityStatus ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime">Защита включена</p>
                    <h4 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-white">Безопасность аккаунта</h4>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/46">
                  Вход, смена почты и пароль защищены подтверждением. WebBrain не хранит ваш пароль.
                </p>
              </div>
              <span className="rounded-full bg-lime/[0.1] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-lime">
                {authenticatorConnected ? "2FA подключена" : "Активно"}
              </span>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
                {[
                  { label: "Почта", value: securityUser?.email ?? "Не подключена" },
                  { label: "Аккаунт создан", value: formatAccountDate(securityUser?.createdAt) },
                  { label: "Последний вход", value: formatAccountDate(securityUser?.lastSignInAt) },
                ].map((item) => (
                  <div key={item.label} className="min-w-0 rounded-[13px] bg-black/20 px-3 py-2.5">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/28">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white/74">{item.value}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">Способы входа</h4>
                  <p className="mt-1 text-sm leading-6 text-white/42">Почта остается основным входом, а Google Authenticator добавляет 6-значный код.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between gap-3 rounded-[14px] bg-black/20 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/[0.06] text-lime">
                      <Mail className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white/82">Почта</p>
                      <p className="text-xs font-medium text-white/38">{emailConnected ? "Подключен" : "Не подключен"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[0.055] px-3 py-1 text-xs font-bold text-white/42">
                    Основной
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[14px] bg-black/20 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/[0.06] text-lime">
                      <KeyRound className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white/82">Google Authenticator</p>
                      <p className="text-xs font-medium text-white/38">{authenticatorConnected ? "Подключен" : "QR-код и 6-значный код"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={authenticatorConnected || savingSecurityAction === "authenticator"}
                    onClick={() => void handleStartAuthenticatorEnrollment()}
                    className={`h-9 shrink-0 rounded-[11px] px-3 text-xs font-extrabold transition ${
                      authenticatorConnected
                        ? "cursor-default bg-white/[0.055] text-white/34"
                        : "bg-lime text-black hover:bg-white disabled:cursor-wait disabled:opacity-70"
                    }`}
                  >
                    {authenticatorConnected ? "Готово" : savingSecurityAction === "authenticator" ? "Готовлю..." : "Подключить"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/[0.055] text-lime">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">Смена почты</h4>
                  <p className="mt-1 text-sm leading-6 text-white/42">Мы отправим письмо подтверждения на новый адрес.</p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/34">Новая почта</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.currentTarget.value)}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-[14px] border border-white/[0.07] bg-black/20 px-4 text-sm font-semibold text-white/82 outline-none transition placeholder:text-white/22 focus:border-lime/45 focus:bg-lime/[0.045]"
                />
              </label>

              <button
                type="button"
                disabled={savingSecurityAction === "email"}
                onClick={() => void handleUpdateEmail()}
                className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-[13px] bg-lime px-4 text-sm font-extrabold text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
              >
                {savingSecurityAction === "email" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {savingSecurityAction === "email" ? "Отправляю..." : "Сменить почту"}
              </button>
            </div>
          </div>

          {(securityActionError || securityActionMessage) ? (
            <div className={`rounded-[16px] px-4 py-3 text-sm font-semibold ${
              securityActionError
                ? "bg-red-500/[0.1] text-red-100 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.22)]"
                : "bg-lime/[0.1] text-lime shadow-[inset_0_0_0_1px_rgba(190,255,76,0.2)]"
            }`}>
              {securityActionError || securityActionMessage}
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="rounded-[18px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/[0.055] text-lime">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">Пароль</h4>
                  <p className="mt-1 text-sm leading-6 text-white/42">Введите текущий пароль, затем задайте новый.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                  placeholder="Текущий пароль"
                  autoComplete="current-password"
                  className="h-12 rounded-[14px] border border-white/[0.07] bg-black/20 px-4 text-sm font-semibold text-white/82 outline-none transition placeholder:text-white/24 focus:border-lime/45 focus:bg-lime/[0.045]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.currentTarget.value)}
                    placeholder="Новый пароль"
                    autoComplete="new-password"
                    className="h-12 rounded-[14px] border border-white/[0.07] bg-black/20 px-4 text-sm font-semibold text-white/82 outline-none transition placeholder:text-white/24 focus:border-lime/45 focus:bg-lime/[0.045]"
                  />
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(event) => setNewPasswordConfirm(event.currentTarget.value)}
                    placeholder="Повторите пароль"
                    autoComplete="new-password"
                    className="h-12 rounded-[14px] border border-white/[0.07] bg-black/20 px-4 text-sm font-semibold text-white/82 outline-none transition placeholder:text-white/24 focus:border-lime/45 focus:bg-lime/[0.045]"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingSecurityAction === "password"}
                  onClick={() => void handleUpdatePassword()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] bg-lime px-4 text-sm font-extrabold text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
                >
                  {savingSecurityAction === "password" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {savingSecurityAction === "password" ? "Сохраняю..." : "Обновить пароль"}
                </button>
                <button
                  type="button"
                  disabled={savingSecurityAction === "reset"}
                  onClick={() => void handleSendPasswordReset()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-bold text-white/68 transition hover:border-lime/35 hover:bg-lime/[0.08] hover:text-lime disabled:cursor-wait disabled:opacity-70"
                >
                  {savingSecurityAction === "reset" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Сброс по почте
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] bg-red-500/[0.08] p-4 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-red-500/[0.12] text-red-100">
                <Trash2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h4 className="text-xl font-semibold tracking-[-0.025em] text-white">Удаление аккаунта</h4>
                <p className="mt-1 text-sm leading-6 text-red-100/60">
                  Аккаунт можно удалить только через {securityUser?.deleteDelayDays ?? 7} дней после создания. Будут удалены профиль, проекты, чаты, сайты и публикации.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[14px] bg-black/24 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-red-100/58">Доступно с</span>
                <span className="text-sm font-semibold text-white">{deleteAvailableAt}</span>
              </div>
              {!canDeleteAccount ? (
                <p className="mt-2 text-xs leading-5 text-red-100/52">До этой даты удаление аккаунта недоступно.</p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                value={deleteConfirmValue}
                onChange={(event) => setDeleteConfirmValue(event.currentTarget.value)}
                placeholder="Введите УДАЛИТЬ"
                disabled={!canDeleteAccount}
                className="h-12 rounded-[14px] border border-red-200/[0.14] bg-black/20 px-4 text-sm font-semibold text-white/82 outline-none transition placeholder:text-red-100/26 focus:border-red-200/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
              <button
                type="button"
                disabled={!canDeleteAccount || savingSecurityAction === "delete"}
                onClick={() => void handleDeleteAccount()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-red-400 px-4 text-sm font-extrabold text-black transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {savingSecurityAction === "delete" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Удалить
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[13px] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-bold text-white/72 transition hover:border-red-300/35 hover:bg-red-400/[0.09] hover:text-red-100 sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      );
    }

    if (activeSection === "archive") {
      if (isLoadingArchivedChats) {
        return (
          <div className="grid min-h-[340px] place-items-center rounded-[18px] bg-white/[0.025] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
            <div className="max-w-sm">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-lime/70" />
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">Загружаю архив</h3>
              <p className="mt-2 text-sm leading-6 text-white/42">Собираю чаты, которые убрали из основного списка.</p>
            </div>
          </div>
        );
      }

      if (archivedChats.length > 0) {
        return (
          <div className="space-y-3">
            {archivedChats.map((chat) => (
              <div
                key={chat.id}
                className="flex flex-col gap-3 rounded-[16px] bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.055] text-lime">
                      <Archive className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white/82">{limitChatTitle(chat.title)}</p>
                      <p className="mt-1 truncate text-xs font-medium text-white/34">Проект: {chat.project_name}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreArchivedChat(chat)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-bold text-white/68 transition hover:border-lime/35 hover:bg-lime/[0.08] hover:text-lime"
                >
                  <RefreshCw className="h-4 w-4" />
                  Вернуть
                </button>
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="grid min-h-[340px] place-items-center rounded-[18px] bg-white/[0.025] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
          <div className="max-w-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[17px] bg-white/[0.055] text-white/68">
              <Archive className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">Архив пока пуст</h3>
            <p className="mt-2 text-sm leading-6 text-white/42">Здесь будут чаты, которые вы уберёте из основного списка, но захотите сохранить.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid min-h-[340px] place-items-center rounded-[18px] bg-white/[0.025] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
        <div className="max-w-sm">
          <Palette className="mx-auto h-10 w-10 text-white/28" />
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">Внешний вид скоро</h3>
          <p className="mt-2 text-sm leading-6 text-white/42">Тема, плотность интерфейса и визуальные пресеты появятся в следующих обновлениях.</p>
        </div>
      </div>
    );
  };

  return (
    <>
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] bg-[#101112]/98 text-white backdrop-blur-2xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(190,255,76,0.12),transparent_36%),radial-gradient(circle_at_0%_100%,rgba(62,207,142,0.08),transparent_34%)]"
          />
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full flex-col overflow-hidden"
          >
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-5 md:px-7">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-lime">WebBrain v{appVersion}</p>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Настройки</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть настройки"
                className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/[0.04] text-white/52 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 md:grid-cols-[246px_minmax(0,1fr)]">
              <aside className="min-h-0 border-b border-white/[0.06] p-3 md:border-b-0 md:border-r md:px-3 md:py-4">
                <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
                  {visibleAccountSettingsSections.map((section) => {
                    const Icon = section.icon;
                    const active = activeSection === section.key;

                    return (
                      <button
                        key={section.key}
                        type="button"
                        aria-disabled={section.locked}
                        title={section.locked ? "Скоро" : section.label}
                        onClick={() => {
                          if (!section.locked) onSectionChange(section.key);
                        }}
                        className={`group relative flex h-10 items-center gap-2.5 rounded-[11px] px-2.5 text-left text-[0.82rem] font-semibold transition ${
                          active
                            ? "bg-white/[0.09] text-white"
                            : section.locked
                              ? "cursor-not-allowed bg-white/[0.018] text-white/28"
                              : "text-white/54 hover:bg-white/[0.055] hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-lime" : ""}`} />
                        <span className="min-w-0 truncate">{section.label}</span>
                        {section.locked ? (
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-lime px-2 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-black opacity-0 transition group-hover:opacity-100">
                            Скоро
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 h-px bg-white/[0.065]" />
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-3 flex h-10 w-full items-center gap-2.5 rounded-[11px] px-2.5 text-left text-[0.82rem] font-semibold text-red-100/68 transition hover:bg-red-400/[0.09] hover:text-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </aside>

              <section className="min-h-0 overflow-y-auto p-4 md:px-5 md:py-6">
                <div className="mb-5">
                  <h3 className="text-2xl font-semibold tracking-[-0.035em] text-white">{activeMeta.label}</h3>
                  <p className="mt-1 text-sm text-white/38">Настройки рабочего пространства</p>
                </div>
                {renderSectionContent()}
              </section>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
    {typeof document === "undefined"
      ? null
      : createPortal(
        <AnimatePresence>
          {isAuthenticatorModalOpen && authenticatorEnrollment ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/62 px-4 py-6 text-white backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) void handleCancelAuthenticatorEnrollment();
              }}
            >
              <motion.div
                initial={{ y: 18, scale: 0.98, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 12, scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[520px] rounded-[24px] bg-[#171a18] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(190,255,76,0.18)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">Двухфакторная защита</p>
                    <h4 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">Подключите Google Authenticator</h4>
                    <p className="mt-2 text-sm leading-6 text-white/46">Отсканируйте QR-код или введите код подключения вручную, затем подтвердите 6 цифр из приложения.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCancelAuthenticatorEnrollment()}
                    aria-label="Закрыть подключение Google Authenticator"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white/[0.055] text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="rounded-[18px] bg-white p-3">
                    <img
                      src={authenticatorEnrollment.qrCode}
                      alt="QR-код Google Authenticator"
                      className="h-full w-full rounded-[12px]"
                    />
                  </div>
                  <div className="min-w-0 rounded-[18px] bg-black/22 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/34">Код подключения</p>
                    <button
                      type="button"
                      onClick={() => void handleCopyAuthenticatorSecret()}
                      className="mt-2 flex w-full items-center justify-between gap-3 rounded-[13px] bg-white/[0.045] px-3 py-3 text-left transition hover:bg-white/[0.07]"
                    >
                      <span className="min-w-0 break-all font-mono text-sm font-semibold tracking-[0.04em] text-white/78">{authenticatorEnrollment.secret}</span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-lime">
                        <Copy className="h-4 w-4" />
                        {copiedAuthenticatorSecret ? "Скопировано" : "Копировать"}
                      </span>
                    </button>
                    <p className="mt-3 text-xs leading-5 text-white/36">Этот код нужен только для настройки приложения. Не отправляйте его никому.</p>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/34">Код из приложения</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={authenticatorCode}
                    onChange={(event) => setAuthenticatorCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="h-14 w-full rounded-[15px] border border-white/[0.08] bg-black/24 px-4 text-center font-mono text-2xl font-bold tracking-[0.18em] text-white outline-none transition placeholder:text-white/18 focus:border-lime/45 focus:bg-lime/[0.045]"
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleCancelAuthenticatorEnrollment()}
                    className="inline-flex h-11 items-center justify-center rounded-[13px] border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-bold text-white/62 transition hover:border-white/16 hover:bg-white/[0.07] hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={savingSecurityAction === "authenticator" || authenticatorCode.length !== 6}
                    onClick={() => void handleVerifyAuthenticatorEnrollment()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[13px] bg-lime px-4 text-sm font-extrabold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {savingSecurityAction === "authenticator" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Подключить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export function WebBrainAppShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<"chat" | "editor">("chat");
  const sidebarAutoHiddenByEditorRef = useRef(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [shellProfileSummary, setShellProfileSummary] = useState<ProfileSummaryResponse | null>(null);
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [projectChatsById, setProjectChatsById] = useState<Record<string, StoredChat[]>>({});
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const [chatRunStates, setChatRunStates] = useState<Record<string, ChatRunSummary>>({});
  const [seenChatRuns, setSeenChatRuns] = useState<Record<string, string>>({});
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [isLoadingArchivedChats, setIsLoadingArchivedChats] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeSite, setActiveSite] = useState<StoredSite | null>(null);
  const [activeSitePages, setActiveSitePages] = useState<StoredSitePage[]>([]);
  const [activeSitePageId, setActiveSitePageId] = useState<string | null>(null);
  const [activePublication, setActivePublication] = useState<PublishedSite | null>(null);
  const [activePublicationUrl, setActivePublicationUrl] = useState<string | null>(null);
  const [activePublicationUsage, setActivePublicationUsage] = useState<PublicationUsage | null>(null);
  const [composerProjectId, setComposerProjectId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCreatingBlankSite, setIsCreatingBlankSite] = useState(false);
  const [isBackendPanelOpen, setIsBackendPanelOpen] = useState(false);
  const [backendArtifacts, setBackendArtifacts] = useState<WebBrainProjectArtifact[]>([]);
  const [isLoadingBackendArtifacts, setIsLoadingBackendArtifacts] = useState(false);
  const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<WebBrainSupabaseConnectionStatus | null>(null);
  const [supabaseProjects, setSupabaseProjects] = useState<WebBrainSupabaseProjectOption[]>([]);
  const [supabaseOrganizations, setSupabaseOrganizations] = useState<WebBrainSupabaseOrganizationOption[]>([]);
  const [supabaseTables, setSupabaseTables] = useState<WebBrainSupabaseTableOption[]>([]);
  const [supabaseTablesError, setSupabaseTablesError] = useState<string | null>(null);
  const [isLoadingSupabaseConnection, setIsLoadingSupabaseConnection] = useState(false);
  const [isLoadingSupabaseProjects, setIsLoadingSupabaseProjects] = useState(false);
  const [isLoadingSupabaseTables, setIsLoadingSupabaseTables] = useState(false);
  const [isCreatingSupabaseProject, setIsCreatingSupabaseProject] = useState(false);
  const [createSupabaseProjectError, setCreateSupabaseProjectError] = useState<string | null>(null);
  const [isDisconnectingSupabase, setIsDisconnectingSupabase] = useState(false);
  const [isSelectingSupabaseProject, setIsSelectingSupabaseProject] = useState(false);
  const [isSupabaseGateProjectPickerOpen, setIsSupabaseGateProjectPickerOpen] = useState(false);
  const [supabaseGateResumeAction, setSupabaseGateResumeAction] = useState<WebBrainSupabaseGatePayload["resumeAction"]>("connect_database");
  const [supabaseGateCreateName, setSupabaseGateCreateName] = useState("");
  const [isSupabaseGateCreateOpen, setIsSupabaseGateCreateOpen] = useState(false);
  const [supabaseGateCreateRegion, setSupabaseGateCreateRegion] = useState("eu-central-1");
  const [supabaseGateCreatePassword, setSupabaseGateCreatePassword] = useState("");
  const [isSupabaseGateRegionOpen, setIsSupabaseGateRegionOpen] = useState(false);
  const [supabaseGateSelectedOrganizationSlug, setSupabaseGateSelectedOrganizationSlug] = useState("");
  const [isPublishHostingOpen, setIsPublishHostingOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [renamingItem, setRenamingItem] = useState<RenamingItem>(null);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [activeAccountSettingsSection, setActiveAccountSettingsSection] = useState<AccountSettingsSectionKey>("profile");
  const [isComposerModelMenuOpen, setIsComposerModelMenuOpen] = useState(false);
  const [isComposerEffortMenuOpen, setIsComposerEffortMenuOpen] = useState(false);
  const [composerAiModel, setComposerAiModel] = useState<(typeof composerAiModels)[number]>("Space-1");
  const [composerAllowedSpaceModels, setComposerAllowedSpaceModels] = useState<WebBrainSpaceModelId[]>(["Space-1"]);
  const [composerAiEffort, setComposerAiEffort] = useState<(typeof composerAiEfforts)[number]["value"]>("medium");
  const [composerPlanMode, setComposerPlanMode] = useState(false);
  const [composerModelMenuStyle, setComposerModelMenuStyle] = useState<CSSProperties | null>(null);
  const [composerEffortMenuStyle, setComposerEffortMenuStyle] = useState<CSSProperties | null>(null);
  const [composerAttachment, setComposerAttachment] = useState<ComposerAttachment | null>(null);
  const [chatLimitNotice, setChatLimitNotice] = useState<ChatLimitNotice | null>(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [editorAiSelection, setEditorAiSelection] = useState<EditorAiSelection | null>(null);
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const chatRequestRevisionRef = useRef(0);
  // Site loading has its own token, independent from the chat-message revision.
  // Sharing chatRequestRevisionRef caused freshly-fetched sites to be dropped
  // whenever any chat action (or StrictMode's double-boot) bumped that counter.
  const siteLoadTokenRef = useRef(0);
  const supabaseDataLoadKeyRef = useRef<string | null>(null);
  const supabaseDataReadyKeyRef = useRef<string | null>(null);
  const isSendingMessageRef = useRef(false);
  const sitePagesRevisionRef = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldStickToChatBottomRef = useRef(true);
  const chatAutoScrollPausedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const composerModelButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerEffortButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const projectChats = activeProjectId ? projectChatsById[activeProjectId] ?? [] : [];
  const activeChat = projectChats.find((chat) => chat.id === activeChatId) ?? null;
  const composerProject = projects.find((project) => project.id === (composerProjectId ?? activeProjectId)) ?? projects[0] ?? null;
  const composerAllowedSpaceModelSet = useMemo(() => new Set<WebBrainSpaceModelId>(composerAllowedSpaceModels), [composerAllowedSpaceModels]);
  const activeHeaderProject = projects.find((project) => project.id === activeProjectId) ?? composerProject;
  const supabaseGateSelectedRegion = SUPABASE_REGION_OPTIONS.find((region) => region.value === supabaseGateCreateRegion) ?? SUPABASE_REGION_OPTIONS[0];
  const supabaseGateSelectedOrganization =
    supabaseOrganizations.find((organization) => organization.slug === supabaseGateSelectedOrganizationSlug) ?? supabaseOrganizations[0] ?? null;
  const supabaseGatePassword = supabaseGateCreatePassword.trim();
  const supabaseGateDbPasswordTooShort = supabaseGatePassword.length > 0 && supabaseGatePassword.length < 12;
  const pinnedProjects = projects.filter((project) => project.is_pinned);
  const regularProjects = projects.filter((project) => !project.is_pinned);
  const activeAccountPlan = accountSubscriptionPlans.find((plan) => plan.key === shellProfileSummary?.subscription?.planKey) ?? accountSubscriptionPlans[0];
  const projectPlanLimit = Math.max(0, activeAccountPlan.limits.sites);
  const isProjectCreationBlockedByPlan = shellProfileSummary ? (shellProfileSummary.access?.isAdmin === true ? false : projects.length >= projectPlanLimit) : false;
  const normalizedSidebarSearchQuery = normalizeSidebarSearch(sidebarSearchQuery);
  const isSidebarSearching = normalizedSidebarSearchQuery.length > 0;
  const getSidebarProjectItems = useCallback(
    (sourceProjects: StoredProject[]) =>
      sourceProjects
        .map((project) => {
          const chats = projectChatsById[project.id] ?? [];

          if (!isSidebarSearching) {
            return { project, chats };
          }

          const projectMatches = normalizeSidebarSearch(project.name).includes(normalizedSidebarSearchQuery);
          const matchingChats = chats.filter((chat) => normalizeSidebarSearch(chat.title).includes(normalizedSidebarSearchQuery));

          if (!projectMatches && matchingChats.length === 0) return null;

          return {
            project,
            chats: projectMatches ? chats : matchingChats,
          };
        })
        .filter((item): item is { project: StoredProject; chats: StoredChat[] } => Boolean(item)),
    [isSidebarSearching, normalizedSidebarSearchQuery, projectChatsById],
  );
  const pinnedProjectItems = getSidebarProjectItems(pinnedProjects);
  const regularProjectItems = getSidebarProjectItems(regularProjects);
  const hasSidebarSearchResults = pinnedProjectItems.length > 0 || regularProjectItems.length > 0;
  const totalChatsCount = Object.values(projectChatsById).reduce((count, chats) => count + chats.length, 0);

  useEffect(() => {
    let frame = 0;

    const updatePosition = () => {
      const style = getFixedPopoverStyle(composerModelButtonRef.current, 176, "left");
      setComposerModelMenuStyle(style);
    };

    if (isComposerModelMenuOpen) {
      frame = window.requestAnimationFrame(updatePosition);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    } else {
      frame = window.requestAnimationFrame(() => setComposerModelMenuStyle(null));
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isComposerModelMenuOpen]);

  useEffect(() => {
    let frame = 0;

    const updatePosition = () => {
      const style = getFixedPopoverStyle(composerEffortButtonRef.current, 160, "left");
      setComposerEffortMenuStyle(style);
    };

    if (isComposerEffortMenuOpen) {
      frame = window.requestAnimationFrame(updatePosition);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    } else {
      frame = window.requestAnimationFrame(() => setComposerEffortMenuStyle(null));
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isComposerEffortMenuOpen]);

  useEffect(() => {
    if (!isSettingsMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && settingsMenuRef.current?.contains(target)) return;
      setIsSettingsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSettingsMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsMenuOpen]);

  useEffect(() => {
    if (!clientId) {
      setSeenChatRuns({});
      return;
    }

    setSeenChatRuns(readSeenChatRuns(clientId));
  }, [clientId]);

  useEffect(() => {
    if (!activeChatId) return;

    const stableMessages = messages.filter((message) => !isTransientAssistantMessage(message));
    setMessagesByChatId((items) => {
      if (items[activeChatId] === stableMessages) return items;

      return {
        ...items,
        [activeChatId]: stableMessages,
      };
    });
  }, [activeChatId, messages]);

  useEffect(() => {
    if (!clientId || !activeChatId) return;
    const runState = chatRunStates[activeChatId];
    if (!runState || runState.status !== "completed") return;

    setSeenChatRuns((items) => {
      if (items[activeChatId] === runState.updated_at) return items;

      const next = {
        ...items,
        [activeChatId]: runState.updated_at,
      };
      writeSeenChatRuns(clientId, next);
      return next;
    });
  }, [activeChatId, chatRunStates, clientId]);

  const latestPlanMessageIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" && message.status === "План" ? index : latest),
    -1,
  );
  const latestClarificationMessageIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" && message.status === "Вопрос" ? index : latest),
    -1,
  );
  const latestConfirmationMessageIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" && message.status === "Подтверждение" ? index : latest),
    -1,
  );
  const latestSupabaseGateMessageIndex = messages.reduce(
    (latest, message, index) =>
      message.role === "assistant" && message.payload?.kind === "supabase_connection_gate" ? index : latest,
    -1,
  );
  const latestStatusMessageIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" && message.status ? index : latest),
    -1,
  );
  const latestAssistantMessageIndex = messages.reduce(
    (latest, message, index) => (message.role === "assistant" ? index : latest),
    -1,
  );

  function hasMessageAfter(messageIndex: number) {
    return messages.slice(messageIndex + 1).length > 0;
  }

  function isInteractiveMessageOpen(messageIndex: number) {
    return messageIndex >= 0 && !hasMessageAfter(messageIndex);
  }

  const latestOpenPlanMessageIndex = isInteractiveMessageOpen(latestPlanMessageIndex) ? latestPlanMessageIndex : -1;
  const latestOpenClarificationMessageIndex = isInteractiveMessageOpen(latestClarificationMessageIndex)
    ? latestClarificationMessageIndex
    : -1;
  const latestOpenConfirmationMessageIndex = isInteractiveMessageOpen(latestConfirmationMessageIndex)
    ? latestConfirmationMessageIndex
    : -1;
  const latestOpenSupabaseGateMessageIndex = isInteractiveMessageOpen(latestSupabaseGateMessageIndex)
    ? latestSupabaseGateMessageIndex
    : -1;
  const latestPendingAssistantActionIndex = Math.max(
    latestOpenPlanMessageIndex,
    latestOpenClarificationMessageIndex,
    latestOpenConfirmationMessageIndex,
    latestOpenSupabaseGateMessageIndex,
  );
  const openInteractiveMessageIndexes = useMemo(
    () =>
      new Set(
        [
          latestOpenPlanMessageIndex,
          latestOpenClarificationMessageIndex,
          latestOpenConfirmationMessageIndex,
          latestOpenSupabaseGateMessageIndex,
        ].filter((index) => index >= 0),
      ),
    [
      latestOpenPlanMessageIndex,
      latestOpenClarificationMessageIndex,
      latestOpenConfirmationMessageIndex,
      latestOpenSupabaseGateMessageIndex,
    ],
  );
  const chatDisplayItems = useMemo(
    () => buildChatDisplayItems(messages, openInteractiveMessageIndexes),
    [messages, openInteractiveMessageIndexes],
  );
  const activeChatRunState = activeChatId ? chatRunStates[activeChatId] : undefined;
  const activeChatIsRunning = activeChatRunState?.status === "running";
  const activeChatIsWaiting = activeChatRunState?.status === "waiting";
  const isAssistantSessionActive = isSendingMessage || activeChatIsRunning || latestPendingAssistantActionIndex !== -1;
  const latestLiveAssistantMessage = useMemo(() => getLatestLiveAssistantMessage(messages), [messages]);
  const aiWorkingSummary = compactAiWorkingSummary(latestLiveAssistantMessage?.text);
  const showAiWorkingMenu = isSendingMessage || activeChatIsRunning;
  const latestRunId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === "assistant" && message.payload?.runId) return message.payload.runId;
    }

    return undefined;
  }, [messages]);
  const latestChatScrollSignature = useMemo(() => chatScrollSignature(messages), [messages]);
  const composerPlaceholder = isSendingMessage || activeChatIsRunning
    ? "ИИ работает..."
    : latestPendingAssistantActionIndex !== -1 || activeChatIsWaiting
      ? "Ответьте в карточке, чтобы продолжить..."
      : "Опишите, какой сайт нужно собрать...";

  const getChatDistanceToBottom = useCallback(() => {
    const scrollElement = chatScrollRef.current;
    if (!scrollElement) return 0;

    return scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
  }, []);

  const updateScrollToLatestVisibility = useCallback(() => {
    const distanceToBottom = getChatDistanceToBottom();

    if (distanceToBottom > 260) {
      chatAutoScrollPausedRef.current = true;
      shouldStickToChatBottomRef.current = false;
    } else if (distanceToBottom <= 120) {
      chatAutoScrollPausedRef.current = false;
      shouldStickToChatBottomRef.current = true;
    }
    setShowScrollToLatest(distanceToBottom > 420);
  }, [getChatDistanceToBottom]);

  const scrollChatToLatest = useCallback((behavior: ScrollBehavior = "smooth", options: { keepStuck?: boolean } = {}) => {
    if (options.keepStuck ?? true) {
      chatAutoScrollPausedRef.current = false;
      shouldStickToChatBottomRef.current = true;
    }
    chatBottomRef.current?.scrollIntoView({ block: "end", behavior });
  }, []);

  const applyLocalSitePages = useCallback((updater: SitePagesUpdater) => {
    sitePagesRevisionRef.current += 1;
    setActiveSitePages((currentPages) => (typeof updater === "function" ? updater(currentPages) : updater));
  }, []);

  function expandProject(projectId: string) {
    setExpandedProjectIds((items) => (items.includes(projectId) ? items : [...items, projectId]));
  }

  function toggleProjectExpanded(projectId: string) {
    setExpandedProjectIds((items) => (items.includes(projectId) ? items.filter((id) => id !== projectId) : [...items, projectId]));
  }

  function setChatsForProject(projectId: string, chats: StoredChat[]) {
    setProjectChatsById((items) => ({
      ...items,
      [projectId]: sortChats(chats)
    }));
  }

  function detachActiveAiStream() {
    const controller = activeStreamControllerRef.current;
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }

    activeStreamControllerRef.current = null;
    isSendingMessageRef.current = false;
    setIsSendingMessage(false);
    setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message)));
  }

  function groupChatsByProject(chats: StoredChat[], projectsToSeed: StoredProject[] = []) {
    const grouped: Record<string, StoredChat[]> = {};
    projectsToSeed.forEach((project) => {
      grouped[project.id] = [];
    });
    chats.forEach((chat) => {
      grouped[chat.project_id] = [...(grouped[chat.project_id] ?? []), chat];
    });

    return Object.fromEntries(Object.entries(grouped).map(([projectId, chats]) => [projectId, sortChats(chats)])) as Record<string, StoredChat[]>;
  }

  const refreshChatRunStates = useCallback(async (currentClientId = clientId) => {
    if (!currentClientId) return;

    const { runs } = await requestJson<ChatRunsResponse>("/api/chats/runs", currentClientId);
    setChatRunStates(Object.fromEntries(runs.map((run) => [run.chat_id, run])));
  }, [clientId]);

  const loadSiteForProject = useCallback(async (projectId: string, currentClientId: string, isCancelled: () => boolean = () => false) => {
    // An optimistic project hasn't been persisted yet — its id is not a UUID. Skip the DB
    // fetch (it would 500 with "invalid input syntax for type uuid") until the real one exists.
    if (isOptimisticProjectId(projectId)) {
      if (!isCancelled()) setActiveSite(null);
      return;
    }
    // Claim a token for THIS load. Only the most-recent site load (for the
    // most-recently-selected project) is allowed to write activeSite. This is
    // deliberately NOT tied to chatRequestRevisionRef — chat actions and the
    // StrictMode double-boot must not invalidate a successful site fetch.
    const token = (siteLoadTokenRef.current += 1);
    const isStale = () => isCancelled() || siteLoadTokenRef.current !== token;

    let lastError: unknown = null;
    // Retry transient failures (e.g. server restart, network blip) before giving up
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { sites } = await requestJson<SitesResponse>(`/api/projects/${projectId}/sites`, currentClientId);
        const nextSite = sites[0] ?? null;

        if (!isStale()) {
          setActiveSite(nextSite);
        }

        return nextSite;
      } catch (error) {
        lastError = error;
        if (isStale()) return null;
        // wait before retry
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    if (!isStale()) {
      // Do NOT clobber an existing loaded site on a transient error — keeps the
      // editor from showing "сайт не создан" when the request merely failed.
      const message = lastError instanceof Error ? lastError.message : "Не удалось загрузить сайт";
      setChatError(message);
    }

    return null;
  }, []);

  async function toggleProjectChats(projectId: string) {
    const willExpand = !expandedProjectIds.includes(projectId);
    toggleProjectExpanded(projectId);

    if (!willExpand || !clientId || Object.prototype.hasOwnProperty.call(projectChatsById, projectId)) return;

    try {
      const { chats } = await requestJson<ChatsResponse>(`/api/projects/${projectId}/chats`, clientId);
      setChatsForProject(projectId, chats);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить чаты проекта";
      setChatError(message);
    }
  }

  function startRename(type: "project" | "chat", id: string, value: string) {
    setOpenMenu(null);
    setRenamingItem({ type, id, value: type === "chat" ? limitChatTitle(value) : value });
  }

  function updateRenameValue(value: string) {
    setRenamingItem((item) => {
      if (!item) return item;

      return {
        ...item,
        value: item.type === "chat" ? limitChatTitle(value) : value,
      };
    });
  }

  async function commitRename() {
    if (!renamingItem) return;

    const item = renamingItem;
    const value = item.value.trim();
    setRenamingItem(null);

    if (!value) return;

    if (item.type === "project") {
      await renameProject(item.id, value);
      return;
    }

    await renameChat(item.id, value);
  }

  const loadSupabaseTables = useCallback(async (projectId: string, currentClientId: string, isCancelled: () => boolean = () => false) => {
    try {
      setIsLoadingSupabaseTables(true);
      setSupabaseTablesError(null);
      const { tables } = await requestJson<SupabaseTablesResponse>(`/api/supabase/tables?projectId=${encodeURIComponent(projectId)}`, currentClientId);

      if (!isCancelled()) {
        setSupabaseTables(tables);
      }
    } catch (error) {
      if (!isCancelled()) {
        setSupabaseTables([]);
        setSupabaseTablesError(error instanceof Error ? error.message : "Не удалось загрузить таблицы Supabase.");
      }
    } finally {
      if (!isCancelled()) {
        setIsLoadingSupabaseTables(false);
      }
    }
  }, []);

  const preloadSupabaseDataForProject = useCallback(async (
    projectId: string,
    currentClientId: string,
    isCancelled: () => boolean = () => false,
	  ) => {
	    const loadKey = `${currentClientId}:${projectId}`;
	    const isStale = () => isCancelled() || supabaseDataLoadKeyRef.current !== loadKey;
	    const isNewLoadTarget = supabaseDataLoadKeyRef.current !== loadKey;

	    if (isNewLoadTarget) {
	      supabaseDataReadyKeyRef.current = null;
	    }
	    supabaseDataLoadKeyRef.current = loadKey;
	    setIsLoadingSupabaseConnection(true);
	    setIsLoadingSupabaseProjects(true);
	    setIsLoadingSupabaseTables(true);
	    setCreateSupabaseProjectError(null);
	    setSupabaseTablesError(null);
	    if (isNewLoadTarget) {
	      setSupabaseConnectionStatus(null);
	      setSupabaseProjects([]);
	      setSupabaseOrganizations([]);
	      setSupabaseTables([]);
	    }

    try {
      const { status } = await requestJson<SupabaseConnectionResponse>(`/api/supabase/connection?projectId=${encodeURIComponent(projectId)}`, currentClientId);
      if (isStale()) return;

      setSupabaseConnectionStatus(status);

      if (!status.connected) {
        setSupabaseProjects([]);
        setSupabaseOrganizations([]);
        setSupabaseTables([]);
        return;
      }

      const [projectsResult, tablesResult] = await Promise.all([
        requestJson<SupabaseProjectsResponse>(`/api/supabase/projects?projectId=${encodeURIComponent(projectId)}`, currentClientId)
          .then((value) => ({ value }))
          .catch((error: unknown) => ({ error })),
        requestJson<SupabaseTablesResponse>(`/api/supabase/tables?projectId=${encodeURIComponent(projectId)}`, currentClientId)
          .then((value) => ({ value }))
          .catch((error: unknown) => ({ error })),
      ]);

      if (isStale()) return;

      if ("value" in projectsResult) {
        setSupabaseProjects(projectsResult.value.projects);
        setSupabaseOrganizations(projectsResult.value.organizations);
      } else {
        setSupabaseProjects([]);
        setSupabaseOrganizations([]);
      }

      if ("value" in tablesResult) {
        setSupabaseTables(tablesResult.value.tables);
        setSupabaseTablesError(null);
      } else {
        setSupabaseTables([]);
        setSupabaseTablesError(tablesResult.error instanceof Error ? tablesResult.error.message : "Не удалось загрузить таблицы Supabase.");
      }
    } catch (error) {
      if (!isStale()) {
        setSupabaseConnectionStatus(null);
        setSupabaseProjects([]);
        setSupabaseOrganizations([]);
        setSupabaseTables([]);
        setSupabaseTablesError(error instanceof Error ? error.message : "Не удалось проверить подключение Supabase.");
      }
	    } finally {
	      if (!isStale()) {
	        supabaseDataReadyKeyRef.current = loadKey;
	        setIsLoadingSupabaseConnection(false);
	        setIsLoadingSupabaseProjects(false);
	        setIsLoadingSupabaseTables(false);
      }
    }
  }, []);

  const selectProject = useCallback(async (
    projectId: string,
    currentClientId: string,
    isCancelled: () => boolean = () => false,
    preloadedChats?: StoredChat[],
    waitForSupabasePreload = false,
  ) => {
    detachActiveAiStream();
    const requestRevision = (chatRequestRevisionRef.current += 1);
    const isCurrentRequest = () => !isCancelled() && chatRequestRevisionRef.current === requestRevision;

    // Optimistic project (client-only id, not a UUID): set UI state but make NO database
    // calls — chats / site / Supabase preload would all 500 with "invalid input syntax for type uuid".
    if (isOptimisticProjectId(projectId)) {
      setChatError(null);
      setActiveProjectId(projectId);
      setComposerProjectId(projectId);
      setOpenMenu(null);
      setIsProjectPickerOpen(false);
      setExpandedProjectIds((items) => (items.includes(projectId) ? items : [...items, projectId]));
      setActiveChatId(null);
      setMessages([]);
      setActiveSite(null);
      return;
    }

    const supabasePreloadPromise = preloadSupabaseDataForProject(projectId, currentClientId, isCancelled);

    setChatError(null);
    setActiveProjectId(projectId);
    setComposerProjectId(projectId);
    setOpenMenu(null);
    setIsProjectPickerOpen(false);
    setExpandedProjectIds((items) => (items.includes(projectId) ? items : [...items, projectId]));

    const nextChats = sortChats(
      preloadedChats ?? (await requestJson<ChatsResponse>(`/api/projects/${projectId}/chats`, currentClientId)).chats,
    );
    // Forward only the raw unmount flag — site loading is gated by its own token,
    // not the chat-message revision, so it survives chat actions and double-boot.
    await loadSiteForProject(projectId, currentClientId, isCancelled);

    if (nextChats.length === 0) {
      if (waitForSupabasePreload) {
        await supabasePreloadPromise;
      }

      if (isCurrentRequest()) {
        setProjectChatsById((items) => ({
          ...items,
          [projectId]: nextChats
        }));
        setActiveChatId(null);
        setMessages([]);
      }
      return;
    }

    const activeChat = nextChats[0];
	    const { messages: loadedMessages } = await requestJson<MessagesResponse>(`/api/chats/${activeChat.id}/messages`, currentClientId);
	    const nextMessages = toChatMessages(loadedMessages);
    if (waitForSupabasePreload) {
      await supabasePreloadPromise;
    }

    if (isCurrentRequest()) {
      setProjectChatsById((items) => ({
        ...items,
        [projectId]: nextChats
	      }));
	      setActiveChatId(activeChat.id);
	      setMessages(nextMessages);
	      setMessagesByChatId((items) => ({
	        ...items,
	        [activeChat.id]: nextMessages,
	      }));
	    }
  }, [loadSiteForProject, preloadSupabaseDataForProject]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setChatError(null);
        setIsLoading(true);

        const session = await requireCurrentAuthSession();
        const authenticatedClientId = persistAuthenticatedClientId(session);
        setClientId(authenticatedClientId);

        const [{ projects: loadedProjects }, { chats: loadedChats }, { runs: loadedRuns }, loadedProfileSummary] = await Promise.all([
          requestJson<ProjectsResponse>("/api/projects", authenticatedClientId),
          requestJson<ChatsResponse>("/api/chats", authenticatedClientId),
          requestJson<ChatRunsResponse>("/api/chats/runs", authenticatedClientId).catch(() => ({ runs: [] })),
          requestJson<ProfileSummaryResponse>("/api/profile/summary", authenticatedClientId).catch(() => null),
        ]);
        const nextProjects = sortProjects(loadedProjects);
        const nextChatsByProjectId = groupChatsByProject(loadedChats, nextProjects);

        if (cancelled) return;

        const profilePlan = accountSubscriptionPlans.find((plan) => plan.key === loadedProfileSummary?.subscription?.planKey) ?? accountSubscriptionPlans[0];
        const nextAllowedSpaceModels = loadedProfileSummary?.access?.allowedSpaceModels?.length
          ? loadedProfileSummary.access.allowedSpaceModels
          : getAllowedSpaceModelIds(getTierConfig(profilePlan.tierId));
        const fallbackSpaceModel = nextAllowedSpaceModels[nextAllowedSpaceModels.length - 1] ?? "Space-1";
        setShellProfileSummary(loadedProfileSummary);
        setComposerAllowedSpaceModels(nextAllowedSpaceModels);
        setComposerAiModel((current) => (nextAllowedSpaceModels.includes(current) ? current : fallbackSpaceModel));
        setProjects(nextProjects);
        setProjectChatsById(nextChatsByProjectId);
        setChatRunStates(Object.fromEntries(loadedRuns.map((run) => [run.chat_id, run])));
        if (nextProjects.length > 0) {
          await selectProject(nextProjects[0].id, authenticatedClientId, () => cancelled, nextChatsByProjectId[nextProjects[0].id] ?? [], true);
        } else {
          setProjectChatsById({});
          setExpandedProjectIds([]);
          setActiveProjectId(null);
          setComposerProjectId(null);
          setActiveChatId(null);
          setActiveSite(null);
          supabaseDataLoadKeyRef.current = null;
          supabaseDataReadyKeyRef.current = null;
          setSupabaseConnectionStatus(null);
          setSupabaseProjects([]);
          setSupabaseOrganizations([]);
          setSupabaseTables([]);
          setSupabaseTablesError(null);
          setMessages([]);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Не удалось подключить Supabase";
          setChatError(message);
          setProjectChatsById({});
          setExpandedProjectIds([]);
          setActiveProjectId(null);
          setComposerProjectId(null);
          setActiveChatId(null);
          setActiveSite(null);
          supabaseDataLoadKeyRef.current = null;
          supabaseDataReadyKeyRef.current = null;
          setSupabaseConnectionStatus(null);
          setSupabaseProjects([]);
          setSupabaseOrganizations([]);
          setSupabaseTables([]);
          setSupabaseTablesError(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [selectProject]);

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    async function pollRuns() {
      try {
        await refreshChatRunStates(clientId);
      } catch {
        // Sidebar run badges are best-effort; chat actions surface real errors.
      }
    }

    void pollRuns();
    const intervalId = window.setInterval(() => void pollRuns(), 5000);

    return () => {
      cancelled = true;
      void cancelled;
      window.clearInterval(intervalId);
    };
  }, [clientId, refreshChatRunStates]);

  useEffect(() => {
    if (!clientId || !activeChatId) return;

    const currentClientId = clientId;
    const currentChatId = activeChatId;
    const runState = chatRunStates[activeChatId];
    if (!runState || !["running", "waiting", "completed"].includes(runState.status)) return;

    let cancelled = false;

	    async function refreshActiveChatMessages() {
	      try {
	        const { messages: loadedMessages } = await requestJson<MessagesResponse>(`/api/chats/${currentChatId}/messages`, currentClientId);
	        const nextMessages = toChatMessages(loadedMessages);
	        if (!cancelled) {
	          setMessages((currentMessages) => mergeServerMessagesWithLiveStage(currentMessages, nextMessages));
	          setMessagesByChatId((items) => ({
	            ...items,
	            [currentChatId]: nextMessages,
	          }));
	        }
	      } catch {
        // The normal chat error channel is reserved for user-triggered actions.
      }
    }

    void refreshActiveChatMessages();

    if (runState.status !== "running") return () => {
      cancelled = true;
    };

    const intervalId = window.setInterval(() => void refreshActiveChatMessages(), 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeChatId, chatRunStates, clientId]);

  useEffect(() => {
    if (!openMenu) return;

    function closeMenu() {
      setOpenMenu(null);
    }

    window.addEventListener("pointerdown", closeMenu);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!isAssistantSessionActive && showScrollToLatest) return;
    if (chatAutoScrollPausedRef.current) return;
    if (!shouldStickToChatBottomRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollChatToLatest("auto", { keepStuck: false });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isAssistantSessionActive, latestChatScrollSignature, scrollChatToLatest, showScrollToLatest]);

  useEffect(() => {
    if (!isProjectPickerOpen) return;

    function closeProjectPicker() {
      setIsProjectPickerOpen(false);
    }

    window.addEventListener("pointerdown", closeProjectPicker);

    return () => {
      window.removeEventListener("pointerdown", closeProjectPicker);
    };
  }, [isProjectPickerOpen]);

  useEffect(() => {
    if (!isAttachmentMenuOpen) return;

    function closeAttachmentMenu() {
      setIsAttachmentMenuOpen(false);
    }

    window.addEventListener("pointerdown", closeAttachmentMenu);

    return () => {
      window.removeEventListener("pointerdown", closeAttachmentMenu);
    };
  }, [isAttachmentMenuOpen]);

  useEffect(() => {
    return () => {
      if (composerAttachment?.previewUrl) {
        URL.revokeObjectURL(composerAttachment.previewUrl);
      }
    };
  }, [composerAttachment]);

  const loadSupabaseTablePreview = useCallback(async (table: WebBrainSupabaseTableOption) => {
    if (!clientId || !activeProjectId) {
      throw new Error("Сначала выберите проект WebBrain.");
    }

    const params = new URLSearchParams({
      projectId: activeProjectId,
      schema: table.schema,
      table: table.name,
    });
    const { preview } = await requestJson<SupabaseTablePreviewResponse>(`/api/supabase/table-preview?${params.toString()}`, clientId);

    return preview;
  }, [activeProjectId, clientId]);

  const executeSupabaseSql = useCallback(async (query: string) => {
    if (!clientId || !activeProjectId) {
      throw new Error("Сначала выберите проект WebBrain.");
    }

    const { result } = await requestJson<SupabaseSqlResponse>("/api/supabase/sql", clientId, {
      method: "POST",
      body: JSON.stringify({
        projectId: activeProjectId,
        query,
      }),
    });

    return result;
  }, [activeProjectId, clientId]);

  const loadSupabaseGateProjects = useCallback(async () => {
    if (!clientId || !activeProjectId) return false;

    const currentClientId = clientId;
    const currentProjectId = activeProjectId;

    setIsLoadingSupabaseConnection(true);
    setIsLoadingSupabaseProjects(true);
    setCreateSupabaseProjectError(null);

    try {
      const { status } = await requestJson<SupabaseConnectionResponse>(`/api/supabase/connection?projectId=${encodeURIComponent(currentProjectId)}`, currentClientId);
      setSupabaseConnectionStatus(status);

      if (!status.connected) {
        setSupabaseProjects([]);
        setSupabaseOrganizations([]);
        return false;
      }

      const { projects, organizations } = await requestJson<SupabaseProjectsResponse>(`/api/supabase/projects?projectId=${encodeURIComponent(currentProjectId)}`, currentClientId);
      setSupabaseProjects(projects);
      setSupabaseOrganizations(organizations);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить проекты Supabase";
      setChatError(message);
      return false;
    } finally {
      setIsLoadingSupabaseConnection(false);
      setIsLoadingSupabaseProjects(false);
    }
  }, [activeProjectId, clientId]);

  useEffect(() => {
    if (!isBackendPanelOpen || !clientId || !activeProjectId) {
      return;
    }

    let cancelled = false;
    const currentClientId = clientId;
    const currentProjectId = activeProjectId;
    const currentSupabaseLoadKey = `${currentClientId}:${currentProjectId}`;
    const hasPreloadedSupabaseData = supabaseDataReadyKeyRef.current === currentSupabaseLoadKey;

    async function loadBackendPanelData() {
      try {
        setIsLoadingBackendArtifacts(true);
        const { artifacts } = await requestJson<ProjectArtifactsResponse>(`/api/projects/${currentProjectId}/artifacts`, currentClientId);
        if (!cancelled) setBackendArtifacts(artifacts);

        if (!hasPreloadedSupabaseData) {
          await preloadSupabaseDataForProject(currentProjectId, currentClientId, () => cancelled);
        }
      } catch (error) {
        if (!cancelled) {
          setBackendArtifacts([]);
          const message = error instanceof Error ? error.message : "Не удалось загрузить настройки заявок и данных";
          setChatError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBackendArtifacts(false);
        }
      }
    }

    void loadBackendPanelData();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, clientId, isBackendPanelOpen, preloadSupabaseDataForProject]);

  useEffect(() => {
    if (!clientId || !activeSite) {
      setActivePublication(null);
      setActivePublicationUrl(null);
      setActivePublicationUsage(null);
      return;
    }

    let cancelled = false;
    const currentSite = activeSite;
    const currentClientId = clientId;

    async function loadEditorPages() {
      const loadRevision = sitePagesRevisionRef.current;

      try {
        const { pages } = await requestJson<SitePagesResponse>(`/api/sites/${currentSite.id}/pages`, currentClientId);

        if (cancelled || sitePagesRevisionRef.current !== loadRevision) return;

        sitePagesRevisionRef.current += 1;
        setActiveSitePages(pages);
        setActiveSitePageId((currentId) => (currentId && pages.some((page) => page.id === currentId) ? currentId : pages[0]?.id ?? null));
      } catch (error) {
        if (!cancelled && sitePagesRevisionRef.current === loadRevision) {
          sitePagesRevisionRef.current += 1;
          setActiveSitePages([]);
          setActiveSitePageId(null);
          const message = error instanceof Error ? error.message : "Не удалось загрузить страницы сайта";
          setChatError(message);
        }
      }
    }

    void loadEditorPages();

    return () => {
      cancelled = true;
    };
  }, [activeSite, clientId]);

  const activeSiteId = activeSite?.id ?? null;

  useEffect(() => {
    if (!clientId || !activeSiteId) {
      setActivePublication(null);
      setActivePublicationUrl(null);
      setActivePublicationUsage(null);
      return;
    }

    let cancelled = false;
    const currentClientId = clientId;
    const currentSiteId = activeSiteId;

    async function loadPublication() {
      try {
        const result = await requestJson<PublicationResponse>(`/api/sites/${currentSiteId}/publish`, currentClientId);

        if (cancelled) return;

        setActivePublication(result.publication);
        setActivePublicationUrl(result.publicUrl);
        setActivePublicationUsage(result.usage);
      } catch {
        if (cancelled) return;

        setActivePublication(null);
        setActivePublicationUrl(null);
        setActivePublicationUsage(null);
      }
    }

    void loadPublication();

    return () => {
      cancelled = true;
    };
  }, [activeSiteId, clientId]);

  async function createBlankSite() {
    const targetProjectId = activeProjectId ?? composerProject?.id ?? null;

    if (!clientId || !targetProjectId || isCreatingBlankSite) {
      if (!targetProjectId) {
        setChatError("Сначала создайте или выберите проект");
      }

      return;
    }

    try {
      setChatError(null);
      setIsCreatingBlankSite(true);
      const { site } = await requestJson<SiteResponse>(`/api/projects/${targetProjectId}/sites`, clientId, {
        method: "POST",
        body: JSON.stringify({
          name: "Новая страница",
          template: "blankHero"
        })
      });

      setActiveProjectId(targetProjectId);
      setComposerProjectId(targetProjectId);
      expandProject(targetProjectId);
      applyLocalSitePages([]);
      setActiveSitePageId(null);
      setActiveSite(site);
      switchAppMode("editor");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось создать страницу";
      setChatError(message);
    } finally {
      setIsCreatingBlankSite(false);
    }
  }

  async function publishActiveSite(input: { planKey: HostingPlanKey; slug: string; settings: Record<string, unknown> }) {
    if (!clientId || !activeSite) {
      throw new Error("Сначала создайте сайт в редакторе");
    }

    const result = await requestJson<PublishSiteResponse>(`/api/sites/${activeSite.id}/publish`, clientId, {
      method: "POST",
      body: JSON.stringify(input),
    });

    setActiveSite((currentSite) => (currentSite?.id === activeSite.id ? { ...currentSite, status: "published" } : currentSite));
    setActivePublication(result.publication);
    setActivePublicationUrl(result.publicUrl);
    setActivePublicationUsage(result.usage);

    return result;
  }

  async function updateActivePublicationStatus(status: PublishedSite["status"]) {
    if (!clientId || !activeSite) {
      throw new Error("Сначала выберите сайт");
    }

    const result = await requestJson<PublicationResponse>(`/api/sites/${activeSite.id}/publish`, clientId, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    setActivePublication(result.publication);
    setActivePublicationUrl(result.publicUrl);
    setActivePublicationUsage(result.usage);
    setActiveSite((currentSite) =>
      currentSite?.id === activeSite.id
        ? { ...currentSite, status: result.publication?.status === "active" ? "published" : "draft" }
        : currentSite,
    );
  }

  async function openProject(projectId: string) {
    if (!clientId) return;

    try {
      await selectProject(projectId, clientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось открыть проект";
      setChatError(message);
    }
  }

  function handleProjectRowSelect(projectId: string) {
    if (expandedProjectIds.includes(projectId)) {
      toggleProjectExpanded(projectId);
      return;
    }

    void openProject(projectId);
  }

  async function createChatInProject(projectId = composerProjectId ?? activeProjectId) {
    if (!projectId) {
      setChatError("Сначала создайте проект");
      return;
    }

    detachActiveAiStream();
    const requestRevision = (chatRequestRevisionRef.current += 1);
    const isCurrentRequest = () => chatRequestRevisionRef.current === requestRevision;

    setChatError(null);
    setActiveProjectId(projectId);
    setComposerProjectId(projectId);
    expandProject(projectId);
    setActiveChatId(null);
    setMessages([]);
    setDraft("");
    setOpenMenu(null);
    setIsProjectPickerOpen(false);

    if (!clientId) return;

    try {
      // Site loading is gated by its own token (latest load wins), not the chat revision.
      await loadSiteForProject(projectId, clientId);
      const { chats } = await requestJson<ChatsResponse>(`/api/projects/${projectId}/chats`, clientId);
      if (!isCurrentRequest()) return;
      setChatsForProject(projectId, chats);
    } catch (error) {
      if (!isCurrentRequest()) return;
      const message = error instanceof Error ? error.message : "Не удалось создать чат";
      setChatError(message);
    }
  }

  function showProjectLimitUpgradeModal(message?: string) {
    const fallbackMessage = `Достигнут лимит проектов: ${projects.length} / ${toProjectLimitLabel(activeAccountPlan.limits.sitesLabel)}. Обновите план.`;
    setChatError(message ?? fallbackMessage);
    setActiveAccountSettingsSection("subscription");
    setIsSettingsMenuOpen(false);
    setIsAccountSettingsOpen(true);
  }

  async function createProjectFromSidebar() {
    if (!clientId) return;

    if (isProjectCreationBlockedByPlan) {
      showProjectLimitUpgradeModal();
      return;
    }

    chatRequestRevisionRef.current += 1;
    const createdAt = new Date().toISOString();
    const optimisticProject: StoredProject = {
      id: `optimistic-project-${Date.now()}`,
      name: "Новый проект",
      is_pinned: false,
      created_at: createdAt,
      updated_at: createdAt
    };
    const previousState = {
      activeProjectId,
      composerProjectId,
      activeChatId,
      activeSite,
      messages,
      draft
    };

    setChatError(null);
    setSidebarSearchQuery("");
    setProjects((items) => mergeProject(items, optimisticProject));
    setActiveProjectId(optimisticProject.id);
    setComposerProjectId(optimisticProject.id);
    setChatsForProject(optimisticProject.id, []);
    expandProject(optimisticProject.id);
    setActiveChatId(null);
    setActiveSite(null);
    setMessages([]);
    setDraft("");
    setOpenMenu(null);
    setIsProjectPickerOpen(false);

    try {
      const { project } = await requestJson<ProjectResponse>("/api/projects", clientId, {
        method: "POST",
        body: JSON.stringify({ name: "Новый проект" })
      });

      setProjects((items) => mergeProject(items.filter((item) => item.id !== optimisticProject.id), project));
      setProjectChatsById((items) => {
        const { [optimisticProject.id]: optimisticChats, ...rest } = items;

        return {
          ...rest,
          [project.id]: optimisticChats ?? []
        };
      });
      setExpandedProjectIds((items) => {
        const withoutOptimistic = items.filter((id) => id !== optimisticProject.id);

        return withoutOptimistic.includes(project.id) ? withoutOptimistic : [...withoutOptimistic, project.id];
      });
      setActiveProjectId((currentId) => (currentId === optimisticProject.id ? project.id : currentId));
      setComposerProjectId((currentId) => (currentId === optimisticProject.id ? project.id : currentId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось создать проект";
      setProjects((items) => items.filter((item) => item.id !== optimisticProject.id));
      setProjectChatsById((items) => {
        const rest = { ...items };
        delete rest[optimisticProject.id];

        return rest;
      });
      setExpandedProjectIds((items) => items.filter((id) => id !== optimisticProject.id));
      setActiveProjectId((currentId) => (currentId === optimisticProject.id ? previousState.activeProjectId : currentId));
      setComposerProjectId((currentId) => (currentId === optimisticProject.id ? previousState.composerProjectId : currentId));
      setActiveChatId((currentId) => (currentId === null ? previousState.activeChatId : currentId));
      setActiveSite((currentSite) => (currentSite === null ? previousState.activeSite : currentSite));
      setMessages((currentMessages) => (currentMessages.length === 0 ? previousState.messages : currentMessages));
      setDraft((currentDraft) => (currentDraft === "" ? previousState.draft : currentDraft));
      if (isProjectLimitErrorMessage(message)) {
        showProjectLimitUpgradeModal(message);
      }
      setChatError(message);
    }
  }

  async function openChat(chatId: string, projectId = activeProjectId) {
    if (!clientId || chatId === activeChatId) return;

    detachActiveAiStream();
    const requestRevision = (chatRequestRevisionRef.current += 1);
    const isCurrentRequest = () => chatRequestRevisionRef.current === requestRevision;

    try {
      setChatError(null);
      if (projectId) {
        setActiveProjectId(projectId);
        setComposerProjectId(projectId);
        expandProject(projectId);
      }
      setActiveChatId(chatId);
      setMessages(messagesByChatId[chatId] ?? []);
      setOpenMenu(null);
      setIsProjectPickerOpen(false);

      const { messages: loadedMessages } = await requestJson<MessagesResponse>(`/api/chats/${chatId}/messages`, clientId);
      const nextMessages = toChatMessages(loadedMessages);
      if (!isCurrentRequest()) return;

      setMessages(nextMessages);
      setMessagesByChatId((items) => ({
        ...items,
        [chatId]: nextMessages,
      }));

      if (projectId) {
        // Site loading is gated by its own token and should not block chat switching.
        void loadSiteForProject(projectId, clientId);
      }
    } catch (error) {
      if (!isCurrentRequest()) return;
      const message = error instanceof Error ? error.message : "Не удалось открыть чат";
      setChatError(message);
    }
  }

  async function toggleProjectPin(project: StoredProject) {
    if (!clientId) return;

    try {
      const { project: updatedProject } = await requestJson<ProjectResponse>(`/api/projects/${project.id}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ is_pinned: !project.is_pinned })
      });

      setProjects((items) => mergeProject(items, updatedProject));
      setOpenMenu(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось обновить проект";
      setChatError(message);
    }
  }

  async function renameProject(projectId: string, name: string) {
    if (!clientId) return;

    const previousName = projects.find((project) => project.id === projectId)?.name;

    setChatError(null);
    setOpenMenu(null);
    setProjects((items) => items.map((project) => (project.id === projectId ? { ...project, name } : project)));

    try {
      const { project } = await requestJson<ProjectResponse>(`/api/projects/${projectId}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });

      setProjects((items) => mergeProject(items, project));
    } catch (error) {
      if (previousName !== undefined) {
        setProjects((items) => items.map((project) => (project.id === projectId ? { ...project, name: previousName } : project)));
      }
      const message = error instanceof Error ? error.message : "Не удалось переименовать проект";
      setChatError(message);
    }
  }

  async function deleteProject(projectId: string) {
    if (!clientId) return;

    chatRequestRevisionRef.current += 1;
    const previousState = {
      projects,
      projectChatsById,
      expandedProjectIds,
      activeProjectId,
      composerProjectId,
      activeChatId,
      activeSite,
      activeSitePages,
      activeSitePageId,
      messages,
      openMenu,
      renamingItem,
    };
    const remainingProjects = projects.filter((project) => project.id !== projectId);
    const nextProject = remainingProjects[0] ?? null;
    const wasActiveProject = activeProjectId === projectId;

    setChatError(null);
    setOpenMenu(null);
    setRenamingItem((item) => (item?.type === "project" && item.id === projectId ? null : item));
    setProjects(remainingProjects);
    setProjectChatsById((items) => {
      const next = { ...items };
      delete next[projectId];
      return next;
    });
    setExpandedProjectIds((items) => items.filter((id) => id !== projectId));

    if (wasActiveProject) {
      if (nextProject) {
        setActiveProjectId(nextProject.id);
        setComposerProjectId(nextProject.id);
        setActiveChatId(null);
        setActiveSite(null);
        applyLocalSitePages([]);
        setActiveSitePageId(null);
        setMessages([]);
      } else {
        setActiveProjectId(null);
        setComposerProjectId(null);
        setActiveChatId(null);
        setActiveSite(null);
        applyLocalSitePages([]);
        setActiveSitePageId(null);
        setMessages([]);
      }
    }

    try {
      await requestJson<{ ok: true }>(`/api/projects/${projectId}`, clientId, {
        method: "DELETE"
      });

      if (wasActiveProject && nextProject) {
        await selectProject(nextProject.id, clientId);
      }
    } catch (error) {
      setProjects(previousState.projects);
      setProjectChatsById(previousState.projectChatsById);
      setExpandedProjectIds(previousState.expandedProjectIds);
      setActiveProjectId(previousState.activeProjectId);
      setComposerProjectId(previousState.composerProjectId);
      setActiveChatId(previousState.activeChatId);
      setActiveSite(previousState.activeSite);
      applyLocalSitePages(previousState.activeSitePages);
      setActiveSitePageId(previousState.activeSitePageId);
      setMessages(previousState.messages);
      setOpenMenu(previousState.openMenu);
      setRenamingItem(previousState.renamingItem);
      const message = error instanceof Error ? error.message : "Не удалось удалить проект";
      setChatError(message);
    }
  }

  async function renameChat(chatId: string, title: string) {
    if (!clientId) return;

    const previousChatEntry =
      Object.entries(projectChatsById).flatMap(([projectId, chats]) =>
        chats.filter((chat) => chat.id === chatId).map((chat) => ({ projectId, chat }))
      )[0] ?? null;

    setChatError(null);
    setOpenMenu(null);
    if (previousChatEntry) {
      setProjectChatsById((items) => ({
        ...items,
        [previousChatEntry.projectId]: (items[previousChatEntry.projectId] ?? []).map((chat) =>
          chat.id === chatId ? { ...chat, title } : chat
        )
      }));
    }

    try {
      const { chat } = await requestJson<ChatResponse>(`/api/chats/${chatId}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ title })
      });

      setProjectChatsById((items) => ({
        ...items,
        [chat.project_id]: mergeChat(items[chat.project_id] ?? [], chat)
      }));
    } catch (error) {
      if (previousChatEntry) {
        setProjectChatsById((items) => ({
          ...items,
          [previousChatEntry.projectId]: (items[previousChatEntry.projectId] ?? []).map((chat) =>
            chat.id === chatId ? { ...chat, title: previousChatEntry.chat.title } : chat
          )
        }));
      }
      const message = error instanceof Error ? error.message : "Не удалось переименовать чат";
      setChatError(message);
    }
  }

  async function deleteChat(chatId: string) {
    if (!clientId) return;
    chatRequestRevisionRef.current += 1;

    const chatProjectId =
      Object.entries(projectChatsById).find(([, chats]) => chats.some((chat) => chat.id === chatId))?.[0] ?? activeProjectId;

    if (!chatProjectId) return;

    const previousState = {
      projectChatsById,
      activeProjectId,
      composerProjectId,
      activeChatId,
      activeSite,
      activeSitePages,
      activeSitePageId,
      messages,
      openMenu,
      renamingItem,
    };
    const remainingChats = (projectChatsById[chatProjectId] ?? []).filter((chat) => chat.id !== chatId);
    const nextChat = remainingChats[0] ?? null;
    const wasActiveChat = activeChatId === chatId;

    setChatError(null);
    setOpenMenu(null);
    setRenamingItem((item) => (item?.type === "chat" && item.id === chatId ? null : item));
    setProjectChatsById((items) => ({
      ...items,
      [chatProjectId]: remainingChats
    }));

    if (wasActiveChat) {
      setActiveProjectId(chatProjectId);
      setComposerProjectId(chatProjectId);
      setActiveChatId(nextChat?.id ?? null);
      setMessages([]);
    }

    try {
      await requestJson<{ ok: true }>(`/api/chats/${chatId}`, clientId, {
        method: "DELETE"
      });

      if (wasActiveChat && nextChat) {
        await openChat(nextChat.id, chatProjectId);
      }
    } catch (error) {
      setProjectChatsById(previousState.projectChatsById);
      setActiveProjectId(previousState.activeProjectId);
      setComposerProjectId(previousState.composerProjectId);
      setActiveChatId(previousState.activeChatId);
      setActiveSite(previousState.activeSite);
      applyLocalSitePages(previousState.activeSitePages);
      setActiveSitePageId(previousState.activeSitePageId);
      setMessages(previousState.messages);
      setOpenMenu(previousState.openMenu);
      setRenamingItem(previousState.renamingItem);
      const message = error instanceof Error ? error.message : "Не удалось удалить чат";
      setChatError(message);
    }
  }

  async function archiveChat(chat: StoredChat) {
    if (!clientId) return;
    chatRequestRevisionRef.current += 1;

    const chatProjectId =
      Object.entries(projectChatsById).find(([, chats]) => chats.some((item) => item.id === chat.id))?.[0] ?? chat.project_id ?? activeProjectId;

    if (!chatProjectId) return;

    const previousState = {
      projectChatsById,
      archivedChats,
      activeProjectId,
      composerProjectId,
      activeChatId,
      activeSite,
      activeSitePages,
      activeSitePageId,
      messages,
      openMenu,
      renamingItem,
    };
    const projectName = projects.find((project) => project.id === chatProjectId)?.name ?? "Без проекта";
    const remainingChats = (projectChatsById[chatProjectId] ?? []).filter((item) => item.id !== chat.id);
    const nextChat = remainingChats[0] ?? null;
    const wasActiveChat = activeChatId === chat.id;
    const archivedChat: ArchivedChat = { ...chat, is_archived: true, project_name: projectName };

    setChatError(null);
    setOpenMenu(null);
    setRenamingItem((item) => (item?.type === "chat" && item.id === chat.id ? null : item));
    setProjectChatsById((items) => ({
      ...items,
      [chatProjectId]: remainingChats
    }));
    setArchivedChats((items) => [archivedChat, ...items.filter((item) => item.id !== chat.id)]);

    if (wasActiveChat) {
      setActiveProjectId(chatProjectId);
      setComposerProjectId(chatProjectId);
      setActiveChatId(nextChat?.id ?? null);
      setMessages([]);
    }

    try {
      await requestJson<ChatResponse>(`/api/chats/${chat.id}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: true })
      });

      if (wasActiveChat && nextChat) {
        await openChat(nextChat.id, chatProjectId);
      }
    } catch (error) {
      setProjectChatsById(previousState.projectChatsById);
      setArchivedChats(previousState.archivedChats);
      setActiveProjectId(previousState.activeProjectId);
      setComposerProjectId(previousState.composerProjectId);
      setActiveChatId(previousState.activeChatId);
      setActiveSite(previousState.activeSite);
      applyLocalSitePages(previousState.activeSitePages);
      setActiveSitePageId(previousState.activeSitePageId);
      setMessages(previousState.messages);
      setOpenMenu(previousState.openMenu);
      setRenamingItem(previousState.renamingItem);
      const message = error instanceof Error ? error.message : "Не удалось архивировать чат";
      setChatError(message);
    }
  }

  async function restoreArchivedChat(chat: ArchivedChat) {
    if (!clientId) return;

    const previousState = {
      projectChatsById,
      archivedChats,
    };

    setChatError(null);
    setArchivedChats((items) => items.filter((item) => item.id !== chat.id));
    setProjectChatsById((items) => ({
      ...items,
      [chat.project_id]: mergeChat(items[chat.project_id] ?? [], { ...chat, is_archived: false })
    }));
    expandProject(chat.project_id);

    try {
      const { chat: restoredChat } = await requestJson<ChatResponse>(`/api/chats/${chat.id}`, clientId, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: false })
      });

      setProjectChatsById((items) => ({
        ...items,
        [restoredChat.project_id]: mergeChat(items[restoredChat.project_id] ?? [], restoredChat)
      }));
    } catch (error) {
      setProjectChatsById(previousState.projectChatsById);
      setArchivedChats(previousState.archivedChats);
      const message = error instanceof Error ? error.message : "Не удалось вернуть чат из архива";
      setChatError(message);
    }
  }

  async function sendMessageText(
    text: string,
    options: {
      visible?: boolean;
      action?: string;
      runId?: string | null;
      spaceModel?: string | null;
      attachments?: ChatAttachmentPayload[];
      planMode?: boolean;
    } = {},
  ) {
    const value = text.trim();
    if (!value || !clientId || isLoading || isSendingMessageRef.current) return false;
    if (!options.action && activeChatId && chatRunStates[activeChatId]?.status === "running") return false;

    const isVisibleMessage = options.visible ?? true;
    const shouldStartNewChat = !activeChatId;
    if (!isVisibleMessage && shouldStartNewChat) return false;

    const streamController = new AbortController();
    const requestRevision = (chatRequestRevisionRef.current += 1);
    activeStreamControllerRef.current = streamController;
    isSendingMessageRef.current = true;
    setDraft("");
    setIsSendingMessage(true);
    chatAutoScrollPausedRef.current = false;
    shouldStickToChatBottomRef.current = true;
    setShowScrollToLatest(false);
    const pendingAssistantMessage: ChatMessage = {
      role: "assistant",
      text: "Думаю над запросом и готовлю следующий шаг.",
      status: "Думает",
      transient: true,
    };
    setMessages((items) => {
      const currentMessages = shouldStartNewChat ? [] : items;
      const nextMessages = isVisibleMessage ? [...currentMessages, { role: "user" as const, text: value }] : currentMessages;

      return [...nextMessages, pendingAssistantMessage];
    });

    try {
      setChatError(null);
      setChatLimitNotice(null);
      setIsProjectPickerOpen(false);
      let targetProjectId: string | null = composerProject?.id ?? activeProjectId ?? null;
      // If the active project is still optimistic (not persisted), treat it as "no project"
      // so a real one is created below — never send the non-UUID id to the database.
      if (isOptimisticProjectId(targetProjectId)) targetProjectId = null;

      if (!targetProjectId) {
        if (isProjectCreationBlockedByPlan) {
          showProjectLimitUpgradeModal();
          setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message)));
          return false;
        }

        const { project } = await requestJson<ProjectResponse>("/api/projects", clientId, {
          method: "POST",
          body: JSON.stringify({ name: makeLocalWorkTitle(value) }),
          signal: streamController.signal
        });

        targetProjectId = project.id;
        setProjects((items) => mergeProject(items, project));
        setActiveProjectId(project.id);
        setComposerProjectId(project.id);
        setChatsForProject(project.id, []);
        expandProject(project.id);
        setActiveChatId(null);
        setActiveSite(null);
      }

      let targetChatId = shouldStartNewChat ? null : activeChatId;

      if (!targetChatId && targetProjectId) {
        const created = await requestJson<ChatWithMessagesResponse>(`/api/projects/${targetProjectId}/chats`, clientId, {
          method: "POST",
          body: JSON.stringify({ title: "Новый чат", seed: false }),
          signal: streamController.signal
        });

        targetChatId = created.chat.id;
        setActiveProjectId(targetProjectId);
        setComposerProjectId(targetProjectId);
        expandProject(targetProjectId);
        setActiveChatId(created.chat.id);
        setProjectChatsById((items) => ({
          ...items,
          [targetProjectId]: mergeChat(items[targetProjectId] ?? [], created.chat)
        }));
      }

      if (!targetChatId) {
        setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message)));
        return false;
      }

      const result = await streamChatMessage(
        `/api/chats/${targetChatId}/messages`,
        clientId,
        value,
        (message) => {
          if (chatRequestRevisionRef.current !== requestRevision) return;

          if (message.role === "assistant") {
            if (isLimitAssistantMessage(message)) {
              setChatLimitNotice({
                tierId: "start",
                tierLabel: "Start",
              });
              setMessages((items) => items.filter((item) => !isTransientAssistantMessage(item)));
              return;
            }
            if (message.payload?.kind === "backend_artifacts") {
              setBackendArtifacts(message.payload.artifacts);
            }
            setMessages((items) => {
              const pendingIndex = items.findIndex(isTransientAssistantMessage);

              if (pendingIndex === -1) return [...items, message];

              const nextMessages = [...items];
              nextMessages.splice(pendingIndex, 1, message);

              return nextMessages;
            });
          }
        },
        streamController.signal,
        {
          visible: isVisibleMessage,
          action: options.action,
          runId: options.runId ?? null,
          spaceModel: options.spaceModel ?? composerAiModel,
          planMode: options.planMode ?? composerPlanMode,
          editorSelection: activeMode === "editor" ? editorAiSelection : null,
          attachments: options.attachments ?? []
        }
      );

      if (chatRequestRevisionRef.current !== requestRevision) return;

      if (result.limitReached) {
        setChatLimitNotice({
          tierId: result.limitReached.tierId,
          tierLabel: tierLabelFromId(result.limitReached.tierId),
        });
        setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message) && !isLimitAssistantMessage(message)));
      }

      setProjectChatsById((items) => ({
        ...items,
        [result.chat.project_id]: mergeChat(items[result.chat.project_id] ?? [], result.chat)
      }));
      if (result.project) {
        setProjects((items) => mergeProject(items, result.project as StoredProject));
      }
      if (result.site) {
        setActiveSite(result.site);
      }
      if (result.pages?.length) {
        applyLocalSitePages(result.pages);
        setActiveSitePageId((currentId) =>
          currentId && result.pages?.some((page) => page.id === currentId)
            ? currentId
            : result.pages?.[0]?.id ?? null
        );
        switchAppMode("editor");
      }
      return true;
    } catch (error) {
      if (isAbortError(error)) return;

      setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message)));
      const message = error instanceof Error ? error.message : "Не удалось сохранить сообщение";
      if (isProjectLimitErrorMessage(message)) {
        showProjectLimitUpgradeModal(message);
        return false;
      }
      const limitNotice = parseLimitNoticeFromText(message);
      if (limitNotice) {
        setChatLimitNotice(limitNotice);
        return false;
      }
      setChatError(message);
      return false;
    } finally {
      if (activeStreamControllerRef.current === streamController) {
        activeStreamControllerRef.current = null;
        isSendingMessageRef.current = false;
        setIsSendingMessage(false);
      }
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAssistantSessionActive) return;
    const attachment = composerAttachment;
    const messageText = composeMessageWithAttachment(draft, attachment);
    const sent = await sendMessageText(messageText, { attachments: createChatAttachmentPayload(attachment) });
    if (sent) {
      setComposerAttachment(null);
    }
  }

  async function stopActiveChatRun() {
    detachActiveAiStream();

    if (!clientId || !activeChatId) {
      isSendingMessageRef.current = false;
      setIsSendingMessage(false);
      setMessages((items) => items.filter((message) => !isTransientAssistantMessage(message)));
      return;
    }

    const stoppedChatId = activeChatId;
    try {
      setChatError(null);
      await requestJson<{ ok: true; runId: string | null }>(`/api/chats/${stoppedChatId}/runs`, clientId, {
        method: "POST",
        body: JSON.stringify({ action: "stop" }),
      });
      detachActiveAiStream();
      setChatRunStates((items) => {
        const current = items[stoppedChatId];
        if (!current) return items;

        return {
          ...items,
          [stoppedChatId]: {
            ...current,
            status: "stopped",
            phase: "stopped",
            waiting_for: null,
            updated_at: new Date().toISOString(),
          },
        };
      });
      void refreshChatRunStates(clientId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось остановить ИИ";
      setChatError(message);
    }
  }

  async function handleAttachmentSelected(file: File | undefined, kind: "file" | "photo") {
    if (!file) return;

    if (file.size > MAX_COMPOSER_ATTACHMENT_BYTES) {
      setChatError(`Файл слишком большой. Максимум ${formatComposerFileSize(MAX_COMPOSER_ATTACHMENT_BYTES)}.`);
      setIsAttachmentMenuOpen(false);
      return;
    }

    try {
      setChatError(null);
      setComposerAttachment(await createComposerAttachment(file, kind));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось прочитать файл";
      setChatError(message);
    }

    setIsAttachmentMenuOpen(false);
  }

  function connectSupabase(resumeAction?: WebBrainSupabaseGatePayload["resumeAction"]) {
    if (!clientId || !activeProjectId) return;

    if (resumeAction) {
      writeSupabaseGateResumeAction(activeProjectId, resumeAction);
    }

    const oauthUrl = `/api/supabase/oauth/start?client_id=${encodeURIComponent(clientId)}&project_id=${encodeURIComponent(activeProjectId)}`;
    const popup = window.open(oauthUrl, "_blank");

    if (popup) {
      popup.opener = null;
    } else {
      setChatError("Браузер заблокировал новую вкладку Supabase. Разрешите всплывающие окна и попробуйте еще раз.");
    }
  }

  async function continueSupabaseGate(action: WebBrainSupabaseGatePayload["resumeAction"]) {
    if (!activeProjectId || !action) return;

    clearSupabaseGateResumeAction(activeProjectId);
    setIsSupabaseGateProjectPickerOpen(false);
    await sendMessageText(
      action === "continue_after_supabase_connection" ? "Supabase подключен, продолжай создание сайта" : "подключи базу данных",
      {
        visible: false,
        action,
      },
    );
  }

  async function openSupabaseGateProjectPicker(payload: WebBrainSupabaseGatePayload) {
    if (!activeProjectId) return;

    const action = payload.resumeAction ?? "connect_database";
    setSupabaseGateResumeAction(action);
    writeSupabaseGateResumeAction(activeProjectId, action);

    const connected = await loadSupabaseGateProjects();
    if (!connected) {
      connectSupabase(action);
      return;
    }

    setSupabaseGateCreateName((value) => value || `${activeHeaderProject?.name || "WebBrain"} data`);
    setIsSupabaseGateProjectPickerOpen(true);
  }

  async function selectSupabaseProjectFromGate(project: WebBrainSupabaseProjectOption) {
    const selected = await selectSupabaseProject(project);
    if (!selected) return;

    await continueSupabaseGate(supabaseGateResumeAction ?? "connect_database");
  }

  async function createSupabaseProjectFromGate() {
    const created = await createSupabaseProject({
      name: supabaseGateCreateName.trim() || `${activeHeaderProject?.name || "WebBrain"} data`,
      organizationSlug: supabaseGateSelectedOrganization?.slug,
      organizationId: supabaseGateSelectedOrganization?.id,
      region: supabaseGateCreateRegion,
      dbPass: supabaseGatePassword || undefined,
    });
    if (!created) return;

    setIsSupabaseGateCreateOpen(false);
    await continueSupabaseGate(supabaseGateResumeAction ?? "connect_database");
  }

  useEffect(() => {
    if (isLoading || !clientId || !activeProjectId) return;

    const pendingAction = readSupabaseGateResumeAction(activeProjectId);
    if (!pendingAction) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("supabase") !== "connected") return;

    setSupabaseGateResumeAction(pendingAction);
    setSupabaseGateCreateName((value) => value || `${activeHeaderProject?.name || "WebBrain"} data`);

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("supabase");
    cleanUrl.searchParams.delete("detail");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);

    void loadSupabaseGateProjects().then((connected) => {
      if (connected) {
        setIsSupabaseGateProjectPickerOpen(true);
      }
    });
  }, [activeHeaderProject?.name, activeProjectId, clientId, isLoading, loadSupabaseGateProjects]);

  useEffect(() => {
    if (isLoading || !clientId || !activeProjectId) return;

    let checking = false;

    async function checkSupabaseAfterFocus() {
      if (checking || !activeProjectId) return;
      const pendingAction = readSupabaseGateResumeAction(activeProjectId);
      if (!pendingAction) return;

      checking = true;
      try {
        const connected = await loadSupabaseGateProjects();
        if (connected) {
          setSupabaseGateResumeAction(pendingAction);
          setSupabaseGateCreateName((value) => value || `${activeHeaderProject?.name || "WebBrain"} data`);
          setIsSupabaseGateProjectPickerOpen(true);
        }
      } finally {
        checking = false;
      }
    }

    window.addEventListener("focus", checkSupabaseAfterFocus);

    return () => {
      window.removeEventListener("focus", checkSupabaseAfterFocus);
    };
  }, [activeHeaderProject?.name, activeProjectId, clientId, isLoading, loadSupabaseGateProjects]);

  async function selectSupabaseProject(project: WebBrainSupabaseProjectOption) {
    if (!clientId || !activeProjectId) return false;

    try {
      setIsSelectingSupabaseProject(true);
      setChatError(null);
      setCreateSupabaseProjectError(null);
      const { status } = await requestJson<SupabaseConnectionResponse>("/api/supabase/connection", clientId, {
        method: "PATCH",
        body: JSON.stringify({
          projectId: activeProjectId,
          project,
        }),
      });

      setSupabaseConnectionStatus(status);
      await loadSupabaseTables(activeProjectId, clientId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось выбрать проект для данных сайта";
      setChatError(message);
      return false;
    } finally {
      setIsSelectingSupabaseProject(false);
    }
  }

  async function disconnectSupabase() {
    if (!clientId || !activeProjectId) return;

    try {
      setIsDisconnectingSupabase(true);
      setChatError(null);
      setCreateSupabaseProjectError(null);
      const { status } = await requestJson<SupabaseConnectionResponse>("/api/supabase/connection", clientId, {
        method: "DELETE",
        body: JSON.stringify({
          projectId: activeProjectId,
        }),
      });

      setSupabaseConnectionStatus(status);
      setSupabaseProjects([]);
      setSupabaseOrganizations([]);
      setSupabaseTables([]);
      setSupabaseTablesError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось выйти из Supabase";
      setChatError(message);
    } finally {
      setIsDisconnectingSupabase(false);
    }
  }

  async function createSupabaseProject(input: CreateSupabaseProjectInput) {
    if (!clientId || !activeProjectId) return false;

    try {
      setIsCreatingSupabaseProject(true);
      setChatError(null);
      setCreateSupabaseProjectError(null);
      const { status, projects, organizations } = await requestJson<CreateSupabaseProjectResponse>("/api/supabase/projects", clientId, {
        method: "POST",
        body: JSON.stringify({
          projectId: activeProjectId,
          ...input,
        }),
      });

      setSupabaseConnectionStatus(status);
      setSupabaseProjects(projects);
      setSupabaseOrganizations(organizations);
      await loadSupabaseTables(activeProjectId, clientId);
      setCreateSupabaseProjectError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось создать проект для данных сайта";
      setCreateSupabaseProjectError(message);
      setChatError(message);
      return false;
    } finally {
      setIsCreatingSupabaseProject(false);
    }
  }

  const composerCanSubmit = Boolean(composeMessageWithAttachment(draft, composerAttachment));
  const openSidebarManually = useCallback(() => {
    sidebarAutoHiddenByEditorRef.current = false;
    setSidebarOpen(true);
  }, []);
  const closeSidebarManually = useCallback(() => {
    sidebarAutoHiddenByEditorRef.current = false;
    setSidebarOpen(false);
  }, []);
  const switchAppMode = useCallback((mode: "chat" | "editor") => {
    setActiveMode(mode);
    if (mode === "editor") {
      sidebarAutoHiddenByEditorRef.current = sidebarOpen;
      setSidebarOpen(false);
      return;
    }

    if (sidebarAutoHiddenByEditorRef.current) {
      setSidebarOpen(true);
      sidebarAutoHiddenByEditorRef.current = false;
    }
  }, [sidebarOpen]);

  const loadArchivedChats = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsLoadingArchivedChats(true);
      const { chats } = await requestJson<ArchivedChatsResponse>("/api/chats/archived", clientId);
      setArchivedChats(chats);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить архив чатов";
      setChatError(message);
    } finally {
      setIsLoadingArchivedChats(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!isAccountSettingsOpen || activeAccountSettingsSection !== "archive") return;
    void loadArchivedChats();
  }, [activeAccountSettingsSection, isAccountSettingsOpen, loadArchivedChats]);

  const handleSignOut = useCallback(async () => {
    setIsSettingsMenuOpen(false);
    setIsAccountSettingsOpen(false);

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Even if Supabase is temporarily unavailable, clear the local app identity.
    }

    window.localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
    window.location.assign("/login");
  }, []);

  const openAccountSettings = useCallback((section: AccountSettingsSectionKey) => {
    setActiveAccountSettingsSection(section);
    setIsSettingsMenuOpen(false);
    setIsAccountSettingsOpen(true);
  }, []);

  const showInitialWorkspaceLoading = isLoading && !chatError;

  if (showInitialWorkspaceLoading) {
    return <WorkspaceLoadingScreen />;
  }

  return (
    <main className="app-shell flex h-screen overflow-hidden bg-[#151616] text-white">
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 300 : 0,
          borderColor: sidebarOpen ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0)"
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="hidden shrink-0 overflow-hidden border-r bg-[#242626] text-white/[0.74] md:flex"
      >
        <motion.div
          initial={false}
          animate={{ opacity: sidebarOpen ? 1 : 0, x: sidebarOpen ? 0 : -14 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-full min-h-0 w-[300px] shrink-0 flex-col px-3 py-3"
        >
          <div className="mb-3 flex h-9 items-center justify-between px-2 text-white/[0.58]">
            <button
              type="button"
              onClick={closeSidebarManually}
              aria-label="Свернуть меню"
              className="rounded-[7px] p-2 transition hover:bg-white/[0.07] hover:text-white"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void createProjectFromSidebar()}
                aria-label="Создать проект"
                className="rounded-[7px] p-2 transition hover:bg-white/[0.07] hover:text-white"
              >
                <LaptopPlusIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => createChatInProject()}
                aria-label="Новый чат"
                className="rounded-[7px] p-2 transition hover:bg-white/[0.07] hover:text-white"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-2">
            <label className="flex h-9 items-center gap-2 rounded-[10px] border border-transparent bg-[#1a1b1c] px-3 text-white/58 transition focus-within:border-lime focus-within:bg-[#171819] focus-within:text-lime">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="search"
                aria-label="Поиск по проектам и чатам"
                value={sidebarSearchQuery}
                onChange={(event) => setSidebarSearchQuery(event.target.value)}
                placeholder="Поиск..."
                className="min-w-0 flex-1 bg-transparent text-[0.84rem] text-white outline-none placeholder:text-white/42"
              />
              {sidebarSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setSidebarSearchQuery("")}
                  aria-label="Очистить поиск"
                  className="-mr-1 rounded-[6px] p-1 text-white/38 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(isLoading || pinnedProjectItems.length > 0) ? (
              <SidebarSection title="Закрепленные" className="mt-8">
                {isLoading ? <div className="px-3 py-2 text-sm text-white/36">Загрузка...</div> : null}
                {pinnedProjectItems.map(({ project, chats }) => {
                  const expanded = isSidebarSearching || expandedProjectIds.includes(project.id);

                  return (
                    <ProjectRow
                      key={`pinned-${project.id}`}
                      project={project}
                      expanded={expanded}
                      renaming={renamingItem?.type === "project" && renamingItem.id === project.id}
                      renameValue={renamingItem?.type === "project" && renamingItem.id === project.id ? renamingItem.value : project.name}
                      menuOpen={openMenu?.type === "project" && openMenu.id === project.id}
                      onSelect={() => handleProjectRowSelect(project.id)}
                      onToggleExpanded={() => void toggleProjectChats(project.id)}
                      onMenu={() => setOpenMenu((value) => (value?.type === "project" && value.id === project.id ? null : { type: "project", id: project.id }))}
                      onStartRename={() => startRename("project", project.id, project.name)}
                      onRenameValueChange={updateRenameValue}
                      onCommitRename={() => void commitRename()}
                      onCancelRename={() => setRenamingItem(null)}
                      onTogglePin={() => toggleProjectPin(project)}
                      onDelete={() => deleteProject(project.id)}
                      onCreateChat={() => createChatInProject(project.id)}
                      pinnedRow
                    >
                      <ProjectChatList
                        chats={chats}
                        activeChatId={activeChatId}
                        runStates={chatRunStates}
                        seenRuns={seenChatRuns}
                        openMenu={openMenu}
                        renamingItem={renamingItem}
                        onOpenChat={(chat) => openChat(chat.id, project.id)}
                        onMenu={(chat) => setOpenMenu((value) => (value?.type === "chat" && value.id === chat.id ? null : { type: "chat", id: chat.id }))}
                        onStartRename={(chat) => startRename("chat", chat.id, chat.title)}
                        onRenameValueChange={updateRenameValue}
                        onCommitRename={() => void commitRename()}
                        onCancelRename={() => setRenamingItem(null)}
                        onArchiveChat={(chat) => archiveChat(chat)}
                        onDeleteChat={(chat) => deleteChat(chat.id)}
                      />
                    </ProjectRow>
                  );
                })}
              </SidebarSection>
            ) : null}

            <SidebarSection
              title="Проекты"
              className="mt-7"
            >
              {!isLoading && projects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-white/36">Проектов пока нет</div>
              ) : null}
              {!isLoading && isSidebarSearching && !hasSidebarSearchResults ? (
                <div className="px-3 py-2 text-sm text-white/36">Ничего не найдено</div>
              ) : null}
              {regularProjectItems.map(({ project, chats }) => {
                const expanded = isSidebarSearching || expandedProjectIds.includes(project.id);

                return (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    expanded={expanded}
                    renaming={renamingItem?.type === "project" && renamingItem.id === project.id}
                    renameValue={renamingItem?.type === "project" && renamingItem.id === project.id ? renamingItem.value : project.name}
                    menuOpen={openMenu?.type === "project" && openMenu.id === project.id}
                    onSelect={() => handleProjectRowSelect(project.id)}
                    onToggleExpanded={() => void toggleProjectChats(project.id)}
                    onMenu={() => setOpenMenu((value) => (value?.type === "project" && value.id === project.id ? null : { type: "project", id: project.id }))}
                    onStartRename={() => startRename("project", project.id, project.name)}
                    onRenameValueChange={updateRenameValue}
                    onCommitRename={() => void commitRename()}
                    onCancelRename={() => setRenamingItem(null)}
                    onTogglePin={() => toggleProjectPin(project)}
                    onDelete={() => deleteProject(project.id)}
                    onCreateChat={() => createChatInProject(project.id)}
                  >
                    <ProjectChatList
                      chats={chats}
                      activeChatId={activeChatId}
                      runStates={chatRunStates}
                      seenRuns={seenChatRuns}
                      openMenu={openMenu}
                      renamingItem={renamingItem}
                      onOpenChat={(chat) => openChat(chat.id, project.id)}
                      onMenu={(chat) => setOpenMenu((value) => (value?.type === "chat" && value.id === chat.id ? null : { type: "chat", id: chat.id }))}
                      onStartRename={(chat) => startRename("chat", chat.id, chat.title)}
                      onRenameValueChange={updateRenameValue}
                      onCommitRename={() => void commitRename()}
                      onCancelRename={() => setRenamingItem(null)}
                      onArchiveChat={(chat) => archiveChat(chat)}
                      onDeleteChat={(chat) => deleteChat(chat.id)}
                    />
                  </ProjectRow>
                );
              })}
            </SidebarSection>
          </div>

          <div ref={settingsMenuRef} className="relative shrink-0 border-t border-white/[0.055] pt-3">
            <AnimatePresence>
              {isSettingsMenuOpen ? (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-40 overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#191b1b]/95 p-1.5 shadow-[0_18px_46px_rgba(0,0,0,0.38)] backdrop-blur-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAccountSettings("profile")}
                    className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-white/72 transition hover:bg-white/[0.075] hover:text-white"
                  >
                    <UserRound className="h-4 w-4" />
                    Профиль
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAccountSettings("profile")}
                    className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-white/72 transition hover:bg-white/[0.075] hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Настройки
                  </button>
                  <div className="my-1 h-px bg-white/[0.065]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSignOut()}
                    className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-red-100/72 transition hover:bg-red-400/[0.09] hover:text-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                  <div className="px-3 pb-2 pt-1 text-[0.56rem] font-medium uppercase tracking-[0.12em] text-white/18">
                    WebBrain v{APP_VERSION}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isSettingsMenuOpen}
              onClick={() => setIsSettingsMenuOpen((value) => !value)}
              className={`flex h-10 w-full items-center gap-3 rounded-[9px] px-3 text-left transition hover:bg-white/[0.075] hover:text-white ${
                isSettingsMenuOpen ? "bg-white/[0.075] text-white" : ""
              }`}
            >
              <Settings className="h-4 w-4" />
              Настройки
            </button>
          </div>
        </motion.div>
      </motion.aside>

      <section className="flex min-w-0 flex-1 flex-col bg-[#161718]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.045] px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={openSidebarManually}
              aria-label="Открыть меню"
              className={`rounded-[8px] p-2 text-white/58 transition hover:bg-white/[0.07] hover:text-white ${sidebarOpen ? "md:hidden" : "md:block"}`}
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="min-w-0 truncate text-base font-semibold md:text-lg">
                {activeChat ? limitChatTitle(activeChat.title) : "Новый чат"}
              </h1>
              {activeHeaderProject?.name ? (
                <span className="hidden max-w-[220px] shrink truncate text-[0.72rem] font-normal text-[#858585] md:inline">
                  Проект: {activeHeaderProject.name}
                </span>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center rounded-[15px] border border-white/[0.075] bg-white/[0.035] p-1">
              <button
                type="button"
                onClick={() => switchAppMode("chat")}
                aria-label="Чат"
                className={`relative flex h-10 items-center rounded-[11px] px-5 text-sm font-semibold transition ${
                  activeMode === "chat" ? "text-black" : "text-white/64 hover:text-white"
                }`}
              >
                {activeMode === "chat" ? (
                  <motion.span
                    layoutId="webbrain-mode-switch-pill"
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded-[11px] bg-lime"
                  />
                ) : null}
                <span className="relative z-10">Чат</span>
              </button>
              <button
                type="button"
                onClick={() => switchAppMode("editor")}
                aria-label="Редактор"
                className={`relative flex h-10 items-center rounded-[11px] px-5 text-sm font-semibold transition ${
                  activeMode === "editor" ? "text-black" : "text-white/64 hover:text-white"
                }`}
              >
                {activeMode === "editor" ? (
                  <motion.span
                    layoutId="webbrain-mode-switch-pill"
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded-[11px] bg-lime"
                  />
                ) : null}
                <span className="relative z-10">Редактор</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsBackendPanelOpen((value) => !value)}
              aria-label={supabaseConnectionStatus?.connected ? "Открыть настройки заявок и данных" : "Подключить заявки и данные"}
              title={supabaseConnectionStatus?.connected ? "Заявки и данные подключены" : "Подключить заявки и данные"}
              className={`inline-flex h-10 items-center gap-2 rounded-[13px] border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ecf8e]/45 ${
                isBackendPanelOpen
                  ? "border-[#3ecf8e]/45 bg-[#3ecf8e]/14 text-[#3ecf8e] shadow-[0_0_24px_rgba(62,207,142,0.12)]"
                  : supabaseConnectionStatus?.connected
                    ? "border-[#3ecf8e]/25 bg-[#3ecf8e]/9 text-[#b8f7dc] hover:border-[#3ecf8e]/42 hover:bg-[#3ecf8e]/14"
                    : "border-white/[0.075] bg-white/[0.035] text-white/76 hover:border-[#3ecf8e]/34 hover:bg-[#3ecf8e]/10 hover:text-[#b8f7dc]"
              }`}
            >
              <SupabaseIcon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">{isLoadingSupabaseConnection ? "Проверка" : supabaseConnectionStatus?.connected ? "Данные подключены" : "Заявки и данные"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPublishHostingOpen(true)}
              className={`inline-flex h-10 items-center gap-2 rounded-[13px] border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${
                activePublication
                  ? activePublication.status === "active"
                    ? "border-lime/55 bg-lime text-black hover:bg-[#d7ff74]"
                    : "border-red-200/25 bg-red-400/[0.1] text-red-100 hover:border-red-200/42 hover:bg-red-400/[0.16]"
                  : "border-lime/45 bg-lime/[0.09] text-lime hover:bg-lime hover:text-black"
              }`}
            >
              <Rocket className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{activePublication ? "Мой сайт" : "Опубликовать"}</span>
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <motion.div
            initial={false}
            animate={{ x: activeMode === "chat" ? "0%" : "-50%" }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-full w-[200%]"
          >
            <div className="relative h-full w-1/2 shrink-0 overflow-hidden bg-[#161718]">
              {/*
              <button
                type="button"
                aria-label="Открыть preview"
                className="absolute right-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-[#202122]/90 text-white/62 shadow-[0_18px_44px_rgba(0,0,0,0.36)] backdrop-blur-xl transition hover:border-lime/60 hover:text-lime md:flex"
              >
                <Eye className="h-5 w-5" />
              </button>
              */}

              <div
                ref={chatScrollRef}
                onScroll={updateScrollToLatestVisibility}
                className="no-scrollbar h-full overflow-y-auto px-4 pb-40 pt-8 md:px-7 md:pb-48"
              >
                <div className="mx-auto max-w-[780px]">
                  {chatError ? (
                    <div className="mb-8 rounded-[14px] border border-lime/20 bg-lime/[0.055] px-4 py-3 text-sm leading-6 text-lime/80">
                      {chatError}
                    </div>
                  ) : null}

                  {messages.length === 0 ? (
                    <div className="flex min-h-[calc(100vh-250px)] flex-col items-center justify-center gap-5 pb-16 text-center">
                      <AiOrbShader
                        mode="idle"
                        className="h-24 w-24"
                        label="WebBrain готов помочь создать сайт"
                      />
                      <h2 className="text-[clamp(1.8rem,3.2vw,2.8rem)] font-semibold tracking-[-0.01em] text-white">Какой сайт создадим?</h2>
                      {!isLoading && !activeChatId ? (
                        <div className="flex max-w-[680px] flex-wrap items-center justify-center gap-2">
                          {quickSitePrompts.map((item) => {
                            const Icon = item.icon;

                            return (
                              <button
                                key={item.prompt}
                                type="button"
                                onClick={() => void sendMessageText(item.prompt)}
                                disabled={isLoading || !clientId || isSendingMessage}
                                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-1.5 text-[0.84rem] font-medium text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-lime/35 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-42"
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0 text-white/42" strokeWidth={1.8} />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-7">
                      {chatDisplayItems.map(({ message, originalIndex, workSteps }) => (
                        message.role === "user" && message.hidden ? null : (
                        <article key={`${message.role}-${originalIndex}`} className={message.role === "user" ? "flex justify-end" : ""}>
                          {message.role === "assistant" ? (
                            <div className="max-w-[740px]">
                              {message.eyebrow ? <p className="mb-3.5 text-[0.82rem] font-medium text-white/36">{message.eyebrow}</p> : null}
                              <div className="flex gap-3">
                                {originalIndex === latestAssistantMessageIndex ? (
                                  <AiStatusSphereAvatar active={(isSendingMessage || activeChatIsRunning) && originalIndex === latestStatusMessageIndex} />
                                ) : null}
                                <div className="min-w-0">
                                  {message.status === "План" ? (
                                    <AssistantPlanCard
                                      text={message.text}
                                      payload={message.payload?.kind === "site_plan" ? message.payload : null}
                                      disabled={isSendingMessage}
                                      showActions={originalIndex === latestOpenPlanMessageIndex}
                                      onApprove={(runId) => void sendMessageText("Подтверждаю план", { visible: false, action: "approve_plan", runId })}
                                      onReject={(runId) => void sendMessageText("Отклоняю план", { visible: false, action: "reject_plan", runId })}
                                    />
                                  ) : message.status === "Вопрос" ? (
                                    message.payload?.kind === "site_brief" ? (
                                      <AssistantBriefCard
                                        payload={message.payload}
                                        disabled={isSendingMessage}
                                        showActions={originalIndex === latestOpenClarificationMessageIndex}
                                        onAnswer={(answer, runId) => void sendMessageText(answer, { visible: false, action: "answer_brief", runId })}
                                      />
                                    ) : (
                                      <AssistantClarificationCard
                                        text={message.text}
                                        disabled={isSendingMessage}
                                        showActions={originalIndex === latestOpenClarificationMessageIndex}
                                        onAnswer={(answer) => void sendMessageText(answer, { visible: false, action: "answer_brief", runId: latestRunId ?? null })}
                                      />
                                    )
                                  ) : message.payload?.kind === "supabase_connection_gate" ? (
                                    <AssistantSupabaseGateCard
                                      payload={message.payload}
                                      disabled={isSendingMessage || activeChatIsRunning}
                                      showActions={originalIndex === latestOpenSupabaseGateMessageIndex}
                                      onConnect={(payload) => void openSupabaseGateProjectPicker(payload)}
                                      onDefer={(runId) => void sendMessageText("Продолжить без подключения Supabase", { visible: false, action: "defer_supabase_connection", runId })}
                                      onRetry={(runId) => void sendMessageText("подключи базу данных", { visible: false, action: "retry_supabase_apply", runId })}
                                    />
                                  ) : (
                                    <>
                                      <AssistantWorkLogDisclosure steps={workSteps} className="mb-4" />
                                      <AssistantRichText text={message.text} />
                                      {message.status ? (
                                        <AssistantStatusBadge
                                          status={message.status}
                                          text={message.text}
                                          active={(isSendingMessage || activeChatIsRunning) && originalIndex === latestStatusMessageIndex}
                                        />
                                      ) : null}
                                    </>
                                  )}
                </div>
              </div>
            </div>
                          ) : (
                            <div className="group flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Скопировать запрос"
                                title="Скопировать запрос"
                                onClick={() => void navigator.clipboard.writeText(message.text)}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-lime/45"
                              >
                                <Copy className="h-4 w-4" strokeWidth={1.9} />
                              </button>
                              <div className="max-w-[660px] rounded-[16px] border border-white/[0.08] bg-white/[0.055] px-4 py-3 text-left text-[0.94rem] leading-6 text-white/[0.9] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                                <p className="whitespace-pre-line break-words">{message.text}</p>
                              </div>
                            </div>
                          )}
	                        </article>
                        )
                      ))}
                    </div>
                  )}
                  <div ref={chatBottomRef} className="h-px" />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,#161718_24%,#161718_100%)] px-4 pb-4 pt-12 md:px-7">
                <div className="mx-auto mb-2.5 flex max-w-[780px] justify-end pr-2">
                  <AnimatePresence initial={false}>
                    {showScrollToLatest ? (
                      <motion.button
                        type="button"
                        aria-label="Прокрутить к последним сообщениям"
                        initial={{ opacity: 0, y: 10, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.92 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => scrollChatToLatest("smooth")}
                        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#2a2b2c]/95 text-white/66 shadow-[0_18px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl transition hover:border-lime/40 hover:bg-[#343536] hover:text-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55"
                      >
                        <ChevronDown className="h-[18px] w-[18px]" strokeWidth={2.1} />
                      </motion.button>
                    ) : null}
                  </AnimatePresence>
                </div>
                <div className="pointer-events-auto mx-auto max-w-[780px]">
                  <AnimatePresence initial={false}>
                    {chatLimitNotice ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-3 overflow-hidden rounded-[16px] border border-lime/20 bg-[linear-gradient(180deg,rgba(190,255,76,0.12),rgba(20,24,20,0.94))] p-3 shadow-[0_18px_52px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(190,255,76,0.12)] backdrop-blur-2xl"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-lime/[0.13] text-lime">
                            <Cpu className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold text-white">Достигнут лимит {chatLimitNotice.tierLabel}</p>
                            <p className="mt-0.5 text-xs font-medium text-white/48">Обновите тариф или подождите сброса лимита.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openAccountSettings("subscription")}
                            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[11px] bg-lime px-3 text-xs font-extrabold text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Обновить тариф
                          </button>
                          <button
                            type="button"
                            aria-label="Закрыть уведомление о лимите"
                            onClick={() => setChatLimitNotice(null)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-black/24 text-white/46 transition hover:bg-lime/[0.12] hover:text-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <form onSubmit={submitMessage} className="relative z-20 overflow-visible rounded-[18px] border border-white/[0.07] bg-[#2a2b2c]/[0.92] shadow-[0_16px_58px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl transition-colors duration-150">
                    <AnimatePresence initial={false}>
                      {composerAttachment ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="px-3.5 pt-3.5"
                        >
                          <div className="flex items-center gap-3 rounded-[14px] border border-white/[0.075] bg-white/[0.045] p-2.5 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {composerAttachment.kind === "photo" && composerAttachment.previewUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element -- Blob previews cannot be served through next/image. */
                              <img
                                src={composerAttachment.previewUrl}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-[10px] object-cover"
                              />
                            ) : (
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-white/[0.07] text-white/66">
                                <FileText className="h-5 w-5" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white/86">{composerAttachment.name}</p>
                              <p className="mt-0.5 truncate text-xs text-white/38">
                                {composerAttachment.kind === "photo" ? "Фото" : composerAttachment.kind === "video" ? "Видео" : "Файл"} · {formatComposerFileSize(composerAttachment.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label="Убрать вложение"
                              onClick={() => setComposerAttachment(null)}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/42 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <textarea
                      ref={composerTextareaRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={isAssistantSessionActive}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      rows={2}
                      placeholder={composerPlaceholder}
                      className={`block max-h-36 min-h-[62px] w-full resize-none bg-transparent px-4 text-[0.94rem] leading-6 text-white outline-none placeholder:text-white/36 disabled:cursor-not-allowed disabled:text-white/34 disabled:placeholder:text-white/28 ${composerAttachment ? "pt-3" : "pt-4"}`}
                    />

                    <div className="flex items-center justify-between gap-3 px-3.5 pb-3.5">
                      <div className="flex items-center gap-2 text-[0.84rem] text-white/54">
                      <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Прикрепить файл"
                          aria-expanded={isAttachmentMenuOpen}
                          onClick={() => {
                            setIsProjectPickerOpen(false);
                            setIsAiSettingsOpen(false);
                            setIsComposerModelMenuOpen(false);
                            setIsComposerEffortMenuOpen(false);
                            setIsAttachmentMenuOpen((value) => !value);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${isAttachmentMenuOpen || composerAttachment ? "bg-white/[0.08] text-white" : ""}`}
                        >
                          <Paperclip className="h-[18px] w-[18px]" />
                        </button>
                        <AnimatePresence>
                          {isAttachmentMenuOpen ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-40 rounded-[14px] border border-white/[0.08] bg-[#171819]/95 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl"
                            >
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.07] hover:text-white"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate">Файл</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-left text-sm font-medium text-white/72 transition hover:bg-white/[0.07] hover:text-white"
                              >
                                <ImageIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">Фото</span>
                              </button>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={(event) => {
                            void handleAttachmentSelected(event.target.files?.[0], "file");
                            event.currentTarget.value = "";
                          }}
                        />
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handleAttachmentSelected(event.target.files?.[0], "photo");
                            event.currentTarget.value = "";
                          }}
                        />
                      </div>
                      <div onPointerDown={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Настройки ИИ"
                          aria-expanded={isAiSettingsOpen}
                          onClick={() => {
                            setIsAttachmentMenuOpen(false);
                            setIsProjectPickerOpen(false);
                            setIsComposerModelMenuOpen(false);
                            setIsComposerEffortMenuOpen(false);
                            setIsAiSettingsOpen((value) => !value);
                          }}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${isAiSettingsOpen ? "bg-lime/[0.16] text-lime" : ""}`}
                        >
                          <Settings className="h-[17px] w-[17px]" />
                        </button>
                      </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-[0.84rem] text-white/58">
                      {/* Voice input is intentionally hidden until the recording flow is implemented. */}
                      {/* <button type="button" aria-label="Микрофон" className="hidden h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/[0.08] hover:text-white sm:flex">
                        <Mic className="h-3.5 w-3.5" />
                      </button> */}
	                      {isAssistantSessionActive ? (
	                        <button
	                          type="button"
	                          aria-label="Остановить ИИ"
	                          onClick={() => void stopActiveChatRun()}
	                          className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#182018] text-lime shadow-[inset_0_0_0_1px_rgba(190,255,76,0.26),0_10px_26px_rgba(0,0,0,0.22)] transition hover:bg-red-500/[0.12] hover:text-red-100 hover:shadow-[inset_0_0_0_1px_rgba(248,113,113,0.34),0_10px_26px_rgba(0,0,0,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
	                        >
	                          <CircleStop className="h-[18px] w-[18px] transition group-hover:scale-105" />
	                        </button>
	                      ) : (
                        <button
                          type="submit"
                          aria-label="Отправить"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-lime disabled:cursor-not-allowed disabled:opacity-45"
                          disabled={isLoading || !clientId || !composerCanSubmit}
                        >
                          <Send className="h-[18px] w-[18px]" />
                        </button>
                      )}
                      </div>
                    </div>
                  </form>
                  <AnimatePresence initial={false}>
                    {isAiSettingsOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: -54, scaleY: 0.72 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -54, scaleY: 0.72 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 mx-5 -mt-2 max-w-[calc(100%-40px)] rounded-b-[24px] rounded-t-none border border-t-0 border-white/[0.055] bg-[#030303]/98 px-4 pb-4 pt-5 shadow-[0_22px_64px_rgba(0,0,0,0.54),inset_0_-1px_0_rgba(255,255,255,0.035)] backdrop-blur-2xl"
                        style={{ transformOrigin: "top center" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <button
                              ref={composerModelButtonRef}
                              type="button"
                              title={`Модель: ${composerAiModel}`}
                              aria-label="Выбор модели"
                              aria-expanded={isComposerModelMenuOpen}
                              onClick={() => {
                                setIsComposerEffortMenuOpen(false);
                                setIsComposerModelMenuOpen((value) => !value);
                              }}
                              className={`flex h-10 items-center justify-center gap-2 rounded-full border px-3 transition ${
                                isComposerModelMenuOpen
                                  ? "border-lime/45 bg-lime/[0.15] text-lime"
                                  : "border-white/[0.075] bg-[#202126] text-white/76 hover:bg-[#282a30] hover:text-white"
                              }`}
                            >
                              <BrainCircuit className="h-[18px] w-[18px]" strokeWidth={2.2} />
                              <span className="max-w-[92px] truncate text-[0.88rem] font-bold">{composerAiModel}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsComposerModelMenuOpen(false);
                              setIsComposerEffortMenuOpen(false);
                              setComposerPlanMode((value) => !value);
                            }}
                            title={composerPlanMode ? "Plan включен: ИИ спросит детали и дождется подтверждения плана" : "Plan выключен: ИИ сам выберет лучшее решение и сразу начнет работу"}
                            aria-pressed={composerPlanMode}
                            className={`flex h-10 items-center justify-center gap-2 rounded-full border px-3.5 transition ${
                              composerPlanMode
                                ? "border-lime/45 bg-lime/[0.16] text-lime shadow-[0_0_28px_rgba(185,255,71,0.08)]"
                                : "border-white/[0.075] bg-[#202126] text-white/76 hover:bg-[#282a30] hover:text-white"
                            }`}
                          >
                            <ClipboardList className="h-[18px] w-[18px]" strokeWidth={2.2} />
                            <span className="text-[0.9rem] font-bold">Plan</span>
                          </button>

                          <div className="relative">
                            <button
                              ref={composerEffortButtonRef}
                              type="button"
                              title={`Effort: ${composerAiEfforts.find((effort) => effort.value === composerAiEffort)?.label ?? composerAiEffort}`}
                              aria-label="Выбор effort"
                              aria-expanded={isComposerEffortMenuOpen}
                              onClick={() => {
                                setIsComposerModelMenuOpen(false);
                                setIsComposerEffortMenuOpen((value) => !value);
                              }}
                              className={`flex h-10 items-center justify-center gap-2 rounded-full border px-3.5 transition ${
                                isComposerEffortMenuOpen
                                  ? "border-lime/45 bg-lime/[0.15] text-lime"
                                  : "border-white/[0.075] bg-[#202126] text-white/76 hover:bg-[#282a30] hover:text-white"
                              }`}
                            >
                              <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} />
                              <span className="text-[0.9rem] font-bold">
                                {composerAiEfforts.find((effort) => effort.value === composerAiEffort)?.label ?? composerAiEffort}
                              </span>
                            </button>
                          </div>
                          </div>
                          <div className="relative -mr-1 flex items-center text-white/62" onPointerDown={(event) => event.stopPropagation()}>
                            <ProjectPicker
                              projects={projects}
                              selectedProject={composerProject}
                              open={isProjectPickerOpen}
                              onToggle={() => {
                                setIsAttachmentMenuOpen(false);
                                setIsComposerModelMenuOpen(false);
                                setIsComposerEffortMenuOpen(false);
                                setIsProjectPickerOpen((value) => !value);
                              }}
                              onCreateProject={() => void createProjectFromSidebar()}
                              onSelect={(project) => {
                                if (activeChatId) {
                                  void openProject(project.id);
                                } else {
                                  void createChatInProject(project.id);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  {typeof document === "undefined"
                    ? null
                    : createPortal(
                        <AnimatePresence>
                          {isComposerModelMenuOpen && composerModelMenuStyle ? (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                              style={composerModelMenuStyle}
                              className="z-[9999] max-h-[192px] overflow-y-auto rounded-[14px] border border-white/[0.08] bg-[#151617]/95 p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.46)] backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              {composerAiModels.map((model) => {
                                const selected = composerAiModel === model;
                                const locked = !composerAllowedSpaceModelSet.has(model);

                                return (
                                  <button
                                    key={model}
                                    type="button"
                                    disabled={locked}
                                    title={locked ? "Открывается на тарифе выше" : `Выбрать ${model}`}
                                    onClick={() => {
                                      if (locked) return;
                                      setComposerAiModel(model);
                                      setIsComposerModelMenuOpen(false);
                                    }}
                                    className={`flex h-9 w-full items-center justify-between gap-3 rounded-[9px] px-3 text-left text-sm font-bold transition ${
                                      locked
                                        ? "cursor-not-allowed bg-transparent text-[#777a80]"
                                        : selected
                                          ? "bg-lime text-black"
                                          : "text-white/68 hover:bg-white/[0.07] hover:text-white"
                                    }`}
                                  >
                                    <span className="truncate">{model}</span>
                                    {locked ? <LockKeyhole className="h-3.5 w-3.5 text-[#777a80]" strokeWidth={2.2} /> : null}
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>,
                        document.body
                      )}
                  {typeof document === "undefined"
                    ? null
                    : createPortal(
                        <AnimatePresence>
                          {isComposerEffortMenuOpen && composerEffortMenuStyle ? (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                              style={composerEffortMenuStyle}
                              className="z-[9999] max-h-[192px] overflow-y-auto rounded-[14px] border border-white/[0.08] bg-[#151617]/95 p-1.5 shadow-[0_18px_52px_rgba(0,0,0,0.46)] backdrop-blur-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              {composerAiEfforts.map((effort) => {
                                const selected = composerAiEffort === effort.value;

                                return (
                                  <button
                                    key={effort.value}
                                    type="button"
                                    onClick={() => {
                                      setComposerAiEffort(effort.value);
                                      setIsComposerEffortMenuOpen(false);
                                    }}
                                    className={`flex h-10 w-full items-center gap-2 rounded-[9px] px-2 text-left transition ${
                                      selected ? "bg-lime text-black" : "text-white/68 hover:bg-white/[0.07] hover:text-white"
                                    }`}
                                  >
                                    <Sparkles className="h-4 w-4 shrink-0" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-black">{effort.label}</span>
                                      <span className={`block truncate text-[0.68rem] font-semibold ${selected ? "text-black/52" : "text-white/34"}`}>{effort.hint}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>,
                        document.body
                      )}
                </div>
              </div>
            </div>

            <div className="h-full w-1/2 shrink-0 overflow-hidden bg-[#08090a]">
              <EditorWorkspace
                site={activeSite}
                pages={activeSite ? activeSitePages : []}
                clientId={clientId}
                isAdmin={shellProfileSummary?.access?.isAdmin === true}
                activePageId={activeSitePageId}
                onSelectPage={setActiveSitePageId}
                onPagesChange={applyLocalSitePages}
                onCreateBlankSite={createBlankSite}
                canCreateBlankSite={Boolean(clientId && (activeProjectId || composerProject))}
                isCreatingBlankSite={isCreatingBlankSite}
                isGeneratingSite={isSendingMessage || activeChatIsRunning || latestPendingAssistantActionIndex !== -1}
                isAiWorking={isSendingMessage || activeChatIsRunning}
                aiCanvasStatus={getEditorCanvasStatus(messages)}
                onSelectionContextChange={setEditorAiSelection}
                onRunAiEdit={(prompt) => void sendMessageText(prompt)}
              />
            </div>
          </motion.div>
        </div>
      </section>
      {typeof document === "undefined"
        ? null
        : createPortal(
            <AnimatePresence>
              {isSupabaseGateProjectPickerOpen ? (
                <motion.div
                  className="fixed inset-0 z-[10000] grid place-items-center bg-black/62 px-4 py-6 backdrop-blur-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Выбор проекта Supabase"
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-2xl overflow-hidden rounded-[22px] border border-transparent bg-[#101312]/96 shadow-[0_30px_90px_rgba(0,0,0,0.56)]"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[#252b29] px-5 py-5">
                      <div className="min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#30443b] bg-[#3ecf8e]/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-[#b8f7dc]/78">
                          <Database className="h-3 w-3" />
                          Supabase
                        </div>
                        <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Выберите проект для данных сайта</h2>
                        <p className="mt-2 text-sm leading-6 text-white/46">
                          В этот проект WebBrain подключит подготовленные формы, заявки и таблицы.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSupabaseGateProjectPickerOpen(false)}
                        aria-label="Закрыть"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white/42 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-[min(72vh,620px)] overflow-y-auto px-5 py-5">
                      {isLoadingSupabaseConnection || isLoadingSupabaseProjects ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[0, 1, 2, 3].map((item) => (
                            <div key={item} className="h-24 animate-pulse rounded-[15px] bg-white/[0.04]" />
                          ))}
                        </div>
                      ) : supabaseProjects.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {supabaseProjects.map((project) => {
                            const selected = supabaseConnectionStatus?.connection?.projectRef === project.ref;

                            return (
                              <button
                                key={`${project.organizationSlug ?? "org"}-${project.ref}`}
                                type="button"
                                onClick={() => void selectSupabaseProjectFromGate(project)}
                                disabled={isSelectingSupabaseProject || isSendingMessage}
                                className={`min-h-24 rounded-[15px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-48 ${
                                  selected
                                    ? "border-[#315547] bg-[#10241d] text-white"
                                    : "border-[#29302e] bg-[#161918] text-white/68 hover:border-[#345044] hover:bg-[#17211d] hover:text-white"
                                }`}
                              >
                                <span className="flex items-start justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="block truncate text-base font-semibold">{project.name}</span>
                                    <span className="mt-1 block truncate text-xs text-white/34">{project.organizationName || project.organizationSlug || "Supabase"}</span>
                                  </span>
                                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${selected ? "bg-[#3ecf8e]/12 text-[#3ecf8e]" : "bg-white/[0.04] text-white/34"}`}>
                                    {selected ? <CheckCircle2 className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                                  </span>
                                </span>
                                <span className="mt-4 block truncate text-xs font-medium text-white/30">{project.ref}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[16px] border border-[#29302e] bg-[#151817] px-4 py-5 text-sm leading-6 text-white/52">
                          В аккаунте Supabase не нашлось доступных проектов. Можно создать новый прямо здесь.
                        </div>
                      )}

                      <div className="mt-4 rounded-[16px] bg-[#151817] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white/84">Нужен отдельный проект?</p>
                            <p className="mt-1 text-xs leading-5 text-white/36">WebBrain создаст проект Supabase и выберет его для сайта.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSupabaseGateCreateName((value) => value || `${activeHeaderProject?.name || "WebBrain"} data`);
                              setSupabaseGateSelectedOrganizationSlug((value) => value || supabaseOrganizations[0]?.slug || "");
                              setIsSupabaseGateCreateOpen(true);
                            }}
                            disabled={isCreatingSupabaseProject || isSendingMessage}
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] bg-[#3ecf8e] px-4 text-sm font-extrabold text-[#06140f] transition hover:bg-[#56eba4] disabled:cursor-not-allowed disabled:opacity-48"
                          >
                            <Plus className="h-4 w-4" />
                            Создать
                          </button>
                        </div>
                        {createSupabaseProjectError ? (
                          <p className="mt-3 rounded-[12px] border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-sm leading-6 text-red-100/78">
                            {createSupabaseProjectError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <AnimatePresence>
                      {isSupabaseGateCreateOpen ? (
                        <motion.div
                          className="absolute inset-0 z-30 grid place-items-center bg-black/58 p-5 backdrop-blur-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.16 }}
                        >
                          <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Создать проект для данных"
                            initial={{ opacity: 0, y: 14, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="flex max-h-[min(680px,calc(100%-20px))] w-[min(520px,calc(100%-24px))] flex-col overflow-hidden rounded-[22px] bg-[#101313] shadow-[0_30px_110px_rgba(0,0,0,0.62)]"
                          >
                            <div className="flex items-start justify-between gap-4 border-b border-[#1f2d28] bg-[#111615] px-5 py-4">
                              <div className="min-w-0">
                                <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Создать проект для данных</h3>
                                <p className="mt-2 max-w-md text-sm leading-6 text-white/58">
                                  WebBrain создаст проект в вашем аккаунте Supabase и выберет его для этого сайта.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSupabaseGateCreateOpen(false);
                                  setIsSupabaseGateRegionOpen(false);
                                }}
                                aria-label="Закрыть"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/[0.035] text-white/54 transition hover:bg-white/[0.07] hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                              <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Название</span>
                                <input
                                  value={supabaseGateCreateName}
                                  onChange={(event) => setSupabaseGateCreateName(event.target.value)}
                                  placeholder={`${activeHeaderProject?.name || "WebBrain"} data`}
                                  className="h-12 w-full rounded-[14px] border border-transparent bg-black/32 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/28 focus:bg-black/40 focus:ring-1 focus:ring-[#3ecf8e]/20"
                                />
                              </label>

                              <label className="mt-5 block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Регион</span>
                                <div className="relative">
                                  <button
                                    type="button"
                                    aria-expanded={isSupabaseGateRegionOpen}
                                    onClick={() => setIsSupabaseGateRegionOpen((value) => !value)}
                                    className={`flex h-12 w-full items-center justify-between gap-3 rounded-[14px] border border-transparent bg-black/32 px-4 text-left text-sm text-white outline-none transition hover:bg-black/40 ${
                                      isSupabaseGateRegionOpen ? "ring-1 ring-[#3ecf8e]/22" : ""
                                    }`}
                                  >
                                    <span className="flex min-w-0 items-center gap-3">
                                      <span className="grid h-8 w-9 shrink-0 place-items-center rounded-[9px] bg-white/[0.06] text-[1.05rem] leading-none">
                                        {supabaseGateSelectedRegion.flag}
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block truncate font-semibold text-white/88">{supabaseGateSelectedRegion.label}</span>
                                        <span className="block truncate text-xs text-white/38">{supabaseGateSelectedRegion.value}</span>
                                      </span>
                                    </span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 text-white/42 transition ${isSupabaseGateRegionOpen ? "rotate-180 text-[#b8f7dc]" : ""}`} />
                                  </button>
                                  <AnimatePresence>
                                    {isSupabaseGateRegionOpen ? (
                                      <motion.div
                                        initial={{ y: -4, opacity: 0, scale: 0.98 }}
                                        animate={{ y: 0, opacity: 1, scale: 1 }}
                                        exit={{ y: -4, opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-y-auto rounded-[14px] bg-[#141717] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
                                      >
                                        {SUPABASE_REGION_OPTIONS.map((region) => {
                                          const selected = region.value === supabaseGateCreateRegion;

                                          return (
                                            <button
                                              key={region.value}
                                              type="button"
                                              onClick={() => {
                                                setSupabaseGateCreateRegion(region.value);
                                                setIsSupabaseGateRegionOpen(false);
                                              }}
                                              className={`flex min-h-11 w-full items-center gap-2.5 rounded-[11px] px-2.5 text-left transition ${
                                                selected ? "bg-[#1f2b26] text-[#b8f7dc]" : "text-white/62 hover:bg-white/[0.045] hover:text-white"
                                              }`}
                                            >
                                              <span className={`grid h-7 w-8 shrink-0 place-items-center rounded-[8px] text-[1.05rem] leading-none ${selected ? "bg-[#3ecf8e]/14" : "bg-white/[0.055]"}`}>
                                                {region.flag}
                                              </span>
                                              <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold">{region.label}</span>
                                                <span className="block truncate text-xs text-white/34">{region.value}</span>
                                              </span>
                                              {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#3ecf8e]" /> : null}
                                            </button>
                                          );
                                        })}
                                      </motion.div>
                                    ) : null}
                                  </AnimatePresence>
                                </div>
                                <span className="mt-2 block text-xs leading-5 text-white/42">Лучше выбирать ближе к вашим клиентам. После создания регион меняется только через перенос проекта.</span>
                              </label>

                              <div className="mt-5">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Пароль базы данных</span>
                                  <button
                                    type="button"
                                    onClick={() => setSupabaseGateCreatePassword(generateSupabaseDbPassword())}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-white/[0.045] px-3 text-xs font-semibold text-white/58 transition hover:bg-[#1f2926] hover:text-[#b8f7dc]"
                                  >
                                    <Redo2 className="h-3.5 w-3.5" />
                                    Сгенерировать
                                  </button>
                                </div>
                                <input
                                  value={supabaseGateCreatePassword}
                                  onChange={(event) => setSupabaseGateCreatePassword(event.target.value)}
                                  placeholder="Можно оставить пустым"
                                  className={`h-12 w-full rounded-[14px] border border-transparent bg-black/32 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/28 focus:bg-black/40 ${
                                    supabaseGateDbPasswordTooShort ? "ring-1 ring-red-400/35" : "focus:ring-1 focus:ring-[#3ecf8e]/20"
                                  }`}
                                />
                                <span className={`mt-2 block text-xs leading-5 ${supabaseGateDbPasswordTooShort ? "text-red-100/70" : "text-white/42"}`}>
                                  {supabaseGateDbPasswordTooShort ? "Минимум 12 символов." : "Если поле пустое, WebBrain создаст надежный пароль сам."}
                                </span>
                              </div>

                              {supabaseOrganizations.length > 1 ? (
                                <label className="mt-5 block">
                                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Аккаунт Supabase</span>
                                  <select
                                    value={supabaseGateSelectedOrganizationSlug || supabaseOrganizations[0]?.slug || ""}
                                    onChange={(event) => setSupabaseGateSelectedOrganizationSlug(event.target.value)}
                                    className="h-12 w-full rounded-[14px] border border-transparent bg-black/32 px-4 text-sm font-semibold text-white outline-none transition focus:bg-black/40 focus:ring-1 focus:ring-[#3ecf8e]/20"
                                  >
                                    {supabaseOrganizations.map((organization) => (
                                      <option key={organization.slug} value={organization.slug}>
                                        {organization.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}

                              {supabaseGateSelectedOrganization ? (
                                <div className="mt-5 rounded-[14px] bg-[#181b1b] px-4 py-3 text-sm leading-5 text-white/46">
                                  Проект будет создан в аккаунте {supabaseGateSelectedOrganization.name}.
                                </div>
                              ) : null}
                            </div>
                            <div className="border-t border-[#1f2d28] bg-[#111615] px-5 py-4">
                              <button
                                type="button"
                                onClick={() => void createSupabaseProjectFromGate()}
                                disabled={isCreatingSupabaseProject || isSendingMessage || supabaseGateDbPasswordTooShort}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#3ecf8e]/13 px-4 text-sm font-semibold text-[#b8f7dc] transition hover:bg-[#3ecf8e]/18 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Plus className="h-4 w-4" />
                                {isCreatingSupabaseProject ? "Создаю..." : "Создать проект"}
                              </button>
                            </div>
                          </motion.div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )}
      <BackendPanel
        open={isBackendPanelOpen}
        loading={isLoadingBackendArtifacts}
        artifacts={backendArtifacts}
        projectName={projects.find((project) => project.id === activeProjectId)?.name}
        connectionStatus={supabaseConnectionStatus}
        loadingConnection={isLoadingSupabaseConnection}
        supabaseProjects={supabaseProjects}
        supabaseOrganizations={supabaseOrganizations}
        supabaseTables={supabaseTables}
        loadingSupabaseProjects={isLoadingSupabaseProjects}
        loadingSupabaseTables={isLoadingSupabaseTables}
        supabaseTablesError={supabaseTablesError}
        creatingSupabaseProject={isCreatingSupabaseProject}
        createSupabaseProjectError={createSupabaseProjectError}
        disconnectingSupabase={isDisconnectingSupabase}
        selectingSupabaseProject={isSelectingSupabaseProject}
        onConnectSupabase={connectSupabase}
        onDisconnectSupabase={() => void disconnectSupabase()}
        onCreateSupabaseProject={(input) => void createSupabaseProject(input)}
        onSelectSupabaseProject={(project) => void selectSupabaseProject(project)}
        onRefreshSupabaseTables={() => {
          if (clientId && activeProjectId) {
            void loadSupabaseTables(activeProjectId, clientId);
          }
        }}
        onLoadSupabaseTablePreview={loadSupabaseTablePreview}
        onExecuteSupabaseSql={executeSupabaseSql}
        onClose={() => setIsBackendPanelOpen(false)}
      />
      <PublishHostingModal
        open={isPublishHostingOpen}
        projectName={projects.find((project) => project.id === activeProjectId)?.name}
        publication={activePublication}
        publicUrl={activePublicationUrl}
        usage={activePublicationUsage}
        onClose={() => setIsPublishHostingOpen(false)}
        onPublish={publishActiveSite}
        onUpdateStatus={updateActivePublicationStatus}
      />
      <AccountSettingsModal
        open={isAccountSettingsOpen}
        activeSection={activeAccountSettingsSection}
        clientId={clientId}
        projectsCount={projects.length}
        chatsCount={totalChatsCount}
        appVersion={APP_VERSION}
        archivedChats={archivedChats}
        isLoadingArchivedChats={isLoadingArchivedChats}
        onSectionChange={setActiveAccountSettingsSection}
        onClose={() => setIsAccountSettingsOpen(false)}
        onSignOut={() => void handleSignOut()}
        onRestoreArchivedChat={(chat) => void restoreArchivedChat(chat)}
      />
    </main>
  );
}

function composeSiteSrcDoc(document: WebBrainDocument, page: StoredSitePage | null) {
  const html = renderWebBrainDocument(document, page?.slug);
  const editorBridgeScript = `
(function () {
  if (window.__webbrainEditorBridge) return;
  window.__webbrainEditorBridge = true;

  var selectionEnabled = false;
  var insertionEnabled = false;
  var insertionLabel = "Блок";
  var insertionAllowNested = false;
  var insertionContainerElement = null;
  var insertionLockedContainerId = "";
  var insertionPendingContainerElement = null;
  var insertionSwitchTimer = 0;
  var activeInsertionZoneKey = "";
  var selectedElement = null;
  var hoveredElement = null;
  var lastPointerX = NaN;
  var lastPointerY = NaN;
  var frame = 0;
  var insertionFrame = 0;
  var dragState = null;
  var suppressNextClick = false;
  var interactivityObserver = null;
  var bridgeStyle = document.createElement("style");
  bridgeStyle.textContent = ".webbrain-editor-no-select,.webbrain-editor-no-select *{user-select:none!important;-webkit-user-select:none!important;-webkit-user-drag:none!important;} .webbrain-editor-no-select [data-webbrain-id],.webbrain-editor-no-select a{cursor:grab!important;} .webbrain-editor-no-select [data-webbrain-id]:active{cursor:grabbing!important;}";
  document.head.appendChild(bridgeStyle);

  function isElement(value) {
    return value && value.nodeType === 1;
  }

  function isSelectable(element) {
    return isElement(element) && element.hasAttribute("data-webbrain-id");
  }

  function pickElement(target) {
    if (!isElement(target)) return null;

    return target.closest("[data-webbrain-id]");
  }

  function postComponent(element, messageType) {
    var selection = selectionPayload(element);
    if (!selection) return;

    window.parent.postMessage(
      {
        type: messageType,
        selection: selection
      },
      "*"
    );
  }

  function selectionPayload(element) {
    if (!isSelectable(element)) return null;

    var rect = element.getBoundingClientRect();
    var parentElement = closestEditableParent(element);
    var parentRect = parentElement && parentElement !== element ? parentElement.getBoundingClientRect() : null;
    var componentId = element.getAttribute("data-webbrain-id") || "";
    var componentType = element.getAttribute("data-webbrain-type") || "component";
    var childRects = getDirectEditableChildren(element).map(function (childElement) {
      var childRect = childElement.getBoundingClientRect();

      return {
        top: childRect.top,
        left: childRect.left,
        width: childRect.width,
        height: childRect.height,
        componentId: childElement.getAttribute("data-webbrain-id") || "",
        componentType: childElement.getAttribute("data-webbrain-type") || "component"
      };
    });

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      parentTop: parentRect ? parentRect.top : 0,
      parentLeft: parentRect ? parentRect.left : 0,
      parentWidth: parentRect ? parentRect.width : window.innerWidth,
      parentHeight: parentRect ? parentRect.height : window.innerHeight,
      label: componentType,
      componentId: componentId,
      componentType: componentType,
      childRects: childRects
    };
  }

  function postSelection(element) {
    postComponent(element, "webbrain:component-selected");
  }

  function postHover(element) {
    postComponent(element, "webbrain:component-hovered");
  }

  function clearHover() {
    window.parent.postMessage({ type: "webbrain:component-hover-cleared" }, "*");
  }

  function clearSelection() {
    window.parent.postMessage({ type: "webbrain:component-selection-cleared" }, "*");
  }

  function scheduleBoundsUpdate() {
    if (!selectionEnabled || frame) return;

    frame = window.requestAnimationFrame(function () {
      frame = 0;
      if (selectedElement) postSelection(selectedElement);
      if (hoveredElement) postHover(hoveredElement);
    });
  }

  function getRootElement() {
    return document.querySelector(".wb-page[data-webbrain-id]") || document.querySelector("[data-webbrain-type='page']");
  }

  function getDirectEditableChildren(containerElement) {
    if (!containerElement) return [];

    return Array.prototype.filter.call(containerElement.children, function (element) {
      return isSelectable(element);
    });
  }

  function isInsertionContainer(element) {
    if (!isSelectable(element)) return false;

    var type = element.getAttribute("data-webbrain-type") || "";
    return ["page", "section", "footer", "container", "row", "column", "grid", "stack", "card", "cardGrid"].indexOf(type) !== -1;
  }

  function closestInsertionContainer(target) {
    if (!isElement(target)) return getRootElement();

    var element = target.closest("[data-webbrain-id]");
    while (element && !isInsertionContainer(element)) {
      element = element.parentElement ? element.parentElement.closest("[data-webbrain-id]") : null;
    }

    return element || getRootElement();
  }

  function closestEditableParent(element) {
    if (!isElement(element) || !element.parentElement) return getRootElement();

    var parent = element.parentElement.closest("[data-webbrain-id]");
    while (parent && !isInsertionContainer(parent)) {
      parent = parent.parentElement ? parent.parentElement.closest("[data-webbrain-id]") : null;
    }

    return parent || getRootElement();
  }

  function closestDragInsertionContainer(target, draggedElement) {
    var element = closestInsertionContainer(target);

    while (element && draggedElement && (element === draggedElement || draggedElement.contains(element))) {
      element = closestEditableParent(element);
    }

    return element || getRootElement();
  }

  function containerLabel(element) {
    var type = element.getAttribute("data-webbrain-type") || "";
    if (type === "page") return "страницу";
    if (type === "section") return "секцию";
    if (type === "footer") return "футер";
    if (type === "container") return "контейнер";
    if (type === "row") return "ряд";
    if (type === "column") return "колонку";
    if (type === "grid") return "сетку";
    if (type === "card") return "карточку";
    if (type === "cardGrid") return "сетку";
    return "группу";
  }

  function isRectVisible(rect) {
    return rect.width > 80 && rect.height > 24 && rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function pushInsertionZone(zones, containerElement, index, top, label, options) {
    var rect = containerElement.getBoundingClientRect();
    var componentId = containerElement.getAttribute("data-webbrain-id") || "";
    var type = containerElement.getAttribute("data-webbrain-type") || "";
    var inset = type === "page" ? 24 : Math.min(44, Math.max(16, rect.width * 0.035));
    var zoneOptions = options || {};

    if (!componentId || !isRectVisible(rect)) return;

    zones.push({
      top: Math.max(rect.top + 14, Math.min(rect.bottom - 14, top)),
      left: zoneOptions.left !== undefined ? zoneOptions.left : rect.left + inset,
      width: zoneOptions.width !== undefined ? zoneOptions.width : Math.max(120, rect.width - inset * 2),
      height: zoneOptions.height,
      orientation: zoneOptions.orientation || "horizontal",
      mode: zoneOptions.mode || "insert",
      targetComponentId: zoneOptions.targetComponentId,
      side: zoneOptions.side,
      rootComponentId: componentId,
      index: index,
      label: label
    });
  }

  function containerUsesHorizontalZones(containerElement) {
    if (!containerElement) return false;

    var type = containerElement.getAttribute("data-webbrain-type") || "";
    if (type === "row" || type === "grid" || type === "cardGrid") return true;

    var style = window.getComputedStyle(containerElement);
    if (style.display.indexOf("grid") !== -1) return true;

    return style.display.indexOf("flex") !== -1 && style.flexDirection.indexOf("row") !== -1;
  }

  function pushVerticalInsertionZone(zones, containerElement, index, left, top, height, label, options) {
    var rect = containerElement.getBoundingClientRect();
    var componentId = containerElement.getAttribute("data-webbrain-id") || "";
    var zoneOptions = options || {};

    if (!componentId || !isRectVisible(rect)) return;

    zones.push({
      top: Math.max(rect.top + 12, Math.min(rect.bottom - 12, top)),
      left: Math.max(rect.left + 14, Math.min(rect.right - 14, left)),
      width: 1,
      height: Math.max(40, Math.min(rect.height - 24, height)),
      orientation: "vertical",
      mode: zoneOptions.mode || "insert",
      targetComponentId: zoneOptions.targetComponentId,
      side: zoneOptions.side,
      rootComponentId: componentId,
      index: index,
      label: label
    });
  }

  function collectInsertionZones(containerElement, zones, depth) {
    if (!isInsertionContainer(containerElement) || depth > 3) return;

    var rect = containerElement.getBoundingClientRect();
    if (!isRectVisible(rect)) return;

    var type = containerElement.getAttribute("data-webbrain-type") || "";
    var children = getDirectEditableChildren(containerElement);
    var label = insertionLabel + " в " + containerLabel(containerElement);
    var horizontalZones = containerUsesHorizontalZones(containerElement);

    if (!children.length) {
      pushInsertionZone(zones, containerElement, 0, rect.top + Math.min(80, Math.max(34, rect.height / 2)), label);
    } else if (horizontalZones) {
      children.forEach(function (element, index) {
        var childRect = element.getBoundingClientRect();
        var previousElement = children[index - 1];
        var previousRect = previousElement ? previousElement.getBoundingClientRect() : null;
        var nextElement = children[index + 1];
        var nextRect = nextElement ? nextElement.getBoundingClientRect() : null;
        var childMiddleY = childRect.top + childRect.height / 2;
        var previousSameRow = previousRect && Math.abs(previousRect.top + previousRect.height / 2 - childMiddleY) < Math.max(28, childRect.height * 0.45);
        var nextSameRow = nextRect && Math.abs(nextRect.top + nextRect.height / 2 - childMiddleY) < Math.max(28, childRect.height * 0.45);
        var top = Math.max(rect.top + 16, childRect.top + 8);
        var height = Math.max(42, childRect.height - 16);

        if (!previousSameRow) {
          pushVerticalInsertionZone(zones, containerElement, index, childRect.left - 12, top, height, label);
        }

        if (nextSameRow) {
          pushVerticalInsertionZone(zones, containerElement, index + 1, childRect.right + (nextRect.left - childRect.right) / 2, top, height, label);
        } else {
          pushVerticalInsertionZone(zones, containerElement, index + 1, childRect.right + 12, top, height, label);
        }
      });
    } else {
      var sideCandidate = null;

      children.forEach(function (element, index) {
        var childRect = element.getBoundingClientRect();
        var componentId = element.getAttribute("data-webbrain-id") || "";

        var childInnerTop = childRect.top + Math.min(24, childRect.height * 0.24);
        var childInnerBottom = childRect.bottom - Math.min(24, childRect.height * 0.24);

        if (
          !sideCandidate &&
          componentId &&
          Number.isFinite(lastPointerX) &&
          Number.isFinite(lastPointerY) &&
          lastPointerY >= childInnerTop &&
          lastPointerY <= childInnerBottom &&
          lastPointerX >= childRect.left &&
          lastPointerX <= childRect.right
        ) {
          var sideThreshold = Math.min(72, Math.max(28, childRect.width * 0.08));
          if (lastPointerX <= childRect.left + sideThreshold) {
            sideCandidate = {
              element: element,
              index: index,
              side: "left",
              rect: childRect
            };
          } else if (lastPointerX >= childRect.right - sideThreshold) {
            sideCandidate = {
              element: element,
              index: index,
              side: "right",
              rect: childRect
            };
          }
        }

        if (index === 0) {
          pushInsertionZone(zones, containerElement, 0, childRect.top - (type === "page" ? 10 : 12), label);
        }

        var nextElement = children[index + 1];
        var nextTop = nextElement ? nextElement.getBoundingClientRect().top : childRect.bottom + (type === "page" ? 34 : 28);
        var zoneTop = nextElement ? childRect.bottom + (nextTop - childRect.bottom) / 2 : childRect.bottom + (type === "page" ? 18 : 18);

        pushInsertionZone(zones, containerElement, index + 1, zoneTop, label);
      });

      if (sideCandidate) {
        var sideRect = sideCandidate.rect;
        var sideLeft = sideCandidate.side === "left" ? sideRect.left - 10 : sideRect.right + 10;
        var sideIndex = sideCandidate.side === "left" ? sideCandidate.index : sideCandidate.index + 1;
        pushVerticalInsertionZone(
          zones,
          containerElement,
          sideIndex,
          sideLeft,
          sideRect.top + 8,
          Math.max(42, sideRect.height - 16),
          insertionLabel + " рядом",
          {
            mode: "side",
            targetComponentId: sideCandidate.element.getAttribute("data-webbrain-id") || "",
            side: sideCandidate.side
          }
        );
      }
    }

  }

  function insertionZoneKey(zone) {
    return [
      zone.rootComponentId || "",
      zone.index || 0,
      zone.orientation || "horizontal",
      zone.mode || "insert",
      zone.targetComponentId || "",
      zone.side || ""
    ].join(":");
  }

  function pickNearestInsertionZone(zones) {
    if (!zones.length || !Number.isFinite(lastPointerY) || !Number.isFinite(lastPointerX)) {
      activeInsertionZoneKey = "";
      return zones;
    }

    function overflowDistance(value, start, end) {
      if (value < start) return start - value;
      if (value > end) return value - end;

      return 0;
    }

    function zoneDistance(zone) {
      if (zone.orientation === "vertical") {
        var zoneHeight = zone.height || 48;
        return Math.abs(zone.left - lastPointerX) * 1.3 + overflowDistance(lastPointerY, zone.top, zone.top + zoneHeight) * 0.65;
      }

      return Math.abs(zone.top - lastPointerY) * 1.3 + overflowDistance(lastPointerX, zone.left, zone.left + zone.width) * 0.35;
    }

    var nearestZone = zones[0];
    var nearestDistance = zoneDistance(nearestZone);
    zones.forEach(function (zone) {
      var distance = zoneDistance(zone);
      if (distance < nearestDistance) {
        nearestZone = zone;
        nearestDistance = distance;
      }
    });

    var activeZone = activeInsertionZoneKey
      ? zones.find(function (zone) {
          return insertionZoneKey(zone) === activeInsertionZoneKey;
        })
      : null;

    if (activeZone) {
      var activeDistance = zoneDistance(activeZone);
      if (activeDistance <= nearestDistance + 42) {
        return [activeZone];
      }
    }

    activeInsertionZoneKey = insertionZoneKey(nearestZone);
    return [nearestZone];
  }

  function getCurrentInsertionZones() {
    if (!insertionEnabled) return [];

    var rootElement = getRootElement();
    if (!rootElement) return [];

    var zones = [];
    var containerElement = insertionAllowNested && insertionContainerElement ? insertionContainerElement : rootElement;
    collectInsertionZones(containerElement, zones, 0);

    return pickNearestInsertionZone(zones);
  }

  function getCurrentInsertionZone() {
    var zones = getCurrentInsertionZones();
    return zones[0] || null;
  }

  function postInsertionZones() {
    if (!insertionEnabled) return;

    window.parent.postMessage(
      {
        type: "webbrain:insertion-zones",
        zones: getCurrentInsertionZones()
      },
      "*"
    );
  }

  function cancelInsertionContainerSwitch() {
    insertionPendingContainerElement = null;
    if (insertionSwitchTimer) {
      window.clearTimeout(insertionSwitchTimer);
      insertionSwitchTimer = 0;
    }
  }

  function requestInsertionContainerSwitch(element) {
    if (!element || element === insertionContainerElement) {
      cancelInsertionContainerSwitch();
      return;
    }

    if (insertionPendingContainerElement === element) return;

    insertionPendingContainerElement = element;
    if (insertionSwitchTimer) window.clearTimeout(insertionSwitchTimer);

    insertionSwitchTimer = window.setTimeout(function () {
      if (insertionPendingContainerElement && insertionPendingContainerElement !== insertionContainerElement) {
        insertionContainerElement = insertionPendingContainerElement;
        insertionPendingContainerElement = null;
        insertionSwitchTimer = 0;
        postInsertionZones();
      }
    }, 260);
  }

  function isPointNearElement(element, x, y) {
    if (!element || !Number.isFinite(x) || !Number.isFinite(y)) return false;

    var rect = element.getBoundingClientRect();
    var horizontalPadding = Math.min(90, Math.max(36, rect.width * 0.06));
    var verticalPadding = 84;

    return (
      x >= rect.left - horizontalPadding &&
      x <= rect.right + horizontalPadding &&
      y >= rect.top - verticalPadding &&
      y <= rect.bottom + verticalPadding
    );
  }

  function clearInsertionZones() {
    activeInsertionZoneKey = "";
    window.parent.postMessage({ type: "webbrain:insertion-zones-cleared" }, "*");
  }

  function scheduleInsertionZonesUpdate() {
    if (!insertionEnabled || insertionFrame) return;

    insertionFrame = window.requestAnimationFrame(function () {
      insertionFrame = 0;
      postInsertionZones();
    });
  }

  function findEditableElement(componentId) {
    var matchedElement = null;
    document.querySelectorAll("[data-webbrain-id]").forEach(function (element) {
      if (!matchedElement && element.getAttribute("data-webbrain-id") === componentId) matchedElement = element;
    });

    return matchedElement;
  }

  function getEditorAnchor(target) {
    if (!isElement(target)) return null;

    return target.closest("a");
  }

  function neutralizeEditorLink(target) {
    var anchor = getEditorAnchor(target);
    if (!anchor) return;

    var href = anchor.getAttribute("href") || anchor.getAttribute("data-webbrain-editor-href") || "#";
    anchor.setAttribute("data-webbrain-editor-href", href);
    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
    anchor.setAttribute("draggable", "false");
  }

  function getHashTargetId(href) {
    var value = String(href || "").trim();
    if (!value || value.charAt(0) !== "#" || value === "#") return "";

    try {
      return decodeURIComponent(value.slice(1));
    } catch (error) {
      return value.slice(1);
    }
  }

  function handleEditorLinkActivation(event) {
    var anchor = getEditorAnchor(event.target);
    if (!anchor) return;

    var href = anchor.getAttribute("href") || anchor.getAttribute("data-webbrain-editor-href") || "#";
    var hashTargetId = getHashTargetId(href);

    event.preventDefault();
    event.stopPropagation();

    if (!hashTargetId) return;

    var safeHashTargetId = window.CSS && typeof window.CSS.escape === "function" ? window.CSS.escape(hashTargetId) : hashTargetId.replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
    var targetElement =
      document.getElementById(hashTargetId) ||
      document.querySelector('[data-webbrain-id="' + safeHashTargetId + '"]') ||
      document.querySelector('[data-wb-id="' + safeHashTargetId + '"]') ||
      document.querySelector('[id="' + safeHashTargetId + '"]');
    if (targetElement && typeof targetElement.scrollIntoView === "function") {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setAnchorHref(element, href) {
    if (!element || element.tagName.toLowerCase() !== "a") return;

    var nextHref = String(href || "#");
    if (selectionEnabled) {
      element.setAttribute("href", nextHref);
      neutralizeEditorLink(element);
    } else {
      element.setAttribute("href", nextHref);
      element.removeAttribute("data-webbrain-editor-href");
      element.removeAttribute("aria-disabled");
      element.setAttribute("draggable", "false");
    }
  }

  function setEditorInteractivityPaused(paused) {
    document.querySelectorAll("a, button, img").forEach(function (element) {
      element.setAttribute("draggable", "false");
    });

    document.querySelectorAll("a").forEach(function (element) {
      if (paused) {
        neutralizeEditorLink(element);
      } else {
        var storedHref = element.getAttribute("data-webbrain-editor-href");
        if (storedHref) element.setAttribute("href", storedHref);
        element.removeAttribute("data-webbrain-editor-href");
        element.removeAttribute("aria-disabled");
        element.setAttribute("draggable", "false");
      }
    });

    if (paused && !interactivityObserver) {
      interactivityObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "attributes" && mutation.attributeName === "href") {
            neutralizeEditorLink(mutation.target);
          }

          mutation.addedNodes.forEach(function (node) {
            if (!isElement(node)) return;
            if (node.tagName.toLowerCase() === "a") neutralizeEditorLink(node);
            node.querySelectorAll && node.querySelectorAll("a").forEach(neutralizeEditorLink);
            node.querySelectorAll && node.querySelectorAll("a, button, img").forEach(function (element) {
              element.setAttribute("draggable", "false");
            });
          });
        });
      });
      interactivityObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    }

    if (!paused && interactivityObserver) {
      interactivityObserver.disconnect();
      interactivityObserver = null;
    }
  }

  function restoreDraggedElement() {
    if (!dragState || !dragState.element) return;

    dragState.element.style.opacity = dragState.originalOpacity || "";
    dragState.element.style.pointerEvents = dragState.originalPointerEvents || "";
    document.documentElement.style.userSelect = dragState.originalDocumentUserSelect || "";
    if (document.body) document.body.style.userSelect = dragState.originalBodyUserSelect || "";
    if (!selectionEnabled) {
      document.documentElement.classList.remove("webbrain-editor-no-select");
      if (document.body) document.body.classList.remove("webbrain-editor-no-select");
    }
    var selection = window.getSelection && window.getSelection();
    if (selection) selection.removeAllRanges();
  }

  function finishDrag(event, shouldCommit) {
    if (!dragState) return;

    var state = dragState;
    var wasDragging = Boolean(state.dragging);
    var draggedElement = state.element;

    restoreDraggedElement();
    dragState = null;

    if (!wasDragging) return;

    var zone = shouldCommit ? getCurrentInsertionZone() : null;

    insertionEnabled = false;
    insertionLabel = "Блок";
    insertionAllowNested = false;
    insertionLockedContainerId = "";
    insertionContainerElement = null;
    cancelInsertionContainerSwitch();
    clearInsertionZones();
    window.parent.postMessage({ type: "webbrain:component-drag-ended" }, "*");

    if (!shouldCommit || !draggedElement) {
      suppressNextClick = true;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    var parentElement = zone ? findEditableElement(String(zone.rootComponentId || "")) : null;

    if (
      zone &&
      zone.mode === "side" &&
      zone.targetComponentId &&
      zone.side &&
      parentElement &&
      parentElement !== draggedElement &&
      !draggedElement.contains(parentElement)
    ) {
      var targetElement = findEditableElement(String(zone.targetComponentId || ""));
      var rowId = "wb-row-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);

      if (targetElement && targetElement !== draggedElement && !draggedElement.contains(targetElement)) {
        var rowElement = document.createElement("div");
        rowElement.setAttribute("data-webbrain-id", rowId);
        rowElement.setAttribute("data-webbrain-type", "row");
        rowElement.className = "wb-row";
        rowElement.style.width = "100%";
        rowElement.style.gap = "28px";
        rowElement.style.alignItems = "stretch";
        rowElement.style.justifyContent = "flex-start";

        parentElement.insertBefore(rowElement, targetElement);
        if (zone.side === "left") {
          rowElement.appendChild(draggedElement);
          rowElement.appendChild(targetElement);
        } else {
          rowElement.appendChild(targetElement);
          rowElement.appendChild(draggedElement);
        }

        selectedElement = draggedElement;
        hoveredElement = null;
        clearHover();
        postSelection(selectedElement);
        window.parent.postMessage(
          {
            type: "webbrain:component-moved",
            mode: "side",
            componentId: state.componentId,
            parentId: zone.rootComponentId,
            index: zone.index,
            targetId: zone.targetComponentId,
            side: zone.side,
            rowId: rowId
          },
          "*"
        );
      }
    } else if (zone && parentElement && parentElement !== draggedElement && !draggedElement.contains(parentElement)) {
      var directChildrenBefore = getDirectEditableChildren(parentElement);
      var oldIndex = directChildrenBefore.indexOf(draggedElement);
      var targetIndex = Number.isFinite(zone.index) ? Math.max(0, Math.round(zone.index)) : directChildrenBefore.length;

      if (oldIndex >= 0 && targetIndex > oldIndex) targetIndex -= 1;

      var directChildren = getDirectEditableChildren(parentElement).filter(function (element) {
        return element !== draggedElement;
      });
      targetIndex = Math.max(0, Math.min(targetIndex, directChildren.length));
      parentElement.insertBefore(draggedElement, directChildren[targetIndex] || null);

      selectedElement = draggedElement;
      hoveredElement = null;
      clearHover();
      postSelection(selectedElement);
      window.parent.postMessage(
        {
          type: "webbrain:component-moved",
          mode: "insert",
          componentId: state.componentId,
          parentId: zone.rootComponentId,
          index: zone.index
        },
        "*"
      );
    }

    suppressNextClick = true;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type === "webbrain:scroll-preview") {
      window.scrollBy({
        left: Number(data.deltaX) || 0,
        top: Number(data.deltaY) || 0,
        behavior: "auto"
      });
      return;
    }

    if (data.type === "webbrain:select-component") {
      var nextSelectedElement = findEditableElement(String(data.componentId || ""));
      if (!nextSelectedElement) return;

      selectedElement = nextSelectedElement;
      postSelection(selectedElement);
      return;
    }

    if (data.type === "webbrain:insertion-mode") {
      insertionEnabled = Boolean(data.enabled);
      insertionLabel = String(data.label || "Блок");
      insertionAllowNested = Boolean(data.allowNested);
      insertionLockedContainerId = String(data.selectedContainerId || "");
      cancelInsertionContainerSwitch();
      var selectedContainerElement = findEditableElement(String(data.selectedContainerId || ""));
      insertionContainerElement = isInsertionContainer(selectedContainerElement) ? selectedContainerElement : getRootElement();

      if (insertionEnabled) {
        postInsertionZones();
      } else {
        insertionLockedContainerId = "";
        clearInsertionZones();
      }
      return;
    }

    if (data.type === "webbrain:insert-component") {
      var parentElement = findEditableElement(String(data.parentId || ""));
      var html = String(data.html || "");
      if (!parentElement || !html) return;

      var template = document.createElement("template");
      template.innerHTML = html.trim();
      var insertedElement = template.content.firstElementChild;
      if (!insertedElement) return;

      var childIndex = Number.isFinite(data.index) ? Math.max(0, Math.round(data.index)) : getDirectEditableChildren(parentElement).length;
      var directChildren = getDirectEditableChildren(parentElement);
      parentElement.insertBefore(insertedElement, directChildren[childIndex] || null);

      selectedElement = insertedElement;
      hoveredElement = null;
      if (selectionEnabled) setEditorInteractivityPaused(true);
      clearHover();
      postSelection(selectedElement);
      scheduleInsertionZonesUpdate();
      return;
    }

    if (data.type === "webbrain:delete-component") {
      var deletedElement = findEditableElement(String(data.componentId || ""));
      if (!deletedElement) return;

      if (selectedElement === deletedElement || deletedElement.contains(selectedElement)) selectedElement = null;
      if (hoveredElement === deletedElement || deletedElement.contains(hoveredElement)) hoveredElement = null;

      deletedElement.remove();
      clearHover();
      clearSelection();
      scheduleInsertionZonesUpdate();
      return;
    }

    if (data.type === "webbrain:patch-component") {
      var componentId = String(data.componentId || "");
      var patchedElement = findEditableElement(componentId);
      if (!patchedElement) return;

      if (typeof data.html === "string" && data.html.trim()) {
        var replaceTemplate = document.createElement("template");
        replaceTemplate.innerHTML = data.html.trim();
        var replacementElement = replaceTemplate.content.firstElementChild;
        if (!replacementElement) return;

        var wasSelected = selectedElement === patchedElement;
        var wasHovered = hoveredElement === patchedElement;
        patchedElement.replaceWith(replacementElement);

        if (wasSelected) {
          selectedElement = replacementElement;
          postSelection(replacementElement);
        }
        if (wasHovered) {
          hoveredElement = replacementElement;
          postHover(replacementElement);
        }
        scheduleInsertionZonesUpdate();
        return;
      }

      var styles = data.styles || {};
      Object.keys(styles).forEach(function (property) {
        if (property.indexOf("--") === 0) {
          patchedElement.style.setProperty(property, styles[property] || "");
        } else {
          patchedElement.style[property] = styles[property] || "";
        }
      });

      if (patchedElement.getAttribute("data-webbrain-type") === "page" && Object.prototype.hasOwnProperty.call(styles, "background")) {
        if (styles.background) {
          document.documentElement.style.setProperty("--wb-bg", styles.background);
          document.documentElement.style.background = styles.background;
          document.body.style.background = styles.background;
        } else {
          document.documentElement.style.removeProperty("--wb-bg");
          document.documentElement.style.background = "";
          document.body.style.background = "";
        }
      }

      var effectStyles = data.effectStyles || {};
      Object.keys(effectStyles).forEach(function (property) {
        if (property.indexOf("--") === 0) {
          if (effectStyles[property]) patchedElement.style.setProperty(property, effectStyles[property]);
          else patchedElement.style.removeProperty(property);
        } else {
          patchedElement.style[property] = effectStyles[property] || "";
        }
      });

      if (data.effects) {
        var effects = data.effects || {};
        patchedElement.classList.toggle("wb-has-hover-effect", Boolean(effects.hover && effects.hover.enabled));
        patchedElement.classList.toggle("wb-has-text-effect", Boolean(effects.textEffect && effects.textEffect.enabled));
        patchedElement.classList.toggle("wb-has-appear-effect", Boolean(effects.appear && effects.appear.enabled));
        patchedElement.classList.toggle("wb-has-press-effect", Boolean(effects.press && effects.press.enabled));
        patchedElement.classList.toggle("wb-has-loop-effect", Boolean(effects.loop && effects.loop.enabled));
        patchedElement.classList.toggle("wb-has-drag-effect", Boolean(effects.drag && effects.drag.enabled));
        patchedElement.classList.toggle("wb-has-scroll-transform-effect", Boolean(effects.scrollTransform && effects.scrollTransform.enabled));
        patchedElement.classList.toggle("wb-has-scroll-speed-effect", Boolean(effects.scrollSpeed && effects.scrollSpeed.enabled));
        patchedElement.classList.toggle("wb-has-flow-effect", Boolean(effects.flow && effects.flow.enabled));
        patchedElement.classList.toggle("wb-has-ticker-effect", Boolean(effects.ticker && effects.ticker.enabled));
        patchedElement.classList.toggle("wb-has-overlay", patchedElement.getAttribute("data-webbrain-type") !== "page" && Boolean(effects.overlay && effects.overlay.enabled));
        if ((effects.appear && effects.appear.enabled) || (effects.textEffect && effects.textEffect.enabled)) {
          patchedElement.classList.add("wb-in-view");
        }
        if (effects.overlay && effects.overlay.enabled) {
          patchedElement.setAttribute("data-webbrain-overlay", String(effects.overlay.text || patchedElement.textContent || "Подсказка").trim() || "Подсказка");
          patchedElement.setAttribute("data-webbrain-overlay-position", effects.overlay.position || "bottom");
          patchedElement.setAttribute("data-webbrain-overlay-align", effects.overlay.align || "center");
        } else {
          patchedElement.removeAttribute("data-webbrain-overlay");
          patchedElement.removeAttribute("data-webbrain-overlay-position");
          patchedElement.removeAttribute("data-webbrain-overlay-align");
        }
        patchedElement.classList.toggle("wb-effect-hidden", effects.visible === false);
      }

      var props = data.props || {};
      var componentType = patchedElement.getAttribute("data-webbrain-type") || "";
      if (typeof props.text !== "undefined") patchedElement.textContent = String(props.text || "");
      if (typeof props.label !== "undefined") patchedElement.textContent = String(props.label || "");
      if (typeof props.brand !== "undefined") {
        var brandElement = patchedElement.querySelector(".wb-brand");
        if (brandElement) brandElement.textContent = String(props.brand || "");
      }
      if (typeof props.anchorId !== "undefined") {
        var nextAnchorId = String(props.anchorId || "").trim();
        if (nextAnchorId) patchedElement.setAttribute("id", nextAnchorId);
        else patchedElement.setAttribute("id", componentId);
      }
      if (typeof props.href !== "undefined" && patchedElement.tagName.toLowerCase() === "a") {
        setAnchorHref(patchedElement, props.href);
      }
      if (componentType === "button" && typeof props.href !== "undefined") {
        setAnchorHref(patchedElement, props.href);
      }
      if (componentType === "image") {
        if (typeof props.src !== "undefined") patchedElement.setAttribute("src", String(props.src || ""));
        if (typeof props.alt !== "undefined") patchedElement.setAttribute("alt", String(props.alt || ""));
      }
      if ((componentType === "grid" || componentType === "cardGrid") && typeof props.columns !== "undefined") {
        patchedElement.style.setProperty("--wb-columns", String(props.columns || 3));
      }

      if (selectedElement === patchedElement) postSelection(selectedElement);
      if (hoveredElement === patchedElement) postHover(hoveredElement);
      return;
    }

    if (data.type !== "webbrain:selection-mode") return;

    selectionEnabled = Boolean(data.enabled);
    selectedElement = null;
    hoveredElement = null;
    document.documentElement.classList.toggle("webbrain-editor-no-select", selectionEnabled);
    if (document.body) document.body.classList.toggle("webbrain-editor-no-select", selectionEnabled);
    setEditorInteractivityPaused(selectionEnabled);
    clearHover();
    clearSelection();
  });

  document.addEventListener(
    "pointerover",
    function (event) {
      if (!selectionEnabled) return;

      neutralizeEditorLink(event.target);
    },
    true
  );

  document.addEventListener(
    "mouseover",
    function (event) {
      if (!selectionEnabled) return;

      neutralizeEditorLink(event.target);
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    function (event) {
      if (!selectionEnabled || insertionEnabled || event.button !== 0) return;

      setEditorInteractivityPaused(true);
      neutralizeEditorLink(event.target);

      var element = pickElement(event.target);
      if (!element || !isSelectable(element)) return;

      var componentType = element.getAttribute("data-webbrain-type") || "";
      if (componentType === "page") return;

      dragState = {
        element: element,
        componentId: element.getAttribute("data-webbrain-id") || "",
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        originalOpacity: element.style.opacity || "",
        originalPointerEvents: element.style.pointerEvents || "",
        originalDocumentUserSelect: document.documentElement.style.userSelect || "",
        originalBodyUserSelect: document.body ? document.body.style.userSelect || "" : ""
      };

      document.documentElement.style.userSelect = "none";
      if (document.body) document.body.style.userSelect = "none";
      document.documentElement.classList.add("webbrain-editor-no-select");
      if (document.body) document.body.classList.add("webbrain-editor-no-select");
      var selection = window.getSelection && window.getSelection();
      if (selection) selection.removeAllRanges();
      event.preventDefault();
      try {
        element.setPointerCapture(event.pointerId);
      } catch (error) {}
    },
    true
  );

  document.addEventListener(
    "selectstart",
    function (event) {
      if (!selectionEnabled && !dragState) return;

      event.preventDefault();
      event.stopPropagation();
      var selection = window.getSelection && window.getSelection();
      if (selection) selection.removeAllRanges();
    },
    true
  );

  document.addEventListener(
    "dragstart",
    function (event) {
      if (!selectionEnabled && !dragState) return;

      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    "auxclick",
    function (event) {
      if (!selectionEnabled) return;

      neutralizeEditorLink(event.target);
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    "contextmenu",
    function (event) {
      if (!selectionEnabled) return;

      var element = pickElement(event.target);
      if (!element || !isSelectable(element)) return;

      var componentType = element.getAttribute("data-webbrain-type") || "";
      if (componentType === "page") return;

      neutralizeEditorLink(event.target);
      selectedElement = element;
      hoveredElement = null;
      clearHover();
      postSelection(selectedElement);

      var selection = selectionPayload(element);
      if (selection) {
        window.parent.postMessage(
          {
            type: "webbrain:component-context-menu",
            selection: selection,
            x: event.clientX,
            y: event.clientY
          },
          "*"
        );
      }

      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    "pointermove",
    function (event) {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;

      if (dragState) {
        var dragDistanceX = event.clientX - dragState.startX;
        var dragDistanceY = event.clientY - dragState.startY;
        var dragDistance = Math.sqrt(dragDistanceX * dragDistanceX + dragDistanceY * dragDistanceY);

        if (!dragState.dragging && dragDistance > 6) {
          dragState.dragging = true;
          selectedElement = dragState.element;
          hoveredElement = null;
          insertionEnabled = true;
          insertionLabel = "Переместить";
          insertionAllowNested = true;
          insertionLockedContainerId = "";
          insertionContainerElement = closestDragInsertionContainer(event.target, dragState.element);
          dragState.element.style.opacity = "0.42";
          dragState.element.style.pointerEvents = "none";
          clearHover();
          postSelection(selectedElement);
          postInsertionZones();
          window.parent.postMessage({ type: "webbrain:component-drag-started" }, "*");
        }

        if (dragState.dragging) {
          var activeSelection = window.getSelection && window.getSelection();
          if (activeSelection) activeSelection.removeAllRanges();
          var dragInsertionContainer = closestDragInsertionContainer(document.elementFromPoint(event.clientX, event.clientY), dragState.element);
          var currentDragContainer = insertionContainerElement;
          var dragRootElement = getRootElement();

          if (
            currentDragContainer &&
            currentDragContainer !== dragRootElement &&
            dragInsertionContainer === dragRootElement &&
            isPointNearElement(currentDragContainer, lastPointerX, lastPointerY)
          ) {
            cancelInsertionContainerSwitch();
          } else {
            requestInsertionContainerSwitch(dragInsertionContainer);
          }

          scheduleInsertionZonesUpdate();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (insertionEnabled && insertionAllowNested) {
        if (insertionLockedContainerId) {
          var lockedElement = findEditableElement(insertionLockedContainerId);
          if (isInsertionContainer(lockedElement) && lockedElement !== insertionContainerElement) {
            insertionContainerElement = lockedElement;
            cancelInsertionContainerSwitch();
          }
        } else {
          var nextInsertionContainer = closestInsertionContainer(event.target);
          var currentInsertionContainer = insertionContainerElement;
          var rootElement = getRootElement();

          if (
            currentInsertionContainer &&
            currentInsertionContainer !== rootElement &&
            nextInsertionContainer === rootElement &&
            isPointNearElement(currentInsertionContainer, lastPointerX, lastPointerY)
          ) {
            cancelInsertionContainerSwitch();
          } else {
            requestInsertionContainerSwitch(nextInsertionContainer);
          }
        }

        scheduleInsertionZonesUpdate();
      }

      if (!selectionEnabled) return;

      var element = pickElement(event.target);
      if (element === hoveredElement) return;

      hoveredElement = element;
      if (hoveredElement) {
        postHover(hoveredElement);
      } else {
        clearHover();
      }
    },
    true
  );

  document.addEventListener(
    "pointerleave",
    function () {
      if (dragState && dragState.dragging) return;

      if (insertionEnabled && insertionAllowNested) {
        if (!insertionLockedContainerId) {
          cancelInsertionContainerSwitch();
          insertionContainerElement = getRootElement();
        }
        postInsertionZones();
      }

      if (!selectionEnabled || !hoveredElement) return;

      hoveredElement = null;
      clearHover();
    },
    true
  );

  document.addEventListener(
    "pointerup",
    function (event) {
      if (!dragState) return;

      finishDrag(event, true);
    },
    true
  );

  document.addEventListener(
    "pointercancel",
    function (event) {
      if (!dragState) return;

      finishDrag(event, false);
    },
    true
  );

  document.addEventListener(
    "click",
    handleEditorLinkActivation,
    true
  );

  document.addEventListener(
    "auxclick",
    handleEditorLinkActivation,
    true
  );

  document.addEventListener(
    "click",
    function (event) {
      if (suppressNextClick) {
        suppressNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!selectionEnabled) return;

      var element = pickElement(event.target);
      if (!element) return;

      selectedElement = element;
      postSelection(selectedElement);
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );

  window.addEventListener("scroll", scheduleBoundsUpdate, true);
  window.addEventListener("scroll", scheduleInsertionZonesUpdate, true);
  window.addEventListener("resize", scheduleBoundsUpdate);
  window.addEventListener("resize", scheduleInsertionZonesUpdate);
})();`;
  const editorScript = `<script>${editorBridgeScript.replace(/<\/script/gi, "<\\/script")}</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${editorScript}</body>`) : `${html}${editorScript}`;
}

function buildEditorOutlineItems(input: {
  document: WebBrainDocument | null;
  page: StoredSitePage | null;
  codegenElementMap: WebBrainCodegenElementMap | null;
}) {
  if (input.codegenElementMap) return buildCodegenOutlineItems(input.codegenElementMap);
  if (input.document && input.page) return buildDocumentOutlineItems(input.document, input.page);

  return [];
}

function buildCodegenOutlineItems(elementMap: WebBrainCodegenElementMap): EditorOutlineItem[] {
  const items: EditorOutlineItem[] = [];
  const sectionTags = new Set(["main", "header", "section", "footer", "form"]);
  const blockTags = new Set(["nav", "article", "aside", "div", "ul", "li", "h1", "h2", "h3", "p", "img"]);
  const actionTags = new Set(["a", "button"]);
  const seen = new Set<string>();

  const visit = (id: string, depth: number) => {
    if (seen.has(id) || items.length >= 120) return;
    seen.add(id);
    const element = elementMap.elements[id];
    if (!element) return;

    const isSection = sectionTags.has(element.tag);
    const isAction = actionTags.has(element.tag);
    const isBlock = blockTags.has(element.tag);
    const include = isSection || isAction || (isBlock && depth <= 2) || depth === 0;

    if (include) {
      items.push({
        id: element.id,
        label: formatCodegenElementTitle(element),
        meta: `${formatCodegenTagLabel(element.tag)} · ${element.id}`,
        depth: Math.min(depth, 3),
        kind: isAction ? "action" : isSection ? "section" : "block"
      });
    }

    for (const childId of element.children) visit(childId, depth + 1);
  };

  for (const rootId of elementMap.roots) visit(rootId, 0);

  return items;
}

function shortCodegenText(value: unknown, maxLength = 38) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatCodegenTagLabel(tag: string) {
  const lowerTag = tag.toLowerCase();
  const labels: Record<string, string> = {
    main: "Страница",
    header: "Хедер",
    nav: "Навигация",
    section: "Секция",
    footer: "Футер",
    form: "Форма",
    article: "Карточка",
    aside: "Боковой блок",
    div: "Блок",
    ul: "Список",
    li: "Пункт списка",
    a: "Ссылка",
    button: "Кнопка",
    img: "Изображение",
    h1: "Заголовок H1",
    h2: "Заголовок H2",
    h3: "Заголовок H3",
    p: "Текст",
    span: "Текст",
  };

  return labels[lowerTag] ?? tag;
}

function formatCodegenElementTitle(element: WebBrainCodegenElement) {
  const tagLabel = formatCodegenTagLabel(element.tag);
  const text = String(element.text || "").replace(/\s+/g, " ").trim();
  const shortText = shortCodegenText(text);
  const lowerTag = element.tag.toLowerCase();

  if ((lowerTag === "a" || lowerTag === "button") && shortText) return `${tagLabel}: ${shortText}`;
  if (/^h[1-3]$/.test(lowerTag) && shortText) return shortText;
  if (lowerTag === "p" && shortText) return `${tagLabel}: ${shortText}`;
  if (lowerTag === "img") return element.src ? `${tagLabel}: ${shortCodegenText(element.src, 30)}` : tagLabel;
  if (lowerTag === "section" && shortText) return `${tagLabel}: ${shortText}`;
  if (lowerTag === "form" && shortText) return `${tagLabel}: ${shortText}`;
  if (lowerTag === "header" || lowerTag === "nav" || lowerTag === "footer" || lowerTag === "main") return tagLabel;
  if (shortText) return `${tagLabel}: ${shortText}`;

  const readableId = element.id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();

  return readableId || tagLabel;
}

function buildDocumentOutlineItems(document: WebBrainDocument, page: StoredSitePage): EditorOutlineItem[] {
  const items: EditorOutlineItem[] = [];
  const sectionTypes = new Set<WebBrainComponentType>(["page", "header", "section", "footer", "form"]);
  const blockTypes = new Set<WebBrainComponentType>(["container", "row", "column", "grid", "stack", "card", "cardGrid", "image"]);
  const actionTypes = new Set<WebBrainComponentType>(["button", "navLink"]);
  const pageRecord = document.pages.find((documentPage) => documentPage.slug === page.slug) ?? document.pages[0];
  const rootComponent = pageRecord ? findWebBrainComponent(document, pageRecord.rootComponentId) : null;

  const visit = (componentItem: WebBrainComponent, depth: number) => {
    if (items.length >= 90) return;

    const isSection = sectionTypes.has(componentItem.type);
    const isAction = actionTypes.has(componentItem.type);
    const isBlock = blockTypes.has(componentItem.type);
    const include = isSection || isAction || (isBlock && depth <= 2) || depth === 0;

    if (include) {
      items.push({
        id: componentItem.id,
        label: componentDisplayName(componentItem),
        meta: `${componentDisplayName(componentItem)} · ${componentItem.id}`,
        depth: Math.min(depth, 3),
        kind: isAction ? "action" : isSection ? "section" : "block"
      });
    }

    for (const child of getComponentChildren(document, componentItem)) visit(child, depth + 1);
  };

  if (rootComponent) visit(rootComponent, 0);

  return items;
}

function EditorWorkspace({
  site,
  pages,
  clientId,
  isAdmin,
  activePageId,
  onSelectPage,
  onPagesChange,
  onCreateBlankSite,
  canCreateBlankSite,
  isCreatingBlankSite,
  isGeneratingSite,
  isAiWorking,
  aiCanvasStatus,
  onSelectionContextChange,
  onRunAiEdit
}: {
  site: StoredSite | null;
  pages: StoredSitePage[];
  clientId: string | null;
  isAdmin: boolean;
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onPagesChange: (updater: (pages: StoredSitePage[]) => StoredSitePage[]) => void;
  onCreateBlankSite: () => void;
  canCreateBlankSite: boolean;
  isCreatingBlankSite: boolean;
  isGeneratingSite: boolean;
  isAiWorking: boolean;
  aiCanvasStatus: string;
  onSelectionContextChange: (selection: EditorAiSelection | null) => void;
  onRunAiEdit: (prompt: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRevisionRef = useRef(0);
  const pendingSelectComponentIdRef = useRef<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [editorCanvasMode, setEditorCanvasMode] = useState<"visual" | "code">("visual");
  const [activeEditorPanel, setActiveEditorPanel] = useState<EditorPanelKey | null>(null);
  const [activeComponentCategory, setActiveComponentCategory] = useState<EditorComponentCategory>("ready");
  const [selectedComponentToolKey, setSelectedComponentToolKey] = useState<EditorComponentToolKey | null>(null);
  const [selectionToolActive, setSelectionToolActive] = useState(false);
  const [selectionState, setSelectionState] = useState<{ scope: string; selection: EditorSelection } | null>(null);
  const [hoverState, setHoverState] = useState<{ scope: string; selection: EditorSelection } | null>(null);
  const [insertionState, setInsertionState] = useState<{ scope: string; zones: EditorInsertionZone[] } | null>(null);
  const [componentDragActive, setComponentDragActive] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [pageDeleteTarget, setPageDeleteTarget] = useState<StoredSitePage | null>(null);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [previewReloadNonce, setPreviewReloadNonce] = useState(0);
  const [codegenSrcDoc, setCodegenSrcDoc] = useState<string | null>(null);
  const [codegenPreviewError, setCodegenPreviewError] = useState<string | null>(null);
  const [codegenPreviewLoading, setCodegenPreviewLoading] = useState(false);
  const [codegenStyleSaveState, setCodegenStyleSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [adminCodeSaveState, setAdminCodeSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [adminCodeSaveError, setAdminCodeSaveError] = useState<string | null>(null);
  const [selectedAdminCodePath, setSelectedAdminCodePath] = useState<string | null>(null);
  const [editorHistory, setEditorHistory] = useState<EditorDocumentHistoryState>({ pageId: null, past: [], future: [] });
  const [contextMenuState, setContextMenuState] = useState<{ scope: string; selection: EditorSelection; x: number; y: number } | null>(null);
  const componentTools: {
    key: EditorComponentToolKey;
    category: EditorComponentCategory;
    label: string;
    description: string;
    icon: ReactNode;
  }[] = [
    { key: "hero", category: "ready", label: "Первый экран", description: "Оффер, текст и две CTA-кнопки", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "heroMedia", category: "ready", label: "Hero с фоном", description: "Первый экран с фоновой картинкой и оверлеем", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "services", category: "ready", label: "Услуги", description: "Секция с тремя карточками услуг", icon: <Square className="h-3.5 w-3.5" /> },
    { key: "benefits", category: "ready", label: "Преимущества", description: "Карточки ценности для клиента", icon: <Box className="h-3.5 w-3.5" /> },
    { key: "process", category: "ready", label: "Процесс", description: "Шаги работы от идеи до заявки", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "contact", category: "ready", label: "Контакты", description: "Финальный CTA и заявка", icon: <Send className="h-3.5 w-3.5" /> },
    { key: "ctaBand", category: "ready", label: "CTA баннер", description: "Крупный conversion-блок с дорогой кнопкой", icon: <Send className="h-3.5 w-3.5" /> },
    { key: "footer", category: "ready", label: "Футер простой", description: "Низ страницы с брендом и ссылками", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "footerColumns", category: "ready", label: "Футер 3 колонки", description: "Бренд, навигация и контакты", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "footerCta", category: "ready", label: "Футер с CTA", description: "Финальный призыв и нижняя строка", icon: <Send className="h-3.5 w-3.5" /> },
    { key: "booking", category: "business", label: "Запись онлайн", description: "Блок для салона, клиники или услуг", icon: <Wand2 className="h-3.5 w-3.5" /> },
    { key: "menu", category: "business", label: "Меню / товары", description: "Карточки блюд, услуг или товаров", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "form", category: "business", label: "Форма заявки", description: "Короткий блок сбора контакта", icon: <FileText className="h-3.5 w-3.5" /> },
    { key: "heading", category: "elements", label: "Заголовок", description: "H1-H4 текстовый акцент", icon: <Type className="h-3.5 w-3.5" /> },
    { key: "text", category: "elements", label: "Текст", description: "Абзац или короткая подпись", icon: <AlignLeft className="h-3.5 w-3.5" /> },
    { key: "link", category: "elements", label: "Ссылка", description: "Текстовая ссылка для меню или футера", icon: <ExternalLink className="h-3.5 w-3.5" /> },
    { key: "button", category: "elements", label: "Кнопка", description: "CTA со ссылкой или якорем", icon: <MousePointer2 className="h-3.5 w-3.5" /> },
    { key: "image", category: "elements", label: "Изображение", description: "Визуальный блок с src и alt", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: "section", category: "layout", label: "Секция", description: "Большой блок страницы", icon: <Square className="h-3.5 w-3.5" /> },
    { key: "container", category: "layout", label: "Контейнер", description: "Ограничение ширины и внутренняя сетка", icon: <Box className="h-3.5 w-3.5" /> },
    { key: "row", category: "layout", label: "Ряд", description: "Элементы рядом с выравниванием", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "column", category: "layout", label: "Колонка", description: "Вертикальная область внутри ряда", icon: <Square className="h-3.5 w-3.5" /> },
    { key: "grid", category: "layout", label: "Сетка", description: "Колонки для карточек и ссылок", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "stack", category: "layout", label: "Группа", description: "Простая вертикальная или горизонтальная группа", icon: <Box className="h-3.5 w-3.5" /> },
    { key: "columns", category: "layout", label: "Колонки", description: "Две карточки рядом", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> }
  ];
  const componentCategories: {
    key: EditorComponentCategory;
    label: string;
  }[] = [
    { key: "ready", label: "Блоки" },
    { key: "business", label: "Бизнес" },
    { key: "elements", label: "Элементы" },
    { key: "layout", label: "Сетка" }
  ];
  const visibleComponentTools = componentTools.filter((tool) => tool.category === activeComponentCategory);
  const selectedComponentTool = componentTools.find((tool) => tool.key === selectedComponentToolKey) ?? null;
  const viewportSettings = {
    desktop: { width: "1120px", height: "760px", label: "1200 px" },
    tablet: { width: "768px", height: "900px", label: "768 px" },
    mobile: { width: "390px", height: "844px", label: "390 px" }
  }[viewport];
  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0] ?? null, [activePageId, pages]);
  const activeRenderEngine = activePage?.render_engine === "codegen" ? "codegen" : "document_json";
  const isCodegenPage = activeRenderEngine === "codegen";
  const adminCodeFiles = useMemo<AdminCodeFile[]>(() => {
    if (!isCodegenPage || !activePage) return [];

    const files = Array.isArray(activePage.codegen_files) ? activePage.codegen_files : [];
    const overlayCss = activePage.codegen_overlay_css ?? "";

    return [
      ...files.map((file) => ({ path: file.path, content: file.content })),
      {
        path: "webbrain-overlay.css",
        content: overlayCss,
        virtual: true,
      },
    ];
  }, [activePage, isCodegenPage]);
  const canUseAdminCodeMode = isAdmin && isCodegenPage && adminCodeFiles.length > 0;
  const effectiveEditorCanvasMode = canUseAdminCodeMode ? editorCanvasMode : "visual";
  const selectedAdminCodeFile = useMemo(
    () => adminCodeFiles.find((file) => file.path === selectedAdminCodePath) ?? adminCodeFiles[0] ?? null,
    [adminCodeFiles, selectedAdminCodePath]
  );
  const activeDocument = useMemo(
    () => (activePage && !isCodegenPage ? normalizeEditableDocument(normalizeWebBrainDocument(activePage.document_json, activePage.slug, activePage.name)) : null),
    [activePage, isCodegenPage]
  );
  const activeCodegenElementMap = isCodegenPage ? activePage?.codegen_element_map ?? null : null;
  const editorOutlineItems = useMemo(
    () =>
      buildEditorOutlineItems({
        document: activeDocument,
        page: activePage,
        codegenElementMap: activeCodegenElementMap
      }),
    [activeCodegenElementMap, activeDocument, activePage]
  );
  const selectedComponent = useMemo(
    () =>
      activeDocument && selectionState?.selection.componentId
        ? findWebBrainComponent(activeDocument, selectionState.selection.componentId)
        : null,
    [activeDocument, selectionState]
  );
  const deleteTargetComponent = useMemo(
    () => (activeDocument && deleteTargetId ? findWebBrainComponent(activeDocument, deleteTargetId) : null),
    [activeDocument, deleteTargetId]
  );
  const srcDocScope = `${site?.id ?? "empty"}:${activePage?.id ?? "page"}:${activePage?.slug ?? "slug"}`;
  const siteSrcDoc = activeDocument ? composeSiteSrcDoc(activeDocument, activePage) : null;
  const activeCodegenSrcDoc = isCodegenPage ? codegenSrcDoc : null;
  const hasCanvasPreview = Boolean(siteSrcDoc || activeCodegenSrcDoc);
  const previewFrameKey = `${srcDocScope}:${previewReloadNonce}`;
  const canvasLockedByAi = isAiWorking && hasCanvasPreview;
  const showCanvasPreview = hasCanvasPreview && !canvasLockedByAi;
  const selectionScope = `${site?.id ?? "empty"}:${activePage?.id ?? "page"}:${viewport}`;
  const visibleSelection = selectionToolActive && selectionState?.scope === selectionScope ? selectionState.selection : null;
  const selectedCodegenElement = useMemo(() => {
    if (!isCodegenPage || !activeCodegenElementMap || !visibleSelection?.componentId) return null;

    return activeCodegenElementMap.elements[visibleSelection.componentId] ?? null;
  }, [activeCodegenElementMap, isCodegenPage, visibleSelection]);
  const pageSettingsActive = Boolean(visibleSelection && selectedComponent?.type === "page");
  const visibleHover =
    selectionToolActive && hoverState?.scope === selectionScope && hoverState.selection.componentId !== visibleSelection?.componentId
      ? hoverState.selection
      : null;
  const visibleContextMenu = selectionToolActive && contextMenuState?.scope === selectionScope ? contextMenuState : null;
  const insertionModeActive = activeEditorPanel === "components" && Boolean(selectedComponentTool) && Boolean(activeDocument);
  const selectedComponentToolAllowsNested =
    selectedComponentTool?.category === "elements" ||
    Boolean(selectedComponentTool && ["container", "row", "column", "grid", "stack", "columns"].includes(selectedComponentTool.key));
  const selectedInsertTarget = selectedComponent && canContainEditorChildren(selectedComponent.type) ? selectedComponent : null;
  const visibleInsertionZones =
    (insertionModeActive || componentDragActive) && insertionState?.scope === selectionScope ? insertionState.zones : [];
  const canUndoEditor = editorHistory.pageId === activePage?.id && editorHistory.past.length > 0;
  const canRedoEditor = editorHistory.pageId === activePage?.id && editorHistory.future.length > 0;

  useEffect(() => {
    if (!visibleSelection || !selectedComponent || !activePage) {
      onSelectionContextChange(null);
      return;
    }

    onSelectionContextChange({
      pageId: activePage.id,
      pageSlug: activePage.slug,
      componentId: selectedComponent.id,
      componentType: selectedComponent.type,
      componentName: componentDisplayName(selectedComponent)
    });
  }, [activePage, onSelectionContextChange, selectedComponent, visibleSelection]);

  const syncSelectionMode = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:selection-mode",
        enabled: selectionToolActive && !canvasLockedByAi
      },
      "*"
    );
  }, [canvasLockedByAi, selectionToolActive]);

  const syncInsertionMode = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:insertion-mode",
        enabled: insertionModeActive && !canvasLockedByAi,
        label: selectedComponentTool?.label ?? "Блок",
        allowNested: selectedComponentToolAllowsNested,
        selectedContainerId: selectedInsertTarget?.id ?? ""
      },
      "*"
    );
  }, [canvasLockedByAi, insertionModeActive, selectedComponentTool?.label, selectedComponentToolAllowsNested, selectedInsertTarget?.id]);

  const reloadPreviewPage = useCallback(() => {
    if (!hasCanvasPreview) return;

    const selectedComponentId = selectionState?.scope === selectionScope ? selectionState.selection.componentId : null;
    pendingSelectComponentIdRef.current = selectedComponentId;
    setHoverState(null);
    setInsertionState(null);
    setContextMenuState(null);
    setDeleteTargetId(null);
    setPreviewReloadNonce((currentNonce) => currentNonce + 1);
  }, [hasCanvasPreview, selectionScope, selectionState]);

  const patchPreviewComponent = useCallback((componentId: string, patch: ComponentPatch, html?: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:patch-component",
        componentId,
        html,
        props: patch.props ?? {},
        styles: webBrainStyleToInlinePatch(patch.style ?? {}),
        effectStyles: webBrainEffectsToInlinePatch(patch.effects),
        effects: patch.effects ?? {}
      },
      "*"
    );
  }, []);

  const selectPreviewComponent = useCallback((componentId: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:select-component",
        componentId
      },
      "*"
    );
  }, []);

  const jumpToEditorOutlineItem = useCallback(
    (componentId: string) => {
      if (!hasCanvasPreview || canvasLockedByAi) return;

      setSelectedComponentToolKey(null);
      setInsertionState(null);
      setHoverState(null);
      setContextMenuState(null);
      setDeleteTargetId(null);
      setSelectionToolActive(true);
      selectPreviewComponent(componentId);
    },
    [canvasLockedByAi, hasCanvasPreview, selectPreviewComponent]
  );

  const selectCurrentPageSettings = useCallback(() => {
    if (!activeDocument || !activePage) return;

    const documentPage = activeDocument.pages.find((page) => page.slug === activePage.slug) ?? activeDocument.pages[0];
    if (!documentPage) return;

    const rootComponent = findWebBrainComponent(activeDocument, documentPage.rootComponentId);
    if (!rootComponent) return;

    const previewRect = iframeRef.current?.getBoundingClientRect();
    const fallbackWidth = Math.max(1, Math.round(previewRect?.width ?? 1));
    const fallbackHeight = Math.max(1, Math.round(previewRect?.height ?? 1));

    setActiveEditorPanel(null);
    setSelectedComponentToolKey(null);
    setInsertionState(null);
    setHoverState(null);
    setContextMenuState(null);
    setDeleteTargetId(null);
    setSelectionToolActive(true);
    setSelectionState({
      scope: selectionScope,
      selection: {
        top: 0,
        left: 0,
        width: fallbackWidth,
        height: fallbackHeight,
        label: "page",
        componentId: rootComponent.id,
        componentType: rootComponent.type
      }
    });
    selectPreviewComponent(rootComponent.id);
  }, [activeDocument, activePage, selectPreviewComponent, selectionScope]);

  const insertPreviewComponent = useCallback((parentId: string, index: number, html: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:insert-component",
        parentId,
        index,
        html
      },
      "*"
    );
  }, []);

  const deletePreviewComponent = useCallback((componentId: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "webbrain:delete-component",
        componentId
      },
      "*"
    );
  }, []);

  const saveDocument = useCallback(
    (pageId: string, document: WebBrainDocument) => {
      if (!clientId || !site) return;

      const documentForSave = normalizeEditableDocument(document);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const saveRevision = saveRevisionRef.current + 1;
      saveRevisionRef.current = saveRevision;

      saveTimerRef.current = setTimeout(() => {
        requestJson<{ page: StoredSitePage }>(`/api/sites/${site.id}/pages/${pageId}`, clientId, {
          method: "PATCH",
          body: JSON.stringify({
            document_json: documentForSave
          })
        })
          .then(({ page }) => {
            if (saveRevision !== saveRevisionRef.current) return;

            onPagesChange((currentPages) =>
              currentPages.map((currentPage) =>
                currentPage.id === page.id
                  ? {
                      ...currentPage,
                      ...page,
                      document_json: normalizeEditableDocument(normalizeWebBrainDocument(page.document_json, page.slug, page.name))
                    }
                  : currentPage
              )
            );
          })
          .catch((error) => {
            console.error("Failed to save page document", error);
          });
      }, 520);
    },
    [clientId, onPagesChange, site]
  );

  const pushEditorHistory = useCallback((previousDocument: WebBrainDocument) => {
    if (!activePage) return;

    setEditorHistory((history) => {
      const baseHistory = history.pageId === activePage.id ? history : { pageId: activePage.id, past: [], future: [] };
      const lastDocument = baseHistory.past.at(-1);

      if (lastDocument && areEditorDocumentsEqual(lastDocument, previousDocument)) {
        return baseHistory;
      }

      return {
        pageId: activePage.id,
        past: trimEditorPast([...baseHistory.past, previousDocument]),
        future: []
      };
    });
  }, [activePage]);

  const applyEditorDocumentSnapshot = useCallback((document: WebBrainDocument) => {
    if (!activePage) return;

    pendingSelectComponentIdRef.current =
      selectionState?.scope === selectionScope ? selectionState.selection.componentId : null;
    setHoverState(null);
    setInsertionState(null);
    setContextMenuState(null);
    setDeleteTargetId(null);
    setActiveEditorPanel(null);
    onPagesChange((currentPages) =>
      currentPages.map((currentPage) =>
        currentPage.id === activePage.id
          ? {
              ...currentPage,
              document_json: normalizeEditableDocument(document)
            }
          : currentPage
      )
    );
    saveDocument(activePage.id, document);
    setPreviewReloadNonce((currentNonce) => currentNonce + 1);
  }, [activePage, onPagesChange, saveDocument, selectionScope, selectionState]);

  const undoEditorChange = useCallback(() => {
    if (!activePage || !activeDocument || editorHistory.pageId !== activePage.id) return;

    const previousDocument = editorHistory.past.at(-1);
    if (!previousDocument) return;

    setEditorHistory({
      pageId: activePage.id,
      past: editorHistory.past.slice(0, -1),
      future: [activeDocument, ...editorHistory.future].slice(0, EDITOR_HISTORY_LIMIT)
    });
    applyEditorDocumentSnapshot(previousDocument);
  }, [activeDocument, activePage, applyEditorDocumentSnapshot, editorHistory]);

  const redoEditorChange = useCallback(() => {
    if (!activePage || !activeDocument || editorHistory.pageId !== activePage.id) return;

    const nextDocument = editorHistory.future[0];
    if (!nextDocument) return;

    setEditorHistory({
      pageId: activePage.id,
      past: trimEditorPast([...editorHistory.past, activeDocument]),
      future: editorHistory.future.slice(1)
    });
    applyEditorDocumentSnapshot(nextDocument);
  }, [activeDocument, activePage, applyEditorDocumentSnapshot, editorHistory]);

  useEffect(() => {
    function handleEditorHistoryKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();

        if (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") {
          return;
        }
      }

      const key = event.key.toLocaleLowerCase();
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed || event.altKey) return;

      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoEditorChange();
        } else {
          undoEditorChange();
        }
        return;
      }

      if (key === "y") {
        event.preventDefault();
        redoEditorChange();
      }
    }

    window.addEventListener("keydown", handleEditorHistoryKeyDown);
    return () => window.removeEventListener("keydown", handleEditorHistoryKeyDown);
  }, [redoEditorChange, undoEditorChange]);

  const createEditorPage = useCallback(async () => {
    if (!clientId || !site || isCreatingPage) return;

    try {
      setIsCreatingPage(true);
      const { page } = await requestJson<{ page: StoredSitePage }>(`/api/sites/${site.id}/pages`, clientId, {
        method: "POST",
        body: JSON.stringify({ name: "Новая страница" })
      });
      const nextPage = {
        ...page,
        document_json: normalizeEditableDocument(normalizeWebBrainDocument(page.document_json, page.slug, page.name))
      };

      onPagesChange((currentPages) => [...currentPages.filter((currentPage) => currentPage.id !== nextPage.id), nextPage].sort((a, b) => a.sort_order - b.sort_order));
      onSelectPage(nextPage.id);
      setActiveEditorPanel(null);
      setSelectionToolActive(false);
      setSelectionState(null);
      setHoverState(null);
      setInsertionState(null);
      setContextMenuState(null);
    } catch (error) {
      console.error("Failed to create site page", error);
    } finally {
      setIsCreatingPage(false);
    }
  }, [clientId, isCreatingPage, onPagesChange, onSelectPage, site]);

  const deleteEditorPage = useCallback(async (page: StoredSitePage) => {
    if (!clientId || !site || deletingPageId) return;

    if (pages.length <= 1) {
      return;
    }

    try {
      setDeletingPageId(page.id);
      const { pages: nextPages } = await requestJson<SitePagesResponse>(`/api/sites/${site.id}/pages/${page.id}`, clientId, {
        method: "DELETE"
      });
      const normalizedPages = nextPages.map((nextPage) => ({
        ...nextPage,
        document_json: normalizeEditableDocument(normalizeWebBrainDocument(nextPage.document_json, nextPage.slug, nextPage.name))
      }));

      onPagesChange(() => normalizedPages);

      if (activePageId === page.id) {
        onSelectPage(normalizedPages[0]?.id ?? "");
      }

      setPageDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete site page", error);
    } finally {
      setDeletingPageId(null);
    }
  }, [activePageId, clientId, deletingPageId, onPagesChange, onSelectPage, pages.length, site]);

  const requestDeleteEditorPage = useCallback((page: StoredSitePage) => {
    if (pages.length <= 1 || deletingPageId) return;
    setPageDeleteTarget(page);
  }, [deletingPageId, pages.length]);

  const patchSelectedComponent = useCallback(
    (patch: ComponentPatch) => {
      if (!activePage || !activeDocument || !selectedComponent) return;

      const safePatch = selectedComponent.type === "page" ? normalizePageComponentPatch(patch) : patch;
      const componentPatch = {
        props: safePatch.props,
        style: safePatch.style,
        effects: safePatch.effects,
      };
      const patchedComponentDocument = patchWebBrainComponent(activeDocument, selectedComponent.id, componentPatch);
      const patchedNamedDocument = safePatch.component?.name
        ? {
            ...patchedComponentDocument,
            components: patchedComponentDocument.components.map((componentItem) =>
              componentItem.id === selectedComponent.id
                ? { ...componentItem, name: safePatch.component?.name || componentItem.name }
                : componentItem
            )
          }
        : patchedComponentDocument;
      const patchedThemeDocument = safePatch.theme
        ? {
            ...patchedNamedDocument,
            theme: {
              ...patchedNamedDocument.theme,
              ...safePatch.theme
            }
          }
        : patchedNamedDocument;
      const nextDocument = normalizeEditableDocument(
        selectedComponent.type === "page" && safePatch.style && Object.prototype.hasOwnProperty.call(safePatch.style, "background")
          ? {
              ...patchedThemeDocument,
              theme: {
                ...patchedThemeDocument.theme,
                background: safePatch.style.background || DEFAULT_EDITOR_BACKGROUND
              }
            }
          : patchedThemeDocument
      );
      if (areEditorDocumentsEqual(activeDocument, nextDocument)) return;
      pushEditorHistory(activeDocument);
      const nextComponent = findWebBrainComponent(nextDocument, selectedComponent.id);
      const nextPreviewHtml = nextComponent && ["button", "heading", "text"].includes(nextComponent.type) ? renderWebBrainComponentHtml(nextDocument, nextComponent.id) : undefined;
      if (safePatch.theme) {
        pendingSelectComponentIdRef.current = selectedComponent.id;
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
      } else {
        patchPreviewComponent(selectedComponent.id, {
          ...safePatch,
          effects: nextComponent?.effects ?? safePatch.effects
        }, nextPreviewHtml);
      }
      onPagesChange((currentPages) =>
        currentPages.map((currentPage) =>
          currentPage.id === activePage.id
            ? {
                ...currentPage,
                document_json: nextDocument
              }
            : currentPage
        )
      );
      saveDocument(activePage.id, nextDocument);
    },
    [activeDocument, activePage, onPagesChange, patchPreviewComponent, pushEditorHistory, saveDocument, selectedComponent]
  );

  const patchHeaderNavLink = useCallback(
    (navLinkId: string, patch: ComponentPatch) => {
      if (!activePage || !activeDocument) return;

      const nextDocument = normalizeEditableDocument(patchWebBrainComponent(activeDocument, navLinkId, patch));
      if (areEditorDocumentsEqual(activeDocument, nextDocument)) return;
      pushEditorHistory(activeDocument);
      const nextComponent = findWebBrainComponent(nextDocument, navLinkId);
      patchPreviewComponent(navLinkId, {
        ...patch,
        effects: nextComponent?.effects ?? patch.effects
      });
      onPagesChange((currentPages) =>
        currentPages.map((currentPage) =>
          currentPage.id === activePage.id
            ? {
                ...currentPage,
                document_json: nextDocument
              }
            : currentPage
        )
      );
      saveDocument(activePage.id, nextDocument);
    },
    [activeDocument, activePage, onPagesChange, patchPreviewComponent, pushEditorHistory, saveDocument]
  );

  const requestDeleteComponent = useCallback(
    (componentId: string) => {
      if (!activeDocument) return;

      const component = findWebBrainComponent(activeDocument, componentId);
      const isPageRoot = activeDocument.pages.some((page) => page.rootComponentId === componentId);
      if (!component || isPageRoot) return;

      setContextMenuState(null);
      setDeleteTargetId(component.id);
    },
    [activeDocument]
  );

  const confirmDeleteComponent = useCallback(() => {
    if (!activePage || !activeDocument || !deleteTargetId) return;

    const nextDocument = normalizeEditableDocument(removeWebBrainComponent(activeDocument, deleteTargetId));
    if (areEditorDocumentsEqual(activeDocument, nextDocument)) return;
    pushEditorHistory(activeDocument);
    deletePreviewComponent(deleteTargetId);

    setDeleteTargetId(null);
    setContextMenuState(null);
    setSelectionState(null);
    setHoverState(null);
    setInsertionState(null);
    onPagesChange((currentPages) =>
      currentPages.map((currentPage) =>
        currentPage.id === activePage.id
          ? {
              ...currentPage,
              document_json: nextDocument
            }
          : currentPage
      )
    );
    saveDocument(activePage.id, nextDocument);
  }, [activeDocument, activePage, deletePreviewComponent, deleteTargetId, onPagesChange, pushEditorHistory, saveDocument]);

  const addComponentToPage = useCallback(
    (toolKey: EditorComponentToolKey, target?: { rootComponentId: string; index: number }) => {
      if (!activePage || !activeDocument) return;

      const { rootId, components } = createEditorComponentBundle(toolKey, activeDocument);
      const activeDocumentPage = activeDocument.pages.find((page) => page.slug === activePage.slug) ?? activeDocument.pages[0];
      const pageRoot = activeDocument.components.find((componentItem) => componentItem.id === activeDocumentPage?.rootComponentId);
      const targetRootComponent = target
        ? activeDocument.components.find((componentItem) => componentItem.id === target.rootComponentId)
        : null;
      const parentComponent = targetRootComponent ?? (selectedComponent && canContainEditorChildren(selectedComponent.type) ? selectedComponent : pageRoot);
      const parentId = parentComponent?.id;

      if (!parentId) return;

      const nextDocument: WebBrainDocument = normalizeEditableDocument({
        ...activeDocument,
        components: [
          ...activeDocument.components.map((componentItem) =>
            componentItem.id === parentId
              ? {
                  ...componentItem,
                  children: insertChildAt(componentItem.children, rootId, target?.index)
                }
              : componentItem
          ),
          ...components
        ]
      });

      pushEditorHistory(activeDocument);
      const insertionIndex = target?.index ?? parentComponent.children.length;
      const componentHtml = renderWebBrainComponentHtml(nextDocument, rootId);
      insertPreviewComponent(parentId, insertionIndex, componentHtml);
      setSelectionToolActive(true);
      setActiveEditorPanel(null);
      setSelectedComponentToolKey(null);
      setSelectionState(null);
      setHoverState(null);
      setInsertionState(null);
      window.setTimeout(() => selectPreviewComponent(rootId), 80);
      onPagesChange((currentPages) =>
        currentPages.map((currentPage) =>
          currentPage.id === activePage.id
            ? {
                ...currentPage,
                document_json: nextDocument
              }
            : currentPage
        )
      );
      saveDocument(activePage.id, nextDocument);
    },
    [activeDocument, activePage, insertPreviewComponent, onPagesChange, pushEditorHistory, saveDocument, selectPreviewComponent, selectedComponent]
  );

  const moveComponentInDocument = useCallback(
    (eventData: Extract<EditorSelectionMessage, { type: "webbrain:component-moved" }>) => {
      if (!activePage || !activeDocument) return;

      const nextDocument = normalizeEditableDocument(
        eventData.mode === "side" && eventData.targetId && eventData.side && eventData.rowId
          ? moveWebBrainComponentToSide(activeDocument, eventData.componentId, eventData.targetId, eventData.side, eventData.rowId)
          : moveWebBrainComponent(activeDocument, eventData.componentId, eventData.parentId, eventData.index)
      );
      if (areEditorDocumentsEqual(activeDocument, nextDocument)) return;
      pushEditorHistory(activeDocument);

      onPagesChange((currentPages) =>
        currentPages.map((currentPage) =>
          currentPage.id === activePage.id
            ? {
                ...currentPage,
                document_json: nextDocument
              }
            : currentPage
        )
      );
      saveDocument(activePage.id, nextDocument);
    },
    [activeDocument, activePage, onPagesChange, pushEditorHistory, saveDocument]
  );

  const handlePreviewLoad = useCallback(() => {
    syncSelectionMode();
    syncInsertionMode();

    const pendingComponentId = pendingSelectComponentIdRef.current;
    if (!pendingComponentId) return;

    pendingSelectComponentIdRef.current = null;
    window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "webbrain:select-component",
          componentId: pendingComponentId
        },
        "*"
      );
    }, 40);
  }, [syncInsertionMode, syncSelectionMode]);

  useEffect(() => {
    let cancelled = false;

    if (!clientId || !site || !activePage || !isCodegenPage) {
      return () => {
        cancelled = true;
      };
    }

    const siteId = site.id;
    const pageId = activePage.id;
    const requestClientId = clientId;

    async function loadCodegenPreview() {
      setCodegenPreviewLoading(true);
      setCodegenPreviewError(null);

      try {
        const html = await requestText(`/api/sites/${siteId}/pages/${pageId}/codegen/preview`, requestClientId);
        if (!cancelled) setCodegenSrcDoc(html);
      } catch (error) {
        if (!cancelled) {
          setCodegenSrcDoc(null);
          setCodegenPreviewError(error instanceof Error ? error.message : "Не удалось загрузить code-gen превью");
        }
      } finally {
        if (!cancelled) setCodegenPreviewLoading(false);
      }
    }

    void loadCodegenPreview();

    return () => {
      cancelled = true;
    };
  }, [activePage, clientId, isCodegenPage, previewReloadNonce, site]);

  const patchSelectedCodegenStyle = useCallback(
    async (property: string, value: WebBrainCodegenStyleValue) => {
      if (!clientId || !site || !activePage || !selectedCodegenElement) return;

      try {
        setCodegenStyleSaveState("saving");
        const { page } = viewport === "desktop"
          ? await requestJson<{ page: StoredSitePage }>(
              `/api/sites/${site.id}/pages/${activePage.id}/codegen/style`,
              clientId,
              {
                method: "PATCH",
                body: JSON.stringify({
                  filePath: selectedCodegenElement.position.filePath,
                  wbId: selectedCodegenElement.id,
                  property,
                  value
                })
              }
            )
          : await requestJson<{ page: StoredSitePage }>(
              `/api/sites/${site.id}/pages/${activePage.id}/codegen/overlay`,
              clientId,
              {
                method: "PATCH",
                body: JSON.stringify({
                  wbId: selectedCodegenElement.id,
                  state: viewport,
                  declarations: {
                    [property]: value,
                  },
                })
              }
            );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setCodegenStyleSaveState("idle");
      } catch (error) {
        console.error("Failed to patch code-gen style", error);
        setCodegenStyleSaveState("error");
      }
    },
    [activePage, clientId, onPagesChange, selectedCodegenElement, site, viewport]
  );

  const patchSelectedCodegenOverlay = useCallback(
    async (state: "hover" | "focus" | "mobile" | "tablet", property: string, value: WebBrainCodegenStyleValue) => {
      if (!clientId || !site || !activePage || !selectedCodegenElement) return;

      try {
        setCodegenStyleSaveState("saving");
        const { page } = await requestJson<{ page: StoredSitePage }>(
          `/api/sites/${site.id}/pages/${activePage.id}/codegen/overlay`,
          clientId,
          {
            method: "PATCH",
            body: JSON.stringify({
              wbId: selectedCodegenElement.id,
              state,
              declarations: {
                [property]: value,
              },
            })
          }
        );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setCodegenStyleSaveState("idle");
      } catch (error) {
        console.error("Failed to patch code-gen overlay", error);
        setCodegenStyleSaveState("error");
      }
    },
    [activePage, clientId, onPagesChange, selectedCodegenElement, site]
  );

  const patchSelectedCodegenSettings = useCallback(
    async (settings: WebBrainCodegenSettings) => {
      if (!clientId || !site || !activePage || !selectedCodegenElement) return;

      try {
        setCodegenStyleSaveState("saving");
        const { page } = await requestJson<{ page: StoredSitePage }>(
          `/api/sites/${site.id}/pages/${activePage.id}/codegen/settings`,
          clientId,
          {
            method: "PATCH",
            body: JSON.stringify({
              filePath: selectedCodegenElement.position.filePath,
              wbId: selectedCodegenElement.id,
              viewport,
              settings,
            })
          }
        );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setCodegenStyleSaveState("idle");
      } catch (error) {
        console.error("Failed to patch code-gen settings", error);
        setCodegenStyleSaveState("error");
      }
    },
    [activePage, clientId, onPagesChange, selectedCodegenElement, site, viewport]
  );

  const patchSelectedCodegenContent = useCallback(
    async (kind: WebBrainCodegenContentKind, value: string) => {
      if (!clientId || !site || !activePage || !selectedCodegenElement) return;

      try {
        setCodegenStyleSaveState("saving");
        const { page } = await requestJson<{ page: StoredSitePage }>(
          `/api/sites/${site.id}/pages/${activePage.id}/codegen/content`,
          clientId,
          {
            method: "PATCH",
            body: JSON.stringify({
              filePath: selectedCodegenElement.position.filePath,
              wbId: selectedCodegenElement.id,
              kind,
              value,
            })
          }
        );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setCodegenStyleSaveState("idle");
      } catch (error) {
        console.error("Failed to patch code-gen content", error);
        setCodegenStyleSaveState("error");
      }
    },
    [activePage, clientId, onPagesChange, selectedCodegenElement, site]
  );

  const patchSelectedCodegenAnchor = useCallback(
    async (value: string) => {
      if (!clientId || !site || !activePage || !selectedCodegenElement) return;

      const nextWbId = normalizeEditorAnchorId(value);
      if (!nextWbId || nextWbId === selectedCodegenElement.id) return;

      try {
        setCodegenStyleSaveState("saving");
        const { page } = await requestJson<{ page: StoredSitePage }>(
          `/api/sites/${site.id}/pages/${activePage.id}/codegen/anchor`,
          clientId,
          {
            method: "PATCH",
            body: JSON.stringify({
              filePath: selectedCodegenElement.position.filePath,
              wbId: selectedCodegenElement.id,
              nextWbId,
            })
          }
        );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        pendingSelectComponentIdRef.current = nextWbId;
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setCodegenStyleSaveState("idle");
      } catch (error) {
        console.error("Failed to patch code-gen anchor", error);
        setCodegenStyleSaveState("error");
      }
    },
    [activePage, clientId, onPagesChange, selectedCodegenElement, site]
  );

  const saveAdminCodeFile = useCallback(
    async (filePath: string, content: string) => {
      if (!clientId || !site || !activePage || !canUseAdminCodeMode) return;

      try {
        setAdminCodeSaveState("saving");
        setAdminCodeSaveError(null);
        const { page } = await requestJson<{ page: StoredSitePage }>(
          `/api/sites/${site.id}/pages/${activePage.id}/codegen/file`,
          clientId,
          {
            method: "PATCH",
            body: JSON.stringify({
              filePath,
              content,
            })
          }
        );

        onPagesChange((currentPages) =>
          currentPages.map((currentPage) =>
            currentPage.id === page.id
              ? {
                  ...currentPage,
                  ...page,
                  render_engine: "codegen"
                }
              : currentPage
          )
        );
        setPreviewReloadNonce((currentNonce) => currentNonce + 1);
        setAdminCodeSaveState("idle");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Не удалось сохранить код";
        console.error("Failed to save admin code file", error);
        setAdminCodeSaveError(message);
        setAdminCodeSaveState("error");
      }
    },
    [activePage, canUseAdminCodeMode, clientId, onPagesChange, site]
  );

  useEffect(() => {
    syncSelectionMode();
  }, [selectionScope, syncSelectionMode]);

  useEffect(() => {
    syncInsertionMode();
  }, [selectionScope, syncInsertionMode]);

  useEffect(() => {
    if (!canvasLockedByAi) return;

    const resetTimer = window.setTimeout(() => {
      setSelectionToolActive(false);
      setActiveEditorPanel(null);
      setSelectedComponentToolKey(null);
      setSelectionState(null);
      setHoverState(null);
      setInsertionState(null);
      setComponentDragActive(false);
      setContextMenuState(null);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [canvasLockedByAi]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<EditorSelectionMessage>) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (canvasLockedByAi) return;
      if (event.data?.type === "webbrain:component-drag-started") {
        setComponentDragActive(true);
        setContextMenuState(null);
        return;
      }

      if (event.data?.type === "webbrain:component-drag-ended") {
        setComponentDragActive(false);
        return;
      }

      if (event.data?.type === "webbrain:component-moved") {
        setComponentDragActive(false);
        setInsertionState(null);
        if (
          typeof event.data.componentId === "string" &&
          typeof event.data.parentId === "string" &&
          Number.isFinite(event.data.index)
        ) {
          moveComponentInDocument(event.data);
        }
        return;
      }

      if (event.data?.type === "webbrain:insertion-zones-cleared") {
        setInsertionState(null);
        return;
      }

      if (event.data?.type === "webbrain:insertion-zones") {
        setInsertionState({
          scope: selectionScope,
          zones: event.data.zones.filter(
            (zone) =>
              Number.isFinite(zone.top) &&
              Number.isFinite(zone.left) &&
              Number.isFinite(zone.width) &&
              Number.isFinite(zone.index) &&
              typeof zone.rootComponentId === "string"
          )
        });
        return;
      }

      if (event.data?.type === "webbrain:component-hover-cleared") {
        setHoverState(null);
        return;
      }

      if (event.data?.type === "webbrain:component-selection-cleared") {
        setSelectionState(null);
        setHoverState(null);
        setContextMenuState(null);
        return;
      }

      if (
        event.data?.type !== "webbrain:component-selected" &&
        event.data?.type !== "webbrain:component-hovered" &&
        event.data?.type !== "webbrain:component-context-menu"
      ) {
        return;
      }

      const nextSelection = event.data.selection;

      if (
        Number.isFinite(nextSelection.top) &&
        Number.isFinite(nextSelection.left) &&
        Number.isFinite(nextSelection.width) &&
        Number.isFinite(nextSelection.height)
      ) {
        if (event.data.type === "webbrain:component-selected") {
          setSelectionState({
            scope: selectionScope,
            selection: nextSelection
          });
          setContextMenuState(null);
        } else if (event.data.type === "webbrain:component-context-menu") {
          setSelectionState({
            scope: selectionScope,
            selection: nextSelection
          });
          setContextMenuState({
            scope: selectionScope,
            selection: nextSelection,
            x: Number.isFinite(event.data.x) ? event.data.x : nextSelection.left,
            y: Number.isFinite(event.data.y) ? event.data.y : nextSelection.top
          });
        } else {
          setHoverState({
            scope: selectionScope,
            selection: nextSelection
          });
        }
      }
    }

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [canvasLockedByAi, moveComponentInDocument, selectionScope]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-[#08090a] text-white">
      <aside className="hidden w-[52px] shrink-0 flex-col items-center border-r border-white/[0.055] bg-[#111315] py-3 text-white/52 lg:flex">
        {[
          { key: "select", icon: MousePointer2, panel: null, label: "Выбор" },
          { key: "outline", icon: ClipboardList, panel: "outline" as const, label: "Структура" },
          { key: "add", icon: Plus, panel: "components" as const, label: "Добавить" },
          { key: "pages", icon: FileText, panel: "pages" as const, label: "Страницы" },
          { key: "settings", icon: Settings, panel: null, label: "Настройки" }
        ].map(({ key, icon: Icon, panel, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            disabled={isAiWorking || effectiveEditorCanvasMode === "code"}
            onClick={() => {
              if (effectiveEditorCanvasMode === "code") return;

              if (key === "select") {
                const nextSelectionToolActive = !selectionToolActive;
                setActiveEditorPanel(null);
                setSelectedComponentToolKey(null);
                setInsertionState(null);
                setSelectionState(null);
                setHoverState(null);
                setContextMenuState(null);
                setSelectionToolActive(nextSelectionToolActive);
                return;
              }

              if (key === "settings") {
                selectCurrentPageSettings();
                return;
              }

              const nextPanel = panel && activeEditorPanel !== panel ? panel : null;
              if (nextPanel !== "outline") {
                setSelectionToolActive(false);
              }
              setHoverState(null);
              setContextMenuState(null);
              if (nextPanel !== "components" && nextPanel !== "outline") {
                setSelectionState(null);
              }
              setActiveEditorPanel(nextPanel);
              if (nextPanel !== "components") {
                setSelectedComponentToolKey(null);
                setInsertionState(null);
              }
            }}
            className={`mb-2 flex h-8 w-8 items-center justify-center rounded-[9px] transition hover:bg-white/[0.07] hover:text-white ${
              effectiveEditorCanvasMode === "visual" && key === "select" && selectionToolActive
                ? "bg-white/[0.08] text-lime"
                : effectiveEditorCanvasMode === "visual" && key === "settings" && pageSettingsActive
                  ? "bg-white/[0.08] text-lime"
                : effectiveEditorCanvasMode === "visual" && panel && activeEditorPanel === panel
                  ? "bg-lime/[0.12] text-lime"
                  : ""
            } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </aside>

      <AnimatePresence initial={false}>
        {effectiveEditorCanvasMode === "visual" && activeEditorPanel ? (
          <motion.aside
            key={activeEditorPanel}
            initial={{ width: 0, opacity: 0, x: -18 }}
            animate={{ width: 280, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 18 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hidden h-full min-h-0 shrink-0 overflow-hidden border-r border-white/[0.055] bg-[#101214] lg:block"
          >
            <div className="no-scrollbar h-full w-[280px] overflow-y-auto px-4 py-4">
              {activeEditorPanel === "pages" ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/80">Страницы</p>
                    <button
                      type="button"
                      aria-label="Создать новую страницу"
                      onClick={() => void createEditorPage()}
                      disabled={!site || !clientId || isCreatingPage}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-white/[0.07] bg-white/[0.04] text-white/54 transition hover:border-lime/35 hover:bg-lime/[0.12] hover:text-lime disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.07] disabled:hover:bg-white/[0.04] disabled:hover:text-white/54"
                    >
                      <Plus className={`h-4 w-4 ${isCreatingPage ? "animate-pulse" : ""}`} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {site && pages.length === 0 ? <div className="px-2 py-2 text-xs text-white/38">Загрузка страниц...</div> : null}
                    {!site ? <div className="px-2 py-2 text-xs text-white/38">Сайт пока не создан</div> : null}
                    {pages.map((page) => {
                      const active = page.id === activePage?.id;
                      const deleting = deletingPageId === page.id;

                      return (
                        <div
                          key={page.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectPage(page.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              onSelectPage(page.id);
                            }
                          }}
                          className={`group flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-xs transition ${
                            active ? "bg-white/[0.085] text-white" : "text-white/56 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{page.name}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              requestDeleteEditorPage(page);
                            }}
                            disabled={deleting || pages.length <= 1}
                            aria-label={`Удалить страницу ${page.name}`}
                            title={pages.length <= 1 ? "Последнюю страницу нельзя удалить" : "Удалить страницу"}
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-white/28 opacity-0 transition group-hover:opacity-100 ${
                              active ? "opacity-60" : ""
                            } hover:bg-red-400/[0.12] hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-white/28`}
                          >
                            <Trash2 className={`h-3.5 w-3.5 ${deleting ? "animate-pulse" : ""}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {activeEditorPanel === "outline" ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/80">Структура</p>
                    <span className="rounded-full bg-lime/[0.11] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-lime/80">
                      {editorOutlineItems.length}
                    </span>
                  </div>
                  <p className="mb-3 text-[0.68rem] leading-4 text-white/34">
                    Секции и рабочие элементы страницы. Нажмите, чтобы перейти и выделить блок.
                  </p>
                  <div className="space-y-1">
                    {editorOutlineItems.length === 0 ? (
                      <div className="rounded-[12px] bg-white/[0.035] px-3 py-3 text-xs leading-5 text-white/42">
                        У этой страницы пока нет карты секций.
                      </div>
                    ) : null}
                    {editorOutlineItems.map((item) => {
                      const active = visibleSelection?.componentId === item.id;
                      const tone =
                        item.kind === "section"
                          ? "text-lime/82"
                          : item.kind === "action"
                            ? "text-cyan-100/72"
                            : "text-white/52";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => jumpToEditorOutlineItem(item.id)}
                          disabled={!hasCanvasPreview || canvasLockedByAi}
                          className={`group flex w-full min-w-0 items-start gap-2 rounded-[10px] px-2 py-2 text-left transition ${
                            active ? "bg-lime/[0.11] text-white ring-1 ring-lime/25" : "text-white/58 hover:bg-white/[0.055] hover:text-white"
                          } disabled:cursor-not-allowed disabled:opacity-35`}
                          style={{ paddingLeft: `${8 + item.depth * 10}px` }}
                        >
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === "section" ? "bg-lime" : item.kind === "action" ? "bg-cyan-200/70" : "bg-white/25"}`} />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-xs font-semibold ${active ? "text-white" : tone}`}>{item.label}</span>
                            <span className="mt-0.5 block truncate text-[0.62rem] leading-4 text-white/25 group-hover:text-white/36">{item.meta}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {activeEditorPanel === "components" ? (
                <>
                  <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white/34">Добавить</p>
                  <p className="mb-3 text-[0.68rem] leading-4 text-white/34">
                    Выберите блок, потом нажмите линию внутри секции или между блоками.
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-1 rounded-[10px] border border-white/[0.06] bg-black/20 p-1">
                    {componentCategories.map((category) => (
                      <button
                        key={category.key}
                        type="button"
                        onClick={() => {
                          setActiveComponentCategory(category.key);
                          setSelectedComponentToolKey(null);
                          setInsertionState(null);
                        }}
                        className={`h-7 rounded-[7px] text-[0.68rem] font-semibold transition ${
                          activeComponentCategory === category.key ? "bg-white/[0.09] text-lime" : "text-white/38 hover:bg-white/[0.055] hover:text-white/72"
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {visibleComponentTools.map((tool) => {
                      const isSelected = selectedComponentToolKey === tool.key;

                      return (
                      <button
                        key={tool.label}
                        type="button"
                        onClick={() => {
                          setSelectedComponentToolKey((currentToolKey) => (currentToolKey === tool.key ? null : tool.key));
                          setSelectionToolActive(false);
                          setHoverState(null);
                        }}
                        disabled={!activeDocument || !activePage}
                        className={`group flex min-h-10 w-full items-start gap-2 rounded-[10px] px-2 py-2 text-left transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected ? "bg-lime/[0.11] text-white ring-1 ring-lime/35" : ""
                        }`}
                      >
                        <span className={`mt-0.5 transition group-hover:text-lime ${isSelected ? "text-lime" : "text-white/48"}`}>{tool.icon}</span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-white/70 group-hover:text-white">{tool.label}</span>
                          <span className="mt-0.5 block text-[0.64rem] leading-4 text-white/32">{tool.description}</span>
                        </span>
                      </button>
                      );
                    })}
                  </div>
                  <AnimatePresence initial={false}>
                    {selectedComponentTool ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-4 rounded-[13px] border border-lime/20 bg-lime/[0.055] p-3"
                      >
                        <p className="text-xs font-semibold text-lime">{selectedComponentTool.label}</p>
                        <p className="mt-1 text-[0.68rem] leading-4 text-white/42">
                          Нажмите зеленую линию в canvas или вставьте элемент внутрь выбранного контейнера.
                        </p>
                        {selectedInsertTarget && selectedComponentToolAllowsNested ? (
                          <button
                            type="button"
                            onClick={() =>
                              addComponentToPage(selectedComponentTool.key, {
                                rootComponentId: selectedInsertTarget.id,
                                index: selectedInsertTarget.children.length
                              })
                            }
                            className="mt-3 flex min-h-8 w-full items-center justify-center rounded-[9px] border border-lime/35 bg-lime/[0.08] px-2 text-center text-[0.68rem] font-bold leading-4 text-lime transition hover:bg-lime hover:text-black"
                          >
                            Вставить внутрь: {componentInspectorSchemas[selectedInsertTarget.type]?.title ?? selectedInsertTarget.name}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => addComponentToPage(selectedComponentTool.key)}
                          className="mt-2 flex h-8 w-full items-center justify-center rounded-[9px] bg-lime text-xs font-bold text-black transition hover:bg-lime/90"
                        >
                          Вставить в конец
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : null}
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex h-12 shrink-0 items-center border-b border-white/[0.055] bg-[#0d0f11] px-4">
          <div className="absolute left-4 flex items-center gap-2">
            <EditorIconButton
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Перезагрузить страницу"
              onClick={reloadPreviewPage}
              disabled={!hasCanvasPreview}
            />
            <button
              type="button"
              onClick={() => {
                setEditorCanvasMode("visual");
                setActiveEditorPanel((currentPanel) => (currentPanel === "outline" ? null : "outline"));
                setSelectedComponentToolKey(null);
                setInsertionState(null);
                setSelectionToolActive(true);
              }}
              disabled={isAiWorking || effectiveEditorCanvasMode === "code"}
              className={`hidden h-8 items-center gap-2 rounded-[9px] border px-3 text-xs font-bold transition md:inline-flex ${
                effectiveEditorCanvasMode === "visual" && activeEditorPanel === "outline"
                  ? "border-lime/35 bg-lime/[0.12] text-lime"
                  : "border-white/[0.055] bg-white/[0.025] text-white/54 hover:border-lime/35 hover:text-lime"
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Структура
            </button>
            {canUseAdminCodeMode ? (
              <button
                type="button"
                onClick={() => {
                  const nextMode = effectiveEditorCanvasMode === "code" ? "visual" : "code";
                  setEditorCanvasMode(nextMode);
                  setActiveEditorPanel(null);
                  setSelectedComponentToolKey(null);
                  setInsertionState(null);
                  setSelectionState(null);
                  setHoverState(null);
                  setContextMenuState(null);
                  setSelectionToolActive(false);
                }}
                disabled={isAiWorking}
                className={`hidden h-8 items-center gap-2 rounded-[9px] border px-3 text-xs font-bold transition md:inline-flex ${
                  effectiveEditorCanvasMode === "code"
                    ? "border-lime/45 bg-lime text-black shadow-[0_0_28px_rgba(190,255,76,0.12)]"
                    : "border-white/[0.055] bg-white/[0.025] text-white/54 hover:border-lime/35 hover:text-lime"
                } disabled:cursor-not-allowed disabled:opacity-35`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                {effectiveEditorCanvasMode === "code" ? "Визуально" : "Код"}
              </button>
            ) : null}
          </div>

          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
            <div className="flex items-center rounded-[10px] border border-white/[0.06] bg-white/[0.035] p-1 text-white/42">
              <EditorToolbarButton
                active={viewport === "desktop"}
                icon={<Monitor className="h-3.5 w-3.5" />}
                label="Desktop"
                onClick={() => setViewport("desktop")}
              />
              <EditorToolbarButton
                active={viewport === "tablet"}
                icon={<Tablet className="h-3.5 w-3.5" />}
                label="Tablet"
                onClick={() => setViewport("tablet")}
              />
              <EditorToolbarButton
                active={viewport === "mobile"}
                icon={<Smartphone className="h-3.5 w-3.5" />}
                label="Mobile"
                onClick={() => setViewport("mobile")}
              />
            </div>

            <div className="flex items-center gap-1 text-white/32">
              <EditorIconButton
                icon={<Undo2 className="h-3.5 w-3.5" />}
                label="Отменить"
                onClick={undoEditorChange}
                disabled={!canUndoEditor}
              />
              <EditorIconButton
                icon={<Redo2 className="h-3.5 w-3.5" />}
                label="Повторить"
                onClick={redoEditorChange}
                disabled={!canRedoEditor}
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <EditorIconButton
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              label="Открыть сайт в отдельной вкладке"
              disabled={!hasCanvasPreview}
              onClick={() => {
                const previewHtml = siteSrcDoc ?? activeCodegenSrcDoc;
                if (!previewHtml) return;
                const blob = new Blob([previewHtml], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(url), 60_000);
              }}
            />
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#070809]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(185,255,71,0.055),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_34%)]" />
          <motion.div
            initial={false}
            animate={{
              width: effectiveEditorCanvasMode === "code" ? "calc(100% - 34px)" : viewportSettings.width,
              height: effectiveEditorCanvasMode === "code" ? "calc(100% - 48px)" : viewportSettings.height
            }}
            style={{ maxWidth: "calc(100% - 34px)", maxHeight: "calc(100% - 48px)" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto my-6 rounded-[13px] border border-white/[0.09] bg-[#050606] shadow-[0_34px_90px_rgba(0,0,0,0.55)]"
          >
            <motion.div
              initial={false}
              animate={{ height: "100%" }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[13px] bg-[#0d0f0f]"
            >
              {effectiveEditorCanvasMode === "code" && selectedAdminCodeFile ? (
                <AdminCodeProjectEditor
                  files={adminCodeFiles}
                  selectedPath={selectedAdminCodeFile.path}
                  saveState={adminCodeSaveState}
                  saveError={adminCodeSaveError}
                  onSelectPath={setSelectedAdminCodePath}
                  onSave={saveAdminCodeFile}
                />
              ) : showCanvasPreview ? (
                <>
                  <StablePreviewIframe
                    key={previewFrameKey}
                    ref={iframeRef}
                    title={site?.name ?? "Сайт WebBrain"}
                    srcDoc={siteSrcDoc ?? activeCodegenSrcDoc ?? ""}
                    onLoad={handlePreviewLoad}
                  />
                  {siteSrcDoc ? (
                    <>
                      <EditorHoverOverlay
                        selection={visibleHover}
                        onRequestDelete={(componentId) => requestDeleteComponent(componentId)}
                      />
                      <EditorSelectionOverlay
                        selection={visibleSelection}
                        component={selectedComponent}
                        onPatch={patchSelectedComponent}
                        onRequestDelete={(componentId) => requestDeleteComponent(componentId)}
                      />
                      <EditorContextMenu
                        menu={visibleContextMenu}
                        onClose={() => setContextMenuState(null)}
                        onRequestDelete={(componentId) => requestDeleteComponent(componentId)}
                      />
                      <EditorInsertionZonesOverlay
                        zones={visibleInsertionZones}
                        toolLabel={selectedComponentTool?.label}
                        interactive={!componentDragActive}
                        onInsert={(zone) => {
                          if (!selectedComponentTool) return;

                          addComponentToPage(selectedComponentTool.key, {
                            rootComponentId: zone.rootComponentId,
                            index: zone.index
                          });
                        }}
                      />
                    </>
                  ) : null}
                  {activeCodegenSrcDoc ? (
                    <>
                      <EditorHoverOverlay
                        selection={visibleHover}
                        onRequestDelete={() => undefined}
                      />
                      <CodegenSelectionOverlay selection={selectedCodegenElement ? visibleSelection : null} />
                    </>
                  ) : null}
                </>
              ) : (
                <div className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center">
                  {codegenPreviewLoading ? (
                    <>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-lime">
                        <FileCode2 className="h-5 w-5 animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Загружаю code-gen превью</h2>
                      <p className="mt-3 max-w-[420px] text-sm leading-6 text-white/50">
                        Собираю React-источник страницы и карту элементов для визуального редактора.
                      </p>
                    </>
                  ) : codegenPreviewError ? (
                    <>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] border border-red-400/20 bg-red-500/10 text-red-200">
                        <TriangleAlert className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Code-gen превью не загрузилось</h2>
                      <p className="mt-3 max-w-[520px] text-sm leading-6 text-white/50">{codegenPreviewError}</p>
                    </>
                  ) : isGeneratingSite ? (
                    <>
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.075] px-4 py-2 text-sm font-semibold text-lime shadow-[0_0_42px_rgba(190,255,76,0.08)]">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-45" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
                        </span>
                        ИИ создает сайт
                      </div>
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/[0.08] bg-white/[0.04] text-lime">
                        <BrainCircuit className="h-6 w-6 animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Готовлю страницу в редакторе</h2>
                      <p className="mt-3 max-w-[420px] text-sm leading-6 text-white/50">
                        Пока идет генерация, шаблон не подставляется. Готовый сайт появится здесь после проверки и сохранения.
                      </p>
                      {aiCanvasStatus ? (
                        <p className="mt-3 max-w-[420px] text-xs font-semibold uppercase tracking-[0.18em] text-lime/70">
                          {aiCanvasStatus}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-lime">
                        <Wand2 className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Сайт пока не создан</h2>
                      <p className="mt-3 max-w-[420px] text-sm leading-6 text-white/50">
                        Опишите задачу в чате. WebBrain создаст полноценный сайт и только потом откроет его в редакторе.
                      </p>
                      <button
                        type="button"
                        onClick={onCreateBlankSite}
                        disabled={!canCreateBlankSite || isCreatingBlankSite}
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-lime px-5 py-3 text-sm font-extrabold text-black transition hover:scale-[1.02] hover:bg-lime/90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                      >
                        <Plus className="h-4 w-4" />
                        {isCreatingBlankSite ? "Создаем страницу..." : "Создать пустую страницу"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {effectiveEditorCanvasMode === "visual" && visibleSelection && selectedCodegenElement && activeCodegenElementMap ? (
          <motion.aside
            key="codegen-inspector"
            initial={{ width: 0, opacity: 0, x: 28 }}
            animate={{ width: 282, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 28 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hidden shrink-0 overflow-hidden border-l border-white/[0.055] bg-[#101214] xl:block"
          >
            <CodegenInspectorPanel
              key={`${selectedCodegenElement.id}:${viewport}`}
              element={selectedCodegenElement}
              viewport={viewport}
              saveState={codegenStyleSaveState}
              onPatchStyle={patchSelectedCodegenStyle}
              onPatchOverlay={patchSelectedCodegenOverlay}
              onPatchSettings={patchSelectedCodegenSettings}
              onPatchContent={patchSelectedCodegenContent}
              onPatchAnchor={patchSelectedCodegenAnchor}
              onClose={() => {
                setSelectionToolActive(false);
                setSelectionState(null);
                setHoverState(null);
                setContextMenuState(null);
              }}
            />
          </motion.aside>
        ) : null}
        {effectiveEditorCanvasMode === "visual" && visibleSelection && selectedComponent && activeDocument ? (
          <motion.aside
            key="component-inspector"
            initial={{ width: 0, opacity: 0, x: 28 }}
            animate={{ width: 282, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 28 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hidden shrink-0 overflow-hidden border-l border-white/[0.055] bg-[#101214] xl:block"
          >
            <ComponentInspectorPanel
              key={selectedComponent.id}
              component={selectedComponent}
              document={activeDocument}
              selection={visibleSelection}
              onPatch={patchSelectedComponent}
              onPatchComponent={patchHeaderNavLink}
              onAddChild={(toolKey) =>
                addComponentToPage(toolKey, {
                  rootComponentId: selectedComponent.id,
                  index: selectedComponent.children.length
                })
              }
              onSelectComponent={(componentId) => {
                setSelectionToolActive(true);
                selectPreviewComponent(componentId);
              }}
              onRunAiEdit={onRunAiEdit}
              onClose={() => {
                setSelectionToolActive(false);
                setSelectionState(null);
                setHoverState(null);
                setContextMenuState(null);
              }}
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {pageDeleteTarget ? (
                <motion.div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !deletingPageId) setPageDeleteTarget(null);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-page-title"
                    className="w-full max-w-[390px] rounded-[24px] border border-white/[0.09] bg-[#121415] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-red-300">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <h3 id="delete-page-title" className="text-xl font-semibold text-white">Удалить страницу?</h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Страница «{pageDeleteTarget.name}» будет удалена из сайта. Это действие нельзя отменить.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        disabled={Boolean(deletingPageId)}
                        onClick={() => setPageDeleteTarget(null)}
                        className="h-11 flex-1 rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-wait disabled:opacity-50"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(deletingPageId)}
                        onClick={() => void deleteEditorPage(pageDeleteTarget)}
                        className="h-11 flex-1 rounded-[14px] bg-red-500 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-70"
                      >
                        {deletingPageId ? "Удаляю..." : "Удалить"}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
              {deleteTargetComponent ? (
                <motion.div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setDeleteTargetId(null);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="w-full max-w-[360px] rounded-[24px] border border-white/[0.09] bg-[#121415] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-red-300">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Удалить компонент?</h3>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {componentInspectorSchemas[deleteTargetComponent.type]?.title ?? deleteTargetComponent.type} «
                      {componentDisplayName(deleteTargetComponent)}» будет удален вместе со вложенными элементами.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(null)}
                        className="h-11 flex-1 rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteComponent}
                        className="h-11 flex-1 rounded-[14px] bg-red-500 text-sm font-semibold text-white transition hover:bg-red-400"
                      >
                        Удалить
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

function AdminCodeProjectEditor({
  files,
  selectedPath,
  saveState,
  saveError,
  onSelectPath,
  onSave,
}: {
  files: AdminCodeFile[];
  selectedPath: string;
  saveState: "idle" | "saving" | "error";
  saveError: string | null;
  onSelectPath: (path: string) => void;
  onSave: (path: string, content: string) => void;
}) {
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0] ?? null;
  const groups = useMemo(() => groupAdminCodeFiles(files), [files]);

  if (!selectedFile) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] border border-white/[0.08] bg-white/[0.04] text-lime">
            <FileCode2 className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-white">Код не найден</h2>
          <p className="mt-2 max-w-[380px] text-sm leading-6 text-white/42">
            У этой страницы нет сохраненных codegen-файлов.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[#090b0d] text-white">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/[0.065] bg-[#101214] lg:flex lg:flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <FileCode2 className="h-4 w-4 text-lime" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white/86">Код проекта</p>
            <p className="truncate text-[0.66rem] font-semibold text-white/30">{files.length} файлов</p>
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => (
            <div key={group.directory} className="mb-3 last:mb-0">
              <div className="mb-1 flex h-7 items-center gap-2 px-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/32">
                <Folder className="h-3.5 w-3.5" />
                <span className="truncate">{group.directory}</span>
              </div>
              <div className="space-y-1">
                {group.files.map((file) => {
                  const active = file.path === selectedFile.path;

                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => onSelectPath(file.path)}
                      className={`flex h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 text-left text-xs font-semibold transition ${
                        active
                          ? "bg-lime/[0.12] text-lime ring-1 ring-lime/24"
                          : "text-white/54 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{fileNameFromPath(file.path)}</span>
                      {file.virtual ? (
                        <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[0.56rem] font-black uppercase text-white/30">
                          css
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <CodeFileEditor
        key={selectedFile.path}
        file={selectedFile}
        saveState={saveState}
        saveError={saveError}
        onSave={onSave}
      />
    </div>
  );
}

function CodeFileEditor({
  file,
  saveState,
  saveError,
  onSave,
}: {
  file: AdminCodeFile;
  saveState: "idle" | "saving" | "error";
  saveError: string | null;
  onSave: (path: string, content: string) => void;
}) {
  const [draft, setDraft] = useState(file.content);
  const dirty = draft !== file.content;
  const lineCount = draft.split("\n").length;
  const statusLabel =
    saveState === "saving"
      ? "Сохраняю"
      : saveState === "error"
        ? "Ошибка"
        : dirty
          ? "Есть изменения"
          : "Сохранено";

  const save = useCallback(() => {
    if (!dirty || saveState === "saving") return;

    onSave(file.path, draft);
  }, [dirty, draft, file.path, onSave, saveState]);

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0d0f11] px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white/88">{file.path}</p>
          <p className="truncate text-[0.66rem] font-semibold text-white/30">
            {lineCount} строк · {formatCodeFileSize(draft.length)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`hidden rounded-full border px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.1em] md:inline-flex ${
              saveState === "error"
                ? "border-red-300/20 bg-red-400/[0.08] text-red-100/68"
                : dirty
                  ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-100/68"
                  : "border-lime/20 bg-lime/[0.08] text-lime/70"
            }`}
          >
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saveState === "saving"}
            className="inline-flex h-8 items-center gap-2 rounded-[9px] bg-lime px-3 text-xs font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {saveState === "saving" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Сохранить
          </button>
        </div>
      </header>

      {saveError ? (
        <div className="shrink-0 border-b border-red-300/15 bg-red-400/[0.07] px-4 py-2 text-xs leading-5 text-red-100/78">
          {saveError}
        </div>
      ) : null}

      <textarea
        spellCheck={false}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            save();
          }
        }}
        className="min-h-0 flex-1 resize-none border-0 bg-[#08090a] px-4 py-4 font-mono text-[12.5px] leading-6 text-white/82 outline-none selection:bg-lime/25 selection:text-white placeholder:text-white/24"
      />
    </section>
  );
}

function groupAdminCodeFiles(files: AdminCodeFile[]) {
  const groups = new Map<string, AdminCodeFile[]>();

  for (const file of files) {
    const slashIndex = file.path.lastIndexOf("/");
    const directory = slashIndex === -1 ? "root" : file.path.slice(0, slashIndex);
    const group = groups.get(directory) ?? [];
    group.push(file);
    groups.set(directory, group);
  }

  return Array.from(groups.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([directory, groupFiles]) => ({
      directory,
      files: groupFiles.toSorted((first, second) => first.path.localeCompare(second.path)),
    }));
}

function fileNameFromPath(path: string) {
  return path.split("/").pop() || path;
}

function formatCodeFileSize(length: number) {
  if (length < 1024) return `${length} B`;

  return `${(length / 1024).toFixed(1)} KB`;
}

function CodegenSelectionOverlay({ selection }: { selection: EditorSelection | null }) {
  if (!selection) return null;

  return (
    <div
      className="pointer-events-none absolute z-40 rounded-[8px] border border-lime shadow-[0_0_0_1px_rgba(190,255,76,0.24),0_0_34px_rgba(190,255,76,0.16)]"
      style={{
        top: selection.top,
        left: selection.left,
        width: selection.width,
        height: selection.height,
      }}
    >
      <div className="absolute -left-px -top-7 rounded-[8px] border border-lime/35 bg-[#0c0f0d]/95 px-2 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-lime shadow-[0_12px_34px_rgba(0,0,0,0.36)]">
        {selection.label}
      </div>
    </div>
  );
}

function formatCodegenViewportLabel(viewport: WebBrainCodegenViewport) {
  if (viewport === "mobile") return "Mobile";
  if (viewport === "tablet") return "Tablet";

  return "Desktop";
}

function getCodegenViewportSettings(element: WebBrainCodegenElement, viewport: WebBrainCodegenViewport): WebBrainCodegenSettings {
  const baseSettings = element.settingsByViewport?.desktop ?? element.settings ?? {};
  const viewportSettings = viewport === "desktop" ? {} : element.settingsByViewport?.[viewport] ?? {};

  return {
    ...baseSettings,
    ...viewportSettings,
  };
}

function CodegenInspectorPanel({
  element,
  viewport,
  saveState,
  onPatchStyle,
  onPatchOverlay,
  onPatchSettings,
  onPatchContent,
  onPatchAnchor,
  onClose,
}: {
  element: WebBrainCodegenElement;
  viewport: WebBrainCodegenViewport;
  saveState: "idle" | "saving" | "error";
  onPatchStyle: (property: string, value: WebBrainCodegenStyleValue) => void;
  onPatchOverlay: (state: "hover" | "focus" | "mobile" | "tablet", property: string, value: WebBrainCodegenStyleValue) => void;
  onPatchSettings: (settings: WebBrainCodegenSettings) => void;
  onPatchContent: (kind: WebBrainCodegenContentKind, value: string) => void;
  onPatchAnchor: (value: string) => void;
  onClose: () => void;
}) {
  const statusText = saveState === "saving" ? "Сохраняю" : saveState === "error" ? "Ошибка сохранения" : viewport === "desktop" ? "Desktop base" : `${formatCodegenViewportLabel(viewport)} overrides`;
  const responsiveSettings = getCodegenViewportSettings(element, viewport);
  const elementTitle = formatCodegenElementTitle(element);
  const elementKind = formatCodegenTagLabel(element.tag);

  const patch = (property: string, value: WebBrainCodegenStyleValue) => {
    onPatchStyle(property, value);
  };

  return (
    <div className="flex h-full w-[282px] flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.055] px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white/84">{elementTitle}</p>
          <p className="truncate text-[0.68rem] text-white/35">{elementKind} · {statusText}</p>
        </div>
        <button
          type="button"
          aria-label="Закрыть настройки"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-white/38 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-[13px] border border-lime/18 bg-lime/[0.045] p-3">
          <p className="text-xs font-semibold text-lime">Якорь блока</p>
          <div className="mt-2">
            <CodegenAnchorInput
              value={element.id}
              placeholder="faq"
              onCommit={onPatchAnchor}
            />
          </div>
          <p className="mt-2 text-[0.66rem] leading-4 text-white/34">
            В кнопке или пункте меню укажите #{element.id}.
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[0.66rem] text-white/32">{element.position.filePath}</p>
            <span className="shrink-0 rounded-full border border-lime/20 bg-lime/[0.08] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-lime/78">
              {formatCodegenViewportLabel(viewport)}
            </span>
          </div>
        </div>

        {element.settingsSchema.length ? (
          <CodegenPrimitiveSettingsPanel
            primitive={element.primitive}
            settings={responsiveSettings}
            schema={element.settingsSchema}
            viewport={viewport}
            onPatch={onPatchSettings}
          />
        ) : element.primitive ? (
          <div className="mb-4 rounded-[13px] border border-sky-400/18 bg-sky-400/[0.045] p-3">
            <p className="text-xs font-semibold text-sky-200">Primitive</p>
            <p className="mt-1 text-sm font-semibold text-white/78">{formatCodegenPrimitiveLabel(element.primitive)}</p>
            <p className="mt-2 text-[0.68rem] leading-4 text-white/40">
              У блока есть интерактивное поведение, но ИИ не добавил схему настроек.
            </p>
          </div>
        ) : null}

        <CodegenContentPanel element={element} onPatchContent={onPatchContent} />

        <div className="space-y-3">
          <CodegenStyleField
            label="Цвет текста"
            property="color"
            value={element.style.color}
            placeholder="#ffffff"
            onPatch={patch}
          />
          <CodegenStyleField
            label="Фон"
            property="background"
            value={element.style.background}
            placeholder="transparent"
            onPatch={patch}
          />
          <CodegenStyleField
            label="Размер текста"
            property="fontSize"
            value={element.style.fontSize}
            placeholder="32"
            numeric
            onPatch={patch}
          />
          <CodegenStyleField
            label="Отступ внутри"
            property="padding"
            value={element.style.padding}
            placeholder="24px"
            onPatch={patch}
          />
          <CodegenStyleField
            label="Скругление"
            property="borderRadius"
            value={element.style.borderRadius}
            placeholder="16"
            numeric
            onPatch={patch}
          />
          <CodegenStyleField
            label="Ширина"
            property="width"
            value={element.style.width}
            placeholder="100%"
            onPatch={patch}
          />
          <CodegenStyleField
            label="Высота"
            property="height"
            value={element.style.height}
            placeholder="auto"
            onPatch={patch}
          />
        </div>

        <div className="mt-6 border-t border-white/[0.065] pt-4">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/34">Слои / layout</p>
          <div className="grid grid-cols-2 gap-3">
            <CodegenStyleField
              label="Позиция"
              property="position"
              value={element.style.position}
              placeholder="relative"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Z-index"
              property="zIndex"
              value={element.style.zIndex}
              placeholder="2"
              numeric
              onPatch={patch}
            />
            <CodegenStyleField
              label="Сверху"
              property="top"
              value={element.style.top}
              placeholder="24px"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Справа"
              property="right"
              value={element.style.right}
              placeholder="-32px"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Снизу"
              property="bottom"
              value={element.style.bottom}
              placeholder="auto"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Слева"
              property="left"
              value={element.style.left}
              placeholder="8%"
              onPatch={patch}
            />
          </div>
          <div className="mt-3 space-y-3">
            <CodegenStyleField
              label="Display"
              property="display"
              value={element.style.display}
              placeholder="grid"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Grid columns"
              property="gridTemplateColumns"
              value={element.style.gridTemplateColumns}
              placeholder="1.1fr 0.9fr"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Gap"
              property="gap"
              value={element.style.gap}
              placeholder="clamp(20px, 4vw, 72px)"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Overflow"
              property="overflow"
              value={element.style.overflow}
              placeholder="visible"
              onPatch={patch}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-white/[0.065] pt-4">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/34">Движение / глубина</p>
          <div className="space-y-3">
            <CodegenStyleField
              label="Transform"
              property="transform"
              value={element.style.transform}
              placeholder="translateY(-24px) rotate(-2deg)"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Shadow"
              property="boxShadow"
              value={element.style.boxShadow}
              placeholder="0 28px 90px rgba(0,0,0,.42)"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Opacity"
              property="opacity"
              value={element.style.opacity}
              placeholder="0.92"
              numeric
              onPatch={patch}
            />
            <CodegenStyleField
              label="Filter"
              property="filter"
              value={element.style.filter}
              placeholder="blur(0px)"
              onPatch={patch}
            />
            <CodegenStyleField
              label="Backdrop"
              property="backdropFilter"
              value={element.style.backdropFilter}
              placeholder="blur(18px)"
              onPatch={patch}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-white/[0.065] pt-4">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/34">Overlay CSS</p>
          <div className="space-y-3">
            <CodegenStyleField
              label="Hover фон"
              property="background"
              value={undefined}
              placeholder="#bfff45"
              onPatch={(property, value) => onPatchOverlay("hover", property, value)}
            />
            <CodegenStyleField
              label="Focus обводка"
              property="outline"
              value={undefined}
              placeholder="2px solid #bfff45"
              onPatch={(property, value) => onPatchOverlay("focus", property, value)}
            />
            <CodegenStyleField
              label={`${formatCodegenViewportLabel(viewport)} отступ`}
              property="padding"
              value={undefined}
              placeholder="20px"
              onPatch={(property, value) => onPatchOverlay(viewport === "desktop" ? "mobile" : viewport, property, value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CodegenContentPanel({
  element,
  onPatchContent,
}: {
  element: WebBrainCodegenElement;
  onPatchContent: (kind: WebBrainCodegenContentKind, value: string) => void;
}) {
  const supportsText = Boolean(element.text) || ["a", "button", "h1", "h2", "h3", "h4", "h5", "h6", "label", "li", "p", "span"].includes(element.tag);
  const supportsHref = element.tag === "a";
  const supportsSrc = element.tag === "img";

  if (!supportsText && !supportsHref && !supportsSrc) return null;

  return (
    <div className="mb-5 rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-3">
      <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/34">Контент</p>
      <div className="space-y-3">
        {supportsText ? (
          <CodegenContentField
            key={`${element.id}:text:${element.text ?? ""}`}
            label="Текст"
            value={element.text ?? ""}
            multiline
            onCommit={(value) => onPatchContent("text", value)}
          />
        ) : null}
        {supportsHref ? (
          <CodegenContentField
            key={`${element.id}:href:${element.href ?? ""}`}
            label="Ссылка"
            value={element.href ?? ""}
            placeholder="#contact"
            onCommit={(value) => onPatchContent("href", value)}
          />
        ) : null}
        {supportsSrc ? (
          <CodegenContentField
            key={`${element.id}:src:${element.src ?? ""}`}
            label="Изображение"
            value={element.src ?? ""}
            placeholder="https://..."
            onCommit={(value) => onPatchContent("src", value)}
          />
        ) : null}
      </div>
    </div>
  );
}

function CodegenContentField({
  label,
  value,
  placeholder,
  multiline,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => {
    const nextValue = draft.trim();
    if (nextValue !== value) onCommit(nextValue);
  }, [draft, onCommit, value]);

  if (multiline) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs text-white/42">{label}</span>
        <textarea
          value={draft}
          placeholder={placeholder}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="min-h-[86px] w-full resize-none rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-sm leading-5 text-white/82 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-white/42">{label}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="h-10 w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-sm text-white/82 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
      />
    </label>
  );
}

function CodegenAnchorInput({
  value,
  placeholder,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => {
    const nextValue = normalizeEditorAnchorId(draft);
    setDraft(nextValue || value);
    if (nextValue && nextValue !== value) onCommit(nextValue);
  }, [draft, onCommit, value]);

  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1.5 block text-xs text-white/42">ID для ссылок</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-10 w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-sm text-white/82 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
      />
    </label>
  );
}

function CodegenPrimitiveSettingsPanel({
  primitive,
  settings,
  schema,
  viewport,
  onPatch,
}: {
  primitive?: string;
  settings: WebBrainCodegenSettings;
  schema: WebBrainCodegenSettingField[];
  viewport: WebBrainCodegenViewport;
  onPatch: (settings: WebBrainCodegenSettings) => void;
}) {
  const patchSetting = (field: WebBrainCodegenSettingField, value: WebBrainCodegenSettingValue) => {
    onPatch({
      ...settings,
      [field.key]: value,
    });
  };

  return (
    <div className="mb-5 rounded-[16px] border border-sky-400/18 bg-sky-400/[0.045] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-sky-200/72">Smart block</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{primitive ? formatCodegenPrimitiveLabel(primitive) : "Visual settings"}</p>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-sky-100/72">
          {formatCodegenViewportLabel(viewport)}
        </span>
      </div>

      <div className="space-y-3">
        {schema.map((field) => (
          <CodegenPrimitiveSettingField
            key={field.key}
            field={field}
            value={Object.prototype.hasOwnProperty.call(settings, field.key) ? settings[field.key] : field.default}
            onChange={(value) => patchSetting(field, value)}
          />
        ))}
      </div>
    </div>
  );
}

function CodegenPrimitiveSettingField({
  field,
  value,
  onChange,
}: {
  field: WebBrainCodegenSettingField;
  value: WebBrainCodegenSettingValue | undefined;
  onChange: (value: WebBrainCodegenSettingValue) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-[11px] border border-white/[0.06] bg-black/20 px-3 py-2">
        <span className="min-w-0 text-sm font-semibold text-white/72">{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
          className="h-4 w-4 accent-sky-300"
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/34">{field.label}</span>
        <select
          value={typeof value === "string" ? value : field.options?.[0]?.value ?? ""}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="h-10 w-full rounded-[11px] border border-white/[0.07] bg-black/30 px-3 text-sm font-semibold text-white/78 outline-none transition focus:border-sky-300/45 focus:bg-sky-300/[0.045]"
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value} className="bg-[#101214] text-white">
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const numeric = field.type === "number";
  const stringValue = value === null || value === undefined ? "" : String(value);

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/34">
        <span>{field.label}</span>
        {field.cssVar ? <span className="text-sky-200/36">{field.cssVar}</span> : field.unit ? <span className="text-white/24">{field.unit}</span> : null}
      </span>
      <input
        key={`${field.key}:${stringValue}`}
        type={numeric ? "number" : field.type === "color" ? "text" : "text"}
        min={numeric ? field.min : undefined}
        max={numeric ? field.max : undefined}
        step={numeric ? field.step ?? 1 : undefined}
        defaultValue={stringValue}
        placeholder={field.type === "color" ? "#bfff45" : undefined}
        onBlur={(event) => {
          const nextValue = event.currentTarget.value.trim();
          if (!nextValue) {
            onChange(null);
            return;
          }

          onChange(numeric ? clampEditorFloat(nextValue, Number(value) || 0, field.min ?? -10000, field.max ?? 10000) : nextValue);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-10 w-full rounded-[11px] border border-white/[0.07] bg-black/20 px-3 text-sm font-semibold text-white/78 outline-none transition placeholder:text-white/22 focus:border-sky-300/45 focus:bg-sky-300/[0.045]"
      />
    </label>
  );
}

function formatCodegenPrimitiveLabel(primitive: string) {
  if (primitive === "reveal") return "Reveal panel";
  if (primitive === "accordion") return "Accordion";
  if (primitive === "tabs") return "Tabs";
  if (primitive === "sticky-stack") return "Sticky stack";
  if (primitive === "carousel") return "Carousel";
  if (primitive === "drawer") return "Drawer";
  if (primitive === "marquee") return "Marquee";
  if (primitive === "hover-expand") return "Hover expand";

  return primitive;
}

function CodegenStyleField({
  label,
  property,
  value,
  placeholder,
  numeric = false,
  onPatch,
}: {
  label: string;
  property: string;
  value: WebBrainCodegenStyleValue | undefined;
  placeholder: string;
  numeric?: boolean;
  onPatch: (property: string, value: WebBrainCodegenStyleValue) => void;
}) {
  const defaultValue = formatCodegenStyleValue(value);
  const commit = (rawValue: string) => {
    const nextValue = parseCodegenStyleValue(rawValue, numeric);
    if (nextValue === value || (nextValue == null && value == null)) return;

    onPatch(property, nextValue);
  };

  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/34">{label}</span>
      <input
        key={`${property}:${defaultValue}`}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-10 w-full rounded-[11px] border border-white/[0.07] bg-black/20 px-3 text-sm font-semibold text-white/78 outline-none transition placeholder:text-white/22 focus:border-lime/45 focus:bg-lime/[0.045]"
      />
    </label>
  );
}

function formatCodegenStyleValue(value: WebBrainCodegenStyleValue | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseCodegenStyleValue(value: string, numeric: boolean): WebBrainCodegenStyleValue {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (numeric && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function LaptopPlusIcon({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex translate-y-[1px] ${className ?? ""}`} aria-hidden="true">
      <Laptop className="h-full w-full" />
      <Plus className="absolute -right-[3px] -top-[4px] h-2.5 w-2.5 rounded-[3px] bg-[#242626] stroke-[2.5]" />
    </span>
  );
}

function AiCanvasWorkOverlay({
  active,
  status,
  iframeRef
}: {
  active: boolean;
  status: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const touchPointRef = useRef<{ x: number; y: number } | null>(null);
  const [badgePosition, setBadgePosition] = useState({ x: 22, y: 22 });
  const [cycleIndex, setCycleIndex] = useState(0);
  const shouldCycleStatus = active && ["Собираю страницу", "Редактирую сайт"].includes(status);
  const visibleStatus = shouldCycleStatus ? activeEditingStatusSequence[cycleIndex % activeEditingStatusSequence.length] : status;

  const scrollPreview = useCallback(
    (deltaX: number, deltaY: number) => {
      const previewWindow = iframeRef.current?.contentWindow;
      if (!previewWindow) return;

      try {
        previewWindow.scrollBy({
          left: deltaX,
          top: deltaY,
          behavior: "auto"
        });
      } catch {
        previewWindow.postMessage(
          {
            type: "webbrain:scroll-preview",
            deltaX,
            deltaY
          },
          "*"
        );
      }
    },
    [iframeRef]
  );

  const moveBadge = useCallback((clientX: number, clientY: number, currentTarget: HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const badgeWidth = 252;
    const badgeHeight = 44;
    const nextX = Math.min(Math.max(14, clientX - rect.left + 18), Math.max(14, rect.width - badgeWidth));
    const nextY = Math.min(Math.max(14, clientY - rect.top + 18), Math.max(14, rect.height - badgeHeight));

    setBadgePosition({ x: nextX, y: nextY });
  }, []);

  useEffect(() => {
    if (!shouldCycleStatus) {
      return;
    }

    const timer = window.setInterval(() => {
      setCycleIndex((index) => index + 1);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [shouldCycleStatus]);

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-[55] select-none overflow-hidden rounded-[13px]"
      style={
        {
          "--ai-badge-x": `${badgePosition.x}px`,
          "--ai-badge-y": `${badgePosition.y}px`
        } as CSSProperties
      }
      onPointerMove={(event) => moveBadge(event.clientX, event.clientY, event.currentTarget)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onWheel={(event: ReactWheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        scrollPreview(event.deltaX, event.deltaY);
      }}
      onTouchStart={(event: ReactTouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        if (!touch) return;

        touchPointRef.current = { x: touch.clientX, y: touch.clientY };
        moveBadge(touch.clientX, touch.clientY, event.currentTarget);
      }}
      onTouchMove={(event: ReactTouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        const previous = touchPointRef.current;
        if (!touch || !previous) return;

        event.preventDefault();
        event.stopPropagation();
        scrollPreview(previous.x - touch.clientX, previous.y - touch.clientY);
        touchPointRef.current = { x: touch.clientX, y: touch.clientY };
        moveBadge(touch.clientX, touch.clientY, event.currentTarget);
      }}
      onTouchEnd={() => {
        touchPointRef.current = null;
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/40 backdrop-saturate-[0.72]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--ai-badge-x,50%)_var(--ai-badge-y,50%),rgba(190,255,76,0.11),transparent_18%)]" />
      <motion.div
        aria-live="polite"
        initial={false}
        animate={{ x: badgePosition.x, y: badgePosition.y }}
        transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.62 }}
        className="pointer-events-none absolute left-0 top-0 flex max-w-[252px] items-center gap-2 overflow-hidden rounded-[13px] border border-white/[0.12] bg-[#111315]/90 px-3 py-2 text-[0.72rem] font-semibold text-white/76 shadow-[0_18px_48px_rgba(0,0,0,0.42)] backdrop-blur-xl"
      >
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border border-lime/25 bg-lime/[0.09] text-lime">
          <MousePointer2 className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_12px_rgba(190,255,76,0.9)]" />
        </span>
        <motion.span
          key={visibleStatus}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-w-0 truncate"
        >
          {visibleStatus}
        </motion.span>
        <span className="relative ml-0.5 flex h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="absolute inset-y-0 left-0 w-1/2 animate-[webbrain-ai-progress_1.1s_ease-in-out_infinite] rounded-full bg-lime/80" />
        </span>
      </motion.div>
    </div>
  );
}

function getChildInsertTools(type: WebBrainComponentType): { key: EditorComponentToolKey; label: string; icon: ReactNode }[] {
  if (!canContainEditorChildren(type)) return [];

  const textTools: { key: EditorComponentToolKey; label: string; icon: ReactNode }[] = [
    { key: "text", label: "Текст", icon: <AlignLeft className="h-3.5 w-3.5" /> },
    { key: "link", label: "Ссылка", icon: <ExternalLink className="h-3.5 w-3.5" /> },
    { key: "button", label: "Кнопка", icon: <MousePointer2 className="h-3.5 w-3.5" /> },
    { key: "image", label: "Картинка", icon: <ImageIcon className="h-3.5 w-3.5" /> }
  ];

  if (type === "page") {
    return [
      { key: "section", label: "Секция", icon: <Square className="h-3.5 w-3.5" /> },
      { key: "container", label: "Контейнер", icon: <Box className="h-3.5 w-3.5" /> },
      { key: "footer", label: "Футер", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> }
    ];
  }

  if (type === "row") {
    return [{ key: "column", label: "Колонка", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> }, ...textTools];
  }

  if (type === "grid" || type === "cardGrid") {
    return [{ key: "column", label: "Колонка", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> }, ...textTools];
  }

  return [
    ...textTools,
    { key: "row", label: "Ряд", icon: <PanelsTopLeft className="h-3.5 w-3.5" /> },
    { key: "column", label: "Колонка", icon: <Square className="h-3.5 w-3.5" /> },
    { key: "grid", label: "Сетка", icon: <Box className="h-3.5 w-3.5" /> }
  ];
}

function ComponentInspectorPanel({
  component,
  document,
  selection,
  onPatch,
  onPatchComponent,
  onAddChild,
  onSelectComponent,
  onRunAiEdit,
  onClose
}: {
  component: WebBrainComponent;
  document: WebBrainDocument;
  selection: EditorSelection | null;
  onPatch: (patch: ComponentPatch) => void;
  onPatchComponent: (componentId: string, patch: ComponentPatch) => void;
  onAddChild: (toolKey: EditorComponentToolKey) => void;
  onSelectComponent: (componentId: string) => void;
  onRunAiEdit: (prompt: string) => void;
  onClose: () => void;
}) {
  const schema = componentInspectorSchemas[component.type] ?? componentInspectorSchemas.stack;
  const editorNode = getEditorNodeManifest(document, component);
  const settingsControls = editorNode.controls.filter((control) => isSettingsManifestControl(control, schema.settings));
  const styleControls = editorNode.controls.filter((control) => isStyleManifestControl(control, schema.style));
  const defaultTab = settingsControls.length ? "settings" : "style";
  const [activeTab, setActiveTab] = useState<"settings" | "style" | "effects">(defaultTab);
  const navLinks = component.type === "header" ? getComponentChildren(document, component).filter((child) => child.type === "navLink") : [];
  const childTools = getChildInsertTools(component.type);
  // Temporarily disabled by request: the inline "Добавить внутрь" block is not needed in the inspector right now.
  const showChildInsertTools = false;
  const activeControls = activeTab === "settings" ? settingsControls : activeTab === "style" ? styleControls : [];
  const themeTokens = getEditorThemeTokens(document);
  const effectsTabControlCount = component.type === "page" ? 0 : 1;
  const renderControl = (control: WebBrainEditorControl) => {
    if (control.inspectorControl) {
      return (
        <InspectorControlField
          key={control.key}
          control={control.inspectorControl}
          component={component}
          themeTokens={themeTokens}
          navLinks={navLinks}
          selection={selection}
          onPatch={onPatch}
          onPatchComponent={onPatchComponent}
        />
      );
    }

    return (
        <ManifestInspectorControlField
          key={control.key}
          control={control}
          document={document}
          component={component}
          themeTokens={themeTokens}
          onSelectComponent={onSelectComponent}
          onRunAiEdit={onRunAiEdit}
          onPatch={onPatch}
        />
    );
  };

  return (
    <div className="flex h-full w-[282px] flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.055] px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white/84">{editorNode.label || schema.title}</p>
          <p className="truncate text-[0.68rem] text-white/35">{componentDisplayName(component)}</p>
        </div>
        <button
          type="button"
          aria-label="Закрыть настройки"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-white/38 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {showChildInsertTools && childTools.length ? (
          <div className="mb-5 rounded-[13px] border border-lime/18 bg-lime/[0.045] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-lime">Добавить внутрь</p>
              <span className="truncate text-[0.62rem] text-white/32">{componentInspectorSchemas[component.type]?.title ?? component.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {childTools.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => onAddChild(tool.key)}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-white/[0.055] bg-black/18 px-2 text-left text-[0.68rem] font-semibold text-white/62 transition hover:border-lime/35 hover:bg-lime/[0.1] hover:text-lime"
                >
                  {tool.icon}
                  <span className="truncate">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <ManifestAiActionPanel editorNode={editorNode} component={component} onRunAiEdit={onRunAiEdit} />

        <div className="mb-5 flex gap-5 border-b border-white/[0.065] text-sm">
          {[
            { key: "settings" as const, label: "Настройки", count: settingsControls.length },
            { key: "style" as const, label: "Стиль", count: styleControls.length },
            { key: "effects" as const, label: "Эффекты", count: effectsTabControlCount }
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const isDisabled = tab.count === 0;

            return (
              <button
                key={tab.key}
                type="button"
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.key)}
                className={`relative pb-2 transition ${
                  isActive ? "text-white" : isDisabled ? "cursor-not-allowed text-white/20" : "text-white/42 hover:text-white/70"
                }`}
              >
                {tab.label}
                {isActive ? <motion.span layoutId="inspector-tab-line" className="absolute -bottom-px left-0 right-0 h-px bg-white" /> : null}
              </button>
            );
          })}
        </div>

        {activeTab === "effects" ? (
          <InspectorEffectsPanel component={component} onPatch={onPatch} />
        ) : activeControls.length ? (
          <StructuredManifestInspectorContent component={component} tab={activeTab} controls={activeControls} renderControl={renderControl} />
        ) : (
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-3 py-4 text-sm text-white/38">Для этого компонента здесь пока нет параметров.</div>
        )}
      </div>
    </div>
  );
}

type InspectorContentTab = "settings" | "style";

type InspectorControlGroupDefinition = {
  title: string;
  description?: string;
  controls: InspectorControl[];
  defaultOpen?: boolean;
};

function StructuredManifestInspectorContent({
  component,
  tab,
  controls,
  renderControl
}: {
  component: WebBrainComponent;
  tab: InspectorContentTab;
  controls: WebBrainEditorControl[];
  renderControl: (control: WebBrainEditorControl) => ReactNode;
}) {
  const knownControls = controls.filter((control) => control.inspectorControl);
  const customControls = controls.filter((control) => !control.inspectorControl);
  const controlByInspector = new Map(knownControls.map((control) => [control.inspectorControl, control]));
  const groups = getInspectorControlGroups(
    component.type,
    tab,
    knownControls.map((control) => control.inspectorControl).filter((control): control is InspectorControl => Boolean(control))
  );

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <InspectorControlFoldout key={group.title} title={group.title} description={group.description} defaultOpen={group.defaultOpen ?? true}>
          {group.controls.map((control) => {
            const manifestControl = controlByInspector.get(control);
            return manifestControl ? renderControl(manifestControl) : null;
          })}
        </InspectorControlFoldout>
      ))}
      {customControls.length ? (
        <InspectorControlFoldout
          title="Manifest"
          description="Поля, которые описал ИИ именно для этого блока."
          defaultOpen={!knownControls.length}
        >
          {customControls.map(renderControl)}
        </InspectorControlFoldout>
      ) : null}
    </div>
  );
}

function isSettingsManifestControl(control: WebBrainEditorControl, schemaSettings: InspectorControl[]) {
  if (control.inspectorControl && schemaSettings.includes(control.inspectorControl)) return true;
  const target = control.binding?.target;
  return target === "props" || target === "children" || target === "component" || control.type === "list" || control.type === "form" || control.type === "dataSource";
}

function isStyleManifestControl(control: WebBrainEditorControl, schemaStyle: InspectorControl[]) {
  if (control.inspectorControl && schemaStyle.includes(control.inspectorControl)) return true;
  const target = control.binding?.target;
  return target === "style" || target === "effects" || target === "theme" || control.type === "color" || control.type === "spacing" || control.type === "animation";
}

function ManifestAiActionPanel({
  editorNode,
  component,
  onRunAiEdit,
}: {
  editorNode: WebBrainEditorNodeManifest;
  component: WebBrainComponent;
  onRunAiEdit: (prompt: string) => void;
}) {
  const actions = editorNode.aiActions ?? [];
  if (!actions.length) return null;

  return (
    <div className="mb-4 rounded-[13px] border border-lime/18 bg-lime/[0.045] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-lime">AI-правка</p>
        <span className="truncate text-[0.62rem] text-white/32">{component.id}</span>
      </div>
      <div className="grid gap-1.5">
        {actions.slice(0, 3).map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onRunAiEdit(action.prompt)}
            className="flex min-h-8 items-center gap-2 rounded-[8px] border border-white/[0.055] bg-black/18 px-2 text-left text-[0.68rem] font-semibold text-white/68 transition hover:border-lime/35 hover:bg-lime/[0.1] hover:text-lime"
          >
            <Wand2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getInspectorControlGroups(type: WebBrainComponentType, tab: InspectorContentTab, controls: InspectorControl[]): InspectorControlGroupDefinition[] {
  if (tab === "settings") {
    return buildInspectorControlGroups(controls, [
      {
        title: type === "image" ? "Медиа" : "Контент",
        description:
          type === "header"
            ? "Название бренда и пункты меню."
            : type === "button"
              ? "Текст кнопки и действие при клике."
              : type === "image"
                ? "Картинка, подпись и запасной URL."
                : "Основное содержимое элемента.",
        controls: ["brand", "text", "textAccent", "label", "links", "imageUpload", "imageAlt", "imageSrc"],
        defaultOpen: true
      },
      {
        title: "Ссылка",
        description: "Страница, якорь или внешний URL.",
        controls: ["href", "target"],
        defaultOpen: true
      },
      {
        title: "Якорь блока",
        description: "ID, куда ведут ссылки вида #faq.",
        controls: ["anchorId"],
        defaultOpen: true
      },
      {
        title: "Семантика",
        description: "Роль элемента для структуры страницы.",
        controls: ["level", "semanticTag", "ariaLabel"],
        defaultOpen: true
      }
    ]);
  }

  if (type === "heading" || type === "text" || type === "navLink") {
    return buildInspectorControlGroups(controls, [
      {
        title: "Типографика",
        description: type === "navLink" ? "Вид ссылки в навигации и hover-цвет." : "Размер, насыщенность, строки и цвет.",
        controls: ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "textColor", "hoverColor", "align"],
        defaultOpen: true
      },
      {
        title: "Размер",
        description: "Ширина слоя и поведение внутри родителя.",
        controls: ["widthMode", "width", "minWidth", "maxWidth", "grow", "overflow"],
        defaultOpen: true
      },
      {
        title: "Позиция",
        description: "Положение слоя, смещения и порядок по глубине.",
        controls: ["position", "positionOffsets", "zIndex"],
        defaultOpen: false
      },
      {
        title: "Отступы",
        description: "Свободное место вокруг текстового слоя.",
        controls: ["padding", "margin"],
        defaultOpen: true
      }
    ]);
  }

  if (type === "button") {
    return buildInspectorControlGroups(controls, [
      {
        title: "Кнопка",
        description: "Вариант и базовый размер кнопки.",
        controls: ["buttonVariant", "buttonSize"],
        defaultOpen: true
      },
      {
        title: "Иконка",
        description: "Знак внутри кнопки: тип, позиция, размер и цвет.",
        controls: ["buttonIcon"],
        defaultOpen: true
      },
      {
        title: "Размер",
        description: "Ширина, высота и поведение внутри родителя.",
        controls: ["widthMode", "width", "heightMode", "height", "minWidth", "maxWidth", "grow", "overflow"],
        defaultOpen: true
      },
      {
        title: "Текст",
        description: "Надпись внутри кнопки и ее читаемость.",
        controls: ["fontSize", "fontWeight", "letterSpacing", "textColor", "align"],
        defaultOpen: true
      },
      {
        title: "Позиция",
        description: "Положение кнопки, смещения и слой.",
        controls: ["position", "positionOffsets", "zIndex"],
        defaultOpen: false
      },
      {
        title: "Отступы",
        description: "Внутреннее дыхание и место вокруг кнопки.",
        controls: ["padding", "margin"],
        defaultOpen: true
      },
      {
        title: "Фон и форма",
        description: "Цвет, рамка, скругление и тень.",
        controls: ["background", "borderColor", "radius", "shadow"],
        defaultOpen: true
      }
    ]);
  }

  if (type === "image") {
    return buildInspectorControlGroups(controls, [
      {
        title: "Размер",
        description: "Ширина, высота и ограничения изображения.",
        controls: ["widthMode", "width", "heightMode", "height", "minWidth", "maxWidth", "maxHeight", "grow", "overflow"],
        defaultOpen: true
      },
      {
        title: "Кадрирование",
        description: "Как картинка заполняет свою область.",
        controls: ["imageFit", "imagePosition"],
        defaultOpen: true
      },
      {
        title: "Позиция",
        description: "Положение изображения, смещения и слой.",
        controls: ["position", "positionOffsets", "zIndex"],
        defaultOpen: false
      },
      {
        title: "Отступы",
        controls: ["margin"],
        defaultOpen: true
      },
      {
        title: "Форма",
        description: "Скругление, тень и рамка.",
        controls: ["radius", "borderColor", "shadow", "background"],
        defaultOpen: true
      }
    ]);
  }

  if (type === "page") {
    return buildInspectorControlGroups(controls, [
      {
        title: "Отступы страницы",
        description: "Свободное место между краем холста и первым блоком.",
        controls: ["padding"],
        defaultOpen: true
      },
      {
        title: "Холст",
        description: "Фон всей страницы. Фоны секций и карточек меняются отдельно.",
        controls: ["background", "overflow"],
        defaultOpen: true
      }
    ]);
  }

  return buildInspectorControlGroups(controls, [
    {
      title: "Макет",
      description: getLayoutGroupDescription(type),
      controls: ["direction", "justify", "alignItems", "wrap", "columns", "gap"],
      defaultOpen: true
    },
    {
      title: "Размер",
      description: "Ширина, высота, ограничения и поведение внутри родителя.",
      controls: ["widthMode", "width", "heightMode", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "grow", "overflow"],
      defaultOpen: true
    },
    {
      title: "Позиция",
      description: "Положение блока, смещения и порядок по глубине.",
      controls: ["position", "positionOffsets", "zIndex"],
      defaultOpen: false
    },
    {
      title: "Отступы",
      description: "Внутреннее и внешнее пространство блока.",
      controls: ["padding", "margin"],
      defaultOpen: true
    },
    {
      title: "Фон и рамка",
      description: "Цвет, фоновая картинка, оверлей, обводка и тень.",
      controls: ["background", "backgroundImageUpload", "backgroundImageSrc", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundOverlay", "backgroundOverlayOpacity", "backgroundBlendMode", "borderColor", "radius", "shadow"],
      defaultOpen: true
    },
    {
      title: "Текст внутри",
      description: "Выравнивание текста внутри блока.",
      controls: ["align", "textColor"],
      defaultOpen: false
    }
  ]);
}

function getLayoutGroupDescription(type: WebBrainComponentType) {
  if (type === "footer") return "Строки, колонки и расстояния для нижней части сайта.";
  if (type === "section") return "Поток элементов внутри секции.";
  if (type === "grid" || type === "cardGrid") return "Количество колонок и расстояние между ними.";
  if (type === "row") return "Горизонтальное распределение дочерних элементов.";
  if (type === "column") return "Вертикальная колонка и выравнивание внутри нее.";
  if (type === "header") return "Навигация, бренд и распределение элементов.";

  return "Направление, выравнивание и расстояния между элементами.";
}

function ManifestInspectorControlField({
  control,
  document,
  component,
  themeTokens,
  onSelectComponent,
  onRunAiEdit,
  onPatch,
}: {
  control: WebBrainEditorControl;
  document: WebBrainDocument;
  component: WebBrainComponent;
  themeTokens: EditorThemeTokens;
  onSelectComponent: (componentId: string) => void;
  onRunAiEdit: (prompt: string) => void;
  onPatch: (patch: ComponentPatch) => void;
}) {
  const value = readManifestBindingValue(document, component, control.binding);
  const patchValue = (nextValue: unknown) => {
    const patch = createManifestBindingPatch(control.binding, nextValue);
    if (patch) onPatch(patch);
  };

  if (!control.binding || control.binding.target === "custom") {
    return (
      <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs leading-5 text-white/38">
        <span className="block font-semibold text-white/60">{control.label}</span>
        Это поле требует отдельного AI-патча.
      </div>
    );
  }

  if (control.type === "text" || control.type === "link" || control.type === "dataSource") {
    return (
      <InspectorTextInput
        label={control.label}
        value={typeof value === "string" ? value : ""}
        placeholder={control.placeholder}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "richText") {
    return (
      <InspectorTextField
        label={control.label}
        value={typeof value === "string" ? value : ""}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "color") {
    return (
      <InspectorColorField
        label={control.label}
        value={typeof value === "string" ? value : undefined}
        fallback={themeTokens.text}
        allowRawCss
        allowGradient
        clearLabel="Сбросить"
        onChange={patchValue}
      />
    );
  }

  if (control.type === "number") {
    const numericValue = typeof value === "number" ? value : Number(value);
    return (
      <InspectorRange
        label={control.label}
        value={Number.isFinite(numericValue) ? numericValue : control.min ?? 0}
        min={control.min ?? 0}
        max={control.max ?? 100}
        step={control.step ?? 1}
        unit={control.unit ?? ""}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "spacing") {
    return (
      <InspectorSpacingBox
        label={control.label}
        value={normalizeSpacingValues(value, emptySpacingValues)}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "toggle") {
    return (
      <InspectorBooleanRow
        label={control.label}
        value={Boolean(value)}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "select") {
    const options = control.options?.length
      ? control.options.map((option) => [option.value, option.label] as [string, string])
      : [["", "Не выбрано"] as [string, string]];
    return (
      <InspectorSelect
        label={control.label}
        value={typeof value === "string" || typeof value === "number" ? String(value) : options[0]?.[0] ?? ""}
        options={options}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "image") {
    return (
      <InspectorImageDropzone
        label={control.label}
        value={typeof value === "string" ? value : ""}
        onClear={() => patchValue(undefined)}
        onChange={patchValue}
      />
    );
  }

  if (control.type === "list") {
    const childComponents = component.children
      .map((childId) => findWebBrainComponent(document, childId))
      .filter((child): child is WebBrainComponent => Boolean(child));

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-white/46">{control.label}</p>
          <button
            type="button"
            onClick={() => onRunAiEdit(`Добавь подходящий элемент в список или группу «${component.name || component.type}» и сохрани редактируемую структуру.`)}
            className="rounded-[8px] bg-lime/[0.1] px-2 py-1 text-[0.66rem] font-bold text-lime transition hover:bg-lime/[0.16]"
          >
            AI добавить
          </button>
        </div>
        <div className="space-y-1.5">
          {childComponents.length ? childComponents.map((child, index) => (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelectComponent(child.id)}
              className="flex h-9 w-full items-center justify-between gap-2 rounded-[9px] border border-white/[0.055] bg-white/[0.025] px-2 text-left transition hover:border-lime/30 hover:bg-lime/[0.075]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.72rem] font-semibold text-white/72">{child.name || child.type}</span>
                <span className="block truncate text-[0.6rem] text-white/30">{index + 1}. {child.type}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/28" />
            </button>
          )) : (
            <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-white/34">Список пуст.</div>
          )}
        </div>
      </div>
    );
  }

  if (control.type === "form" || control.type === "animation") {
    return (
      <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs leading-5 text-white/38">
        <span className="block font-semibold text-white/60">{control.label}</span>
        Структурное поле редактируется через canvas или AI-правку выбранного блока.
      </div>
    );
  }

  return null;
}

function readManifestBindingValue(document: WebBrainDocument, component: WebBrainComponent, binding: WebBrainEditorBinding | undefined): unknown {
  if (!binding?.target) return undefined;
  if (binding.target === "props") return readObjectPath(component.props, binding.path);
  if (binding.target === "style") return readObjectPath(component.style, binding.path);
  if (binding.target === "effects") return readObjectPath(component.effects, binding.path);
  if (binding.target === "component") return readObjectPath(component, binding.path);
  if (binding.target === "theme") return readObjectPath(document.theme, binding.path);
  if (binding.target === "children") return component.children;
  return undefined;
}

function createManifestBindingPatch(binding: WebBrainEditorBinding | undefined, value: unknown): ComponentPatch | null {
  if (!binding?.path) return null;
  if (binding.target === "props") return { props: createNestedObjectPatch(binding.path, value) as Partial<WebBrainProps> };
  if (binding.target === "style") return { style: createNestedObjectPatch(binding.path, value) as Partial<WebBrainStyle> };
  if (binding.target === "effects") return { effects: createNestedObjectPatch(binding.path, value) as Partial<WebBrainEffects> };
  if (binding.target === "theme") return { theme: createNestedObjectPatch(binding.path, value) as Partial<WebBrainDocument["theme"]> };
  if (binding.target === "component") return { component: createNestedObjectPatch(binding.path, value) as Partial<Pick<WebBrainComponent, "name">> };
  return null;
}

function readObjectPath(source: unknown, path: string | undefined): unknown {
  if (!path || !source || typeof source !== "object") return source;

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function createNestedObjectPatch(path: string, value: unknown): Record<string, unknown> {
  const segments = path.split(".").filter(Boolean);
  if (!segments.length) return {};

  const root: Record<string, unknown> = {};
  let cursor = root;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }

    const next: Record<string, unknown> = {};
    cursor[segment] = next;
    cursor = next;
  });

  return root;
}

function buildInspectorControlGroups(controls: InspectorControl[], definitions: InspectorControlGroupDefinition[]) {
  const usedControls = new Set<InspectorControl>();
  const groups: InspectorControlGroupDefinition[] = [];

  definitions.forEach((definition) => {
    const pickedControls = definition.controls.filter((control) => controls.includes(control) && !usedControls.has(control));

    if (!pickedControls.length) return;

    pickedControls.forEach((control) => usedControls.add(control));
    groups.push({
      ...definition,
      controls: pickedControls
    });
  });

  const remainingControls = controls.filter((control) => !usedControls.has(control));

  if (remainingControls.length) {
    groups.push({
      title: "Дополнительно",
      description: "Редкие параметры выбранного элемента.",
      controls: remainingControls,
      defaultOpen: false
    });
  }

  return groups;
}

type SemanticTag = NonNullable<WebBrainProps["tag"]>;

function defaultSemanticTagForComponent(type: WebBrainComponentType): SemanticTag {
  if (type === "header") return "header";
  if (type === "footer") return "footer";
  if (type === "section") return "section";
  if (type === "text") return "p";

  return "div";
}

function semanticTagOptionsForComponent(type: WebBrainComponentType): [string, string][] {
  if (type === "text") {
    return [
      ["p", "Абзац"],
      ["span", "Строка"],
      ["div", "Блок"]
    ];
  }

  if (type === "footer") {
    return [
      ["footer", "Footer"],
      ["section", "Section"],
      ["div", "Div"]
    ];
  }

  if (type === "header") {
    return [
      ["header", "Header"],
      ["nav", "Nav"],
      ["div", "Div"]
    ];
  }

  return [
    ["div", "Div"],
    ["section", "Section"],
    ["article", "Article"],
    ["header", "Header"],
    ["footer", "Footer"],
    ["nav", "Nav"],
    ["main", "Main"]
  ];
}

function defaultButtonIconEnabled(props: WebBrainProps) {
  if (props.buttonIconEnabled !== undefined) return props.buttonIconEnabled;
  return props.variant === "primary" || props.variant === "lime3d" || props.variant === undefined;
}

function buttonIconLabel(icon: WebBrainProps["buttonIcon"]) {
  if (icon === "arrowUpRight") return "Стрелка вверх";
  if (icon === "chevronRight") return "Шеврон";
  if (icon === "plus") return "Плюс";
  if (icon === "send") return "Отправка";
  return "Стрелка";
}

function defaultTextAccentText(text?: string) {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words.slice(-Math.min(2, words.length)).join(" ");
}

function defaultInspectorHeightForComponent(type: WebBrainComponentType) {
  if (type === "button") return 48;
  if (type === "image") return 360;
  if (type === "header") return 72;
  if (type === "section") return 420;

  return 160;
}

function InspectorEffectsPanel({
  component,
  onPatch
}: {
  component: WebBrainComponent;
  onPatch: (patch: ComponentPatch) => void;
}) {
  const effects = component.effects ?? {};
  const transform = effects.transform ?? {};
  const overlay = effects.overlay ?? {};
  const transition = effects.transition ?? {};
  const [effectMenuOpen, setEffectMenuOpen] = useState(false);
  const [activeEffect, setActiveEffect] = useState<InspectorEffectKind | null>(null);
  const patchEffects = (nextEffects: Partial<WebBrainEffects>) => onPatch({ effects: nextEffects });
  const patchTransform = (nextTransform: NonNullable<WebBrainEffects["transform"]>) =>
    patchEffects({ transform: { ...transform, ...nextTransform } });
  const patchOverlay = (nextOverlay: NonNullable<WebBrainEffects["overlay"]>) => patchEffects({ overlay: { ...overlay, ...nextOverlay } });
  const patchTransition = (nextTransition: NonNullable<WebBrainEffects["transition"]>) =>
    patchEffects({ transition: { ...transition, ...nextTransition } });
  const cursorEnabled = Boolean(effects.cursor && effects.cursor !== "auto");
  const visibilityEnabled = effects.opacity !== undefined || effects.visible === false;
  const transformEnabled = hasInspectorTransformValues(transform);
  const transitionEnabled = hasInspectorTransitionValues(transition);
  const availableEffects = getInspectorEffectMenuItems(component.type);
  const activeEffects = getEnabledInspectorEffectMenuItems(effects, availableEffects);

  const addEffect = (kind: InspectorEffectKind) => {
    patchEffects(getDefaultInspectorEffectPatch(kind));
    setActiveEffect(kind);
    setEffectMenuOpen(false);
  };

  const removeEffect = (kind: InspectorEffectKind) => {
    patchEffects(getDisabledInspectorEffectPatch(kind, effects));
    setActiveEffect((current) => (current === kind ? null : current));
  };

  return (
    <div className="space-y-5">
      <InspectorGroup title="Эффекты">
        <div className="relative">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm text-white/48">Активные эффекты</span>
            <button
              type="button"
              onClick={() => setEffectMenuOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.07] bg-white/[0.035] text-white/72 transition hover:border-sky-400/45 hover:bg-white/[0.07] hover:text-white"
              aria-label="Добавить эффект"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {effectMenuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#252628] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)]"
              >
                {availableEffects.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => addEffect(item.kind)}
                    className="flex h-11 w-full items-center justify-between rounded-[12px] px-3 text-left text-sm font-semibold text-white/82 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <span>{item.label}</span>
                    {item.submenu ? <span className="text-lg leading-none text-white/34">›</span> : null}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {activeEffects.length ? (
          <div className="space-y-2">
            {activeEffects.map((item) => (
              <InspectorEffectListRow
                key={item.kind}
                label={item.label}
                active={activeEffect === item.kind}
                onOpen={() => setActiveEffect((current) => (current === item.kind ? null : item.kind))}
                onRemove={() => removeEffect(item.kind)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-3 py-4 text-sm text-white/38">
            Нажмите плюс, чтобы добавить анимацию, реакцию на hover, press или scroll.
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeEffect && isInspectorEffectEnabled(activeEffect, effects) ? (
            <motion.div
              key={activeEffect}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="mt-3"
            >
              <InspectorEffectEditorCard
                kind={activeEffect}
                effects={effects}
                onPatch={patchEffects}
                onClose={() => setActiveEffect(null)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </InspectorGroup>

      <InspectorTogglePanel
        title="Поповер"
        enabled={Boolean(overlay.enabled)}
        status={overlay.enabled ? "включен" : "выключен"}
        onToggle={(enabled) => patchOverlay(enabled ? { enabled: true, color: overlay.color ?? "rgba(18, 20, 21, 0.96)", opacity: overlay.opacity ?? 1 } : { enabled: false })}
      >
        {overlay.enabled ? (
          <>
            <InspectorTextInput
              label="Текст окна"
              value={overlay.text ?? ""}
              placeholder="Текст"
              onChange={(value) => patchOverlay({ text: value })}
            />
            <InspectorColorField
              label="Фон окна"
              value={overlay.color}
              fallback="rgba(18, 20, 21, 0.96)"
              allowRawCss
              onChange={(value) => patchOverlay({ color: value })}
            />
            <InspectorEffectNumberRow label="Прозрачность окна" value={overlay.opacity ?? 1} min={0} max={1} step={0.05} onChange={(value) => patchOverlay({ opacity: value })} />
            <InspectorSelect
              label="Позиция"
              value={overlay.position ?? "bottom"}
              options={[
                ["top", "Сверху"],
                ["right", "Справа"],
                ["bottom", "Снизу"],
                ["left", "Слева"],
                ["center", "По центру"]
              ]}
              onChange={(value) => patchOverlay({ position: value as NonNullable<WebBrainEffects["overlay"]>["position"] })}
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-white/48">Выравнивание</span>
              <InspectorOverlayAlignControl
                value={overlay.align ?? "center"}
                onChange={(value) => patchOverlay({ align: value as NonNullable<WebBrainEffects["overlay"]>["align"] })}
              />
            </div>
            <InspectorAxisPair
              label="Смещение"
              values={[overlay.offsetX ?? 0, overlay.offsetY ?? 10]}
              axis={["X", "Y"]}
              min={-240}
              max={240}
              onChange={(values) => patchOverlay({ offsetX: values[0], offsetY: values[1] })}
            />
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm text-white/48">Закрытие</span>
              <InspectorSegmentedToggle
                value={overlay.dismiss ?? "auto"}
                options={[
                  ["auto", "Авто"],
                  ["click", "Клик"]
                ]}
                onChange={(value) => patchOverlay({ dismiss: value as NonNullable<WebBrainEffects["overlay"]>["dismiss"] })}
              />
            </div>
            <InspectorSelect
              label="Коллизии"
              value={overlay.collision ?? "auto"}
              options={[
                ["auto", "Авто"],
                ["none", "Нет"]
              ]}
              onChange={(value) => patchOverlay({ collision: value as NonNullable<WebBrainEffects["overlay"]>["collision"] })}
            />
            <InspectorEffectNumberRow
              label="Отступ от края"
              value={overlay.collisionPadding ?? 20}
              min={0}
              max={120}
              step={1}
              unit="px"
              onChange={(value) => patchOverlay({ collisionPadding: value })}
            />
            <InspectorEffectNumberRow label="Z-index" value={overlay.zIndex ?? 0} min={0} max={999} step={1} onChange={(value) => patchOverlay({ zIndex: value })} />
          </>
        ) : null}
      </InspectorTogglePanel>

      <InspectorTogglePanel
        title="Курсор"
        enabled={cursorEnabled}
        status={cursorEnabled ? cursorLabel(effects.cursor) : "авто"}
        onToggle={(enabled) => patchEffects({ cursor: enabled ? "pointer" : undefined })}
      >
        {cursorEnabled ? (
          <InspectorSelect
            label="Поведение"
            value={effects.cursor ?? "pointer"}
            options={[
              ["default", "Обычный"],
              ["pointer", "Указатель"],
              ["copy", "Копировать"],
              ["grab", "Перетаскивать"]
            ]}
            onChange={(value) => patchEffects({ cursor: value as WebBrainEffects["cursor"] })}
          />
        ) : null}
      </InspectorTogglePanel>

      <InspectorTogglePanel
        title="Видимость"
        enabled={visibilityEnabled}
        status={visibilityEnabled ? `${Math.round((effects.opacity ?? 1) * 100)}%` : "обычно"}
        onToggle={(enabled) => patchEffects(enabled ? { opacity: effects.opacity ?? 1, visible: effects.visible ?? true } : { opacity: undefined, visible: undefined })}
      >
        {visibilityEnabled ? (
          <>
            <InspectorEffectNumberRow label="Прозрачность" value={effects.opacity ?? 1} min={0} max={1} step={0.05} onChange={(value) => patchEffects({ opacity: value })} />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-white/48">Показывать</span>
              <InspectorSegmentedToggle
                value={effects.visible === false ? "no" : "yes"}
                options={[
                  ["yes", "Да"],
                  ["no", "Нет"]
                ]}
                onChange={(value) => patchEffects({ visible: value === "yes" })}
              />
            </div>
          </>
        ) : null}
      </InspectorTogglePanel>

      <InspectorTogglePanel
        title="Трансформации"
        enabled={transformEnabled}
        status={transformEnabled ? "изменены" : "обычно"}
        onToggle={(enabled) => patchEffects({ transform: enabled ? { scale: transform.scale ?? 1 } : clearInspectorTransformPatch() })}
      >
        {transformEnabled ? (
          <InspectorEffectTransformControls
            value={transform}
            defaults={{ scale: 1 }}
            rotateMode="3d"
            showShadow
            onPatch={patchTransform}
          />
        ) : null}
      </InspectorTogglePanel>

      <InspectorTogglePanel
        title="Переход"
        enabled={transitionEnabled}
        status={transitionEnabled ? (transition.type === "spring" ? "пружина" : "кривая") : "обычно"}
        onToggle={(enabled) => patchEffects({ transition: enabled ? { type: "ease", easing: "ease-in-out", duration: 0.4, delay: 0 } : clearInspectorTransitionPatch() })}
      >
        {transitionEnabled ? <InspectorTransitionDesigner transition={transition} onPatch={patchTransition} /> : null}
      </InspectorTogglePanel>
    </div>
  );
}

type InspectorEffectKind =
  | "textEffect"
  | "appear"
  | "hover"
  | "press"
  | "loop"
  | "drag"
  | "scrollSpeed"
  | "scrollTransform"
  | "flow"
  | "ticker";

type InspectorEffectMenuItem = {
  kind: InspectorEffectKind;
  label: string;
  submenu?: boolean;
};

const inspectorEffectOrder: InspectorEffectKind[] = [
  "textEffect",
  "appear",
  "hover",
  "press",
  "loop",
  "drag",
  "scrollTransform",
  "scrollSpeed",
  "flow",
  "ticker"
];

const inspectorEffectLabels: Record<InspectorEffectKind, string> = {
  textEffect: "Текст",
  appear: "Появление",
  hover: "Наведение",
  press: "Нажатие",
  loop: "Цикл",
  drag: "Перетаскивание",
  scrollSpeed: "Скорость скролла",
  scrollTransform: "Скролл-трансформация",
  flow: "Поток",
  ticker: "Тикер"
};

function getInspectorEffectMenuItems(componentType: WebBrainComponentType): InspectorEffectMenuItem[] {
  const items: InspectorEffectMenuItem[] = [
    { kind: "textEffect", label: inspectorEffectLabels.textEffect },
    { kind: "appear", label: inspectorEffectLabels.appear },
    { kind: "hover", label: inspectorEffectLabels.hover },
    { kind: "press", label: inspectorEffectLabels.press },
    { kind: "loop", label: inspectorEffectLabels.loop },
    { kind: "drag", label: inspectorEffectLabels.drag },
    { kind: "scrollTransform", label: inspectorEffectLabels.scrollTransform, submenu: true },
    { kind: "scrollSpeed", label: inspectorEffectLabels.scrollSpeed, submenu: true }
  ];

  if (componentType === "button") {
    items.push({ kind: "flow", label: inspectorEffectLabels.flow }, { kind: "ticker", label: inspectorEffectLabels.ticker });
  }

  return items;
}

function getEnabledInspectorEffectMenuItems(effects: WebBrainEffects, availableEffects: InspectorEffectMenuItem[]) {
  const availableByKind = new Map(availableEffects.map((item) => [item.kind, item]));

  return inspectorEffectOrder
    .filter((kind) => isInspectorEffectEnabled(kind, effects))
    .map((kind) => availableByKind.get(kind) ?? { kind, label: inspectorEffectLabels[kind] });
}

function isInspectorEffectEnabled(kind: InspectorEffectKind, effects: WebBrainEffects) {
  if (kind === "textEffect") return Boolean(effects.textEffect?.enabled);
  if (kind === "appear") return Boolean(effects.appear?.enabled);
  if (kind === "hover") return Boolean(effects.hover?.enabled);
  if (kind === "press") return Boolean(effects.press?.enabled);
  if (kind === "loop") return Boolean(effects.loop?.enabled);
  if (kind === "drag") return Boolean(effects.drag?.enabled);
  if (kind === "scrollSpeed") return Boolean(effects.scrollSpeed?.enabled);
  if (kind === "scrollTransform") return Boolean(effects.scrollTransform?.enabled);
  if (kind === "flow") return Boolean(effects.flow?.enabled);
  return Boolean(effects.ticker?.enabled);
}

const inspectorTransformKeys: Array<keyof WebBrainTransform> = ["opacity", "scale", "rotateX", "rotateY", "rotateZ", "skewX", "skewY", "offsetX", "offsetY", "shadow"];
const inspectorTransitionKeys: Array<keyof WebBrainTransition> = ["duration", "delay", "easing", "bezier", "stiffness", "damping", "mass"];

function hasInspectorTransformValues(transform?: WebBrainTransform) {
  return inspectorTransformKeys.some((key) => transform?.[key] !== undefined);
}

function clearInspectorTransformPatch(): WebBrainTransform {
  return {
    opacity: undefined,
    scale: undefined,
    rotateX: undefined,
    rotateY: undefined,
    rotateZ: undefined,
    skewX: undefined,
    skewY: undefined,
    offsetX: undefined,
    offsetY: undefined,
    shadow: undefined
  };
}

function clearInspectorTransitionPatch(): WebBrainTransition {
  return {
    type: undefined,
    duration: undefined,
    delay: undefined,
    easing: undefined,
    bezier: undefined,
    stiffness: undefined,
    damping: undefined,
    mass: undefined
  };
}

function hasInspectorTransitionValues(transition?: WebBrainTransition) {
  return inspectorTransitionKeys.some((key) => transition?.[key] !== undefined) || transition?.type === "spring";
}

function cursorLabel(cursor: WebBrainEffects["cursor"]) {
  if (cursor === "default") return "обычный";
  if (cursor === "pointer") return "указатель";
  if (cursor === "copy") return "копировать";
  if (cursor === "grab") return "перетаскивание";
  return "авто";
}

function getDefaultInspectorEffectPatch(kind: InspectorEffectKind): Partial<WebBrainEffects> {
  if (kind === "textEffect") {
    return { textEffect: { enabled: true, trigger: "appear", preset: "blur", per: "character", delay: 0, enter: { opacity: 0, offsetY: 12 } } };
  }

  if (kind === "appear") {
    return { appear: { enabled: true, trigger: "appear", preset: "fade-in", delay: 0, enter: { opacity: 0, offsetY: 18, scale: 1 } } };
  }

  if (kind === "hover") return { hover: { enabled: true, opacity: 0.92, scale: 1.04 } };
  if (kind === "press") {
    return {
      press: {
        enabled: true,
        opacity: 1,
        scale: 0.94,
        rotateMode: "2d",
        transition: { type: "spring", stiffness: 288, damping: 12, mass: 1, delay: 0 }
      }
    };
  }

  if (kind === "loop") {
    return {
      loop: {
        enabled: true,
        mode: "loop",
        opacity: 1,
        scale: 1,
        rotateMode: "2d",
        rotateZ: 360,
        offscreen: "play",
        transition: { type: "ease", easing: "linear", duration: 3, delay: 0 }
      }
    };
  }

  if (kind === "drag") {
    return { drag: { enabled: true, freeform: true, snapBack: true, transition: { type: "spring", stiffness: 260, damping: 22, mass: 1 } } };
  }

  if (kind === "scrollSpeed") return { scrollSpeed: { enabled: true, speed: 110 } };
  if (kind === "scrollTransform") {
    return {
      scrollTransform: {
        enabled: true,
        trigger: "scroll",
        from: { opacity: 0.35, offsetY: 30 },
        to: { opacity: 1, offsetY: 0 },
        transition: { type: "ease", easing: "ease-out", duration: 0.4 }
      }
    };
  }

  if (kind === "flow") {
    return { flow: { enabled: true, transition: { type: "spring", stiffness: 260, damping: 20, mass: 1 } } };
  }

  return { ticker: { enabled: true, speed: 100, hoverSpeed: 100, direction: "left", draggable: false } };
}

function getDisabledInspectorEffectPatch(kind: InspectorEffectKind, effects: WebBrainEffects): Partial<WebBrainEffects> {
  if (kind === "textEffect") return { textEffect: { ...(effects.textEffect ?? {}), enabled: false } };
  if (kind === "appear") return { appear: { ...(effects.appear ?? {}), enabled: false } };
  if (kind === "hover") return { hover: { ...(effects.hover ?? {}), enabled: false } };
  if (kind === "press") return { press: { ...(effects.press ?? {}), enabled: false } };
  if (kind === "loop") return { loop: { ...(effects.loop ?? {}), enabled: false } };
  if (kind === "drag") return { drag: { ...(effects.drag ?? {}), enabled: false } };
  if (kind === "scrollSpeed") return { scrollSpeed: { ...(effects.scrollSpeed ?? {}), enabled: false } };
  if (kind === "scrollTransform") return { scrollTransform: { ...(effects.scrollTransform ?? {}), enabled: false } };
  if (kind === "flow") return { flow: { ...(effects.flow ?? {}), enabled: false } };
  return { ticker: { ...(effects.ticker ?? {}), enabled: false } };
}

function InspectorEffectListRow({
  label,
  active,
  onOpen,
  onRemove
}: {
  label: string;
  active: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-11 w-full items-center gap-3 rounded-[12px] px-2.5 text-left text-sm font-semibold transition ${
        active ? "bg-white/[0.12] text-white" : "bg-white/[0.055] text-white/76 hover:bg-white/[0.09] hover:text-white"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-sky-500 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-white/42 transition hover:bg-white/[0.08] hover:text-white/72"
        aria-label="Удалить эффект"
      >
        <X className="h-4 w-4" />
      </span>
    </button>
  );
}

function InspectorEffectEditorCard({
  kind,
  effects,
  onPatch,
  onClose
}: {
  kind: InspectorEffectKind;
  effects: WebBrainEffects;
  onPatch: (effects: Partial<WebBrainEffects>) => void;
  onClose: () => void;
}) {
  const textEffect = effects.textEffect ?? {};
  const appear = effects.appear ?? {};
  const hover = effects.hover ?? {};
  const press = effects.press ?? {};
  const loop = effects.loop ?? {};
  const drag = effects.drag ?? {};
  const scrollSpeed = effects.scrollSpeed ?? {};
  const scrollTransform = effects.scrollTransform ?? {};
  const flow = effects.flow ?? {};
  const ticker = effects.ticker ?? {};

  const patchTextEffect = (next: NonNullable<WebBrainEffects["textEffect"]>) =>
    onPatch({ textEffect: { ...textEffect, ...next, enter: { ...(textEffect.enter ?? {}), ...(next.enter ?? {}) } } });
  const patchAppear = (next: NonNullable<WebBrainEffects["appear"]>) =>
    onPatch({ appear: { ...appear, ...next, enter: { ...(appear.enter ?? {}), ...(next.enter ?? {}) } } });
  const patchHover = (next: NonNullable<WebBrainEffects["hover"]>) => onPatch({ hover: { ...hover, ...next } });
  const patchPress = (next: NonNullable<WebBrainEffects["press"]>) =>
    onPatch({ press: { ...press, ...next, transition: { ...(press.transition ?? {}), ...(next.transition ?? {}) } } });
  const patchLoop = (next: NonNullable<WebBrainEffects["loop"]>) =>
    onPatch({ loop: { ...loop, ...next, transition: { ...(loop.transition ?? {}), ...(next.transition ?? {}) } } });
  const patchDrag = (next: NonNullable<WebBrainEffects["drag"]>) =>
    onPatch({ drag: { ...drag, ...next, transition: { ...(drag.transition ?? {}), ...(next.transition ?? {}) } } });
  const patchScrollSpeed = (next: NonNullable<WebBrainEffects["scrollSpeed"]>) => onPatch({ scrollSpeed: { ...scrollSpeed, ...next } });
  const patchScrollTransform = (next: NonNullable<WebBrainEffects["scrollTransform"]>) =>
    onPatch({
      scrollTransform: {
        ...scrollTransform,
        ...next,
        from: { ...(scrollTransform.from ?? {}), ...(next.from ?? {}) },
        to: { ...(scrollTransform.to ?? {}), ...(next.to ?? {}) },
        transition: { ...(scrollTransform.transition ?? {}), ...(next.transition ?? {}) }
      }
    });
  const patchFlow = (next: NonNullable<WebBrainEffects["flow"]>) =>
    onPatch({ flow: { ...flow, ...next, transition: { ...(flow.transition ?? {}), ...(next.transition ?? {}) } } });
  const patchTicker = (next: NonNullable<WebBrainEffects["ticker"]>) => onPatch({ ticker: { ...ticker, ...next } });
  const patchBaseTransition = (next: NonNullable<WebBrainEffects["transition"]>) =>
    onPatch({ transition: { ...(effects.transition ?? {}), ...next } });
  const baseTransition = effects.transition ?? { type: "ease", easing: "ease-in-out", duration: 0.4, delay: 0 };

  return (
    <div className="rounded-[18px] border border-white/[0.07] bg-[#101112] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.36)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h4 className="text-base font-semibold text-white">{inspectorEffectLabels[kind]}</h4>
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/45 transition hover:bg-white/[0.08] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <InspectorEffectPreview label={inspectorEffectLabels[kind]} kind={kind} effects={effects} />

      {kind === "textEffect" ? (
        <>
          <InspectorSelect
            label="Триггер"
            value={textEffect.trigger ?? "appear"}
            options={[
              ["appear", "При появлении"],
              ["hover", "При наведении"],
              ["scroll", "При скролле"]
            ]}
            onChange={(value) => patchTextEffect({ trigger: value as NonNullable<WebBrainEffects["textEffect"]>["trigger"] })}
          />
          <InspectorSelect
            label="Пресет"
            value={textEffect.preset ?? "blur"}
            options={[
              ["blur", "Размытие"],
              ["fade", "Проявление"],
              ["slide", "Сдвиг"],
              ["scale", "Масштаб"]
            ]}
            onChange={(value) => patchTextEffect({ preset: value as NonNullable<WebBrainEffects["textEffect"]>["preset"] })}
          />
          <InspectorSelect
            label="Разбивка"
            value={textEffect.per ?? "character"}
            options={[
              ["character", "По символам"],
              ["word", "По словам"],
              ["line", "По строкам"]
            ]}
            onChange={(value) => patchTextEffect({ per: value as NonNullable<WebBrainEffects["textEffect"]>["per"] })}
          />
          <InspectorEffectNumberRow label="Задержка" value={textEffect.delay ?? 0} min={0} max={3} step={0.05} unit="с" onChange={(value) => patchTextEffect({ delay: value })} />
          <InspectorEffectSubPanel title="Начальное состояние">
            <InspectorEffectTransformControls
              value={textEffect.enter ?? {}}
              defaults={{ opacity: 0, scale: 1, offsetY: 12 }}
              compact
              onPatch={(value) => patchTextEffect({ enter: value })}
            />
          </InspectorEffectSubPanel>
          <InspectorNestedTransition title="Переход" transition={baseTransition} onPatch={patchBaseTransition} />
        </>
      ) : null}

      {kind === "appear" ? (
        <>
          <InspectorSelect
            label="Триггер"
            value={appear.trigger ?? "appear"}
            options={[
              ["appear", "При появлении"],
              ["scroll", "При скролле"]
            ]}
            onChange={(value) => patchAppear({ trigger: value as NonNullable<WebBrainEffects["appear"]>["trigger"] })}
          />
          <InspectorSelect
            label="Пресет"
            value={appear.preset ?? "fade-in"}
            options={[
              ["fade-in", "Плавное появление"],
              ["blur", "Размытие"],
              ["slide-up", "Снизу вверх"],
              ["scale", "Масштаб"]
            ]}
            onChange={(value) => patchAppear({ preset: value as NonNullable<WebBrainEffects["appear"]>["preset"] })}
          />
          <InspectorEffectNumberRow label="Задержка" value={appear.delay ?? 0} min={0} max={3} step={0.05} unit="с" onChange={(value) => patchAppear({ delay: value })} />
          <InspectorEffectSubPanel title="Начальное состояние">
            <InspectorEffectTransformControls
              value={appear.enter ?? {}}
              defaults={{ opacity: 0, scale: appear.preset === "scale" ? 0.88 : 1, offsetY: appear.preset === "slide-up" ? 24 : 12 }}
              compact
              onPatch={(value) => patchAppear({ enter: value })}
            />
          </InspectorEffectSubPanel>
          <InspectorNestedTransition title="Переход" transition={baseTransition} onPatch={patchBaseTransition} />
        </>
      ) : null}

      {kind === "hover" ? (
        <>
          <InspectorEffectTransformControls
            value={hover}
            defaults={{ opacity: effects.opacity ?? 1, scale: 1.04 }}
            onPatch={patchHover}
            showShadow
          />
          <InspectorNestedTransition title="Переход" transition={baseTransition} onPatch={patchBaseTransition} />
        </>
      ) : null}

      {kind === "press" ? (
        <>
          <InspectorEffectTransformControls
            value={press}
            defaults={{ opacity: 1, scale: 0.94 }}
            rotateMode={press.rotateMode ?? "2d"}
            onRotateModeChange={(value) => patchPress({ rotateMode: value })}
            onPatch={patchPress}
            showShadow
          />
          <InspectorNestedTransition title="Переход" transition={press.transition ?? { type: "spring", stiffness: 288, damping: 12, mass: 1 }} onPatch={(value) => patchPress({ transition: value })} />
        </>
      ) : null}

      {kind === "loop" ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-white/48">Тип</span>
            <InspectorSegmentedToggle
              value={loop.mode ?? "loop"}
              options={[
                ["loop", "Цикл"],
                ["mirror", "Зеркально"]
              ]}
              onChange={(value) => patchLoop({ mode: value as NonNullable<WebBrainEffects["loop"]>["mode"] })}
            />
          </div>
          <InspectorEffectNumberRow label="Задержка" value={loop.delay ?? 0} min={0} max={3} step={0.05} unit="с" onChange={(value) => patchLoop({ delay: value })} />
          <InspectorEffectTransformControls
            value={loop}
            defaults={{ opacity: 1, scale: 1, rotateZ: 360 }}
            rotateMode={loop.rotateMode ?? "2d"}
            onRotateModeChange={(value) => patchLoop({ rotateMode: value })}
            onPatch={patchLoop}
            rotateMax={720}
          />
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-white/48">Вне экрана</span>
            <InspectorSegmentedToggle
              value={loop.offscreen ?? "play"}
              options={[
                ["play", "Играть"],
                ["pause", "Пауза"]
              ]}
              onChange={(value) => patchLoop({ offscreen: value as NonNullable<WebBrainEffects["loop"]>["offscreen"] })}
            />
          </div>
          <InspectorNestedTransition title="Переход" transition={loop.transition ?? { type: "ease", easing: "linear", duration: 3 }} onPatch={(value) => patchLoop({ transition: value })} />
        </>
      ) : null}

      {kind === "drag" ? (
        <>
          <InspectorBooleanRow label="Свободно" value={drag.freeform !== false} onChange={(value) => patchDrag({ freeform: value })} />
          <InspectorBooleanRow label="Вернуть назад" value={drag.snapBack !== false} onChange={(value) => patchDrag({ snapBack: value })} />
          <InspectorNestedTransition title="Переход" transition={drag.transition ?? { type: "spring", stiffness: 260, damping: 22, mass: 1 }} onPatch={(value) => patchDrag({ transition: value })} />
        </>
      ) : null}

      {kind === "scrollSpeed" ? (
        <InspectorEffectNumberRow label="Скорость" value={scrollSpeed.speed ?? 110} min={10} max={300} step={1} unit="%" onChange={(value) => patchScrollSpeed({ speed: value })} />
      ) : null}

      {kind === "scrollTransform" ? (
        <>
          <InspectorSelect
            label="Триггер"
            value={scrollTransform.trigger ?? "scroll"}
            options={[["scroll", "При скролле"]]}
            onChange={() => patchScrollTransform({ trigger: "scroll" })}
          />
          <div className="mb-3 rounded-[13px] border border-white/[0.06] bg-black/20 p-3">
            <p className="mb-3 text-sm font-semibold text-white/78">От</p>
            <InspectorEffectTransformControls value={scrollTransform.from ?? {}} defaults={{ opacity: 0.35, scale: 1, offsetY: 30 }} onPatch={(value) => patchScrollTransform({ from: value })} compact />
          </div>
          <div className="mb-3 rounded-[13px] border border-white/[0.06] bg-black/20 p-3">
            <p className="mb-3 text-sm font-semibold text-white/78">До</p>
            <InspectorEffectTransformControls value={scrollTransform.to ?? {}} defaults={{ opacity: 1, scale: 1, offsetY: 0 }} onPatch={(value) => patchScrollTransform({ to: value })} compact />
          </div>
          <InspectorNestedTransition title="Переход" transition={scrollTransform.transition ?? { type: "ease", easing: "ease-out", duration: 0.4 }} onPatch={(value) => patchScrollTransform({ transition: value })} />
        </>
      ) : null}

      {kind === "flow" ? (
        <>
          <InspectorNestedTransition title="Переход" transition={flow.transition ?? { type: "spring", stiffness: 260, damping: 20, mass: 1 }} onPatch={(value) => patchFlow({ transition: value })} />
          <p className="mt-3 rounded-[12px] border border-white/[0.06] bg-white/[0.035] px-3 py-3 text-sm leading-relaxed text-white/45">
            Анимирует соседний контент вокруг интерактивной кнопки.
          </p>
        </>
      ) : null}

      {kind === "ticker" ? (
        <>
          <InspectorEffectNumberRow label="Скорость" value={ticker.speed ?? 100} min={10} max={300} step={1} unit="%" onChange={(value) => patchTicker({ speed: value })} />
          <InspectorEffectNumberRow label="При наведении" value={ticker.hoverSpeed ?? 100} min={10} max={300} step={1} unit="%" onChange={(value) => patchTicker({ hoverSpeed: value })} />
          <InspectorSelect
            label="Направление"
            value={ticker.direction ?? "left"}
            options={[
              ["left", "Влево"],
              ["right", "Вправо"],
              ["up", "Вверх"],
              ["down", "Вниз"]
            ]}
            onChange={(value) => patchTicker({ direction: value as NonNullable<WebBrainEffects["ticker"]>["direction"] })}
          />
          <InspectorBooleanRow label="Перетаскивать" value={Boolean(ticker.draggable)} onChange={(value) => patchTicker({ draggable: value })} />
        </>
      ) : null}
    </div>
  );
}

type InspectorPreviewMotionValue = string | number | Array<string | number>;
type InspectorPreviewMotionState = Record<string, InspectorPreviewMotionValue>;
type InspectorPreviewTransition = {
  duration?: number;
  delay?: number;
  ease?: "linear" | "easeIn" | "easeOut" | "easeInOut" | [number, number, number, number];
  repeat?: number;
  repeatDelay?: number;
  repeatType?: "loop" | "mirror" | "reverse";
  type?: "spring";
  stiffness?: number;
  damping?: number;
  mass?: number;
};
type InspectorEffectPreviewMotion = {
  key: string;
  initial: InspectorPreviewMotionState;
  animate: InspectorPreviewMotionState;
  transition: InspectorPreviewTransition;
};

function InspectorEffectPreview({
  label,
  kind,
  effects
}: {
  label: string;
  kind: InspectorEffectKind;
  effects: WebBrainEffects;
}) {
  const preview = getInspectorEffectPreviewMotion(kind, effects);

  return (
    <div className="mb-4 overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#151719] p-3">
      <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-[12px] bg-[radial-gradient(circle_at_center,rgba(185,255,71,0.09),rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.32))]">
        <motion.div
          key={`${kind}-${preview.key}`}
          initial={preview.initial}
          animate={preview.animate}
          transition={preview.transition}
          className="flex min-h-14 min-w-28 items-center justify-center rounded-[14px] border border-white/[0.1] bg-white/[0.08] px-5 text-base font-black text-white shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {label}
        </motion.div>
      </div>
    </div>
  );
}

function getInspectorEffectPreviewMotion(kind: InspectorEffectKind, effects: WebBrainEffects): InspectorEffectPreviewMotion {
  const base = getInspectorEffectPreviewTransform();
  const defaultTransition = getInspectorEffectPreviewTransition(effects.transition, 0.7, 2.2);

  if (kind === "textEffect") {
    const textEffect = effects.textEffect ?? {};
    const preset = textEffect.preset ?? "blur";
    const initial = getInspectorEffectPreviewTransform(textEffect.enter, {
      opacity: preset === "fade" || preset === "blur" ? 0.18 : 0.42,
      scale: preset === "scale" ? 0.76 : 1,
      offsetY: preset === "slide" ? 20 : 10,
      blur: preset === "blur" ? 12 : 0
    });

    return {
      key: getInspectorEffectPreviewKey(kind, textEffect),
      initial,
      animate: base,
      transition: getInspectorEffectPreviewTransition({ ...effects.transition, delay: textEffect.delay ?? effects.transition?.delay }, 0.74, 2.35)
    };
  }

  if (kind === "appear") {
    const appear = effects.appear ?? {};
    const preset = appear.preset ?? "fade-in";
    const initial = getInspectorEffectPreviewTransform(appear.enter, {
      opacity: preset === "fade-in" || preset === "blur" ? 0.22 : 0.5,
      scale: preset === "scale" ? 0.82 : 1,
      offsetY: preset === "slide-up" ? 24 : 12,
      blur: preset === "blur" ? 12 : 0
    });

    return {
      key: getInspectorEffectPreviewKey(kind, appear),
      initial,
      animate: base,
      transition: getInspectorEffectPreviewTransition({ ...effects.transition, delay: appear.delay ?? effects.transition?.delay }, 0.72, 2.4)
    };
  }

  if (kind === "hover") {
    const target = getInspectorEffectPreviewTransform(effects.hover, { opacity: 0.92, scale: 1.04 });

    return {
      key: getInspectorEffectPreviewKey(kind, effects.hover),
      initial: base,
      animate: getInspectorEffectPreviewSequence(base, target),
      transition: { ...defaultTransition, repeatDelay: 1.15 }
    };
  }

  if (kind === "press") {
    const press = effects.press ?? {};
    const target = getInspectorEffectPreviewTransform(press, { opacity: 1, scale: 0.94 });

    return {
      key: getInspectorEffectPreviewKey(kind, press),
      initial: base,
      animate: getInspectorEffectPreviewSequence(base, target),
      transition: getInspectorEffectPreviewTransition(press.transition, 0.48, 1.3)
    };
  }

  if (kind === "loop") {
    const loop = effects.loop ?? {};
    const target = getInspectorEffectPreviewTransform(loop, { opacity: 1, scale: 1, rotateZ: 360 });
    const loopTransition = getInspectorEffectPreviewTransition(loop.transition, 2.8, 0);

    return {
      key: getInspectorEffectPreviewKey(kind, loop),
      initial: base,
      animate: target,
      transition: {
        ...loopTransition,
        delay: loop.delay ?? loopTransition.delay,
        repeatType: loop.mode === "mirror" ? "mirror" : "loop"
      }
    };
  }

  if (kind === "drag") {
    const drag = effects.drag ?? {};
    const target = getInspectorEffectPreviewTransform(undefined, { offsetX: 42, offsetY: drag.freeform === false ? 0 : 12, rotateZ: drag.freeform === false ? 0 : -4 });

    return {
      key: getInspectorEffectPreviewKey(kind, drag),
      initial: base,
      animate: drag.snapBack === false ? target : getInspectorEffectPreviewSequence(base, target),
      transition: getInspectorEffectPreviewTransition(drag.transition, 0.7, drag.snapBack === false ? 0 : 1.2)
    };
  }

  if (kind === "scrollSpeed") {
    const speed = Math.max(10, effects.scrollSpeed?.speed ?? 110);
    const duration = 2.4 / (speed / 100);

    return {
      key: getInspectorEffectPreviewKey(kind, effects.scrollSpeed),
      initial: base,
      animate: { ...base, x: [0, -34, 0] },
      transition: { duration, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }
    };
  }

  if (kind === "scrollTransform") {
    const scrollTransform = effects.scrollTransform ?? {};
    const initial = getInspectorEffectPreviewTransform(scrollTransform.from, { opacity: 0.35, offsetY: 28 });
    const target = getInspectorEffectPreviewTransform(scrollTransform.to, { opacity: 1, offsetY: 0 });

    return {
      key: getInspectorEffectPreviewKey(kind, scrollTransform),
      initial,
      animate: target,
      transition: getInspectorEffectPreviewTransition(scrollTransform.transition, 0.72, 2.2)
    };
  }

  if (kind === "flow") {
    return {
      key: getInspectorEffectPreviewKey(kind, effects.flow),
      initial: base,
      animate: { ...base, scale: [1, 1.06, 0.98, 1], x: [0, 14, -8, 0] },
      transition: getInspectorEffectPreviewTransition(effects.flow?.transition, 0.9, 1.35)
    };
  }

  const ticker = effects.ticker ?? {};
  const distance = ticker.direction === "up" || ticker.direction === "down" ? 26 : 42;
  const x = ticker.direction === "right" ? [0, distance, 0] : ticker.direction === "left" || !ticker.direction ? [0, -distance, 0] : 0;
  const y = ticker.direction === "down" ? [0, distance, 0] : ticker.direction === "up" ? [0, -distance, 0] : 0;
  const duration = 2.4 / Math.max(0.2, (ticker.speed ?? 100) / 100);

  return {
    key: getInspectorEffectPreviewKey(kind, ticker),
    initial: base,
    animate: { ...base, x, y },
    transition: { duration, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }
  };
}

function getInspectorEffectPreviewTransform(
  transform?: WebBrainEffects["transform"],
  defaults: WebBrainEffects["transform"] & { blur?: number } = {}
): InspectorPreviewMotionState {
  return {
    opacity: clampEditorFloat(transform?.opacity, defaults.opacity ?? 1, 0, 1),
    scale: clampEditorFloat(transform?.scale, defaults.scale ?? 1, 0.1, 3),
    rotateX: clampEditorFloat(transform?.rotateX, defaults.rotateX ?? 0, -720, 720),
    rotateY: clampEditorFloat(transform?.rotateY, defaults.rotateY ?? 0, -720, 720),
    rotate: clampEditorFloat(transform?.rotateZ, defaults.rotateZ ?? 0, -720, 720),
    skewX: `${formatEditorCssNumber(clampEditorFloat(transform?.skewX, defaults.skewX ?? 0, -80, 80))}deg`,
    skewY: `${formatEditorCssNumber(clampEditorFloat(transform?.skewY, defaults.skewY ?? 0, -80, 80))}deg`,
    x: clampEditorFloat(transform?.offsetX, defaults.offsetX ?? 0, -260, 260),
    y: clampEditorFloat(transform?.offsetY, defaults.offsetY ?? 0, -260, 260),
    filter: `blur(${formatEditorCssNumber(clampEditorFloat(defaults.blur, 0, 0, 24))}px) drop-shadow(0 ${formatEditorCssNumber(clampEditorFloat(transform?.shadow, defaults.shadow ?? 0, 0, 80) / 4)}px ${formatEditorCssNumber(clampEditorFloat(transform?.shadow, defaults.shadow ?? 0, 0, 80))}px rgba(0,0,0,0.36))`
  };
}

function getInspectorEffectPreviewSequence(from: InspectorPreviewMotionState, to: InspectorPreviewMotionState): InspectorPreviewMotionState {
  const sequence: InspectorPreviewMotionState = {};

  Object.keys(from).forEach((key) => {
    const fromValue = Array.isArray(from[key]) ? from[key][0] : from[key];
    const targetValue = to[key] ?? fromValue;
    const toValue = Array.isArray(targetValue) ? targetValue[0] : targetValue;

    sequence[key] = [fromValue, toValue, fromValue];
  });

  return sequence;
}

function getInspectorEffectPreviewTransition(
  transition: WebBrainEffects["transition"] | undefined,
  fallbackDuration: number,
  repeatDelay: number
): InspectorPreviewTransition {
  if (transition?.type === "spring") {
    return {
      type: "spring",
      stiffness: transition.stiffness ?? 260,
      damping: transition.damping ?? 22,
      mass: transition.mass ?? 1,
      delay: transition.delay ?? 0,
      repeat: Infinity,
      repeatDelay
    };
  }

  return {
    duration: clampEditorFloat(transition?.duration, fallbackDuration, 0.05, 8),
    delay: clampEditorFloat(transition?.delay, 0, 0, 3),
    ease: cssEaseToMotionEase(webBrainTransitionToCssEase(transition ?? { type: "ease", easing: "ease-in-out" })),
    repeat: Infinity,
    repeatDelay
  };
}

function getInspectorEffectPreviewKey(kind: InspectorEffectKind, value: unknown) {
  return `${kind}-${JSON.stringify(value ?? {})}`;
}

function InspectorEffectTransformControls({
  value,
  defaults,
  rotateMode,
  rotateMax = 180,
  compact = false,
  showShadow = false,
  onRotateModeChange,
  onPatch
}: {
  value: WebBrainEffects["transform"] | WebBrainEffects["hover"] | WebBrainEffects["press"] | WebBrainEffects["loop"];
  defaults: Partial<NonNullable<WebBrainEffects["transform"]>>;
  rotateMode?: "2d" | "3d";
  rotateMax?: number;
  compact?: boolean;
  showShadow?: boolean;
  onRotateModeChange?: (value: "2d" | "3d") => void;
  onPatch: (value: NonNullable<WebBrainEffects["transform"]>) => void;
}) {
  const safeValue = value ?? {};
  const rotationEnabled = safeValue.rotateX !== undefined || safeValue.rotateY !== undefined || safeValue.rotateZ !== undefined;
  const skewEnabled = safeValue.skewX !== undefined || safeValue.skewY !== undefined;
  const offsetEnabled = safeValue.offsetX !== undefined || safeValue.offsetY !== undefined;

  return (
    <div className={compact ? "space-y-2" : "space-y-2 rounded-[13px] border border-white/[0.06] bg-black/20 p-3"}>
      <InspectorOptionalControl
        title="Прозрачность"
        enabled={safeValue.opacity !== undefined}
        status={safeValue.opacity !== undefined ? `${Math.round((safeValue.opacity ?? defaults.opacity ?? 1) * 100)}%` : "обычно"}
        onToggle={(enabled) => onPatch({ opacity: enabled ? (safeValue.opacity ?? defaults.opacity ?? 1) : undefined })}
      >
        <InspectorEffectNumberRow label="Значение" value={safeValue.opacity ?? defaults.opacity ?? 1} min={0} max={1} step={0.05} onChange={(nextValue) => onPatch({ opacity: nextValue })} />
      </InspectorOptionalControl>

      <InspectorOptionalControl
        title="Масштаб"
        enabled={safeValue.scale !== undefined}
        status={safeValue.scale !== undefined ? `${formatEditorCssNumber(safeValue.scale ?? defaults.scale ?? 1)}x` : "обычно"}
        onToggle={(enabled) => onPatch({ scale: enabled ? (safeValue.scale ?? defaults.scale ?? 1) : undefined })}
      >
        <InspectorEffectNumberRow label="Значение" value={safeValue.scale ?? defaults.scale ?? 1} min={0.1} max={3} step={0.05} onChange={(nextValue) => onPatch({ scale: nextValue })} />
      </InspectorOptionalControl>

      <InspectorOptionalControl
        title="Вращение"
        enabled={rotationEnabled}
        status={rotationEnabled ? `${formatEditorCssNumber(safeValue.rotateZ ?? defaults.rotateZ ?? 0)}°` : "обычно"}
        onToggle={(enabled) =>
          onPatch(
            enabled
              ? { rotateZ: safeValue.rotateZ ?? defaults.rotateZ ?? 0 }
              : {
                  rotateX: undefined,
                  rotateY: undefined,
                  rotateZ: undefined
                }
          )
        }
      >
        {rotateMode && onRotateModeChange ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm text-white/48">Режим</span>
            <InspectorSegmentedToggle
              value={rotateMode}
              options={[
                ["2d", "2D"],
                ["3d", "3D"]
              ]}
              onChange={(nextValue) => onRotateModeChange(nextValue as "2d" | "3d")}
            />
          </div>
        ) : null}
        {rotateMode === "3d" ? (
          <InspectorAxisTriple
            label="Оси"
            values={[safeValue.rotateX ?? 0, safeValue.rotateY ?? 0, safeValue.rotateZ ?? defaults.rotateZ ?? 0]}
            axis={["X", "Y", "Z"]}
            min={-rotateMax}
            max={rotateMax}
            onChange={(values) => onPatch({ rotateX: values[0], rotateY: values[1], rotateZ: values[2] })}
          />
        ) : (
          <InspectorEffectNumberRow label="Угол" value={safeValue.rotateZ ?? defaults.rotateZ ?? 0} min={-rotateMax} max={rotateMax} step={1} onChange={(nextValue) => onPatch({ rotateZ: nextValue })} />
        )}
      </InspectorOptionalControl>

      <InspectorOptionalControl
        title="Наклон"
        enabled={skewEnabled}
        status={skewEnabled ? `${formatEditorCssNumber(safeValue.skewX ?? 0)} / ${formatEditorCssNumber(safeValue.skewY ?? 0)}°` : "обычно"}
        onToggle={(enabled) => onPatch(enabled ? { skewX: 0, skewY: 0 } : { skewX: undefined, skewY: undefined })}
      >
        <InspectorAxisPair
          label="Оси"
          values={[safeValue.skewX ?? 0, safeValue.skewY ?? 0]}
          axis={["X", "Y"]}
          min={-60}
          max={60}
          onChange={(values) => onPatch({ skewX: values[0], skewY: values[1] })}
        />
      </InspectorOptionalControl>

      <InspectorOptionalControl
        title="Смещение"
        enabled={offsetEnabled}
        status={offsetEnabled ? `${formatEditorCssNumber(safeValue.offsetX ?? 0)} / ${formatEditorCssNumber(safeValue.offsetY ?? defaults.offsetY ?? 0)}px` : "обычно"}
        onToggle={(enabled) => onPatch(enabled ? { offsetX: 0, offsetY: defaults.offsetY ?? 0 } : { offsetX: undefined, offsetY: undefined })}
      >
        <InspectorAxisPair
          label="Оси"
          values={[safeValue.offsetX ?? 0, safeValue.offsetY ?? defaults.offsetY ?? 0]}
          axis={["X", "Y"]}
          min={-240}
          max={240}
          onChange={(values) => onPatch({ offsetX: values[0], offsetY: values[1] })}
        />
      </InspectorOptionalControl>

      {showShadow ? (
        <InspectorOptionalControl
          title="Тень"
          enabled={safeValue.shadow !== undefined && safeValue.shadow > 0}
          status={safeValue.shadow !== undefined && safeValue.shadow > 0 ? `${formatEditorCssNumber(safeValue.shadow)}px` : "нет"}
          onToggle={(enabled) => onPatch({ shadow: enabled ? (safeValue.shadow && safeValue.shadow > 0 ? safeValue.shadow : 18) : undefined })}
        >
          <InspectorEffectNumberRow label="Размер" value={safeValue.shadow ?? 18} min={0} max={80} step={1} onChange={(nextValue) => onPatch({ shadow: nextValue })} />
        </InspectorOptionalControl>
      ) : null}
    </div>
  );
}

function InspectorEffectSubPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3 rounded-[13px] border border-white/[0.06] bg-black/20 p-3">
      <p className="mb-3 text-sm font-semibold text-white/78">{title}</p>
      {children}
    </div>
  );
}

function InspectorTogglePanel({
  title,
  enabled,
  status,
  children,
  onToggle
}: {
  title: string;
  enabled: boolean;
  status?: string;
  children: ReactNode;
  onToggle: (enabled: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(enabled);
  const isExpanded = enabled && expanded;

  return (
    <section className={`rounded-[14px] border p-3 transition ${enabled ? "border-white/[0.09] bg-white/[0.025]" : "border-white/[0.055] bg-black/10"}`}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <button
          type="button"
          disabled={!enabled}
          aria-expanded={isExpanded}
          onClick={() => setExpanded((value) => !value)}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${
            enabled ? "cursor-pointer hover:text-white" : "cursor-default"
          }`}
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-white/42 transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white/78">{title}</span>
            {status ? <span className="mt-0.5 block truncate text-[0.66rem] text-white/34">{status}</span> : null}
          </span>
        </button>
        <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/[0.08] bg-black/25 transition hover:border-lime/45 hover:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              setExpanded(event.target.checked);
              onToggle(event.target.checked);
            }}
            className="h-4 w-4 cursor-pointer rounded border-white/[0.18] bg-black/40 accent-lime"
            aria-label={enabled ? `Выключить ${title}` : `Включить ${title}`}
          />
        </label>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-white/[0.055] pt-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function InspectorOptionalControl({
  title,
  enabled,
  status,
  children,
  onToggle
}: {
  title: string;
  enabled: boolean;
  status?: string;
  children: ReactNode;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <InspectorTogglePanel title={title} enabled={enabled} status={status} onToggle={onToggle}>
        {children}
      </InspectorTogglePanel>
    </div>
  );
}

function InspectorBooleanRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 last:mb-0">
      <span className="text-sm text-white/48">{label}</span>
      <InspectorSegmentedToggle
        value={value ? "yes" : "no"}
        options={[
          ["yes", "Да"],
          ["no", "Нет"]
        ]}
        onChange={(nextValue) => onChange(nextValue === "yes")}
      />
    </div>
  );
}

function InspectorNestedTransition({
  title,
  transition,
  onPatch
}: {
  title: string;
  transition: NonNullable<WebBrainEffects["transition"]>;
  onPatch: (transition: NonNullable<WebBrainEffects["transition"]>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-[13px] border border-white/[0.06] bg-black/20 p-3">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-sm font-semibold text-white/78">{title}</span>
        <span className="flex h-8 items-center gap-2 rounded-[9px] bg-white/[0.08] px-2.5 text-sm font-semibold text-white/72">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-sky-500 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          {transition.type === "spring" ? "Пружина" : "Кривая"}
        </span>
      </button>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden pt-4"
          >
            <InspectorTransitionDesigner transition={transition} onPatch={onPatch} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type InspectorEaseKey = Exclude<NonNullable<WebBrainEffects["transition"]>["easing"], undefined>;

const inspectorEasePresets: Array<{
  key: InspectorEaseKey;
  label: string;
  bezier: [number, number, number, number];
}> = [
  { key: "linear", label: "Линейно", bezier: [0, 0, 1, 1] },
  { key: "ease", label: "Мягко", bezier: [0.25, 0.1, 0.25, 1] },
  { key: "ease-in", label: "Ускорение", bezier: [0.4, 0, 1, 1] },
  { key: "ease-out", label: "Замедление", bezier: [0, 0, 0.2, 1] },
  { key: "ease-in-out", label: "Ускорение и замедление", bezier: [0.44, 0, 0.56, 1] },
  { key: "custom", label: "Своя кривая", bezier: [0.44, 0, 0.56, 1] }
];

const transitionCurveYMin = -1;
const transitionCurveYMax = 2;

function InspectorTransitionDesigner({
  transition,
  onPatch
}: {
  transition: NonNullable<WebBrainEffects["transition"]>;
  onPatch: (transition: NonNullable<WebBrainEffects["transition"]>) => void;
}) {
  const transitionType = transition.type ?? "ease";

  return (
    <div className="space-y-4">
      <InspectorSegmentedToggle
        value={transitionType}
        options={[
          ["ease", "Кривая"],
          ["spring", "Пружина"]
        ]}
        onChange={(value) => onPatch({ type: value as NonNullable<WebBrainEffects["transition"]>["type"] })}
      />

      <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.04] p-3">
        <TransitionCurvePreview
          transition={transition}
          onBezierChange={(bezier) => onPatch({ type: "ease", easing: "custom", bezier: formatBezierTuple(bezier) })}
        />
      </div>

      {transitionType === "spring" ? (
        <div>
          <InspectorEffectNumberRow label="Жесткость" value={transition.stiffness ?? 260} min={20} max={700} step={1} onChange={(value) => onPatch({ stiffness: value })} />
          <InspectorEffectNumberRow label="Затухание" value={transition.damping ?? 22} min={1} max={80} step={1} onChange={(value) => onPatch({ damping: value })} />
          <InspectorEffectNumberRow label="Масса" value={transition.mass ?? 1} min={0.1} max={5} step={0.1} onChange={(value) => onPatch({ mass: value })} />
          <InspectorEffectNumberRow label="Задержка" value={transition.delay ?? 0} min={0} max={3} step={0.05} unit="с" onChange={(value) => onPatch({ delay: value })} />
        </div>
      ) : (
        <div>
          <InspectorSelect
            label="Кривая"
            value={transition.bezier ? "custom" : transition.easing ?? "ease-in-out"}
            options={inspectorEasePresets.map((preset) => [preset.key, preset.label])}
            onChange={(value) => {
              const easing = value as NonNullable<WebBrainEffects["transition"]>["easing"];
              const preset = inspectorEasePresets.find((item) => item.key === easing) ?? inspectorEasePresets[4];

              onPatch({
                easing,
                bezier: easing === "custom" ? transition.bezier || preset.bezier.join(", ") : ""
              });
            }}
          />
          <InspectorTextInput
            label="Безье"
            value={transition.bezier ?? ""}
            placeholder="0.44, 0, 0.56, 1"
            onChange={(value) => onPatch({ easing: "custom", bezier: value })}
          />
          <InspectorEffectNumberRow label="Время" value={transition.duration ?? 0.4} min={0.05} max={4} step={0.05} unit="с" onChange={(value) => onPatch({ duration: value })} />
          <InspectorEffectNumberRow label="Задержка" value={transition.delay ?? 0} min={0} max={3} step={0.05} unit="с" onChange={(value) => onPatch({ delay: value })} />
        </div>
      )}
    </div>
  );
}

function TransitionCurvePreview({
  transition,
  onBezierChange
}: {
  transition: NonNullable<WebBrainEffects["transition"]>;
  onBezierChange?: (bezier: [number, number, number, number]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeHandleRef = useRef<0 | 1 | null>(null);
  const width = 220;
  const height = 126;
  const padding = 20;
  const transitionType = transition.type ?? "ease";
  const bezier = getTransitionBezierTuple(transition);
  const curvePath =
    transitionType === "spring"
      ? getSpringCurvePath(transition, width, height, padding)
      : getBezierCurvePath(bezier, width, height, padding);
  const handles = getBezierHandlePoints(bezier, width, height, padding);
  const startPoint = getTransitionCurvePoint(0, 0, width, height, padding);
  const endPoint = getTransitionCurvePoint(1, 1, width, height, padding);
  const updateHandle = useCallback(
    (handleIndex: 0 | 1, clientX: number, clientY: number) => {
      const svg = svgRef.current;

      if (!svg || !onBezierChange) return;

      const rect = svg.getBoundingClientRect();
      const viewX = ((clientX - rect.left) / rect.width) * width;
      const viewY = ((clientY - rect.top) / rect.height) * height;
      const graphWidth = width - padding * 2;
      const graphHeight = height - padding * 2;
      const nextX = clampEditorFloat((viewX - padding) / graphWidth, 0, 0, 1);
      const normalizedY = clampEditorFloat((height - padding - viewY) / graphHeight, 0, 0, 1);
      const nextY = transitionCurveYMin + normalizedY * (transitionCurveYMax - transitionCurveYMin);
      const nextBezier: [number, number, number, number] = [...bezier];

      if (handleIndex === 0) {
        nextBezier[0] = nextX;
        nextBezier[1] = nextY;
      } else {
        nextBezier[2] = nextX;
        nextBezier[3] = nextY;
      }

      onBezierChange(nextBezier);
    },
    [bezier, onBezierChange]
  );
  const stopDraggingHandle = useCallback(() => {
    activeHandleRef.current = null;
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[126px] w-full touch-none select-none rounded-[12px] bg-white/[0.08]"
      onPointerMove={(event) => {
        if (activeHandleRef.current === null) return;

        event.preventDefault();
        updateHandle(activeHandleRef.current, event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (activeHandleRef.current === null) return;

        event.preventDefault();
        stopDraggingHandle();
      }}
      onPointerCancel={stopDraggingHandle}
    >
      <path d={`M ${startPoint.x} ${startPoint.y} L ${handles[0].x} ${handles[0].y}`} stroke="rgba(14, 165, 233, 0.78)" strokeWidth="2" />
      <path d={`M ${endPoint.x} ${endPoint.y} L ${handles[1].x} ${handles[1].y}`} stroke="rgba(14, 165, 233, 0.78)" strokeWidth="2" />
      <path d={curvePath} fill="none" stroke="rgba(244, 245, 240, 0.62)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={startPoint.x} cy={startPoint.y} r="6" fill="rgba(244, 245, 240, 0.72)" />
      <circle cx={endPoint.x} cy={endPoint.y} r="6" fill="rgba(244, 245, 240, 0.72)" />
      <circle
        cx={handles[0].x}
        cy={handles[0].y}
        r="7"
        fill="#0ea5e9"
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          activeHandleRef.current = 0;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHandle(0, event.clientX, event.clientY);
        }}
      />
      <circle
        cx={handles[1].x}
        cy={handles[1].y}
        r="7"
        fill="#0ea5e9"
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          activeHandleRef.current = 1;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateHandle(1, event.clientX, event.clientY);
        }}
      />
    </svg>
  );
}

function InspectorEffectNumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const safeValue = clampEditorFloat(value, min, min, max);
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? formatEditorCssNumber(safeValue);

  const commitValue = (nextValue = inputValue) => {
    if (nextValue.trim() === "") {
      setDraftValue(null);
      return;
    }

    const normalizedValue = clampEditorFloat(nextValue, safeValue, min, max);
    setDraftValue(null);
    onChange(normalizedValue);
  };

  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-xs text-white/42">
        <span>{label}</span>
        <span className="text-white/66">
          {formatEditorCssNumber(safeValue)}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setDraftValue(nextValue);

            if (nextValue.trim() !== "") {
              onChange(clampEditorFloat(nextValue, safeValue, min, max));
            }
          }}
          onBlur={() => commitValue()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-9 w-20 shrink-0 rounded-[10px] border border-white/[0.07] bg-white/[0.055] px-2 text-sm font-semibold text-white/82 outline-none transition [appearance:textfield] focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.12] accent-sky-400 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/45"
        />
      </div>
    </div>
  );
}

function InspectorAxisPair({
  label,
  values,
  axis,
  min,
  max,
  onChange
}: {
  label: string;
  values: [number, number];
  axis: [string, string];
  min: number;
  max: number;
  onChange: (values: [number, number]) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs text-white/42">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {values.map((value, index) => (
          <InspectorAxisNumberInput
            key={axis[index]}
            label={axis[index]}
            value={value}
            min={min}
            max={max}
            onChange={(nextValue) => {
              const nextValues: [number, number] = [values[0], values[1]];
              nextValues[index] = nextValue;
              onChange(nextValues);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InspectorAxisTriple({
  label,
  values,
  axis,
  min,
  max,
  onChange
}: {
  label: string;
  values: [number, number, number];
  axis: [string, string, string];
  min: number;
  max: number;
  onChange: (values: [number, number, number]) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs text-white/42">{label}</p>
      <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-white/[0.07] bg-black/20">
        {values.map((value, index) => (
          <InspectorAxisNumberInput
            key={axis[index]}
            label={axis[index]}
            value={value}
            min={min}
            max={max}
            className={index === 0 ? "" : "border-l border-white/[0.07]"}
            onChange={(nextValue) => {
              const nextValues: [number, number, number] = [values[0], values[1], values[2]];
              nextValues[index] = nextValue;
              onChange(nextValues);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InspectorAxisNumberInput({
  label,
  value,
  min,
  max,
  className = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  className?: string;
  onChange: (value: number) => void;
}) {
  const safeValue = clampEditorFloat(value, 0, min, max);
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? formatEditorCssNumber(safeValue);

  const commitValue = (nextValue = inputValue) => {
    if (nextValue.trim() === "") {
      setDraftValue(null);
      return;
    }

    const normalizedValue = clampEditorFloat(nextValue, safeValue, min, max);
    setDraftValue(null);
    onChange(normalizedValue);
  };

  return (
    <label className={`flex h-11 items-center justify-center gap-2 bg-white/[0.035] px-2 ${className}`}>
      <input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);

          if (nextValue.trim() !== "") {
            onChange(clampEditorFloat(nextValue, safeValue, min, max));
          }
        }}
        onBlur={() => commitValue()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold text-white/82 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-[0.65rem] font-semibold text-white/35">{label}</span>
    </label>
  );
}

function InspectorSegmentedToggle({
  value,
  options,
  onChange
}: {
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="grid min-w-[118px] rounded-[10px] bg-white/[0.075] p-1 text-sm font-semibold text-white/45"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`h-8 rounded-[8px] transition ${value === optionValue ? "bg-white/[0.14] text-white" : "hover:bg-white/[0.06] hover:text-white/70"}`}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

function InspectorControlField({
  control,
  component,
  themeTokens,
  navLinks,
  selection,
  onPatch,
  onPatchComponent
}: {
  control: InspectorControl;
  component: WebBrainComponent;
  themeTokens: EditorThemeTokens;
  navLinks: WebBrainComponent[];
  selection: EditorSelection | null;
  onPatch: (patch: ComponentPatch) => void;
  onPatchComponent: (componentId: string, patch: ComponentPatch) => void;
}) {
  const props = component.props;
  const style = component.style;

  if (control === "brand") {
    return <InspectorTextInput label="Бренд" value={props.brand ?? ""} onChange={(value) => onPatch({ props: { brand: value } })} />;
  }

  if (control === "links") {
    return (
      <div className="mt-4 space-y-3">
        <p className="text-xs text-white/42">Ссылки</p>
        {navLinks.map((link) => (
          <div key={link.id} className="rounded-[10px] border border-white/[0.06] bg-black/20 p-2">
            <InspectorTextInput
              label="Название"
              value={link.props.label ?? ""}
              onChange={(value) => onPatchComponent(link.id, { props: { label: value } })}
            />
            <div className="mt-2">
              <InspectorTextInput label="Href" value={link.props.href ?? ""} onChange={(value) => onPatchComponent(link.id, { props: { href: value } })} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (control === "sticky") {
    const isSticky = style.position === "sticky";
    return (
      <InspectorBooleanRow
        label="Закрепить при прокрутке"
        value={isSticky}
        onChange={(value) =>
          onPatch(
            value
              ? { style: { position: "sticky", top: 0, zIndex: Math.max(style.zIndex ?? 0, 50) } }
              : { style: { position: "relative", top: undefined, zIndex: undefined } }
          )
        }
      />
    );
  }

  if (control === "text") {
    return (
      <>
        <InspectorTextField label="Текст" value={props.text ?? ""} onChange={(value) => onPatch({ props: { text: value } })} />
        {component.type === "heading" || component.type === "text" ? (
          <InspectorTextFormatControl
            className="mt-3"
            fontWeight={style.fontWeight}
            fontStyle={style.fontStyle}
            textTransform={style.textTransform}
            textDecoration={style.textDecoration}
            onChange={(nextStyle) => onPatch({ style: nextStyle })}
          />
        ) : null}
      </>
    );
  }

  if (control === "label") {
    return <InspectorTextInput label={component.type === "input" || component.type === "textarea" ? "Название поля" : "Текст кнопки"} value={props.label ?? ""} onChange={(value) => onPatch({ props: { label: value } })} />;
  }

  if (control === "name") {
    return <InspectorTextInput label="Name" value={props.name ?? ""} placeholder="lead_email" onChange={(value) => onPatch({ props: { name: value } })} />;
  }

  if (control === "placeholder") {
    return <InspectorTextInput label="Placeholder" value={props.placeholder ?? ""} placeholder="Введите значение..." onChange={(value) => onPatch({ props: { placeholder: value } })} />;
  }

  if (control === "inputType") {
    return (
      <InspectorSelect
        label="Тип поля"
        value={props.inputType ?? "text"}
        options={[
          ["text", "Text"],
          ["email", "Email"],
          ["tel", "Phone"],
          ["number", "Number"],
          ["date", "Date"],
          ["time", "Time"],
          ["hidden", "Hidden"]
        ]}
        onChange={(value) => onPatch({ props: { inputType: value as WebBrainProps["inputType"] } })}
      />
    );
  }

  if (control === "required") {
    return (
      <InspectorSelect
        label="Обязательное"
        value={props.required ? "true" : "false"}
        options={[
          ["true", "Да"],
          ["false", "Нет"]
        ]}
        onChange={(value) => onPatch({ props: { required: value === "true" } })}
      />
    );
  }

  if (control === "action") {
    return <InspectorTextInput label="Action contract" value={props.action ?? ""} placeholder="lead_submit" onChange={(value) => onPatch({ props: { action: value } })} />;
  }

  if (control === "method") {
    return (
      <InspectorSelect
        label="Метод"
        value={props.method ?? "post"}
        options={[
          ["post", "POST"],
          ["get", "GET"]
        ]}
        onChange={(value) => onPatch({ props: { method: value as WebBrainProps["method"] } })}
      />
    );
  }

  if (control === "href") {
    return <InspectorTextInput label="Ссылка" value={props.href ?? ""} onChange={(value) => onPatch({ props: { href: value } })} />;
  }

  if (control === "anchorId") {
    const anchorId = props.anchorId ?? "";
    return (
      <div>
        <InspectorTextInput
          label="ID для ссылок"
          value={anchorId}
          placeholder="faq"
          onChange={(value) => onPatch({ props: { anchorId: normalizeEditorAnchorId(value) } })}
        />
        <p className="mt-1.5 text-[0.66rem] leading-4 text-white/34">
          В кнопке или пункте меню укажите #{anchorId || "faq"}.
        </p>
      </div>
    );
  }

  if (control === "target") {
    return (
      <InspectorSelect
        label="Открывать"
        value={props.target ?? "_self"}
        options={[
          ["_self", "В этой вкладке"],
          ["_blank", "В новой вкладке"]
        ]}
        onChange={(value) => onPatch({ props: { target: value as WebBrainProps["target"] } })}
      />
    );
  }

  if (control === "level") {
    return (
      <InspectorSelect
        label="Уровень"
        value={String(props.level ?? 2)}
        options={[
          ["1", "H1"],
          ["2", "H2"],
          ["3", "H3"],
          ["4", "H4"]
        ]}
        onChange={(value) => onPatch({ props: { level: Number(value) as WebBrainProps["level"] } })}
      />
    );
  }

  if (control === "semanticTag") {
    return (
      <InspectorSelect
        label="HTML-тег"
        value={props.tag ?? defaultSemanticTagForComponent(component.type)}
        options={semanticTagOptionsForComponent(component.type)}
        onChange={(value) => onPatch({ props: { tag: value as SemanticTag } })}
      />
    );
  }

  if (control === "ariaLabel") {
    return (
      <InspectorTextInput
        label="Описание для доступности"
        value={props.ariaLabel ?? ""}
        placeholder="Например: Основная навигация"
        onChange={(value) => onPatch({ props: { ariaLabel: value } })}
      />
    );
  }

  if (control === "fontSize") {
    return <InspectorRange label="Размер" value={style.fontSize ?? 16} min={8} max={96} unit="px" onChange={(value) => onPatch({ style: { fontSize: value } })} />;
  }

  if (control === "fontWeight") {
    return (
      <InspectorRange label="Насыщенность" value={style.fontWeight ?? 500} min={100} max={1000} step={50} unit="" onChange={(value) => onPatch({ style: { fontWeight: value } })} />
    );
  }

  if (control === "letterSpacing") {
    return (
      <InspectorRange
        label="Трекинг"
        value={style.letterSpacing ?? 0}
        min={-2}
        max={8}
        step={0.1}
        unit="px"
        onChange={(value) => onPatch({ style: { letterSpacing: value } })}
      />
    );
  }

  if (control === "lineHeight") {
    return (
      <InspectorRange
        label="Высота строки"
        value={style.lineHeight ?? (component.type === "heading" ? 1.08 : 1.5)}
        min={0.8}
        max={2.4}
        step={0.05}
        unit=""
        onChange={(value) => onPatch({ style: { lineHeight: value } })}
      />
    );
  }

  if (control === "textColor") {
    return (
      <InspectorColorField
        label="Цвет текста"
        value={style.textColor}
        fallback={themeTokens.text}
        presets={inspectorColorPresetsForControl(control, themeTokens)}
        clearLabel="Наследовать"
        onChange={(value) => onPatch({ style: { textColor: value } })}
      />
    );
  }

  if (control === "textAccent") {
    if (component.type !== "heading" && component.type !== "text") return null;

    return (
      <InspectorTextAccentControl
        props={props}
        themeTokens={themeTokens}
        onPatch={(nextProps) => onPatch({ props: nextProps })}
      />
    );
  }

  if (control === "hoverColor") {
    return (
      <InspectorColorField
        label="Hover цвет"
        value={style.hoverColor}
        fallback={themeTokens.primary}
        presets={inspectorColorPresetsForControl(control, themeTokens)}
        clearLabel="Наследовать"
        onChange={(value) => onPatch({ style: { hoverColor: value } })}
      />
    );
  }

  if (control === "align") {
    return <InspectorAlignControl value={style.align ?? "left"} onChange={(value) => onPatch({ style: { align: value } })} />;
  }

  if (control === "padding") {
    const enabled = hasSpacingValues(style.padding);

    return (
      <InspectorOptionalControl
        title="Внутренние отступы"
        enabled={enabled}
        status={spacingStatus(style.padding)}
        onToggle={(value) => onPatch({ style: { padding: value ? defaultPaddingForComponent(component.type) : component.type === "page" ? emptySpacingValues : undefined } })}
      >
        <InspectorSpacingBox label="Значения" value={normalizeSpacingValues(style.padding, defaultPaddingForComponent(component.type))} onChange={(value) => onPatch({ style: { padding: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "margin") {
    const enabled = hasSpacingValues(style.margin);

    return (
      <InspectorOptionalControl
        title="Внешние отступы"
        enabled={enabled}
        status={spacingStatus(style.margin)}
        onToggle={(value) => onPatch({ style: { margin: value ? defaultMarginForComponent(component.type) : undefined } })}
      >
        <InspectorSpacingBox label="Значения" value={normalizeSpacingValues(style.margin, defaultMarginForComponent(component.type))} onChange={(value) => onPatch({ style: { margin: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "background") {
    return (
      <InspectorColorField
        label={component.type === "page" ? "Фон холста" : "Фон"}
        value={style.background}
        fallback={component.type === "page" ? themeTokens.background : "transparent"}
        presets={inspectorColorPresetsForControl(control, themeTokens)}
        allowRawCss
        allowGradient
        clearLabel={component.type === "page" ? "Сбросить" : "Без фона"}
        onChange={(value) => onPatch({ style: { background: value } })}
      />
    );
  }

  if (control === "backgroundImageUpload") {
    return (
      <InspectorImageDropzone
        label="Фоновое изображение"
        value={style.backgroundImage ?? ""}
        onClear={() =>
          onPatch({
            style: clearBackgroundMediaStyle()
          })
        }
        onChange={(value) =>
          onPatch({
            style: {
              backgroundImage: value,
              backgroundSize: style.backgroundSize ?? "cover",
              backgroundPosition: style.backgroundPosition ?? "center",
              backgroundRepeat: style.backgroundRepeat ?? "no-repeat",
              backgroundOverlay: style.backgroundOverlay ?? "#000000",
              backgroundOverlayOpacity: style.backgroundOverlayOpacity ?? 0.35,
              overflow: style.overflow ?? "hidden"
            }
          })
        }
      />
    );
  }

  if (control === "backgroundImageSrc") {
    return (
      <InspectorTextInput
        label="URL фона"
        value={style.backgroundImage ?? ""}
        placeholder="https://... или /media/..."
        clearLabel="Убрать"
        onClear={() => onPatch({ style: clearBackgroundMediaStyle() })}
        onChange={(value) => {
          const nextValue = value.trim();

          if (!nextValue) {
            onPatch({ style: clearBackgroundMediaStyle() });
            return;
          }

          onPatch({
            style: {
              backgroundImage: nextValue,
              backgroundSize: style.backgroundSize ?? "cover",
              backgroundPosition: style.backgroundPosition ?? "center",
              backgroundRepeat: style.backgroundRepeat ?? "no-repeat",
              backgroundOverlay: style.backgroundOverlay ?? "#000000",
              backgroundOverlayOpacity: style.backgroundOverlayOpacity ?? 0.35
            }
          });
        }}
      />
    );
  }

  if (control === "backgroundSize") {
    if (!style.backgroundImage) return null;

    return (
      <InspectorSelect
        label="Размер фона"
        value={style.backgroundSize ?? "cover"}
        options={[
          ["cover", "Cover"],
          ["contain", "Contain"],
          ["auto", "Auto"]
        ]}
        onChange={(value) => onPatch({ style: { backgroundSize: value as WebBrainStyle["backgroundSize"] } })}
      />
    );
  }

  if (control === "backgroundPosition") {
    if (!style.backgroundImage) return null;

    return <InspectorTextInput label="Позиция фона" value={style.backgroundPosition ?? "center"} onChange={(value) => onPatch({ style: { backgroundPosition: value } })} />;
  }

  if (control === "backgroundRepeat") {
    if (!style.backgroundImage) return null;

    return (
      <InspectorSelect
        label="Повтор фона"
        value={style.backgroundRepeat ?? "no-repeat"}
        options={[
          ["no-repeat", "Не повторять"],
          ["repeat", "Повторять"],
          ["repeat-x", "По X"],
          ["repeat-y", "По Y"]
        ]}
        onChange={(value) => onPatch({ style: { backgroundRepeat: value as WebBrainStyle["backgroundRepeat"] } })}
      />
    );
  }

  if (control === "backgroundOverlay") {
    if (!style.backgroundImage) return null;

    return (
      <InspectorColorField
        label="Оверлей"
        value={style.backgroundOverlay}
        fallback="#000000"
        presets={inspectorColorPresetsForControl(control, themeTokens)}
        clearLabel="Без оверлея"
        onChange={(value) =>
          onPatch({
            style: {
              backgroundImage: style.backgroundImage,
              backgroundOverlay: value,
              backgroundOverlayOpacity: value ? (style.backgroundOverlayOpacity ?? 0.35) : undefined
            }
          })
        }
      />
    );
  }

  if (control === "backgroundOverlayOpacity") {
    if (!style.backgroundImage || (!style.backgroundOverlay && style.backgroundOverlayOpacity === undefined)) return null;

    return (
      <InspectorRange
        label="Плотность оверлея"
        value={style.backgroundOverlayOpacity ?? 0.42}
        min={0}
        max={1}
        step={0.01}
        unit=""
        onChange={(value) => onPatch({ style: { backgroundImage: style.backgroundImage, backgroundOverlay: style.backgroundOverlay ?? "#000000", backgroundOverlayOpacity: value } })}
      />
    );
  }

  if (control === "backgroundBlendMode") {
    if (!style.backgroundImage || (!style.backgroundOverlay && style.backgroundOverlayOpacity === undefined)) return null;

    return (
      <InspectorSelect
        label="Blend mode"
        value={style.backgroundBlendMode ?? "normal"}
        options={[
          ["normal", "Normal"],
          ["multiply", "Multiply"],
          ["screen", "Screen"],
          ["overlay", "Overlay"],
          ["soft-light", "Soft light"]
        ]}
        onChange={(value) => onPatch({ style: { backgroundBlendMode: value as WebBrainStyle["backgroundBlendMode"] } })}
      />
    );
  }

  if (control === "borderColor") {
    return (
      <InspectorBorderField
        color={style.borderColor}
        width={style.borderWidth}
        fallbackColor={themeTokens.border}
        presets={inspectorColorPresetsForControl(control, themeTokens)}
        onPatch={(nextStyle) => onPatch({ style: nextStyle })}
      />
    );
  }

  if (control === "radius") {
    const enabled = style.radius !== undefined && style.radius > 0;

    return (
      <InspectorOptionalControl
        title="Скругление"
        enabled={enabled}
        status={enabled ? `${style.radius}px` : "нет"}
        onToggle={(value) => onPatch({ style: { radius: value ? (style.radius && style.radius > 0 ? style.radius : 16) : undefined } })}
      >
        <InspectorRange label="Радиус" value={style.radius ?? 16} min={0} max={80} unit="px" onChange={(value) => onPatch({ style: { radius: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "gap") {
    const enabled = style.gap !== undefined && style.gap > 0;

    return (
      <InspectorOptionalControl
        title="Gap"
        enabled={enabled}
        status={enabled ? `${style.gap}px` : "нет"}
        onToggle={(value) => onPatch({ style: { gap: value ? (style.gap && style.gap > 0 ? style.gap : 16) : undefined } })}
      >
        <InspectorRange label="Расстояние" value={style.gap ?? 16} min={0} max={80} unit="px" onChange={(value) => onPatch({ style: { gap: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "direction") {
    return (
      <InspectorSelect
        label="Направление"
        value={style.direction ?? (component.type === "row" ? "row" : "column")}
        options={[
          ["row", "В ряд"],
          ["column", "В колонку"]
        ]}
        onChange={(value) => onPatch({ style: { direction: value as WebBrainStyle["direction"] } })}
      />
    );
  }

  if (control === "justify") {
    return (
      <InspectorSelect
        label="Распределение"
        value={style.justify ?? "start"}
        options={[
          ["start", "В начало"],
          ["center", "По центру"],
          ["between", "Между"]
        ]}
        onChange={(value) => onPatch({ style: { justify: value as WebBrainStyle["justify"] } })}
      />
    );
  }

  if (control === "alignItems") {
    return (
      <InspectorSelect
        label="Выравнивание элементов"
        value={style.alignItems ?? "stretch"}
        options={[
          ["start", "В начало"],
          ["center", "По центру"],
          ["end", "В конец"],
          ["stretch", "Растянуть"]
        ]}
        onChange={(value) => onPatch({ style: { alignItems: value as WebBrainStyle["alignItems"] } })}
      />
    );
  }

  if (control === "wrap") {
    return (
      <InspectorSelect
        label="Перенос"
        value={style.wrap ? "true" : "false"}
        options={[
          ["true", "Разрешить"],
          ["false", "Не переносить"]
        ]}
        onChange={(value) => onPatch({ style: { wrap: value === "true" } })}
      />
    );
  }

  if (control === "minHeight") {
    const enabled = style.minHeight !== undefined && style.minHeight > 0;

    return (
      <InspectorOptionalControl
        title="Мин. высота"
        enabled={enabled}
        status={enabled ? `${style.minHeight}px` : "нет"}
        onToggle={(value) => onPatch({ style: { minHeight: value ? (style.minHeight && style.minHeight > 0 ? style.minHeight : 240) : undefined } })}
      >
        <InspectorRange label="Значение" value={style.minHeight ?? 240} min={0} max={900} step={20} unit="px" onChange={(value) => onPatch({ style: { minHeight: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "heightMode") {
    return (
      <InspectorSelect
        label="Высота"
        value={style.heightMode ?? "auto"}
        options={[
          ["auto", "Авто"],
          ["fit", "По контенту"],
          ["fixed", "Фиксированная"],
          ["full", "100%"]
        ]}
        onChange={(value) => onPatch({ style: { heightMode: value as WebBrainStyle["heightMode"] } })}
      />
    );
  }

  if (control === "height") {
    if (style.heightMode !== "fixed") return null;

    return (
      <InspectorRange
        label="Высота"
        value={style.height ?? defaultInspectorHeightForComponent(component.type)}
        min={1}
        max={1200}
        step={10}
        unit="px"
        onChange={(value) => onPatch({ style: { height: value, heightMode: style.heightMode ?? "fixed" } })}
      />
    );
  }

  if (control === "minWidth") {
    const enabled = style.minWidth !== undefined && style.minWidth > 0;

    return (
      <InspectorOptionalControl
        title="Мин. ширина"
        enabled={enabled}
        status={enabled ? `${style.minWidth}px` : "нет"}
        onToggle={(value) => onPatch({ style: { minWidth: value ? (style.minWidth && style.minWidth > 0 ? style.minWidth : 160) : undefined } })}
      >
        <InspectorRange label="Значение" value={style.minWidth ?? 160} min={0} max={900} step={10} unit="px" onChange={(value) => onPatch({ style: { minWidth: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "maxWidth") {
    const isImage = component.type === "image";
    const enabled = style.maxWidth !== undefined;

    return (
      <InspectorOptionalControl
        title={isImage ? "Макс. ширина" : "Контейнер"}
        enabled={enabled}
        status={enabled ? `${style.maxWidth}px` : "нет"}
        onToggle={(value) => onPatch({ style: { maxWidth: value ? (style.maxWidth ?? (isImage ? 680 : 1120)) : undefined } })}
      >
        <InspectorRange
          label="Значение"
          value={style.maxWidth ?? (isImage ? 680 : 1120)}
          min={isImage ? 120 : 320}
          max={isImage ? 1800 : 1600}
          step={20}
          unit="px"
          onChange={(value) => onPatch({ style: { maxWidth: value } })}
        />
      </InspectorOptionalControl>
    );
  }

  if (control === "maxHeight") {
    const enabled = style.maxHeight !== undefined;

    return (
      <InspectorOptionalControl
        title="Макс. высота"
        enabled={enabled}
        status={enabled ? `${style.maxHeight}px` : "нет"}
        onToggle={(value) => onPatch({ style: { maxHeight: value ? (style.maxHeight ?? (component.type === "image" ? 520 : 900)) : undefined } })}
      >
        <InspectorRange
          label="Значение"
          value={style.maxHeight ?? (component.type === "image" ? 520 : 900)}
          min={80}
          max={1400}
          step={20}
          unit="px"
          onChange={(value) => onPatch({ style: { maxHeight: value } })}
        />
      </InspectorOptionalControl>
    );
  }

  if (control === "widthMode") {
    return (
      <InspectorSelect
        label="Ширина"
        value={style.widthMode ?? "auto"}
        options={[
          ["auto", "Авто"],
          ["fit", "По контенту"],
          ["fixed", "Фиксированная"],
          ["full", "На всю ширину"]
        ]}
        onChange={(value) => onPatch({ style: { widthMode: value as WebBrainStyle["widthMode"] } })}
      />
    );
  }

  if (control === "position") {
    const keepVisualPosition = (position: WebBrainStyle["position"]) => {
      if (position === "absolute") {
        const nextLeft =
          style.left ??
          (selection?.parentLeft !== undefined ? clampEditorNumber(selection.left - selection.parentLeft, 0, -2000, 2000) : undefined);
        const nextTop =
          style.top ??
          (selection?.parentTop !== undefined ? clampEditorNumber(selection.top - selection.parentTop, 0, -2000, 2000) : undefined);

        onPatch({
          style: {
            position,
            left: nextLeft ?? 0,
            top: nextTop ?? 0,
            right: undefined,
            bottom: undefined
          }
        });
        return;
      }

      if (position === "sticky") {
        onPatch({
          style: {
            position,
            top: style.top ?? 0,
            right: undefined,
            bottom: undefined,
            left: undefined
          }
        });
        return;
      }

      onPatch({
        style: {
          position,
          top: undefined,
          right: undefined,
          bottom: undefined,
          left: undefined
        }
      });
    };

    return (
      <InspectorSelect
        label="Позиция"
        value={style.position ?? "relative"}
        options={[
          ["relative", "В потоке"],
          ["absolute", "Абсолютная"],
          ["sticky", "Липкая"]
        ]}
        onChange={(value) => keepVisualPosition(value as WebBrainStyle["position"])}
      />
    );
  }

  if (control === "positionOffsets") {
    return (
      <InspectorPositionBox
        label="Смещения"
        value={{ top: style.top, right: style.right, bottom: style.bottom, left: style.left }}
        onChange={(value) => onPatch({ style: { position: style.position ?? "relative", ...value } })}
      />
    );
  }

  if (control === "zIndex") {
    const enabled = style.zIndex !== undefined && style.zIndex !== 0;

    return (
      <InspectorOptionalControl
        title="Слой"
        enabled={enabled}
        status={enabled ? String(style.zIndex) : "авто"}
        onToggle={(value) => onPatch({ style: { zIndex: value ? (style.zIndex ?? 1) : undefined } })}
      >
        <InspectorRange label="Значение" value={style.zIndex ?? 1} min={-20} max={100} unit="" onChange={(value) => onPatch({ style: { zIndex: value } })} />
      </InspectorOptionalControl>
    );
  }

  if (control === "grow") {
    return (
      <InspectorSelect
        label="Grow"
        value={style.grow ?? "none"}
        options={[
          ["none", "Не растягивать"],
          ["fit", "По контенту"],
          ["fill", "Заполнить"]
        ]}
        onChange={(value) => onPatch({ style: { grow: value as WebBrainStyle["grow"] } })}
      />
    );
  }

  if (control === "overflow") {
    return (
      <InspectorSelect
        label="Переполнение"
        value={style.overflow ?? "visible"}
        options={[
          ["visible", "Показывать"],
          ["hidden", "Обрезать"],
          ["auto", "Скролл"]
        ]}
        onChange={(value) => onPatch({ style: { overflow: value as WebBrainStyle["overflow"] } })}
      />
    );
  }

  if (control === "buttonVariant") {
    return (
      <InspectorSelect
        label="Вариант"
        value={props.variant ?? "primary"}
        options={[
          ["primary", "Primary"],
          ["secondary", "Secondary"],
          ["ghost", "Ghost"],
          ["glass", "Glass"],
          ["lime3d", "3D CTA"],
          ["outline", "Outline"]
        ]}
        onChange={(value) =>
          onPatch({
            props: { variant: value as WebBrainProps["variant"] },
            style: buttonVariantStyle(value as NonNullable<WebBrainProps["variant"]>, themeTokens)
          })
        }
      />
    );
  }

  if (control === "buttonSize") {
    return (
      <InspectorSelect
        label="Размер"
        value={props.size ?? "md"}
        options={[
          ["sm", "Small"],
          ["md", "Medium"],
          ["lg", "Large"]
        ]}
        onChange={(value) =>
          onPatch({
            props: { size: value as WebBrainProps["size"] },
            style: buttonSizeStyle(value as NonNullable<WebBrainProps["size"]>)
          })
        }
      />
    );
  }

  if (control === "buttonIcon") {
    return (
      <InspectorButtonIconControl
        props={props}
        themeTokens={themeTokens}
        onPatch={(nextProps) => onPatch({ props: nextProps })}
      />
    );
  }

  if (control === "columns") {
    return <InspectorRange label="Колонки" value={component.props.columns ?? 3} min={1} max={6} unit="" onChange={(value) => onPatch({ props: { columns: value } })} />;
  }

  if (control === "width") {
    const maxWidthPercent = component.type === "image" ? 200 : 300;
    if (style.widthMode !== "fixed") return null;

    return (
      <InspectorRange
        label="Ширина"
        value={style.width ?? (component.type === "image" ? 58 : 100)}
        min={5}
        max={maxWidthPercent}
        step={5}
        unit="%"
        onChange={(value) => onPatch({ style: { width: value, widthMode: "fixed" } })}
      />
    );
  }

  if (control === "imageUpload") {
    return (
      <InspectorImageDropzone
        value={props.src ?? ""}
        onClear={() => onPatch({ props: { src: undefined } })}
        onChange={(value, fileName) =>
          onPatch({
            props: {
              src: value,
              ...(fileName && !props.alt ? { alt: fileName.replace(/\.[^.]+$/, "") } : {})
            }
          })
        }
      />
    );
  }

  if (control === "imageSrc") {
    return <InspectorTextInput label="URL изображения" value={props.src ?? ""} placeholder="https://..." clearLabel="Убрать" onClear={() => onPatch({ props: { src: undefined } })} onChange={(value) => onPatch({ props: { src: value } })} />;
  }

  if (control === "imageAlt") {
    return <InspectorTextInput label="Alt" value={props.alt ?? ""} onChange={(value) => onPatch({ props: { alt: value } })} />;
  }

  if (control === "imageFit") {
    return (
      <InspectorSelect
        label="Fit"
        value={style.objectFit ?? "cover"}
        options={[
          ["cover", "Cover"],
          ["contain", "Contain"]
        ]}
        onChange={(value) => onPatch({ style: { objectFit: value as WebBrainStyle["objectFit"] } })}
      />
    );
  }

  if (control === "imagePosition") {
    return <InspectorTextInput label="Position" value={style.objectPosition ?? "center"} onChange={(value) => onPatch({ style: { objectPosition: value } })} />;
  }

  if (control === "shadow") {
    const enabled = style.shadow !== undefined && style.shadow > 0;

    return (
      <InspectorOptionalControl
        title="Тень"
        enabled={enabled}
        status={enabled ? `${style.shadow}px` : "нет"}
        onToggle={(value) => onPatch({ style: { shadow: value ? (style.shadow && style.shadow > 0 ? style.shadow : 18) : undefined } })}
      >
        <InspectorRange label="Размер" value={style.shadow ?? 18} min={0} max={40} unit="px" onChange={(value) => onPatch({ style: { shadow: value } })} />
      </InspectorOptionalControl>
    );
  }

  return null;
}

function InspectorTextFormatControl({
  className = "",
  fontWeight,
  fontStyle,
  textTransform,
  textDecoration,
  onChange
}: {
  className?: string;
  fontWeight?: number;
  fontStyle?: WebBrainStyle["fontStyle"];
  textTransform?: WebBrainStyle["textTransform"];
  textDecoration?: WebBrainStyle["textDecoration"];
  onChange: (style: Partial<WebBrainStyle>) => void;
}) {
  return (
    <InspectorTextFormatToolbar
      className={className}
      boldActive={(fontWeight ?? 500) >= 700}
      italicActive={fontStyle === "italic"}
      textTransform={textTransform}
      textDecoration={textDecoration}
      onBold={(active) => onChange({ fontWeight: active ? 900 : 500 })}
      onItalic={(active) => onChange({ fontStyle: active ? "italic" : undefined })}
      onTextTransform={(value) => onChange({ textTransform: value })}
      onTextDecoration={(value) => onChange({ textDecoration: value })}
    />
  );
}

function InspectorAccentFormatControl({
  fontWeight,
  italic,
  textTransform,
  textDecoration,
  onChange
}: {
  fontWeight?: number;
  italic?: boolean;
  textTransform?: WebBrainProps["textAccentTransform"];
  textDecoration?: WebBrainProps["textAccentDecoration"];
  onChange: (props: Partial<WebBrainProps>) => void;
}) {
  return (
    <InspectorTextFormatToolbar
      boldActive={(fontWeight ?? 900) >= 700}
      italicActive={Boolean(italic)}
      textTransform={textTransform}
      textDecoration={textDecoration}
      onBold={(active) => onChange({ textAccentWeight: active ? 900 : 500, textAccentEnabled: true })}
      onItalic={(active) => onChange({ textAccentItalic: active, textAccentEnabled: true })}
      onTextTransform={(value) => onChange({ textAccentTransform: value as WebBrainProps["textAccentTransform"], textAccentEnabled: true })}
      onTextDecoration={(value) => onChange({ textAccentDecoration: value as WebBrainProps["textAccentDecoration"], textAccentEnabled: true })}
    />
  );
}

function InspectorTextFormatToolbar({
  className = "",
  boldActive,
  italicActive,
  textTransform,
  textDecoration,
  onBold,
  onItalic,
  onTextTransform,
  onTextDecoration
}: {
  className?: string;
  boldActive: boolean;
  italicActive: boolean;
  textTransform?: WebBrainStyle["textTransform"];
  textDecoration?: WebBrainStyle["textDecoration"];
  onBold: (active: boolean) => void;
  onItalic: (active: boolean) => void;
  onTextTransform: (value: WebBrainStyle["textTransform"]) => void;
  onTextDecoration: (value: WebBrainStyle["textDecoration"]) => void;
}) {
  const decoration = textDecoration ?? "none";

  return (
    <div className={`rounded-[13px] border border-white/[0.07] bg-black/20 p-2 ${className}`}>
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/30">Формат</p>
      <div className="grid grid-cols-7 gap-1">
        <InspectorFormatIconButton
          active={boldActive}
          label="Жирный"
          icon={<Bold className="h-4 w-4" />}
          onClick={() => onBold(!boldActive)}
        />
        <InspectorFormatIconButton
          active={italicActive}
          label="Курсив"
          icon={<Italic className="h-4 w-4" />}
          onClick={() => onItalic(!italicActive)}
        />
        <InspectorFormatIconButton
          active={decoration.includes("underline")}
          label="Подчеркивание"
          icon={<Underline className="h-4 w-4" />}
          onClick={() => onTextDecoration(toggleTextDecoration(decoration, "underline"))}
        />
        <InspectorFormatIconButton
          active={decoration.includes("line-through")}
          label="Зачеркивание"
          icon={<Strikethrough className="h-4 w-4" />}
          onClick={() => onTextDecoration(toggleTextDecoration(decoration, "line-through"))}
        />
        <InspectorFormatIconButton
          active={textTransform === "uppercase"}
          label="Все буквы большие"
          icon={<CaseUpper className="h-4 w-4" />}
          onClick={() => onTextTransform(textTransform === "uppercase" ? undefined : "uppercase")}
        />
        <InspectorFormatIconButton
          active={textTransform === "capitalize"}
          label="Каждое слово с большой буквы"
          icon={<ALargeSmall className="h-4 w-4" />}
          onClick={() => onTextTransform(textTransform === "capitalize" ? undefined : "capitalize")}
        />
        <InspectorFormatIconButton
          active={!textTransform || textTransform === "none"}
          label="Обычный регистр"
          icon={<LetterText className="h-4 w-4" />}
          onClick={() => onTextTransform(undefined)}
        />
      </div>
    </div>
  );
}

function InspectorFormatIconButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-9 min-w-0 place-items-center rounded-[10px] border text-sm transition ${
        active
          ? "border-lime/55 bg-lime/[0.18] text-lime shadow-[0_0_0_1px_rgba(185,255,71,0.1)]"
          : "border-white/[0.06] bg-white/[0.035] text-white/52 hover:border-white/12 hover:bg-white/[0.07] hover:text-white/78"
      }`}
    >
      {icon}
    </button>
  );
}

function toggleTextDecoration(
  value: WebBrainStyle["textDecoration"],
  token: "underline" | "line-through"
): WebBrainStyle["textDecoration"] {
  const tokens = new Set((value ?? "none").split(" ").filter((item) => item === "underline" || item === "line-through"));

  if (tokens.has(token)) {
    tokens.delete(token);
  } else {
    tokens.add(token);
  }

  const hasUnderline = tokens.has("underline");
  const hasLineThrough = tokens.has("line-through");
  if (hasUnderline && hasLineThrough) return "underline line-through";
  if (hasUnderline) return "underline";
  if (hasLineThrough) return "line-through";
  return undefined;
}

function InspectorButtonIconControl({
  props,
  themeTokens,
  onPatch
}: {
  props: WebBrainProps;
  themeTokens: EditorThemeTokens;
  onPatch: (props: Partial<WebBrainProps>) => void;
}) {
  const enabled = defaultButtonIconEnabled(props);
  const icon = props.buttonIcon ?? "arrowRight";
  const position = props.buttonIconPosition ?? "right";
  const size = props.buttonIconSize ?? 30;
  const gap = props.buttonIconGap ?? 12;
  const radius = props.buttonIconRadius ?? 999;
  const iconBackground = props.buttonIconBackground ?? "rgba(0,0,0,0.12)";
  const iconColor = props.buttonIconColor ?? "currentColor";
  const IconPreview = icon === "arrowUpRight" ? ArrowUpRight : icon === "chevronRight" ? ChevronRight : icon === "plus" ? Plus : icon === "send" ? Send : ArrowRight;

  return (
    <InspectorOptionalControl
      title="Иконка в кнопке"
      enabled={enabled}
      status={enabled ? buttonIconLabel(icon) : "нет"}
      onToggle={(nextEnabled) =>
        onPatch(
          nextEnabled
            ? {
                buttonIconEnabled: true,
                buttonIcon: icon,
                buttonIconPosition: position,
                buttonIconSize: size,
                buttonIconGap: gap,
                buttonIconBackground: iconBackground
              }
            : { buttonIconEnabled: false }
        )
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-[13px] border border-white/[0.07] bg-black/20 p-3">
        <span
          className="grid shrink-0 place-items-center rounded-full"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            color: iconColor,
            background: iconBackground
          }}
        >
          <IconPreview className="h-[62%] w-[62%]" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white/78">{buttonIconLabel(icon)}</span>
          <span className="mt-0.5 block text-xs text-white/38">{position === "left" ? "Слева от текста" : "Справа от текста"}</span>
        </span>
      </div>

      <InspectorSelect
        label="Тип"
        value={icon}
        options={[
          ["arrowRight", "Стрелка"],
          ["arrowUpRight", "Стрелка вверх"],
          ["chevronRight", "Шеврон"],
          ["plus", "Плюс"],
          ["send", "Отправка"]
        ]}
        onChange={(value) => onPatch({ buttonIcon: value as WebBrainProps["buttonIcon"], buttonIconEnabled: true })}
      />
      <InspectorSelect
        label="Позиция"
        value={position}
        options={[
          ["right", "Справа"],
          ["left", "Слева"]
        ]}
        onChange={(value) => onPatch({ buttonIconPosition: value as WebBrainProps["buttonIconPosition"], buttonIconEnabled: true })}
      />
      <InspectorRange label="Размер" value={size} min={14} max={72} unit="px" onChange={(value) => onPatch({ buttonIconSize: value, buttonIconEnabled: true })} />
      <InspectorRange label="Расстояние" value={gap} min={0} max={40} unit="px" onChange={(value) => onPatch({ buttonIconGap: value, buttonIconEnabled: true })} />
      <InspectorRange label="Скругление" value={radius} min={0} max={999} unit="px" onChange={(value) => onPatch({ buttonIconRadius: value, buttonIconEnabled: true })} />
      <InspectorColorField
        label="Цвет иконки"
        value={props.buttonIconColor}
        fallback="currentColor"
        presets={[themeTokens.text, themeTokens.primary, themeTokens.onPrimary, "#090b0b", "#f4f5f0"]}
        allowRawCss
        clearLabel="Как текст"
        onChange={(value) => onPatch({ buttonIconColor: value, buttonIconEnabled: true })}
      />
      <InspectorColorField
        label="Фон иконки"
        value={props.buttonIconBackground}
        fallback="rgba(0,0,0,0.12)"
        presets={inspectorColorPresetsForControl("background", themeTokens)}
        allowRawCss
        allowGradient
        clearLabel="Стандартный"
        onChange={(value) => onPatch({ buttonIconBackground: value, buttonIconEnabled: true })}
      />
    </InspectorOptionalControl>
  );
}

function InspectorTextAccentControl({
  props,
  themeTokens,
  onPatch
}: {
  props: WebBrainProps;
  themeTokens: EditorThemeTokens;
  onPatch: (props: Partial<WebBrainProps>) => void;
}) {
  const enabled = Boolean(props.textAccentEnabled);
  const accentText = props.textAccentText ?? defaultTextAccentText(props.text);
  const accentColor = props.textAccentColor ?? themeTokens.primary;
  const accentWeight = props.textAccentWeight ?? 900;
  const accentTextStyle: CSSProperties = {
    color: accentColor,
    fontWeight: accentWeight,
    fontStyle: props.textAccentItalic ? "italic" : undefined,
    textTransform: props.textAccentTransform && props.textAccentTransform !== "none" ? props.textAccentTransform : undefined,
    textDecorationLine: props.textAccentDecoration && props.textAccentDecoration !== "none" ? props.textAccentDecoration : undefined
  };

  return (
    <InspectorOptionalControl
      title="Акцент в тексте"
      enabled={enabled}
      status={enabled && accentText ? accentText : "нет"}
      onToggle={(nextEnabled) =>
        onPatch(
          nextEnabled
            ? {
                textAccentEnabled: true,
                textAccentText: accentText,
                textAccentColor: accentColor,
                textAccentWeight: accentWeight,
                textAccentLineBreak: props.textAccentLineBreak ?? false
              }
            : { textAccentEnabled: false }
        )
      }
    >
      <div className="mb-4 rounded-[13px] border border-white/[0.07] bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/30">Превью</p>
        <p className="mt-2 text-lg font-black leading-[1.05] text-white/84">
          <span>{props.text?.replace(accentText, "").trim() || "Основной текст"}</span>
          {props.textAccentLineBreak ? <br /> : " "}
          <span style={accentTextStyle}>{accentText || "Акцент"}</span>
        </p>
      </div>
      <InspectorTextInput
        label="Какие слова выделить"
        value={accentText}
        placeholder="Например: НЕ МЕСЯЦЫ"
        onChange={(value) => onPatch({ textAccentText: value, textAccentEnabled: true })}
      />
      <div className="mb-4">
        <InspectorAccentFormatControl
          fontWeight={accentWeight}
          italic={props.textAccentItalic}
          textTransform={props.textAccentTransform}
          textDecoration={props.textAccentDecoration}
          onChange={onPatch}
        />
      </div>
      <InspectorColorField
        label="Цвет акцента"
        value={props.textAccentColor}
        fallback={themeTokens.primary}
        presets={[themeTokens.primary, themeTokens.onPrimary, themeTokens.text, "#b9ff47", "#f4f5f0", "#63e6ff"]}
        clearLabel="Цвет темы"
        onChange={(value) => onPatch({ textAccentColor: value, textAccentEnabled: true })}
      />
      <InspectorRange
        label="Насыщенность акцента"
        value={accentWeight}
        min={100}
        max={1000}
        step={50}
        unit=""
        onChange={(value) => onPatch({ textAccentWeight: value, textAccentEnabled: true })}
      />
      <InspectorBooleanRow
        label="С новой строки"
        value={Boolean(props.textAccentLineBreak)}
        onChange={(value) => onPatch({ textAccentLineBreak: value, textAccentEnabled: true })}
      />
    </InspectorOptionalControl>
  );
}

function buttonVariantStyle(variant: NonNullable<WebBrainProps["variant"]>, tokens: EditorThemeTokens): Partial<WebBrainStyle> {
  if (variant === "secondary") {
    return {
      background: tokens.surfaceSoft,
      textColor: tokens.text,
      borderColor: tokens.border
    };
  }

  if (variant === "ghost") {
    return {
      background: "transparent",
      textColor: tokens.text,
      borderColor: tokens.border
    };
  }

  if (variant === "glass") {
    return {
      background: "rgba(255,255,255,0.07)",
      textColor: tokens.text,
      borderColor: "rgba(255,255,255,0.16)",
      radius: 22
    };
  }

  if (variant === "lime3d") {
    return {
      background: tokens.primary,
      textColor: tokens.onPrimary,
      borderColor: tokens.primary,
      radius: 24
    };
  }

  if (variant === "outline") {
    return {
      background: "transparent",
      textColor: tokens.primary,
      borderColor: tokens.primary
    };
  }

  return {
    background: tokens.primary,
    textColor: tokens.onPrimary,
    borderColor: tokens.primary
  };
}

function webBrainStyleToInlinePatch(style: Partial<WebBrainStyle>) {
  const patch: Record<string, string> = {};

  if (hasStyleProperty(style, "width")) patch.width = `${clampEditorNumber(style.width, 100, 1, 300)}%`;
  if (hasStyleProperty(style, "widthMode")) {
    if (style.widthMode === "full") patch.width = "100%";
    if (style.widthMode === "fit") patch.width = "fit-content";
    if (style.widthMode === "auto") patch.width = "";
  }
  if (hasStyleProperty(style, "height")) patch.height = `${clampEditorNumber(style.height, 160, 1, 1600)}px`;
  if (hasStyleProperty(style, "heightMode")) {
    if (style.heightMode === "full") patch.height = "100%";
    if (style.heightMode === "fit") patch.height = "fit-content";
    if (style.heightMode === "auto") patch.height = "";
  }
  if (hasStyleProperty(style, "minWidth")) patch.minWidth = `${clampEditorNumber(style.minWidth, 0, 0, 1200)}px`;
  if (hasStyleProperty(style, "maxWidth")) patch["--wb-max-width"] = `${clampEditorNumber(style.maxWidth, 1120, 280, 1800)}px`;
  if (hasStyleProperty(style, "minHeight")) patch.minHeight = `${clampEditorNumber(style.minHeight, 0, 0, 1200)}px`;
  if (hasStyleProperty(style, "maxHeight")) patch.maxHeight = `${clampEditorNumber(style.maxHeight, 900, 0, 1800)}px`;
  if (hasStyleProperty(style, "padding")) {
    const padding = normalizeSpacingValues(style.padding, emptySpacingValues);
    patch.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  }
  if (hasStyleProperty(style, "margin")) {
    const margin = normalizeSpacingValues(style.margin, emptySpacingValues);
    patch.margin = `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`;
  }
  if (hasStyleProperty(style, "gap")) patch.gap = `${clampEditorNumber(style.gap, 0, 0, 120)}px`;
  if (hasStyleProperty(style, "radius")) patch.borderRadius = `${clampEditorNumber(style.radius, 0, 0, 80)}px`;
  if (hasStyleProperty(style, "background")) patch.background = style.background ?? "";
  if (hasStyleProperty(style, "backgroundImage") || hasStyleProperty(style, "backgroundOverlay") || hasStyleProperty(style, "backgroundOverlayOpacity")) {
    patch.backgroundImage = editorBackgroundImageToCss(style);
  }
  if (hasStyleProperty(style, "backgroundSize")) patch.backgroundSize = style.backgroundSize ?? "";
  if (hasStyleProperty(style, "backgroundPosition")) patch.backgroundPosition = style.backgroundPosition ?? "";
  if (hasStyleProperty(style, "backgroundRepeat")) patch.backgroundRepeat = style.backgroundRepeat ?? "";
  if (hasStyleProperty(style, "backgroundBlendMode")) patch.backgroundBlendMode = style.backgroundBlendMode ?? "";
  if (hasStyleProperty(style, "borderColor") || hasStyleProperty(style, "borderWidth")) {
    patch.border = style.borderColor ? `${clampEditorNumber(style.borderWidth, 1, 1, 24)}px solid ${style.borderColor}` : "";
  }
  if (hasStyleProperty(style, "textColor")) patch.color = style.textColor ?? "";
  if (hasStyleProperty(style, "hoverColor")) patch["--wb-hover-color"] = style.hoverColor ?? "";
  if (hasStyleProperty(style, "align")) patch.textAlign = style.align ?? "";
  if (hasStyleProperty(style, "position")) patch.position = style.position ?? "";
  if (hasStyleProperty(style, "top")) patch.top = style.top === undefined ? "" : `${clampEditorNumber(style.top, 0, -1000, 1000)}px`;
  if (hasStyleProperty(style, "right")) patch.right = style.right === undefined ? "" : `${clampEditorNumber(style.right, 0, -1000, 1000)}px`;
  if (hasStyleProperty(style, "bottom")) patch.bottom = style.bottom === undefined ? "" : `${clampEditorNumber(style.bottom, 0, -1000, 1000)}px`;
  if (hasStyleProperty(style, "left")) patch.left = style.left === undefined ? "" : `${clampEditorNumber(style.left, 0, -1000, 1000)}px`;
  if (hasStyleProperty(style, "zIndex")) patch.zIndex = String(clampEditorNumber(style.zIndex, 0, -100, 1000));
  if (hasStyleProperty(style, "grow")) {
    patch.flex = style.grow === "fill" ? "1 1 0" : style.grow === "fit" ? "0 0 auto" : "";
  }
  if (hasStyleProperty(style, "overflow")) patch.overflow = style.overflow ?? "";
  if (hasStyleProperty(style, "direction")) patch.flexDirection = style.direction ?? "";
  if (hasStyleProperty(style, "wrap")) patch.flexWrap = style.wrap ? "wrap" : "nowrap";
  if (hasStyleProperty(style, "justify")) {
    patch.justifyContent = style.justify === "between" ? "space-between" : style.justify === "center" ? "center" : "flex-start";
  }
  if (hasStyleProperty(style, "alignItems")) {
    patch.alignItems =
      style.alignItems === "start" ? "flex-start" : style.alignItems === "center" ? "center" : style.alignItems === "end" ? "flex-end" : "stretch";
  }
  if (hasStyleProperty(style, "fontSize")) {
    const fontSize = clampEditorNumber(style.fontSize, 16, 8, 120);
    patch.fontSize = `${fontSize}px`;
    patch["--wb-font-size"] = `${fontSize}px`;
  }
  if (hasStyleProperty(style, "fontWeight")) patch.fontWeight = String(clampEditorNumber(style.fontWeight, 500, 100, 1000));
  if (hasStyleProperty(style, "letterSpacing")) patch.letterSpacing = `${clampEditorFloat(style.letterSpacing, 0, -2, 8)}px`;
  if (hasStyleProperty(style, "lineHeight")) patch.lineHeight = String(style.lineHeight ?? "");
  if (hasStyleProperty(style, "shadow")) {
    const shadow = clampEditorNumber(style.shadow, 0, 0, 80);
    patch.boxShadow = shadow > 0 ? `0 ${shadow}px ${shadow * 3}px rgba(0,0,0,0.28)` : "";
  }
  if (hasStyleProperty(style, "objectFit")) patch.objectFit = style.objectFit ?? "";
  if (hasStyleProperty(style, "objectPosition")) patch.objectPosition = style.objectPosition ?? "";

  return patch;
}

function editorBackgroundImageToCss(style: Partial<WebBrainStyle>) {
  const imageUrl = style.backgroundImage ? editorCssImageUrl(style.backgroundImage) : "";
  if (!imageUrl) return "";

  const layers: string[] = [];

  if (style.backgroundOverlay || style.backgroundOverlayOpacity !== undefined) {
    const overlayColor = editorColorWithOpacity(style.backgroundOverlay ?? "#000000", style.backgroundOverlayOpacity ?? 0.42);
    layers.push(`linear-gradient(0deg, ${overlayColor}, ${overlayColor})`);
  }

  layers.push(imageUrl);

  return layers.join(",");
}

function editorCssImageUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return "";

  return `url("${trimmedValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "")}")`;
}

function editorColorWithOpacity(color: string, opacity: number) {
  const safeOpacity = clampEditorFloat(opacity, 0.42, 0, 1);

  if (safeOpacity >= 0.995) return color;
  if (safeOpacity <= 0.005) return "transparent";

  return `color-mix(in srgb, ${color} ${formatEditorCssNumber(safeOpacity * 100)}%, transparent)`;
}

function webBrainEffectsToInlinePatch(effects?: Partial<WebBrainEffects>) {
  const patch: Record<string, string> = {};
  if (!effects) return patch;

  const transform = effects.transform ?? {};
  const hover = effects.hover ?? {};
  const overlay = effects.overlay ?? {};
  const transition = effects.transition ?? {};
  const opacity = clampEditorFloat(effects.opacity, 1, 0, 1);

  patch["--wb-opacity"] = formatEditorCssNumber(opacity);
  patch["--wb-cursor"] = effects.cursor && effects.cursor !== "auto" ? effects.cursor : "";
  patch["--wb-scale"] = formatEditorCssNumber(clampEditorFloat(transform.scale, 1, 0.1, 3));
  patch["--wb-rotate-x"] = `${formatEditorCssNumber(clampEditorFloat(transform.rotateX, 0, -180, 180))}deg`;
  patch["--wb-rotate-y"] = `${formatEditorCssNumber(clampEditorFloat(transform.rotateY, 0, -180, 180))}deg`;
  patch["--wb-rotate-z"] = `${formatEditorCssNumber(clampEditorFloat(transform.rotateZ, 0, -180, 180))}deg`;
  patch["--wb-skew-x"] = `${formatEditorCssNumber(clampEditorFloat(transform.skewX, 0, -60, 60))}deg`;
  patch["--wb-skew-y"] = `${formatEditorCssNumber(clampEditorFloat(transform.skewY, 0, -60, 60))}deg`;
  patch["--wb-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(transform.offsetX, 0, -240, 240))}px`;
  patch["--wb-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(transform.offsetY, 0, -240, 240))}px`;

  const shadow = clampEditorFloat(transform.shadow, 0, 0, 80);
  patch.boxShadow = shadow > 0 ? `0 ${formatEditorCssNumber(shadow)}px ${formatEditorCssNumber(shadow * 3)}px rgba(0,0,0,0.28)` : "";

  patch["--wb-hover-opacity"] = formatEditorCssNumber(clampEditorFloat(hover.opacity, opacity, 0, 1));
  patch["--wb-hover-scale"] = formatEditorCssNumber(clampEditorFloat(hover.scale, transform.scale ?? 1, 0.1, 3));
  patch["--wb-hover-rotate-x"] = `${formatEditorCssNumber(clampEditorFloat(hover.rotateX, transform.rotateX ?? 0, -180, 180))}deg`;
  patch["--wb-hover-rotate-y"] = `${formatEditorCssNumber(clampEditorFloat(hover.rotateY, transform.rotateY ?? 0, -180, 180))}deg`;
  patch["--wb-hover-rotate-z"] = `${formatEditorCssNumber(clampEditorFloat(hover.rotateZ, transform.rotateZ ?? 0, -180, 180))}deg`;
  patch["--wb-hover-skew-x"] = `${formatEditorCssNumber(clampEditorFloat(hover.skewX, transform.skewX ?? 0, -60, 60))}deg`;
  patch["--wb-hover-skew-y"] = `${formatEditorCssNumber(clampEditorFloat(hover.skewY, transform.skewY ?? 0, -60, 60))}deg`;
  patch["--wb-hover-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(hover.offsetX, transform.offsetX ?? 0, -240, 240))}px`;
  patch["--wb-hover-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(hover.offsetY, transform.offsetY ?? 0, -240, 240))}px`;

  const hoverShadow = clampEditorFloat(hover.shadow, 0, 0, 80);
  patch["--wb-hover-shadow"] = hoverShadow > 0 ? `0 ${formatEditorCssNumber(hoverShadow)}px ${formatEditorCssNumber(hoverShadow * 3)}px rgba(0,0,0,0.32)` : "";

  const press = effects.press ?? {};
  patch["--wb-press-opacity"] = formatEditorCssNumber(clampEditorFloat(press.opacity, opacity, 0, 1));
  patch["--wb-press-scale"] = formatEditorCssNumber(clampEditorFloat(press.scale, transform.scale ?? 0.96, 0.1, 3));
  patch["--wb-press-rotate-x"] = `${formatEditorCssNumber(clampEditorFloat(press.rotateX, transform.rotateX ?? 0, -180, 180))}deg`;
  patch["--wb-press-rotate-y"] = `${formatEditorCssNumber(clampEditorFloat(press.rotateY, transform.rotateY ?? 0, -180, 180))}deg`;
  patch["--wb-press-rotate-z"] = `${formatEditorCssNumber(clampEditorFloat(press.rotateZ, transform.rotateZ ?? 0, -180, 180))}deg`;
  patch["--wb-press-skew-x"] = `${formatEditorCssNumber(clampEditorFloat(press.skewX, transform.skewX ?? 0, -60, 60))}deg`;
  patch["--wb-press-skew-y"] = `${formatEditorCssNumber(clampEditorFloat(press.skewY, transform.skewY ?? 0, -60, 60))}deg`;
  patch["--wb-press-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(press.offsetX, transform.offsetX ?? 0, -240, 240))}px`;
  patch["--wb-press-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(press.offsetY, transform.offsetY ?? 0, -240, 240))}px`;

  const pressShadow = clampEditorFloat(press.shadow, 0, 0, 80);
  patch["--wb-press-shadow"] = pressShadow > 0 ? `0 ${formatEditorCssNumber(pressShadow)}px ${formatEditorCssNumber(pressShadow * 3)}px rgba(0,0,0,0.32)` : "";

  const loop = effects.loop ?? {};
  patch["--wb-loop-opacity"] = formatEditorCssNumber(clampEditorFloat(loop.opacity, opacity, 0, 1));
  patch["--wb-loop-scale"] = formatEditorCssNumber(clampEditorFloat(loop.scale, transform.scale ?? 1, 0.1, 3));
  patch["--wb-loop-rotate-x"] = `${formatEditorCssNumber(clampEditorFloat(loop.rotateX, transform.rotateX ?? 0, -180, 180))}deg`;
  patch["--wb-loop-rotate-y"] = `${formatEditorCssNumber(clampEditorFloat(loop.rotateY, transform.rotateY ?? 0, -180, 180))}deg`;
  patch["--wb-loop-rotate-z"] = `${formatEditorCssNumber(clampEditorFloat(loop.rotateZ, transform.rotateZ ?? 360, -720, 720))}deg`;
  patch["--wb-loop-skew-x"] = `${formatEditorCssNumber(clampEditorFloat(loop.skewX, transform.skewX ?? 0, -60, 60))}deg`;
  patch["--wb-loop-skew-y"] = `${formatEditorCssNumber(clampEditorFloat(loop.skewY, transform.skewY ?? 0, -60, 60))}deg`;
  patch["--wb-loop-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(loop.offsetX, transform.offsetX ?? 0, -240, 240))}px`;
  patch["--wb-loop-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(loop.offsetY, transform.offsetY ?? 0, -240, 240))}px`;
  patch["--wb-loop-direction"] = loop.mode === "mirror" ? "alternate" : "normal";
  patch["--wb-loop-delay"] = `${formatEditorCssNumber(clampEditorFloat(loop.delay, 0, 0, 3) * 1000)}ms`;
  if (loop.transition) {
    const loopDuration = loop.transition.type === "spring" ? 1800 : clampEditorFloat(loop.transition.duration, 2.8, 0.05, 8) * 1000;
    patch["--wb-loop-duration"] = `${formatEditorCssNumber(loopDuration)}ms`;
    patch["--wb-loop-ease"] = webBrainTransitionToCssEase(loop.transition);
  }

  const appear = effects.appear ?? {};
  patch["--wb-appear-delay"] = `${formatEditorCssNumber(clampEditorFloat(appear.delay, 0, 0, 3) * 1000)}ms`;
  patch["--wb-appear-opacity"] = formatEditorCssNumber(clampEditorFloat(appear.enter?.opacity, 0, 0, 1));
  patch["--wb-appear-scale"] = formatEditorCssNumber(clampEditorFloat(appear.enter?.scale, appear.preset === "scale" ? 0.9 : 1, 0.1, 3));
  patch["--wb-appear-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(appear.enter?.offsetX, 0, -240, 240))}px`;
  patch["--wb-appear-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(appear.enter?.offsetY, appear.preset === "slide-up" ? 24 : 0, -240, 240))}px`;
  patch["--wb-appear-blur"] = appear.preset === "blur" ? "12px" : "0px";

  const textEffect = effects.textEffect ?? {};
  patch["--wb-text-delay"] = `${formatEditorCssNumber(clampEditorFloat(textEffect.delay, 0, 0, 3) * 1000)}ms`;
  patch["--wb-text-blur"] = textEffect.preset === "blur" ? "12px" : "0px";
  patch["--wb-text-offset-y"] = textEffect.preset === "slide" ? "18px" : "8px";

  const scrollSpeed = effects.scrollSpeed ?? {};
  patch["--wb-scroll-speed"] = formatEditorCssNumber(clampEditorFloat(scrollSpeed.speed, 110, 10, 300));

  const scrollTransform = effects.scrollTransform ?? {};
  const patchScrollTransformVars = (prefix: "from" | "to", value?: WebBrainTransform) => {
    if (!value) return;
    if (value.opacity !== undefined) patch[`--wb-scroll-${prefix}-opacity`] = formatEditorCssNumber(clampEditorFloat(value.opacity, prefix === "from" ? 0.35 : 1, 0, 1));
    if (value.scale !== undefined) patch[`--wb-scroll-${prefix}-scale`] = formatEditorCssNumber(clampEditorFloat(value.scale, 1, 0.1, 3));
    if (value.rotateZ !== undefined) patch[`--wb-scroll-${prefix}-rotate-z`] = `${formatEditorCssNumber(clampEditorFloat(value.rotateZ, 0, -360, 360))}deg`;
    if (value.offsetX !== undefined) patch[`--wb-scroll-${prefix}-offset-x`] = `${formatEditorCssNumber(clampEditorFloat(value.offsetX, 0, -240, 240))}px`;
    if (value.offsetY !== undefined) patch[`--wb-scroll-${prefix}-offset-y`] = `${formatEditorCssNumber(clampEditorFloat(value.offsetY, prefix === "from" ? 30 : 0, -240, 240))}px`;
  };
  patchScrollTransformVars("from", scrollTransform.from);
  patchScrollTransformVars("to", scrollTransform.to);

  const ticker = effects.ticker ?? {};
  const tickerDuration = 10000 / Math.max(0.1, clampEditorFloat(ticker.speed, 100, 10, 300) / 100);
  patch["--wb-ticker-duration"] = `${formatEditorCssNumber(tickerDuration)}ms`;
  patch["--wb-ticker-x"] = ticker.direction === "right" ? "16px" : ticker.direction === "up" || ticker.direction === "down" ? "0px" : "-16px";
  patch["--wb-ticker-y"] = ticker.direction === "up" ? "-16px" : ticker.direction === "down" ? "16px" : "0px";

  patch["--wb-overlay-color"] = overlay.color ?? "rgba(18,20,21,0.96)";
  patch["--wb-overlay-opacity"] = formatEditorCssNumber(clampEditorFloat(overlay.opacity, 1, 0, 1));
  patch["--wb-overlay-blend"] = overlay.blendMode ?? "normal";
  patch["--wb-overlay-offset-x"] = `${formatEditorCssNumber(clampEditorFloat(overlay.offsetX, 0, -240, 240))}px`;
  patch["--wb-overlay-offset-y"] = `${formatEditorCssNumber(clampEditorFloat(overlay.offsetY, 10, -240, 240))}px`;
  patch["--wb-overlay-z"] = formatEditorCssNumber(clampEditorFloat(overlay.zIndex, 0, 0, 999));

  const duration = transition.type === "spring" ? 420 : clampEditorFloat(transition.duration, 0.18, 0, 4) * 1000;
  const delay = clampEditorFloat(transition.delay, 0, 0, 3) * 1000;
  patch["--wb-transition-duration"] = `${formatEditorCssNumber(duration)}ms`;
  patch["--wb-transition-delay"] = `${formatEditorCssNumber(delay)}ms`;
  patch["--wb-transition-ease"] = webBrainTransitionToCssEase(transition);

  return patch;
}

function webBrainTransitionToCssEase(transition: NonNullable<WebBrainEffects["transition"]>) {
  if (transition.type === "spring") {
    const stiffness = clampEditorFloat(transition.stiffness, 260, 20, 700);
    const damping = clampEditorFloat(transition.damping, 22, 1, 80);
    const overshoot = Math.max(1, Math.min(1.42, 1 + (stiffness - damping * 8) / 900));

    return `cubic-bezier(0.18, 0.89, 0.32, ${formatEditorCssNumber(overshoot)})`;
  }

  if (transition.bezier && /^-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+$/.test(transition.bezier)) {
    return `cubic-bezier(${transition.bezier})`;
  }

  if (transition.easing === "linear") return "linear";
  if (transition.easing === "ease") return "ease";
  if (transition.easing === "ease-in") return "cubic-bezier(0.4, 0, 1, 1)";
  if (transition.easing === "ease-out") return "cubic-bezier(0, 0, 0.2, 1)";

  return "cubic-bezier(0.44, 0, 0.56, 1)";
}

function getTransitionBezierTuple(transition: NonNullable<WebBrainEffects["transition"]>): [number, number, number, number] {
  if (transition.type === "spring") {
    const stiffness = clampEditorFloat(transition.stiffness, 260, 20, 700);
    const damping = clampEditorFloat(transition.damping, 22, 1, 80);
    const overshoot = Math.max(1, Math.min(1.42, 1 + (stiffness - damping * 8) / 900));

    return [0.18, 0.89, 0.32, overshoot];
  }

  const preset = inspectorEasePresets.find((item) => item.key === (transition.easing ?? "ease-in-out")) ?? inspectorEasePresets[4];

  return parseBezierTuple(transition.bezier, preset.bezier);
}

function parseBezierTuple(value: string | undefined, fallback: [number, number, number, number]): [number, number, number, number] {
  if (!value) return fallback;

  const numbers = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  if (numbers.length !== 4) return fallback;

  return [
    clampEditorFloat(numbers[0], fallback[0], 0, 1),
    clampEditorFloat(numbers[1], fallback[1], transitionCurveYMin, transitionCurveYMax),
    clampEditorFloat(numbers[2], fallback[2], 0, 1),
    clampEditorFloat(numbers[3], fallback[3], transitionCurveYMin, transitionCurveYMax)
  ];
}

function formatBezierTuple(tuple: [number, number, number, number]) {
  return tuple.map((value) => formatEditorCssNumber(value)).join(", ");
}

function getTransitionCurvePoint(xValue: number, yValue: number, width: number, height: number, padding: number) {
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const normalizedY = (clampEditorFloat(yValue, 0, transitionCurveYMin, transitionCurveYMax) - transitionCurveYMin) / (transitionCurveYMax - transitionCurveYMin);

  return {
    x: padding + clampEditorFloat(xValue, 0, 0, 1) * graphWidth,
    y: height - padding - normalizedY * graphHeight
  };
}

function getBezierHandlePoints(tuple: [number, number, number, number], width: number, height: number, padding: number) {
  return [
    getTransitionCurvePoint(tuple[0], tuple[1], width, height, padding),
    getTransitionCurvePoint(tuple[2], tuple[3], width, height, padding)
  ];
}

function getBezierCurvePath(tuple: [number, number, number, number], width: number, height: number, padding: number) {
  const start = getTransitionCurvePoint(0, 0, width, height, padding);
  const end = getTransitionCurvePoint(1, 1, width, height, padding);
  const handles = getBezierHandlePoints(tuple, width, height, padding);

  return `M ${start.x} ${start.y} C ${handles[0].x} ${handles[0].y}, ${handles[1].x} ${handles[1].y}, ${end.x} ${end.y}`;
}

function getSpringCurvePath(transition: NonNullable<WebBrainEffects["transition"]>, width: number, height: number, padding: number) {
  const stiffness = clampEditorFloat(transition.stiffness, 260, 20, 700);
  const damping = clampEditorFloat(transition.damping, 22, 1, 80);
  const mass = clampEditorFloat(transition.mass, 1, 0.1, 5);
  const frequency = Math.max(1.2, Math.min(5.5, Math.sqrt(stiffness / mass) / 7));
  const decay = Math.max(1.5, Math.min(9, damping / 5));

  return Array.from({ length: 34 }, (_, index) => {
    const t = index / 33;
    const y = 1 - Math.exp(-decay * t) * Math.cos(frequency * Math.PI * t);
    const point = getTransitionCurvePoint(t, y, width, height, padding);

    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");
}

function cssEaseToMotionEase(cssEase: string): "linear" | "easeIn" | "easeOut" | "easeInOut" | [number, number, number, number] {
  if (cssEase === "linear") return "linear";
  if (cssEase === "ease") return [0.25, 0.1, 0.25, 1];

  const match = cssEase.match(/cubic-bezier\(([^)]+)\)/);
  if (!match) return "easeInOut";

  return parseBezierTuple(match[1], [0.44, 0, 0.56, 1]);
}

function formatEditorCssNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function hasStyleProperty<T extends keyof WebBrainStyle>(style: Partial<WebBrainStyle>, property: T) {
  return Object.prototype.hasOwnProperty.call(style, property);
}

function buttonSizeStyle(size: NonNullable<WebBrainProps["size"]>): Partial<WebBrainStyle> {
  if (size === "sm") {
    return {
      padding: {
        top: 12,
        right: 18,
        bottom: 12,
        left: 18
      },
      fontSize: 14
    };
  }

  if (size === "lg") {
    return {
      padding: {
        top: 18,
        right: 30,
        bottom: 18,
        left: 30
      },
      fontSize: 17
    };
  }

  return {
    padding: {
      top: 16,
      right: 28,
      bottom: 16,
      left: 28
    },
    fontSize: 16
  };
}

function canContainEditorChildren(type: WebBrainComponentType) {
  return ["page", "section", "footer", "container", "row", "column", "grid", "stack", "card", "cardGrid"].includes(type);
}

function insertChildAt(children: string[], childId: string, index?: number) {
  if (index === undefined) return [...children, childId];

  const safeIndex = Math.max(0, Math.min(children.length, Math.round(index)));

  return [...children.slice(0, safeIndex), childId, ...children.slice(safeIndex)];
}

function makeEditorComponentId(label: string) {
  return `editor-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function editorSpacing(top: number, right = top, bottom = top, left = right): SpacingValues {
  return { top, right, bottom, left };
}

type EditorThemeTokens = {
  background: string;
  text: string;
  primary: string;
  onPrimary: string;
  muted: string;
  surface: string;
  surfaceSoft: string;
  surfaceStrong: string;
  border: string;
  borderSoft: string;
};

function getEditorThemeTokens(document?: WebBrainDocument | null): EditorThemeTokens {
  const theme = document?.theme;
  const primary = theme?.primary ?? theme?.accent ?? "#b9ff47";
  const surface = theme?.surface ?? theme?.panel ?? "rgba(255, 255, 255, 0.04)";
  const border = theme?.border ?? theme?.line ?? "rgba(244, 245, 240, 0.13)";

  return {
    background: theme?.background ?? DEFAULT_EDITOR_BACKGROUND,
    text: theme?.text ?? "#f4f5f0",
    primary,
    onPrimary: theme?.onPrimary ?? "#090b0b",
    muted: theme?.muted ?? "rgba(244, 245, 240, 0.62)",
    surface,
    surfaceSoft: theme?.surfaceSoft ?? surface,
    surfaceStrong: theme?.surfaceStrong ?? theme?.panel ?? "rgba(255, 255, 255, 0.055)",
    border,
    borderSoft: theme?.borderSoft ?? border
  };
}

function primaryButtonStyle(tokens: EditorThemeTokens, padding = editorSpacing(16, 28), radius = 18): WebBrainStyle {
  return {
    widthMode: "auto",
    padding,
    radius,
    background: tokens.primary,
    textColor: tokens.onPrimary,
    borderColor: tokens.primary
  };
}

function secondaryButtonStyle(tokens: EditorThemeTokens, padding = editorSpacing(18, 30), radius = 18): WebBrainStyle {
  return {
    widthMode: "auto",
    padding,
    radius,
    background: tokens.surfaceSoft,
    textColor: tokens.text,
    borderColor: tokens.border
  };
}

function createEditorComponent(
  id: string,
  type: WebBrainComponentType,
  name: string,
  props: WebBrainProps = {},
  style: WebBrainStyle = {},
  children: string[] = []
): WebBrainComponent {
  return {
    id,
    type,
    name,
    props,
    style,
    effects: {},
    children
  };
}

function createFooterComponentBundle(id: string, variant: "footer" | "footerColumns" | "footerCta", tokens: EditorThemeTokens): {
  rootId: string;
  components: WebBrainComponent[];
} {
  const containerId = `${id}-container`;
  const topRowId = `${id}-top-row`;
  const brandColumnId = `${id}-brand-column`;
  const brandTitleId = `${id}-brand-title`;
  const brandCopyId = `${id}-brand-copy`;
  const navColumnId = `${id}-nav-column`;
  const contactColumnId = `${id}-contact-column`;
  const ctaColumnId = `${id}-cta-column`;
  const bottomRowId = `${id}-bottom-row`;

  const rootComponent = createEditorComponent(
    id,
    "footer",
    variant === "footerCta" ? "Футер с CTA" : variant === "footerColumns" ? "Футер 3 колонки" : "Футер простой",
    {},
    {
      maxWidth: 1120,
      padding: editorSpacing(34),
      margin: editorSpacing(0, 0, 0),
      radius: 24,
      background: tokens.surfaceSoft,
      borderColor: tokens.border
    },
    [containerId]
  );

  if (variant === "footerCta") {
    return {
      rootId: id,
      components: [
        rootComponent,
        createEditorComponent(
          containerId,
          "container",
          "Контейнер футера",
          {},
          { maxWidth: 1120, gap: 26, direction: "column", padding: editorSpacing(0), alignItems: "stretch" },
          [ctaColumnId, bottomRowId]
        ),
        createEditorComponent(
          ctaColumnId,
          "column",
          "CTA футера",
          {},
          { gap: 16, padding: editorSpacing(34), radius: 22, background: tokens.surfaceStrong, borderColor: tokens.primary },
          [`${ctaColumnId}-heading`, `${ctaColumnId}-text`, `${ctaColumnId}-button`]
        ),
        createEditorComponent(`${ctaColumnId}-heading`, "heading", "Заголовок CTA", { text: "Готовы запустить страницу?", level: 2 }, { fontSize: 36, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.08 }),
        createEditorComponent(`${ctaColumnId}-text`, "text", "Описание CTA", { text: "Оставьте понятный следующий шаг в самом конце сайта." }, { fontSize: 16, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 }),
        createEditorComponent(`${ctaColumnId}-button`, "button", "Кнопка футера", { label: "Оставить заявку", href: "#contact", variant: "primary", size: "md" }, primaryButtonStyle(tokens, editorSpacing(15, 24), 16)),
        createEditorComponent(bottomRowId, "row", "Нижняя строка", {}, { gap: 20, justify: "between", alignItems: "center", wrap: true }, [`${bottomRowId}-copy`, `${bottomRowId}-links`]),
        createEditorComponent(`${bottomRowId}-copy`, "text", "Копирайт", { text: "© 2026 Studio" }, { fontSize: 13, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.35 }),
        createEditorComponent(`${bottomRowId}-links`, "row", "Ссылки", {}, { gap: 18, alignItems: "center", wrap: true }, [`${bottomRowId}-privacy`, `${bottomRowId}-contacts`]),
        createEditorComponent(`${bottomRowId}-privacy`, "navLink", "Политика", { label: "Политика", href: "#" }, { textColor: tokens.muted, hoverColor: tokens.primary }),
        createEditorComponent(`${bottomRowId}-contacts`, "navLink", "Контакты", { label: "Контакты", href: "#contact" }, { textColor: tokens.muted, hoverColor: tokens.primary })
      ]
    };
  }

  const sharedComponents = [
    rootComponent,
    createEditorComponent(
      containerId,
      "container",
      "Контейнер футера",
      {},
      { maxWidth: 1120, gap: 28, direction: "column", padding: editorSpacing(0), alignItems: "stretch" },
      [topRowId, bottomRowId]
    ),
    createEditorComponent(topRowId, "row", "Верх футера", {}, { gap: 28, justify: "between", alignItems: "start", wrap: true }, [
      brandColumnId,
      navColumnId,
      ...(variant === "footerColumns" ? [contactColumnId] : [])
    ]),
    createEditorComponent(brandColumnId, "column", "Бренд", {}, { gap: 10, widthMode: "auto" }, [brandTitleId, brandCopyId]),
    createEditorComponent(brandTitleId, "heading", "Название", { text: "Studio", level: 3 }, { fontSize: 26, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.05 }),
    createEditorComponent(brandCopyId, "text", "Описание", { text: "Короткое описание бизнеса, обещание или город." }, { fontSize: 15, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.45 }),
    createEditorComponent(navColumnId, "column", "Навигация", {}, { gap: 10, widthMode: "auto" }, [
      `${navColumnId}-title`,
      `${navColumnId}-services`,
      `${navColumnId}-process`,
      `${navColumnId}-contacts`
    ]),
    createEditorComponent(`${navColumnId}-title`, "text", "Заголовок навигации", { text: "Навигация" }, { fontSize: 13, fontWeight: 850, textColor: tokens.muted, margin: editorSpacing(0, 0, 4), lineHeight: 1.2 }),
    createEditorComponent(`${navColumnId}-services`, "navLink", "Услуги", { label: "Услуги", href: "#services" }, { textColor: tokens.muted, hoverColor: tokens.primary }),
    createEditorComponent(`${navColumnId}-process`, "navLink", "Процесс", { label: "Процесс", href: "#work" }, { textColor: tokens.muted, hoverColor: tokens.primary }),
    createEditorComponent(`${navColumnId}-contacts`, "navLink", "Контакты", { label: "Контакты", href: "#contact" }, { textColor: tokens.muted, hoverColor: tokens.primary }),
    createEditorComponent(bottomRowId, "row", "Низ футера", {}, { gap: 20, justify: "between", alignItems: "center", wrap: true, padding: editorSpacing(18, 0, 0) }, [
      `${bottomRowId}-copy`,
      `${bottomRowId}-note`
    ]),
    createEditorComponent(`${bottomRowId}-copy`, "text", "Копирайт", { text: "© 2026. Все права защищены." }, { fontSize: 13, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.35 }),
    createEditorComponent(`${bottomRowId}-note`, "text", "Подпись", { text: "Сделано в WebBrain" }, { fontSize: 13, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.35 })
  ];

  if (variant === "footerColumns") {
    sharedComponents.push(
      createEditorComponent(contactColumnId, "column", "Контакты", {}, { gap: 10, widthMode: "auto" }, [
        `${contactColumnId}-title`,
        `${contactColumnId}-phone`,
        `${contactColumnId}-mail`
      ]),
      createEditorComponent(`${contactColumnId}-title`, "text", "Заголовок контактов", { text: "Контакты" }, { fontSize: 13, fontWeight: 850, textColor: tokens.muted, margin: editorSpacing(0, 0, 4), lineHeight: 1.2 }),
      createEditorComponent(`${contactColumnId}-phone`, "text", "Телефон", { text: "+7 999 000-00-00" }, { fontSize: 15, fontWeight: 560, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.35 }),
      createEditorComponent(`${contactColumnId}-mail`, "text", "Почта", { text: "hello@studio.ru" }, { fontSize: 15, fontWeight: 560, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.35 })
    );
  }

  return {
    rootId: id,
    components: sharedComponents
  };
}

function editorPlaceholderImageDataUrl(tokens: EditorThemeTokens, label = "WebBrain visual") {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="920" viewBox="0 0 1400 920"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${tokens.surfaceStrong}"/><stop offset="0.56" stop-color="${tokens.background}"/><stop offset="1" stop-color="${tokens.primary}" stop-opacity="0.38"/></linearGradient><radialGradient id="r" cx="68%" cy="34%" r="58%"><stop stop-color="${tokens.primary}" stop-opacity="0.42"/><stop offset="1" stop-color="${tokens.background}" stop-opacity="0"/></radialGradient></defs><rect width="1400" height="920" fill="url(#g)"/><rect width="1400" height="920" fill="url(#r)"/><path d="M170 700 C330 540 430 585 560 440 C720 262 922 250 1230 172" fill="none" stroke="${tokens.primary}" stroke-opacity="0.42" stroke-width="6"/><rect x="118" y="116" width="528" height="620" rx="54" fill="white" opacity="0.06" stroke="white" stroke-opacity="0.16"/><rect x="740" y="168" width="484" height="234" rx="42" fill="white" opacity="0.09" stroke="white" stroke-opacity="0.16"/><rect x="792" y="474" width="360" height="260" rx="42" fill="white" opacity="0.05" stroke="white" stroke-opacity="0.12"/><text x="118" y="820" fill="white" opacity="0.55" font-family="Arial, sans-serif" font-size="42" font-weight="800">${label}</text></svg>`
  );

  return `data:image/svg+xml,${svg}`;
}

function createEditorComponentBundle(toolKey: EditorComponentToolKey, document?: WebBrainDocument | null): {
  rootId: string;
  components: WebBrainComponent[];
} {
  const id = makeEditorComponentId(toolKey);
  const tokens = getEditorThemeTokens(document);

  if (toolKey === "footer" || toolKey === "footerColumns" || toolKey === "footerCta") {
    return createFooterComponentBundle(id, toolKey, tokens);
  }

  if (toolKey === "hero") {
    const eyebrowId = `${id}-eyebrow`;
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const actionsId = `${id}-actions`;
    const primaryId = `${id}-primary`;
    const secondaryId = `${id}-secondary`;

    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "section",
          "Первый экран",
          {},
          {
            maxWidth: 1120,
            padding: editorSpacing(92, 44, 74),
            margin: editorSpacing(0, 0, 64),
            radius: 28,
            background: tokens.surface,
            borderColor: tokens.border
          },
          [eyebrowId, headingId, textId, actionsId]
        ),
        createEditorComponent(
          eyebrowId,
          "text",
          "Надзаголовок",
          { text: "Сайт для бизнеса" },
          { fontSize: 14, fontWeight: 850, textColor: tokens.primary, margin: editorSpacing(0, 0, 18), lineHeight: 1.2 }
        ),
        createEditorComponent(
          headingId,
          "heading",
          "Главный заголовок",
          { text: "Запустите сайт без долгой сборки.", level: 1 },
          { fontSize: 68, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 26), lineHeight: 0.98 }
        ),
        createEditorComponent(
          textId,
          "text",
          "Описание",
          { text: "Опишите нишу, услуги и стиль. WebBrain соберет первый экран, структуру и CTA под вашу задачу." },
          { fontSize: 19, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 34), lineHeight: 1.6 }
        ),
        createEditorComponent(actionsId, "stack", "Кнопки", { layout: "horizontal" }, { gap: 14 }, [primaryId, secondaryId]),
        createEditorComponent(primaryId, "button", "Основная кнопка", { label: "Оставить заявку", href: "#contact", variant: "primary", size: "lg" }, primaryButtonStyle(tokens, editorSpacing(18, 30), 18)),
        createEditorComponent(secondaryId, "button", "Вторичная кнопка", { label: "Посмотреть блоки", href: "#services", variant: "secondary", size: "lg" }, secondaryButtonStyle(tokens, editorSpacing(18, 30), 18))
      ]
    };
  }

  if (toolKey === "heroMedia") {
    const eyebrowId = `${id}-eyebrow`;
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const actionsId = `${id}-actions`;
    const primaryId = `${id}-primary`;
    const secondaryId = `${id}-secondary`;
    const proofId = `${id}-proof`;

    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "section",
          "Hero с фоновым изображением",
          {},
          {
            maxWidth: 1120,
            minHeight: 620,
            padding: editorSpacing(108, 52, 54),
            margin: editorSpacing(0, 0, 72),
            radius: 32,
            background: tokens.surfaceStrong,
            backgroundImage: editorPlaceholderImageDataUrl(tokens, "Hero background"),
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundOverlay: "#000000",
            backgroundOverlayOpacity: 0.5,
            borderColor: "rgba(255,255,255,0.14)",
            overflow: "hidden",
            alignItems: "start",
            justify: "between"
          },
          [eyebrowId, headingId, textId, actionsId, proofId]
        ),
        createEditorComponent(eyebrowId, "text", "Надзаголовок", { text: "Премиальный лендинг" }, { fontSize: 14, fontWeight: 850, textColor: tokens.primary, margin: editorSpacing(0, 0, 18), lineHeight: 1.2 }),
        createEditorComponent(headingId, "heading", "Главный заголовок", { text: "Сайт, который выглядит дороже шаблона.", level: 1 }, { fontSize: 70, fontWeight: 920, textColor: tokens.text, margin: editorSpacing(0, 0, 24), lineHeight: 0.96, maxWidth: 780 }),
        createEditorComponent(textId, "text", "Описание", { text: "Используйте фон, оверлей, CTA и motion, чтобы первый экран сразу держал внимание." }, { fontSize: 19, fontWeight: 540, textColor: "rgba(244,245,240,0.78)", margin: editorSpacing(0, 0, 34), lineHeight: 1.56, maxWidth: 620 }),
        createEditorComponent(actionsId, "stack", "CTA ряд", { layout: "horizontal" }, { gap: 14, direction: "row", alignItems: "center", wrap: true, margin: editorSpacing(0, 0, 54) }, [primaryId, secondaryId]),
        createEditorComponent(primaryId, "button", "Главная CTA", { label: "Оставить заявку", href: "#contact", variant: "lime3d", size: "lg" }, primaryButtonStyle(tokens, editorSpacing(18, 32), 24)),
        createEditorComponent(secondaryId, "button", "Вторичная CTA", { label: "Посмотреть детали", href: "#services", variant: "glass", size: "lg" }, secondaryButtonStyle(tokens, editorSpacing(18, 28), 22)),
        createEditorComponent(proofId, "text", "Доказательство", { text: "Фоновое изображение можно заменить в инспекторе. Эффект появления включается во вкладке «Эффекты»." }, { fontSize: 13, fontWeight: 680, textColor: "rgba(244,245,240,0.58)", margin: editorSpacing(0), lineHeight: 1.45, maxWidth: 420 })
      ]
    };
  }

  if (toolKey === "services" || toolKey === "benefits" || toolKey === "menu") {
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const gridId = `${id}-grid`;
    const presets =
      toolKey === "menu"
        ? {
            name: "Меню / товары",
            heading: "Популярные позиции",
            copy: "Покажите самые важные услуги, блюда или товары, чтобы клиент быстрее понял предложение.",
            cards: [
              ["01", "Основная позиция", "Короткое описание, цена или выгода."],
              ["02", "Сезонное предложение", "Добавьте акцент, который хочется выбрать сейчас."],
              ["03", "Быстрый заказ", "Понятный путь к заявке или бронированию."]
            ]
          }
        : toolKey === "benefits"
          ? {
              name: "Преимущества",
              heading: "Почему клиент выбирает вас",
              copy: "Соберите сильные причины доверять бизнесу: скорость, качество, опыт и понятный результат.",
              cards: [
                ["01", "Понятная структура", "Клиент быстро понимает, куда нажать и что делать дальше."],
                ["02", "Визуал под нишу", "Стиль страницы не выглядит универсальным шаблоном."],
                ["03", "CTA без лишнего шума", "Каждый блок ведет к заявке, брони или консультации."]
              ]
            }
          : {
              name: "Услуги",
              heading: "Услуги, которые легко выбрать",
              copy: "Разложите предложение на простые карточки, чтобы посетитель не терялся в длинном тексте.",
              cards: [
                ["01", "Консультация", "Первый шаг для клиента, который еще выбирает."],
                ["02", "Основная услуга", "Главное направление бизнеса с понятной выгодой."],
                ["03", "Сопровождение", "Дополнительная ценность после первого обращения."]
              ]
            };
    const cardComponents = presets.cards.flatMap(([number, title, copy], index) => {
      const cardId = `${id}-card-${index + 1}`;

      return [
        createEditorComponent(cardId, "card", title, {}, { padding: editorSpacing(38, 34), gap: 22, radius: 24, background: tokens.surfaceStrong, borderColor: tokens.border }, [
          `${cardId}-number`,
          `${cardId}-title`,
          `${cardId}-copy`
        ]),
        createEditorComponent(`${cardId}-number`, "text", `Номер ${number}`, { text: number }, { fontSize: 16, fontWeight: 900, textColor: tokens.primary, margin: editorSpacing(0, 0, 24), lineHeight: 1.1 }),
        createEditorComponent(`${cardId}-title`, "heading", title, { text: title, level: 3 }, { fontSize: 30, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 12), lineHeight: 1.05 }),
        createEditorComponent(`${cardId}-copy`, "text", "Описание", { text: copy }, { fontSize: 16, fontWeight: 560, textColor: tokens.muted, lineHeight: 1.5 })
      ];
    });

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "section", presets.name, {}, { maxWidth: 1120, padding: editorSpacing(56, 0, 20), margin: editorSpacing(0, 0, 52) }, [headingId, textId, gridId]),
        createEditorComponent(headingId, "heading", presets.heading, { text: presets.heading, level: 2 }, { fontSize: 46, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 14), lineHeight: 1.04 }),
        createEditorComponent(textId, "text", "Описание", { text: presets.copy }, { fontSize: 18, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 30), lineHeight: 1.55 }),
        createEditorComponent(gridId, "cardGrid", "Карточки", { columns: 3 }, { gap: 0 }, presets.cards.map((_, index) => `${id}-card-${index + 1}`)),
        ...cardComponents
      ]
    };
  }

  if (toolKey === "process") {
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const stepsId = `${id}-steps`;
    const steps = ["Опишите бизнес и цель.", "Получите черновик страницы.", "Отредактируйте блоки визуально."];

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "section", "Процесс", {}, { maxWidth: 1120, padding: editorSpacing(52, 44), margin: editorSpacing(0, 0, 58), radius: 28, background: tokens.surfaceStrong, borderColor: tokens.border }, [
          headingId,
          textId,
          stepsId
        ]),
        createEditorComponent(headingId, "heading", "Процесс работы", { text: "От идеи к странице за один поток.", level: 2 }, { fontSize: 44, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 16), lineHeight: 1.06 }),
        createEditorComponent(textId, "text", "Описание процесса", { text: "Покажите клиенту, что произойдет после заявки." }, { fontSize: 18, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 28), lineHeight: 1.5 }),
        createEditorComponent(stepsId, "stack", "Шаги", { layout: "vertical" }, { gap: 14 }, steps.map((_, index) => `${id}-step-${index + 1}`)),
        ...steps.map((step, index) =>
          createEditorComponent(`${id}-step-${index + 1}`, "text", `Шаг ${index + 1}`, { text: `${index + 1}. ${step}` }, { fontSize: 18, fontWeight: 650, textColor: tokens.muted })
        )
      ]
    };
  }

  if (toolKey === "ctaBand") {
    const eyebrowId = `${id}-eyebrow`;
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const buttonId = `${id}-button`;

    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "section",
          "CTA баннер",
          {},
          {
            maxWidth: 1120,
            minHeight: 360,
            padding: editorSpacing(64, 48),
            margin: editorSpacing(0, 0, 64),
            radius: 34,
            background: tokens.surfaceStrong,
            backgroundImage: editorPlaceholderImageDataUrl(tokens, "CTA background"),
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundOverlay: tokens.background,
            backgroundOverlayOpacity: 0.58,
            borderColor: "rgba(255,255,255,0.14)",
            align: "left",
            overflow: "hidden"
          },
          [eyebrowId, headingId, textId, buttonId]
        ),
        createEditorComponent(eyebrowId, "text", "Метка CTA", { text: "Следующий шаг" }, { fontSize: 13, fontWeight: 850, textColor: tokens.primary, margin: editorSpacing(0, 0, 16), lineHeight: 1.2 }),
        createEditorComponent(headingId, "heading", "CTA заголовок", { text: "Дайте посетителю один понятный путь.", level: 2 }, { fontSize: 48, fontWeight: 920, textColor: tokens.text, margin: editorSpacing(0, 0, 18), lineHeight: 1.02, maxWidth: 720 }),
        createEditorComponent(textId, "text", "CTA описание", { text: "Короткая причина нажать, без перегруза и шаблонной подачи." }, { fontSize: 18, fontWeight: 540, textColor: "rgba(244,245,240,0.72)", margin: editorSpacing(0, 0, 30), lineHeight: 1.55, maxWidth: 560 }),
        createEditorComponent(buttonId, "button", "CTA кнопка", { label: "Связаться", href: "#contact", variant: "lime3d", size: "lg" }, primaryButtonStyle(tokens, editorSpacing(18, 32), 24))
      ]
    };
  }

  if (toolKey === "contact" || toolKey === "booking") {
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;
    const buttonId = `${id}-button`;
    const isBooking = toolKey === "booking";

    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "section",
          isBooking ? "Запись онлайн" : "Контакты",
          {},
          {
            maxWidth: 1120,
            padding: editorSpacing(62, 44),
            margin: editorSpacing(0, 0, 58),
            radius: 28,
            align: "center",
            background: tokens.surfaceStrong,
            borderColor: tokens.border
          },
          [headingId, textId, buttonId]
        ),
        createEditorComponent(headingId, "heading", "CTA заголовок", { text: isBooking ? "Запишитесь на удобное время" : "Готовы обсудить запуск?", level: 2 }, { fontSize: 42, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 14), lineHeight: 1.06 }),
        createEditorComponent(textId, "text", "CTA описание", { text: isBooking ? "Добавьте короткое обещание, условия записи и следующий шаг." : "Оставьте понятный путь к заявке, звонку или консультации." }, { fontSize: 18, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 26), lineHeight: 1.5 }),
        createEditorComponent(buttonId, "button", "CTA кнопка", { label: isBooking ? "Записаться" : "Оставить заявку", href: "#contact", variant: "primary", size: "md" }, primaryButtonStyle(tokens))
      ]
    };
  }

  if (toolKey === "columns") {
    const cards = ["Левая колонка", "Правая колонка"];
    const cardComponents = cards.flatMap((title, index) => {
      const cardId = `${id}-card-${index + 1}`;

      return [
        createEditorComponent(cardId, "card", title, {}, { padding: editorSpacing(34), gap: 16, radius: 22, background: tokens.surface, borderColor: tokens.border }, [
          `${cardId}-title`,
          `${cardId}-copy`
        ]),
        createEditorComponent(`${cardId}-title`, "heading", title, { text: title, level: 3 }, { fontSize: 30, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 12), lineHeight: 1.06 }),
        createEditorComponent(`${cardId}-copy`, "text", "Описание колонки", { text: "Добавьте текст, кнопку или изображение внутрь этой колонки позже." }, { fontSize: 16, fontWeight: 520, textColor: tokens.muted, lineHeight: 1.5 })
      ];
    });

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "cardGrid", "Две колонки", { columns: 2 }, { maxWidth: 1120, gap: 16, margin: editorSpacing(0, 0, 52) }, cards.map((_, index) => `${id}-card-${index + 1}`)),
        ...cardComponents
      ]
    };
  }

  if (toolKey === "section") {
    const headingId = `${id}-heading`;
    const textId = `${id}-text`;

    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "section",
          "Новая секция",
          {},
          {
            maxWidth: 1120,
            padding: editorSpacing(56, 44),
            margin: editorSpacing(0, 0, 56),
            radius: 26,
            background: tokens.surface,
            borderColor: tokens.border
          },
          [headingId, textId]
        ),
        createEditorComponent(headingId, "heading", "Заголовок секции", { text: "Новая секция", level: 2 }, { fontSize: 42, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 14), lineHeight: 1.08 }),
        createEditorComponent(textId, "text", "Описание секции", { text: "Опишите задачу этого блока и настройте стиль справа." }, { fontSize: 18, fontWeight: 500, textColor: tokens.muted, lineHeight: 1.55 })
      ]
    };
  }

  if (toolKey === "container") {
    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "container",
          "Контейнер",
          {},
          {
            maxWidth: 1120,
            padding: editorSpacing(24),
            margin: editorSpacing(0, 0, 32),
            gap: 18,
            direction: "column",
            alignItems: "stretch"
          },
          [`${id}-text`]
        ),
        createEditorComponent(`${id}-text`, "text", "Текст контейнера", { text: "Добавьте элементы внутрь контейнера и настройте layout справа." }, { fontSize: 17, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 })
      ]
    };
  }

  if (toolKey === "row") {
    const leftColumnId = `${id}-left`;
    const rightColumnId = `${id}-right`;

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "row", "Ряд", {}, { gap: 18, padding: editorSpacing(0), margin: editorSpacing(0, 0, 32), justify: "between", alignItems: "stretch", wrap: true }, [
          leftColumnId,
          rightColumnId
        ]),
        createEditorComponent(leftColumnId, "column", "Левая колонка", {}, { gap: 12, padding: editorSpacing(24), radius: 18, background: tokens.surfaceSoft, borderColor: tokens.borderSoft }, [
          `${leftColumnId}-heading`,
          `${leftColumnId}-text`
        ]),
        createEditorComponent(rightColumnId, "column", "Правая колонка", {}, { gap: 12, padding: editorSpacing(24), radius: 18, background: tokens.surfaceSoft, borderColor: tokens.borderSoft }, [
          `${rightColumnId}-heading`,
          `${rightColumnId}-text`
        ]),
        createEditorComponent(`${leftColumnId}-heading`, "heading", "Левая часть", { text: "Левая часть", level: 3 }, { fontSize: 28, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.08 }),
        createEditorComponent(`${leftColumnId}-text`, "text", "Описание", { text: "Текст, ссылка или карточка внутри первой колонки." }, { fontSize: 15, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 }),
        createEditorComponent(`${rightColumnId}-heading`, "heading", "Правая часть", { text: "Правая часть", level: 3 }, { fontSize: 28, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.08 }),
        createEditorComponent(`${rightColumnId}-text`, "text", "Описание", { text: "Можно менять ширину, gap и выравнивание ряда." }, { fontSize: 15, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 })
      ]
    };
  }

  if (toolKey === "column") {
    return {
      rootId: id,
      components: [
        createEditorComponent(
          id,
          "column",
          "Колонка",
          {},
          {
            gap: 14,
            padding: editorSpacing(28),
            margin: editorSpacing(0, 0, 32),
            radius: 20,
            background: tokens.surfaceSoft,
            borderColor: tokens.borderSoft
          },
          [`${id}-heading`, `${id}-text`]
        ),
        createEditorComponent(`${id}-heading`, "heading", "Заголовок колонки", { text: "Колонка", level: 3 }, { fontSize: 30, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.08 }),
        createEditorComponent(`${id}-text`, "text", "Текст колонки", { text: "Внутрь можно вставлять текст, кнопки, изображения и другие контейнеры." }, { fontSize: 16, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 })
      ]
    };
  }

  if (toolKey === "grid") {
    const items = ["Первый элемент", "Второй элемент", "Третий элемент"];

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "grid", "Сетка", { columns: 3 }, { gap: 16, padding: editorSpacing(0), margin: editorSpacing(0, 0, 36) }, items.map((_, index) => `${id}-column-${index + 1}`)),
        ...items.flatMap((title, index) => {
          const columnId = `${id}-column-${index + 1}`;

          return [
            createEditorComponent(columnId, "column", title, {}, { gap: 12, padding: editorSpacing(24), radius: 18, background: tokens.surfaceSoft, borderColor: tokens.borderSoft }, [
              `${columnId}-title`,
              `${columnId}-text`
            ]),
            createEditorComponent(`${columnId}-title`, "heading", title, { text: title, level: 3 }, { fontSize: 24, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0), lineHeight: 1.08 }),
            createEditorComponent(`${columnId}-text`, "text", "Описание", { text: "Элемент сетки можно заменить текстом, ссылками или карточкой." }, { fontSize: 15, fontWeight: 520, textColor: tokens.muted, margin: editorSpacing(0), lineHeight: 1.5 })
          ];
        })
      ]
    };
  }

  if (toolKey === "stack") {
    return {
      rootId: id,
      components: [
        createEditorComponent(id, "stack", "Группа", { layout: "horizontal" }, { gap: 14, padding: editorSpacing(0), margin: editorSpacing(0, 0, 24), direction: "row", alignItems: "center", wrap: true })
      ]
    };
  }

  if (toolKey === "heading") {
    return {
      rootId: id,
      components: [
        createEditorComponent(id, "heading", "Новый заголовок", { text: "Новый заголовок", level: 2 }, { fontSize: 44, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 18), lineHeight: 1.06 })
      ]
    };
  }

  if (toolKey === "text") {
    return {
      rootId: id,
      components: [
        createEditorComponent(id, "text", "Новый текст", { text: "Новый текстовый блок. Измените его в настройках." }, { fontSize: 18, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 20), lineHeight: 1.55 })
      ]
    };
  }

  if (toolKey === "link") {
    return {
      rootId: id,
      components: [
        createEditorComponent(id, "navLink", "Новая ссылка", { label: "Новая ссылка", href: "#" }, { textColor: tokens.muted, hoverColor: tokens.primary })
      ]
    };
  }

  if (toolKey === "button") {
    return {
      rootId: id,
      components: [
        createEditorComponent(id, "button", "Новая кнопка", { label: "Нажать", href: "#contact", variant: "primary", size: "md" }, primaryButtonStyle(tokens))
      ]
    };
  }

  if (toolKey === "image") {
    const placeholderSvg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><rect width="1200" height="720" fill="${tokens.background}"/><rect x="80" y="80" width="1040" height="560" rx="42" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/><circle cx="600" cy="340" r="92" fill="${tokens.primary}" opacity="0.18"/><path d="M430 392 548 286l88 82 70-58 118 104" fill="none" stroke="${tokens.primary}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    );

    return {
      rootId: id,
      components: [
        createEditorComponent(id, "image", "Новое изображение", { src: `data:image/svg+xml,${placeholderSvg}`, alt: "Новое изображение" }, { width: 58, maxWidth: 680, objectFit: "cover", objectPosition: "center", radius: 24, margin: editorSpacing(0, 0, 32) })
      ]
    };
  }

  const headingId = `${id}-heading`;
  const textId = `${id}-text`;
  const formId = `${id}-form`;
  const nameId = `${id}-name`;
  const phoneId = `${id}-phone`;
  const noteId = `${id}-note`;
  const buttonId = `${id}-button`;

  return {
    rootId: id,
    components: [
      createEditorComponent(
        id,
        "section",
        "Форма заявки",
        {},
        {
          maxWidth: 1120,
          padding: editorSpacing(52, 44),
          margin: editorSpacing(0, 0, 56),
          radius: 28,
          align: "center",
          background: tokens.surfaceStrong,
          borderColor: tokens.border
        },
        [headingId, textId, formId]
      ),
      createEditorComponent(headingId, "heading", "Заголовок формы", { text: "Оставьте заявку", level: 2 }, { fontSize: 38, fontWeight: 900, textColor: tokens.text, margin: editorSpacing(0, 0, 12), lineHeight: 1.08 }),
      createEditorComponent(textId, "text", "Описание формы", { text: "Расскажите, что нужно подготовить, и мы свяжемся с вами." }, { fontSize: 17, fontWeight: 500, textColor: tokens.muted, margin: editorSpacing(0, 0, 24), lineHeight: 1.5 }),
      createEditorComponent(
        formId,
        "form",
        "Форма заявки",
        { action: "lead_submit", method: "post", ariaLabel: "Форма заявки" },
        { widthMode: "full", maxWidth: 640, gap: 14, margin: editorSpacing(0), padding: editorSpacing(0), alignItems: "stretch" },
        [nameId, phoneId, noteId, buttonId]
      ),
      createEditorComponent(nameId, "input", "Имя", { label: "Имя", name: "name", placeholder: "Как к вам обращаться", inputType: "text", required: true }, { fontSize: 15 }),
      createEditorComponent(phoneId, "input", "Телефон", { label: "Телефон", name: "phone", placeholder: "+7 999 000-00-00", inputType: "tel", required: true }, { fontSize: 15 }),
      createEditorComponent(noteId, "textarea", "Комментарий", { label: "Комментарий", name: "message", placeholder: "Коротко опишите задачу" }, { fontSize: 15 }),
      createEditorComponent(buttonId, "button", "Кнопка формы", { label: "Отправить", action: "submit", variant: "primary", size: "md" }, primaryButtonStyle(tokens))
    ]
  };
}

const GAP_GUIDE_COMPONENT_TYPES = new Set<string>([
  "page",
  "header",
  "footer",
  "section",
  "container",
  "row",
  "column",
  "grid",
  "stack",
  "form",
  "card",
  "cardGrid"
]);

const SHOW_CANVAS_HOVER_OVERLAY = true;
const SHOW_CANVAS_GAP_GUIDES = false;

type GapGuideAxis = "x" | "y";

function EditorSelectionOverlay({
  selection,
  component,
  onPatch,
  onRequestDelete
}: {
  selection: EditorSelection | null;
  component?: WebBrainComponent | null;
  onPatch?: (patch: ComponentPatch) => void;
  onRequestDelete?: (componentId: string) => void;
}) {
  if (!selection) return null;

  const top = Math.round(selection.top);
  const left = Math.round(selection.left);
  const width = Math.max(1, Math.round(selection.width));
  const height = Math.max(1, Math.round(selection.height));

  return (
    <motion.div
      initial={false}
      animate={{ top, left, width, height }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="pointer-events-none absolute z-[24]"
    >
      <div className="absolute inset-0 rounded-[4px] border-2 border-[#8fc7ff] shadow-[0_0_0_1px_rgba(5,12,18,0.65),0_0_0_4px_rgba(25,156,255,0.16),0_0_26px_rgba(25,156,255,0.2)]" />
      {SHOW_CANVAS_GAP_GUIDES ? <EditorGapGuidesOverlay selection={selection} component={component} onPatch={onPatch} /> : null}
      <EditorDeleteOverlayButton selection={selection} onRequestDelete={onRequestDelete} />
    </motion.div>
  );
}

function EditorGapGuidesOverlay({
  selection,
  component,
  onPatch
}: {
  selection: EditorSelection;
  component?: WebBrainComponent | null;
  onPatch?: (patch: ComponentPatch) => void;
}) {
  const [dragGap, setDragGap] = useState<number | null>(null);
  const gapDragCleanupRef = useRef<(() => void) | null>(null);
  const childRects = useMemo(
    () =>
      (selection.childRects ?? []).filter(
        (rect) => Number.isFinite(rect.top) && Number.isFinite(rect.left) && Number.isFinite(rect.width) && Number.isFinite(rect.height)
      ),
    [selection.childRects]
  );

  useEffect(() => {
    return () => {
      gapDragCleanupRef.current?.();
      gapDragCleanupRef.current = null;
    };
  }, []);

  if (!component || !onPatch || !GAP_GUIDE_COMPONENT_TYPES.has(component.type) || childRects.length < 2) return null;

  const patchGap = onPatch;
  const axis = getGapGuideAxis(component, childRects);
  const estimatedGap = estimateGapFromChildRects(childRects, axis);
  const gapValue = dragGap ?? clampEditorNumber(component.style.gap, estimatedGap, 0, 160);
  const guides = buildGapGuides(selection, childRects, axis, gapValue);

  if (!guides.length) return null;

  function startGapDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    gapDragCleanupRef.current?.();

    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const startCoordinate = axis === "x" ? event.clientX : event.clientY;
    const initialGap = gapValue;
    const previousUserSelect = document.body.style.userSelect;
    let latestGap = initialGap;
    let frame = 0;
    let ended = false;

    document.body.style.userSelect = "none";
    target.setPointerCapture?.(pointerId);

    const flushGap = (nextGap: number) => {
      if (frame) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        patchGap({ style: { gap: nextGap } });
      });
    };

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if ((moveEvent.buttons & 1) !== 1) {
        handleEnd();
        return;
      }

      moveEvent.preventDefault();
      const currentCoordinate = axis === "x" ? moveEvent.clientX : moveEvent.clientY;
      latestGap = clampEditorNumber(initialGap + currentCoordinate - startCoordinate, initialGap, 0, 160);
      setDragGap(latestGap);
      flushGap(latestGap);
    };

    const handleEnd = () => {
      if (ended) return;

      ended = true;
      if (frame) window.cancelAnimationFrame(frame);
      document.body.style.userSelect = previousUserSelect;
      patchGap({ style: { gap: latestGap } });
      setDragGap(null);
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      window.removeEventListener("blur", handleEnd);
      target.removeEventListener("lostpointercapture", handleEnd);
      gapDragCleanupRef.current = null;
    };

    gapDragCleanupRef.current = handleEnd;
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    window.addEventListener("blur", handleEnd);
    target.addEventListener("lostpointercapture", handleEnd);
  }

  return (
    <>
      {guides.map((guide, index) => (
        <button
          key={`${axis}-${index}-${Math.round(guide.left)}-${Math.round(guide.top)}`}
          type="button"
          aria-label={`Изменить gap: ${gapValue}px`}
          onPointerDown={startGapDrag}
          className={`group pointer-events-auto absolute z-10 touch-none ${
            axis === "x" ? "w-9 -translate-x-1/2" : "h-9 -translate-y-1/2"
          }`}
          style={{
            left: guide.left,
            top: guide.top,
            width: axis === "x" ? undefined : guide.width,
            height: axis === "x" ? guide.height : undefined,
            cursor: axis === "x" ? "ew-resize" : "ns-resize"
          }}
        >
          <span
            className={`absolute rounded-full bg-lime/90 shadow-[0_0_14px_rgba(185,255,71,0.38)] ${
              axis === "x" ? "left-1/2 top-0 h-full w-px -translate-x-1/2" : "left-0 top-1/2 h-px w-full -translate-y-1/2"
            }`}
          />
          <span
            className={`absolute grid h-2.5 w-8 place-items-center rounded-full bg-lime shadow-[0_8px_24px_rgba(185,255,71,0.26)] ${
              axis === "x" ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            }`}
          />
          <span
            className={`absolute rounded-[9px] border border-lime/45 bg-[#111513]/95 px-2 py-1 text-[0.68rem] font-extrabold tabular-nums text-lime opacity-0 shadow-[0_14px_30px_rgba(0,0,0,0.4)] backdrop-blur transition group-hover:opacity-100 group-active:opacity-100 ${
              axis === "x" ? "left-1/2 top-full mt-1 -translate-x-1/2" : "left-full top-1/2 ml-1 -translate-y-1/2"
            }`}
          >
            {gapValue}
          </span>
        </button>
      ))}
    </>
  );
}

function getGapGuideAxis(component: WebBrainComponent, childRects: EditorSelectionChildRect[]): GapGuideAxis {
  if (component.style.direction === "column" || component.props.layout === "vertical") return "y";
  if (component.style.direction === "row" || component.props.layout === "horizontal") return "x";
  if (component.type === "row" || component.type === "grid" || component.type === "cardGrid" || component.type === "header") return "x";
  if (component.type === "column" || component.type === "stack" || component.type === "card" || component.type === "section" || component.type === "footer") return "y";

  const leftValues = childRects.map((rect) => rect.left);
  const topValues = childRects.map((rect) => rect.top);
  const horizontalSpread = Math.max(...leftValues) - Math.min(...leftValues);
  const verticalSpread = Math.max(...topValues) - Math.min(...topValues);

  return horizontalSpread >= verticalSpread ? "x" : "y";
}

function estimateGapFromChildRects(childRects: EditorSelectionChildRect[], axis: GapGuideAxis) {
  const sortedRects = [...childRects].sort((first, second) => (axis === "x" ? first.left - second.left : first.top - second.top));
  const gaps: number[] = [];

  sortedRects.forEach((rect, index) => {
    const previousRect = sortedRects[index - 1];
    if (!previousRect) return;

    const gap =
      axis === "x"
        ? rect.left - (previousRect.left + previousRect.width)
        : rect.top - (previousRect.top + previousRect.height);

    if (Number.isFinite(gap) && gap >= 0 && gap < 240) gaps.push(gap);
  });

  if (!gaps.length) return 0;

  return clampEditorNumber(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length, 0, 0, 160);
}

function buildGapGuides(selection: EditorSelection, childRects: EditorSelectionChildRect[], axis: GapGuideAxis, value: number) {
  const guides: { left: number; top: number; width: number; height: number; value: number }[] = [];
  const selectionRight = selection.left + selection.width;
  const selectionBottom = selection.top + selection.height;

  if (axis === "x") {
    const rows = groupRectsByRow(childRects);

    rows.forEach((row) => {
      const sortedRow = [...row].sort((first, second) => first.left - second.left);

      sortedRow.forEach((rect, index) => {
        const nextRect = sortedRow[index + 1];
        if (!nextRect) return;

        const gapStart = rect.left + rect.width;
        const gapEnd = nextRect.left;
        const centerLeft = Math.max(selection.left, Math.min(selectionRight, gapStart + (gapEnd - gapStart) / 2));
        const top = Math.max(selection.top, Math.min(rect.top, nextRect.top));
        const bottom = Math.min(selectionBottom, Math.max(rect.top + rect.height, nextRect.top + nextRect.height));

        if (bottom - top < 8) return;

        guides.push({
          left: centerLeft - selection.left,
          top: top - selection.top,
          width: 1,
          height: bottom - top,
          value
        });
      });
    });
  } else {
    const sortedRects = [...childRects].sort((first, second) => first.top - second.top);

    sortedRects.forEach((rect, index) => {
      const nextRect = sortedRects[index + 1];
      if (!nextRect) return;

      const gapStart = rect.top + rect.height;
      const gapEnd = nextRect.top;
      const centerTop = Math.max(selection.top, Math.min(selectionBottom, gapStart + (gapEnd - gapStart) / 2));
      const left = Math.max(selection.left, Math.min(rect.left, nextRect.left));
      const right = Math.min(selectionRight, Math.max(rect.left + rect.width, nextRect.left + nextRect.width));

      if (right - left < 8) return;

      guides.push({
        left: left - selection.left,
        top: centerTop - selection.top,
        width: right - left,
        height: 1,
        value
      });
    });
  }

  return guides.slice(0, 12);
}

function groupRectsByRow(childRects: EditorSelectionChildRect[]) {
  const rows: EditorSelectionChildRect[][] = [];

  [...childRects]
    .sort((first, second) => first.top + first.height / 2 - (second.top + second.height / 2))
    .forEach((rect) => {
      const centerY = rect.top + rect.height / 2;
      const matchingRow = rows.find((row) => {
        const rowCenter = row.reduce((sum, rowRect) => sum + rowRect.top + rowRect.height / 2, 0) / row.length;
        const rowHeight = Math.max(...row.map((rowRect) => rowRect.height));

        return Math.abs(centerY - rowCenter) <= Math.max(18, rowHeight * 0.5);
      });

      if (matchingRow) {
        matchingRow.push(rect);
      } else {
        rows.push([rect]);
      }
    });

  return rows.filter((row) => row.length > 1);
}

function EditorContextMenu({
  menu,
  onClose,
  onRequestDelete
}: {
  menu: { selection: EditorSelection; x: number; y: number } | null;
  onClose: () => void;
  onRequestDelete: (componentId: string) => void;
}) {
  if (!menu || !menu.selection.componentId || menu.selection.componentType === "page") return null;

  const left = Math.max(10, Math.round(menu.x));
  const top = Math.max(10, Math.round(menu.y));

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[32]"
      onMouseDown={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        style={{ left, top }}
        className="absolute w-[176px] overflow-hidden rounded-[13px] border border-white/[0.09] bg-[#121416]/96 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-[10px] px-3 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/15 hover:text-red-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRequestDelete(menu.selection.componentId);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Удалить
        </button>
      </motion.div>
    </div>
  );
}

function EditorInsertionZonesOverlay({
  zones,
  toolLabel,
  interactive,
  onInsert
}: {
  zones: EditorInsertionZone[];
  toolLabel?: string;
  interactive?: boolean;
  onInsert: (zone: EditorInsertionZone) => void;
}) {
  if (!zones.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[18]">
      {zones.map((zone) => {
        const top = Math.round(zone.top);
        const left = Math.round(zone.left);
        const width = Math.max(120, Math.round(zone.width));
        const height = Math.max(42, Math.round(zone.height ?? 48));
        const isVertical = zone.orientation === "vertical";

        return (
          <motion.button
            key={`${zone.rootComponentId}-${zone.index}-${zone.orientation ?? "horizontal"}-${zone.targetComponentId ?? ""}-${zone.side ?? ""}`}
            type="button"
            initial={false}
            animate={isVertical ? { top, left, height } : { top, left, width }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            onClick={() => {
              if (interactive === false) return;
              onInsert(zone);
            }}
            className={`absolute rounded-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55 ${
              interactive === false ? "pointer-events-none" : "pointer-events-auto"
            } ${isVertical ? "w-16 -translate-x-1/2" : "h-16 -translate-y-1/2"}`}
          >
            <span
              className={
                isVertical
                  ? "absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-lime/70 shadow-[0_0_18px_rgba(185,255,71,0.28)]"
                  : "absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-lime/70 shadow-[0_0_18px_rgba(185,255,71,0.28)]"
              }
            />
            <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-lime/40 bg-[#111513]/95 px-3 py-1 text-[0.68rem] font-semibold text-lime shadow-[0_12px_30px_rgba(0,0,0,0.36)] backdrop-blur transition hover:bg-lime hover:text-black">
              <Plus className="h-3 w-3" />
              {zone.label || toolLabel || "Вставить"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

const StablePreviewIframe = forwardRef<
  HTMLIFrameElement,
  {
    title: string;
    srcDoc: string;
    onLoad: () => void;
  }
>(function StablePreviewIframe({ title, srcDoc, onLoad }, ref) {
  const [stableSrcDoc] = useState(srcDoc);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={stableSrcDoc}
      sandbox="allow-scripts"
      onLoad={onLoad}
      className="absolute inset-0 h-full w-full border-0 bg-[#0d0f0f]"
    />
  );
});

function EditorHoverOverlay({
  selection,
  onRequestDelete
}: {
  selection: EditorSelection | null;
  onRequestDelete?: (componentId: string) => void;
}) {
  if (!selection || !SHOW_CANVAS_HOVER_OVERLAY) return null;

  const top = Math.round(selection.top);
  const left = Math.round(selection.left);
  const width = Math.max(1, Math.round(selection.width));
  const height = Math.max(1, Math.round(selection.height));

  return (
    <motion.div
      initial={false}
      animate={{ top, left, width, height }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="pointer-events-none absolute z-[19]"
    >
      <div className="absolute inset-0 rounded-[4px] border border-[#8fc7ff]/85 bg-[#199cff]/[0.035] shadow-[0_0_0_1px_rgba(5,12,18,0.48),0_0_18px_rgba(25,156,255,0.14)]" />
      <EditorDeleteOverlayButton selection={selection} onRequestDelete={onRequestDelete} />
    </motion.div>
  );
}

function EditorDeleteOverlayButton({
  selection,
  onRequestDelete
}: {
  selection: EditorSelection;
  onRequestDelete?: (componentId: string) => void;
}) {
  if (!onRequestDelete || !selection.componentId || selection.componentType === "page") return null;

  return (
    <button
      type="button"
      aria-label="Удалить компонент"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRequestDelete(selection.componentId);
      }}
      className="pointer-events-auto absolute right-0 top-0 flex h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-red-300/45 bg-[#210d0d]/95 text-red-300 shadow-[0_10px_24px_rgba(0,0,0,0.45),0_0_16px_rgba(248,113,113,0.22)] backdrop-blur transition hover:bg-red-500 hover:text-white"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function EditorToolbarButton({
  icon,
  active = false,
  label,
  onClick
}: {
  icon: ReactNode;
  active?: boolean;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-[7px] transition ${
        active ? "bg-lime/[0.12] text-lime" : "text-white/42 hover:bg-white/[0.06] hover:text-white"
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55`}
    >
      {icon}
    </button>
  );
}

function EditorIconButton({
  icon,
  label,
  onClick,
  disabled = false
}: {
  icon: ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/[0.055] bg-white/[0.025] text-white/46 transition hover:border-lime/40 hover:text-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/55 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.055] disabled:hover:text-white/46"
    >
      {icon}
    </button>
  );
}

function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-white/[0.06] pb-5 pt-1 last:border-b-0">
      <h3 className="mb-3 text-sm font-medium text-white/78">{title}</h3>
      {children}
    </section>
  );
}

function InspectorControlFoldout({
  title,
  description,
  defaultOpen = true,
  children
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[14px] border border-white/[0.065] bg-white/[0.018]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/[0.035]"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white/84">{title}</span>
          {description ? <span className="mt-0.5 block text-[0.68rem] leading-4 text-white/34">{description}</span> : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/42 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-white/[0.055] px-3 py-3">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function InspectorTextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-white/42">{label}</p>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full resize-none rounded-[10px] border border-white/[0.07] bg-black/20 px-3 py-2 text-sm leading-5 text-white/82 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
      />
    </div>
  );
}

function InspectorTextInput({
  label,
  value,
  placeholder,
  clearLabel = "Очистить",
  onClear,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  clearLabel?: string;
  onClear?: () => void;
  onChange: (value: string) => void;
}) {
  const canClear = Boolean(onClear && value);

  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/42">
        <span>{label}</span>
        {canClear ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onClear?.();
            }}
            className="rounded-[7px] px-1.5 py-0.5 text-[0.64rem] font-semibold text-white/38 transition hover:bg-white/[0.06] hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
          >
            {clearLabel}
          </button>
        ) : null}
      </span>
      <div className="relative">
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`h-10 w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-sm text-white/82 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15 ${
            canClear ? "pr-9" : ""
          }`}
        />
        {canClear ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={(event) => {
              event.preventDefault();
              onClear?.();
            }}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-white/34 transition hover:bg-white/[0.07] hover:text-white/72 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </label>
  );
}

function InspectorImageDropzone({
  value,
  label = "Изображение",
  clearLabel = "Убрать",
  onClear,
  onChange
}: {
  value: string;
  label?: string;
  clearLabel?: string;
  onClear?: () => void;
  onChange: (value: string, fileName?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const safePreviewUrl = value ? `url("${value.replace(/"/g, '\\"')}")` : undefined;

  const loadFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Нужна картинка: PNG, JPG, WEBP или SVG.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result, file.name);
      }
    };
    reader.onerror = () => setError("Не получилось прочитать файл.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-3">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs text-white/42">
        <span>{label}</span>
        {value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-[7px] px-1.5 py-0.5 text-[0.64rem] font-semibold text-white/38 transition hover:bg-white/[0.06] hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
          >
            {clearLabel}
          </button>
        ) : null}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          loadFile(event.dataTransfer.files[0]);
        }}
        className={`group relative flex min-h-36 w-full overflow-hidden rounded-[14px] border border-dashed bg-black/20 text-left outline-none transition ${
          isDragging ? "border-lime bg-lime/10 shadow-[0_0_0_3px_rgba(185,255,71,0.12)]" : "border-white/[0.12] hover:border-lime/55 hover:bg-white/[0.035]"
        }`}
      >
        {safePreviewUrl ? (
          <span className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: safePreviewUrl }} />
        ) : null}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.54))]" />
        <span className="relative z-10 flex min-h-36 w-full flex-col items-center justify-center gap-2 px-4 py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/[0.12] bg-[#17191a]/85 text-lime">
            <ImageIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-white">{value ? "Заменить изображение" : "Перетащите файл сюда"}</span>
          <span className="max-w-[240px] text-xs leading-5 text-white/42">PNG, JPG, WEBP или SVG с компьютера</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          loadFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {error ? <p className="mt-2 text-xs text-red-300/80">{error}</p> : null}
    </div>
  );
}

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type InspectorGradientValue = {
  angle: number;
  from: string;
  to: string;
};

const fallbackInspectorColor: RgbaColor = {
  r: 17,
  g: 19,
  b: 21,
  a: 1
};

const baseInspectorColorPresets = ["transparent", "#090b0b", "#111315", "#f4f5f0", "#313131", "rgba(255,255,255,0.08)", "#b9ff47", "#6ee7b7"];
const inspectorGradientPresets = [
  { label: "Graphite", value: "linear-gradient(135deg, #090b0b 0%, #313131 100%)" },
  { label: "Glass", value: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" },
  { label: "Lime", value: "linear-gradient(135deg, #b9ff47 0%, #6ee7b7 100%)" },
  { label: "Sky", value: "linear-gradient(135deg, #63e6ff 0%, #6ee7b7 100%)" },
  { label: "Coral", value: "linear-gradient(135deg, #ff6b57 0%, #f4f5f0 100%)" },
  { label: "Midnight", value: "linear-gradient(180deg, #090b0b 0%, #171a1b 100%)" }
];

function InspectorColorField({
  label,
  value,
  fallback = "#111315",
  presets = baseInspectorColorPresets,
  allowClear = true,
  allowRawCss = false,
  allowGradient = false,
  clearLabel = "Очистить",
  onChange
}: {
  label: string;
  value?: string;
  fallback?: string;
  presets?: string[];
  allowClear?: boolean;
  allowRawCss?: boolean;
  allowGradient?: boolean;
  clearLabel?: string;
  onChange: (value: string | undefined) => void;
}) {
  const hasValue = Boolean(value?.trim());
  const parsedValueColor = parseInspectorColorStrict(value);
  const fallbackColor = parseInspectorColor(fallback, fallbackInspectorColor);
  const color = parsedValueColor ?? fallbackColor;
  const colorCssValue = rgbaColorToCss(color);
  const parsedGradient = allowGradient ? parseInspectorGradient(value) : null;
  const activeMode: "solid" | "gradient" = parsedGradient ? "gradient" : "solid";
  const displayValue = hasValue ? (parsedGradient ? `Градиент ${parsedGradient.angle}°` : parsedValueColor ? "Цвет" : "CSS") : "Не задано";
  const swatchBackground = hasValue && (allowRawCss || allowGradient) && !parsedValueColor ? value : colorCssValue;
  const alphaPercent = Math.round(color.a * 100);
  const syncedDraftValue = value ?? "";
  const [draftState, setDraftState] = useState({ source: syncedDraftValue, value: syncedDraftValue });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const draftValue = draftState.source === syncedDraftValue ? draftState.value : syncedDraftValue;
  const canClear = allowClear && hasValue;
  const fallbackHex = rgbaColorToHex(fallbackColor);
  const gradient = parsedGradient ?? {
    angle: 135,
    from: parsedValueColor ? rgbaColorToHex(parsedValueColor) : fallbackHex,
    to: firstSolidPresetHex(presets, fallbackHex)
  };
  const modalTarget = typeof document === "undefined" ? null : document.body;

  const updateColor = (nextColor: RgbaColor) => {
    const nextCssValue = rgbaColorToCss(nextColor);
    setDraftState({ source: nextCssValue, value: nextCssValue });
    onChange(nextCssValue);
  };

  const updateGradient = (nextGradient: InspectorGradientValue) => {
    const nextCssValue = gradientToCss(nextGradient);
    setDraftState({ source: nextCssValue, value: nextCssValue });
    onChange(nextCssValue);
  };

  const updateDraftValue = (nextValue: string) => {
    const trimmedValue = nextValue.trim();
    setDraftState({ source: syncedDraftValue, value: nextValue });

    if (!trimmedValue) {
      if (allowClear) onChange(undefined);
      return;
    }

    const nextColor = parseInspectorColorStrict(trimmedValue);
    if (nextColor) onChange(rgbaColorToCss(nextColor));
    else if (allowRawCss) onChange(trimmedValue);
  };

  const setMode = (mode: "solid" | "gradient") => {
    if (mode === "gradient") {
      updateGradient(gradient);
      return;
    }

    updateColor(parseInspectorColor(gradient.from, fallbackColor));
  };

  const updateChannel = (channel: "r" | "g" | "b", nextValue: string | number) => {
    updateColor({
      ...color,
      [channel]: clampEditorNumber(nextValue, color[channel], 0, 255)
    });
  };
  const updateFromNativeColor = (nextValue: string) => {
    const nextColor = parseInspectorColorStrict(nextValue);
    if (!nextColor) return;

    updateColor({ ...nextColor, a: color.a });
  };

  useEffect(() => {
    if (!isPickerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPickerOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPickerOpen]);

  const pickerControls = (
    <div className="space-y-3">
      {allowGradient ? (
        <div className="grid grid-cols-2 rounded-[11px] border border-white/[0.08] bg-black/25 p-1 text-[0.72rem] font-semibold">
          {[
            ["solid", "Цвет"],
            ["gradient", "Градиент"]
          ].map(([mode, modeLabel]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode as "solid" | "gradient")}
              className={`h-9 rounded-[8px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${
                activeMode === mode ? "bg-white/[0.13] text-white" : "text-white/48 hover:bg-white/[0.055] hover:text-white/78"
              }`}
            >
              {modeLabel}
            </button>
          ))}
        </div>
      ) : null}

      {activeMode === "gradient" ? (
        <div className="space-y-3">
          <div
            className="h-24 rounded-[14px] border border-white/[0.12] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.24)]"
            style={{ background: gradientToCss(gradient) }}
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              ["from", "Цвет 1"],
              ["to", "Цвет 2"]
            ].map(([key, stopLabel]) => {
              const gradientKey = key as "from" | "to";
              const stopValue = colorInputValue(gradient[gradientKey], gradientKey === "from" ? fallbackHex : firstSolidPresetHex(presets, fallbackHex));

              return (
                <label key={gradientKey} className="block rounded-[12px] border border-white/[0.08] bg-black/20 p-2.5">
                  <span className="mb-2 block text-[0.68rem] font-semibold text-white/42">{stopLabel}</span>
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`${label}: ${stopLabel}`}
                      type="color"
                      value={stopValue}
                      onChange={(event) => updateGradient({ ...gradient, [gradientKey]: event.target.value })}
                      className="h-10 w-11 shrink-0 cursor-pointer rounded-[9px] border border-white/[0.08] bg-black/25 p-1 outline-none focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
                    />
                    <input
                      value={gradient[gradientKey]}
                      spellCheck={false}
                      onChange={(event) => updateGradient({ ...gradient, [gradientKey]: event.target.value })}
                      className="min-w-0 flex-1 rounded-[9px] border border-white/[0.08] bg-black/25 px-2.5 text-xs font-medium text-white/80 outline-none transition focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
                    />
                  </div>
                </label>
              );
            })}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-white/48">Угол</span>
              <span className="text-white/72">{gradient.angle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={gradient.angle}
              onChange={(event) => updateGradient({ ...gradient, angle: clampEditorNumber(event.target.value, gradient.angle, 0, 360) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.14] accent-lime outline-none transition focus-visible:ring-2 focus-visible:ring-lime/45"
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {inspectorGradientPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                aria-label={`Выбрать градиент ${preset.label}`}
                onClick={() => updateDraftValue(preset.value)}
                className="h-10 rounded-[9px] border border-white/[0.08] transition hover:scale-[1.02] hover:border-lime/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
                style={{ background: preset.value }}
              />
            ))}
          </div>
          <input
            type="text"
            value={draftValue}
            spellCheck={false}
            onChange={(event) => updateDraftValue(event.target.value)}
            onBlur={() => setDraftState({ source: syncedDraftValue, value: syncedDraftValue })}
            className="h-10 w-full rounded-[10px] border border-white/[0.08] bg-black/25 px-3 text-xs font-medium text-white/72 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
            placeholder="CSS градиента"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_52px] gap-2">
            <div
              className="h-14 rounded-[14px] border border-white/[0.12] bg-[linear-gradient(45deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.12)_75%),linear-gradient(45deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.12)_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.24)]"
              style={{ background: swatchBackground }}
            />
            <input
              aria-label={`${label}: выбрать цвет`}
              type="color"
              value={rgbaColorToHex(color)}
              onChange={(event) => updateFromNativeColor(event.target.value)}
              className="h-14 w-[52px] cursor-pointer rounded-[14px] border border-white/[0.08] bg-black/25 p-1.5 outline-none transition focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
            />
          </div>
          <input
            type="text"
            value={draftValue}
            spellCheck={false}
            onChange={(event) => updateDraftValue(event.target.value)}
            onBlur={() => setDraftState({ source: syncedDraftValue, value: syncedDraftValue })}
            className="h-10 w-full rounded-[10px] border border-white/[0.08] bg-black/25 px-3 text-xs font-medium text-white/80 outline-none transition placeholder:text-white/28 focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
            placeholder="Значение"
          />
          <div className="grid grid-cols-8 gap-1.5">
            {uniqueInspectorColorPresets(presets).map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={`Выбрать цвет ${preset}`}
                onClick={() => updateDraftValue(preset)}
                className="h-8 rounded-[8px] border border-white/[0.09] bg-[linear-gradient(45deg,rgba(255,255,255,0.14)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.14)_75%),linear-gradient(45deg,rgba(255,255,255,0.14)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.14)_75%)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] transition hover:scale-105 hover:border-lime/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
                style={{ background: preset }}
              />
            ))}
          </div>
          <div className="space-y-2.5">
            {[
              ["R", "r"],
              ["G", "g"],
              ["B", "b"]
            ].map(([channelLabel, channel]) => {
              const colorChannel = channel as "r" | "g" | "b";

              return (
                <div key={colorChannel} className="grid grid-cols-[18px_minmax(0,1fr)_58px] items-center gap-2.5">
                  <span className="text-[0.68rem] font-semibold text-white/38">{channelLabel}</span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={color[colorChannel]}
                    onChange={(event) => updateChannel(colorChannel, event.target.value)}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.14] accent-lime outline-none transition focus-visible:ring-2 focus-visible:ring-lime/45"
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={color[colorChannel]}
                    onChange={(event) => updateChannel(colorChannel, event.target.value)}
                    className="h-9 rounded-[9px] border border-white/[0.08] bg-black/25 px-2 text-center text-xs font-semibold text-white/78 outline-none transition [appearance:textfield] focus:border-lime/55 focus:ring-2 focus:ring-lime/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              );
            })}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-white/48">Прозрачность</span>
              <span className="text-white/72">{alphaPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={alphaPercent}
              onChange={(event) =>
                updateColor({
                  ...color,
                  a: clampEditorNumber(event.target.value, alphaPercent, 0, 100) / 100
                })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.14] accent-lime outline-none transition focus-visible:ring-2 focus-visible:ring-lime/45"
            />
          </div>
        </div>
      )}

      {canClear ? (
        <button
          type="button"
          onClick={() => {
            setDraftState({ source: "", value: "" });
            onChange(undefined);
          }}
          className="flex h-9 w-full items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.025] text-xs font-semibold text-white/52 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white/82 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );

  const pickerModal =
    isPickerOpen && modalTarget
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
            onMouseDown={() => setIsPickerOpen(false)}
          >
            <div
              className="max-h-[min(760px,calc(100vh-48px))] w-[min(420px,calc(100vw-32px))] overflow-y-auto rounded-[18px] border border-white/[0.11] bg-[#101313] shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={label}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#101313]/95 px-4 py-3 backdrop-blur">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white/84">{label}</div>
                  <div className="mt-0.5 text-[0.68rem] font-medium text-white/38">{displayValue}</div>
                </div>
                <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={() => setIsPickerOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-white/55 transition hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">{pickerControls}</div>
            </div>
          </div>,
          modalTarget
        )
      : null;

  return (
    <div className="mb-4 last:mb-0">
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        className="flex w-full items-center gap-3 rounded-[13px] border border-white/[0.075] bg-[#0e1111]/92 p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-white/[0.14] hover:bg-[#121616] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
      >
        <span
          className="h-9 w-9 shrink-0 rounded-[10px] border border-white/[0.12] bg-[linear-gradient(45deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.12)_75%),linear-gradient(45deg,rgba(255,255,255,0.12)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.12)_75%)] bg-[length:10px_10px] bg-[position:0_0,5px_5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.24)]"
          style={{ background: parsedGradient ? gradientToCss(parsedGradient) : swatchBackground }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-white/72">{label}</span>
          <span className="mt-0.5 block truncate text-[0.68rem] text-white/38">{displayValue}</span>
        </span>
        <span className="rounded-[9px] border border-white/[0.08] px-2.5 py-1 text-[0.68rem] font-semibold text-white/50">Настроить</span>
      </button>
      {pickerModal}
    </div>
  );
}

function InspectorBorderField({
  color,
  width,
  fallbackColor,
  presets,
  onPatch
}: {
  color?: string;
  width?: number;
  fallbackColor: string;
  presets: string[];
  onPatch: (style: Partial<WebBrainStyle>) => void;
}) {
  const enabled = Boolean(color);
  const safeWidth = clampEditorNumber(width, 1, 1, 24);
  const nextColor = color ?? fallbackColor;

  return (
    <div className="mb-4 last:mb-0">
      <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-white/[0.07] bg-black/20 px-3 py-2 transition hover:border-white/[0.12]">
        <span className="text-sm font-semibold text-white/76">Обводка</span>
        <span className="flex items-center gap-2 text-xs text-white/42">
          {enabled ? `${safeWidth}px` : "выключена"}
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              onPatch(
                event.target.checked
                  ? {
                      borderColor: nextColor,
                      borderWidth: safeWidth || 1
                    }
                  : {
                      borderColor: undefined,
                      borderWidth: undefined
                    }
              )
            }
            className="h-4 w-4 cursor-pointer rounded border-white/[0.18] bg-black/40 accent-lime"
          />
        </span>
      </label>

      {enabled ? (
        <div className="mt-3 rounded-[14px] border border-white/[0.07] bg-black/15 p-3">
          <InspectorColorField
            label="Цвет обводки"
            value={color}
            fallback={fallbackColor}
            presets={presets}
            clearLabel="Выключить"
            onChange={(value) =>
              onPatch({
                borderColor: value,
                borderWidth: value ? (safeWidth || 1) : undefined
              })
            }
          />
          <InspectorRange
            label="Толщина"
            value={safeWidth}
            min={1}
            max={24}
            step={1}
            unit="px"
            onChange={(value) =>
              onPatch({
                borderColor: color ?? fallbackColor,
                borderWidth: value
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function clearBackgroundMediaStyle(): Partial<WebBrainStyle> {
  return {
    backgroundImage: undefined,
    backgroundSize: undefined,
    backgroundPosition: undefined,
    backgroundRepeat: undefined,
    backgroundOverlay: undefined,
    backgroundOverlayOpacity: undefined,
    backgroundBlendMode: undefined
  };
}

function inspectorColorPresetsForControl(control: InspectorControl, tokens: EditorThemeTokens) {
  if (control === "textColor") {
    return [tokens.text, tokens.muted, tokens.primary, tokens.onPrimary, "#ffffff", "#111315", "rgba(255,255,255,0.72)", "rgba(0,0,0,0.72)"];
  }

  if (control === "hoverColor") {
    return [tokens.primary, tokens.text, tokens.muted, "#6ee7b7", "#63e6ff", "#f4f5f0", "#ff6b57", "#b9ff47"];
  }

  if (control === "backgroundOverlay") {
    return ["#000000", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.58)", tokens.background, "rgba(255,255,255,0.16)", tokens.primary];
  }

  if (control === "borderColor") {
    return ["transparent", tokens.border, tokens.borderSoft, "rgba(255,255,255,0.16)", "rgba(255,255,255,0.28)", tokens.primary, "#111315", "#f4f5f0"];
  }

  return ["transparent", tokens.background, tokens.surface, tokens.surfaceSoft, tokens.surfaceStrong, "rgba(255,255,255,0.06)", "rgba(0,0,0,0.28)", tokens.primary];
}

function uniqueInspectorColorPresets(presets: string[]) {
  const normalized = presets
    .map((preset) => preset.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 8);
}

function parseInspectorGradient(value: string | undefined): InspectorGradientValue | null {
  const trimmedValue = value?.trim();
  if (!trimmedValue || !/linear-gradient\(/i.test(trimmedValue)) return null;

  const angleMatch = trimmedValue.match(/linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg/i);
  const colorMatches = [...trimmedValue.matchAll(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)\s*(?:\d+(?:\.\d+)?%?)?/gi)].map((match) => match[1]);

  if (colorMatches.length < 2) return null;

  return {
    angle: clampEditorNumber(angleMatch?.[1], 135, 0, 360),
    from: colorMatches[0],
    to: colorMatches[colorMatches.length - 1]
  };
}

function gradientToCss(gradient: InspectorGradientValue) {
  return `linear-gradient(${clampEditorNumber(gradient.angle, 135, 0, 360)}deg, ${gradient.from} 0%, ${gradient.to} 100%)`;
}

function colorInputValue(value: string | undefined, fallback: string) {
  return rgbaColorToHex(parseInspectorColor(value, parseInspectorColor(fallback, fallbackInspectorColor)));
}

function firstSolidPresetHex(presets: string[], fallback: string) {
  const solidPreset = presets.find((preset) => {
    const trimmedPreset = preset.trim();

    return trimmedPreset && trimmedPreset !== "transparent" && parseInspectorColorStrict(trimmedPreset);
  });

  return rgbaColorToHex(parseInspectorColor(solidPreset, parseInspectorColor(fallback, fallbackInspectorColor)));
}

function InspectorSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1.5 block text-xs text-white/42">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[10px] border border-white/[0.07] bg-black/20 px-3 text-sm text-white/82 outline-none transition focus:border-lime/55 focus:ring-2 focus:ring-lime/15"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#111315] text-white">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function parseInspectorColor(value: string | undefined, fallback: RgbaColor): RgbaColor {
  return parseInspectorColorStrict(value) ?? fallback;
}

function parseInspectorColorStrict(value: string | undefined): RgbaColor | null {
  if (!value || value === "transparent") {
    return value === "transparent" ? { r: 0, g: 0, b: 0, a: 0 } : null;
  }

  const trimmedValue = value.trim();
  const hexMatch = trimmedValue.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);

  if (hexMatch) {
    const hexValue = hexMatch[1];

    if (hexValue.length === 3) {
      return {
        r: parseInt(hexValue[0] + hexValue[0], 16),
        g: parseInt(hexValue[1] + hexValue[1], 16),
        b: parseInt(hexValue[2] + hexValue[2], 16),
        a: 1
      };
    }

    const alpha = hexValue.length === 8 ? parseInt(hexValue.slice(6, 8), 16) / 255 : 1;

    return {
      r: parseInt(hexValue.slice(0, 2), 16),
      g: parseInt(hexValue.slice(2, 4), 16),
      b: parseInt(hexValue.slice(4, 6), 16),
      a: clampAlpha(alpha)
    };
  }

  const rgbaMatch = trimmedValue.match(/^rgba?\((.+)\)$/i);
  if (!rgbaMatch) return null;

  const channels = rgbaMatch[1]
    .replace(/\//g, ",")
    .split(/,\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (channels.length < 3) return null;

  return {
    r: clampEditorNumber(channels[0], 0, 0, 255),
    g: clampEditorNumber(channels[1], 0, 0, 255),
    b: clampEditorNumber(channels[2], 0, 0, 255),
    a: channels[3] === undefined ? 1 : clampAlpha(Number(channels[3]))
  };
}

function rgbaColorToCss(color: RgbaColor) {
  const alpha = clampAlpha(color.a);

  if (alpha >= 1) {
    return `rgb(${clampEditorNumber(color.r, 0, 0, 255)}, ${clampEditorNumber(color.g, 0, 0, 255)}, ${clampEditorNumber(color.b, 0, 0, 255)})`;
  }

  return `rgba(${clampEditorNumber(color.r, 0, 0, 255)}, ${clampEditorNumber(color.g, 0, 0, 255)}, ${clampEditorNumber(color.b, 0, 0, 255)}, ${formatAlpha(alpha)})`;
}

function rgbaColorToHex(color: RgbaColor) {
  const toHex = (channel: number) => clampEditorNumber(channel, 0, 0, 255).toString(16).padStart(2, "0");

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function clampAlpha(value: number) {
  if (!Number.isFinite(value)) return 1;

  return Math.max(0, Math.min(1, value));
}

function formatAlpha(value: number) {
  return Number(value.toFixed(2)).toString();
}

function InspectorAlignControl({
  value,
  onChange
}: {
  value: "left" | "center" | "right";
  onChange: (value: "left" | "center" | "right") => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-white/42">Выравнивание</p>
      <div className="grid grid-cols-3 rounded-[10px] border border-white/[0.07] bg-black/20 p-1 text-white/48">
        {[
          { value: "left" as const, icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Слева" },
          { value: "center" as const, icon: <AlignCenter className="h-3.5 w-3.5" />, label: "Центр" },
          { value: "right" as const, icon: <AlignRight className="h-3.5 w-3.5" />, label: "Справа" }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            aria-label={item.label}
            onClick={() => onChange(item.value)}
            className={`flex h-8 items-center justify-center rounded-[7px] transition ${
              value === item.value ? "bg-white/[0.09] text-lime" : "hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function InspectorOverlayAlignControl({
  value,
  onChange
}: {
  value: "start" | "center" | "end";
  onChange: (value: "start" | "center" | "end") => void;
}) {
  return (
    <div className="grid w-[116px] grid-cols-3 rounded-[10px] border border-white/[0.07] bg-black/20 p-1 text-white/48">
      {[
        { value: "start" as const, icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Слева" },
        { value: "center" as const, icon: <AlignCenter className="h-3.5 w-3.5" />, label: "По центру" },
        { value: "end" as const, icon: <AlignRight className="h-3.5 w-3.5" />, label: "Справа" }
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          aria-label={item.label}
          title={item.label}
          onClick={() => onChange(item.value)}
          className={`flex h-8 items-center justify-center rounded-[7px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45 ${
            value === item.value ? "bg-white/[0.11] text-lime" : "hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

function InspectorSpacingBox({
  label,
  value,
  onChange
}: {
  label: string;
  value: SpacingValues;
  onChange: (value: SpacingValues) => void;
}) {
  const updateSide = (side: keyof SpacingValues, nextValue: number) => {
    onChange({
      ...value,
      [side]: clampEditorNumber(nextValue, value[side], 0, 96)
    });
  };

  const syncAllSides = () => {
    const nextValue = Math.round((value.top + value.right + value.bottom + value.left) / 4);

    onChange({
      top: nextValue,
      right: nextValue,
      bottom: nextValue,
      left: nextValue
    });
  };

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-white/42">{label}</p>
      <div className="grid grid-cols-3 rounded-[10px] border border-white/[0.07] bg-black/20 text-center text-xs text-white/70">
        <span className="border-b border-r border-white/[0.045]" />
        <SpacingInput value={value.top} label="Сверху" onChange={(nextValue) => updateSide("top", nextValue)} className="border-b border-white/[0.045]" />
        <span className="border-b border-l border-white/[0.045]" />
        <SpacingInput value={value.left} label="Слева" onChange={(nextValue) => updateSide("left", nextValue)} className="border-r border-white/[0.045]" />
        <button
          type="button"
          aria-label="Связать стороны"
          onClick={syncAllSides}
          className="flex min-h-11 items-center justify-center border border-white/[0.07] bg-[#111417] text-sky-400 transition hover:border-sky-400/50 hover:bg-sky-400/10"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <SpacingInput value={value.right} label="Справа" onChange={(nextValue) => updateSide("right", nextValue)} className="border-l border-white/[0.045]" />
        <span className="border-r border-t border-white/[0.045]" />
        <SpacingInput value={value.bottom} label="Снизу" onChange={(nextValue) => updateSide("bottom", nextValue)} className="border-t border-white/[0.045]" />
        <span className="border-l border-t border-white/[0.045]" />
      </div>
    </div>
  );
}

type PositionOffsetValues = Pick<WebBrainStyle, "top" | "right" | "bottom" | "left">;

function InspectorPositionBox({
  label,
  value,
  onChange
}: {
  label: string;
  value: PositionOffsetValues;
  onChange: (value: PositionOffsetValues) => void;
}) {
  const updateSide = (side: keyof PositionOffsetValues, nextValue: number | undefined) => {
    onChange({
      ...value,
      [side]: nextValue === undefined ? undefined : clampEditorNumber(nextValue, value[side] ?? 0, -1000, 1000)
    });
  };

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-white/42">{label}</p>
      <div className="grid grid-cols-3 rounded-[10px] border border-white/[0.07] bg-black/20 text-center text-xs text-white/70">
        <span className="border-b border-r border-white/[0.045]" />
        <PositionInput value={value.top} label="Top" onChange={(nextValue) => updateSide("top", nextValue)} className="border-b border-white/[0.045]" />
        <span className="border-b border-l border-white/[0.045]" />
        <PositionInput value={value.left} label="Left" onChange={(nextValue) => updateSide("left", nextValue)} className="border-r border-white/[0.045]" />
        <span className="flex min-h-11 items-center justify-center border border-white/[0.07] bg-[#111417] text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/38">px</span>
        <PositionInput value={value.right} label="Right" onChange={(nextValue) => updateSide("right", nextValue)} className="border-l border-white/[0.045]" />
        <span className="border-r border-t border-white/[0.045]" />
        <PositionInput value={value.bottom} label="Bottom" onChange={(nextValue) => updateSide("bottom", nextValue)} className="border-t border-white/[0.045]" />
        <span className="border-l border-t border-white/[0.045]" />
      </div>
    </div>
  );
}

function PositionInput({
  value,
  label,
  onChange,
  className = ""
}: {
  value: number | undefined;
  label: string;
  onChange: (value: number | undefined) => void;
  className?: string;
}) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? (value === undefined ? "" : String(value));

  const commitValue = (nextValue = inputValue) => {
    if (nextValue.trim() === "") {
      setDraftValue(null);
      onChange(undefined);
      return;
    }

    const normalizedValue = clampEditorNumber(nextValue, value ?? 0, -1000, 1000);
    setDraftValue(null);
    onChange(normalizedValue);
  };

  return (
    <label className={`flex min-h-11 items-center justify-center ${className}`} aria-label={label}>
      <input
        type="number"
        min={-1000}
        max={1000}
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);

          if (nextValue.trim() !== "") {
            onChange(clampEditorNumber(nextValue, value ?? 0, -1000, 1000));
          }
        }}
        onBlur={() => commitValue()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-14 rounded-[7px] border border-transparent bg-transparent text-center font-semibold text-white/72 outline-none transition [appearance:textfield] focus:border-lime/45 focus:bg-white/[0.045] focus:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}

function SpacingInput({
  value,
  label,
  onChange,
  className = ""
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? String(value);

  const commitValue = (nextValue = inputValue) => {
    if (nextValue.trim() === "") {
      setDraftValue(null);
      return;
    }

    const normalizedValue = clampEditorNumber(nextValue, value, 0, 96);
    setDraftValue(null);
    onChange(normalizedValue);
  };

  return (
    <label className={`flex min-h-11 items-center justify-center ${className}`} aria-label={label}>
      <input
        type="number"
        min={0}
        max={96}
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);

          if (nextValue.trim() !== "") {
            onChange(clampEditorNumber(nextValue, value, 0, 96));
          }
        }}
        onBlur={() => commitValue()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-14 rounded-[7px] border border-transparent bg-transparent text-center font-semibold text-white/72 outline-none transition [appearance:textfield] focus:border-lime/45 focus:bg-white/[0.045] focus:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </label>
  );
}

function InspectorRange({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between text-xs text-white/42">
        <span>{label}</span>
        <span className="text-white/66">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.12] accent-lime outline-none transition focus-visible:ring-2 focus-visible:ring-lime/45"
      />
    </div>
  );
}

function ProjectPicker({
  projects,
  selectedProject,
  open,
  onToggle,
  onCreateProject,
  onSelect
}: {
  projects: StoredProject[];
  selectedProject: StoredProject | null;
  open: boolean;
  onToggle: () => void;
  onCreateProject: () => void;
  onSelect: (project: StoredProject) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    let frame = 0;

    const updatePosition = () => {
      const style = getFixedPopoverStyle(buttonRef.current, 224, "right");
      setMenuStyle(style);
    };

    if (open) {
      frame = window.requestAnimationFrame(updatePosition);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    } else {
      frame = window.requestAnimationFrame(() => setMenuStyle(null));
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const menu = (
    <AnimatePresence>
      {open && menuStyle ? (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={menuStyle}
          className="z-[9999] rounded-[14px] border border-white/[0.08] bg-[#171819]/95 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="max-h-[180px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelect(project)}
                className={`flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-left text-sm transition ${
                  selectedProject?.id === project.id ? "bg-lime text-black" : "text-white/72 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Laptop className="h-4 w-4 shrink-0" />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCreateProject}
            className={`mt-1 flex h-9 w-full items-center gap-2 rounded-[9px] px-2 text-left text-sm font-medium transition ${
              projects.length === 0 ? "bg-lime text-black hover:bg-lime/90" : "text-white/62 hover:bg-white/[0.07] hover:text-lime"
            }`}
          >
            <LaptopPlusIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">Создать проект</span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex h-9 max-w-[220px] items-center gap-2 px-2 text-[0.82rem] font-medium text-white/64 transition hover:text-white"
      >
        <Laptop className="h-4 w-4 shrink-0" />
        <span className="truncate">{selectedProject?.name ?? "Создать проект"}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} />
      </button>

      {typeof document === "undefined" ? menu : createPortal(menu, document.body)}
    </div>
  );
}

function ProjectRow({
  project,
  expanded,
  renaming,
  renameValue,
  menuOpen,
  pinnedRow = false,
  onSelect,
  onToggleExpanded,
  onMenu,
  onStartRename,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onTogglePin,
  onDelete,
  onCreateChat,
  children
}: {
  project: StoredProject;
  expanded: boolean;
  renaming: boolean;
  renameValue: string;
  menuOpen: boolean;
  pinnedRow?: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
  onMenu: () => void;
  onStartRename: () => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onCreateChat: () => void;
  children: ReactNode;
}) {
  const openRowContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (renaming) return;

    event.preventDefault();
    event.stopPropagation();
    if (!menuOpen) onMenu();
  };

  return (
    <div className="relative">
      <div
        className="relative flex h-10 items-center rounded-[9px] transition hover:bg-white/[0.075] hover:text-white"
        onContextMenu={openRowContextMenu}
      >
        {renaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            {pinnedRow ? <Pin className="h-4 w-4 shrink-0 text-white/56" /> : <Laptop className="h-4 w-4 shrink-0 text-white/70" />}
            <InlineNameEditor
              value={renameValue}
              onChange={onRenameValueChange}
              onCommit={onCommitRename}
              onCancel={onCancelRename}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onStartRename();
            }}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left"
          >
            {pinnedRow ? <Pin className="h-4 w-4 shrink-0 text-white/56" /> : <Laptop className="h-4 w-4 shrink-0 text-white/70" />}
            <span className="truncate">{project.name}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Свернуть проект" : "Развернуть проект"}
          className="rounded-[7px] p-1 text-white/48 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`} />
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onMenu}
          aria-label="Действия проекта"
          className="mr-2 rounded-[7px] p-1 text-white/52 transition hover:bg-white/[0.08] hover:text-white"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <AnimatePresence>
          {menuOpen ? (
            <ProjectActionMenu
              project={project}
              onTogglePin={onTogglePin}
              onStartRename={onStartRename}
              onDelete={onDelete}
              onCreateChat={onCreateChat}
            />
          ) : null}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="project-chats"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-visible"
          >
            <div className="mt-1 space-y-1 pl-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProjectChatList({
  chats,
  activeChatId,
  runStates,
  seenRuns,
  openMenu,
  renamingItem,
  onOpenChat,
  onMenu,
  onStartRename,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onArchiveChat,
  onDeleteChat
}: {
  chats: StoredChat[];
  activeChatId: string | null;
  runStates: Record<string, ChatRunSummary>;
  seenRuns: Record<string, string>;
  openMenu: OpenMenu;
  renamingItem: RenamingItem;
  onOpenChat: (chat: StoredChat) => void;
  onMenu: (chat: StoredChat) => void;
  onStartRename: (chat: StoredChat) => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onArchiveChat: (chat: StoredChat) => void;
  onDeleteChat: (chat: StoredChat) => void;
}) {
  if (chats.length === 0) {
    return <div className="px-3 py-2 text-sm text-white/36">Чатов пока нет</div>;
  }

  return chats.map((chat) => (
    <ChatRow
      key={chat.id}
      chat={chat}
      active={chat.id === activeChatId}
      runState={runStates[chat.id]}
      seenRunAt={seenRuns[chat.id]}
      renaming={renamingItem?.type === "chat" && renamingItem.id === chat.id}
      renameValue={renamingItem?.type === "chat" && renamingItem.id === chat.id ? renamingItem.value : chat.title}
      menuOpen={openMenu?.type === "chat" && openMenu.id === chat.id}
      onSelect={() => onOpenChat(chat)}
      onMenu={() => onMenu(chat)}
      onStartRename={() => onStartRename(chat)}
      onRenameValueChange={onRenameValueChange}
      onCommitRename={onCommitRename}
      onCancelRename={onCancelRename}
      onArchive={() => onArchiveChat(chat)}
      onDelete={() => onDeleteChat(chat)}
    />
  ));
}

function ChatRow({
  chat,
  active,
  runState,
  seenRunAt,
  renaming,
  renameValue,
  menuOpen,
  onSelect,
  onMenu,
  onStartRename,
  onRenameValueChange,
  onCommitRename,
  onCancelRename,
  onArchive,
  onDelete
}: {
  chat: StoredChat;
  active: boolean;
  runState?: ChatRunSummary;
  seenRunAt?: string;
  renaming: boolean;
  renameValue: string;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onStartRename: () => void;
  onRenameValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const isAiRunning = runState?.status === "running";
  const isAiWaiting = runState?.status === "waiting";
  const isAiReady = runState?.status === "completed" && !active && seenRunAt !== runState.updated_at;
  const openRowContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (renaming) return;

    event.preventDefault();
    event.stopPropagation();
    if (!menuOpen) onMenu();
  };

  return (
    <div
      className={`relative flex h-10 items-center rounded-[9px] transition ${active ? "bg-white/[0.09] text-white" : "hover:bg-white/[0.075] hover:text-white"}`}
      onContextMenu={openRowContextMenu}
    >
      {renaming ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <MessageSquare className="h-4 w-4 shrink-0 text-white/56" />
          <InlineNameEditor
            value={renameValue}
            onChange={onRenameValueChange}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
            maxLength={CHAT_TITLE_MAX_LENGTH}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStartRename();
          }}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 text-left"
        >
          {isAiRunning ? (
            <span className="relative grid h-4 w-4 shrink-0 place-items-center">
              <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-lime/25" />
              <span className="h-2 w-2 rounded-full bg-lime" />
            </span>
          ) : (
            <MessageSquare className={`h-4 w-4 shrink-0 ${isAiWaiting ? "text-lime/70" : "text-white/56"}`} />
          )}
          <span className="truncate">{limitChatTitle(chat.title)}</span>
          {isAiReady ? (
            <span className="ml-auto shrink-0 rounded-full bg-lime px-1.5 py-0.5 text-[0.58rem] font-extrabold uppercase leading-none text-black">
              готово
            </span>
          ) : isAiWaiting ? (
            <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-lime/70" />
          ) : null}
        </button>
      )}
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onMenu}
        aria-label="Действия чата"
        className="mr-2 rounded-[7px] p-1 text-white/52 transition hover:bg-white/[0.08] hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>{menuOpen ? <ChatActionMenu onStartRename={onStartRename} onArchive={onArchive} onDelete={onDelete} /> : null}</AnimatePresence>
    </div>
  );
}

function ProjectActionMenu({
  project,
  onTogglePin,
  onStartRename,
  onDelete,
  onCreateChat
}: {
  project: StoredProject;
  onTogglePin: () => void;
  onStartRename: () => void;
  onDelete: () => void;
  onCreateChat: () => void;
}) {
  return (
    <ActionMenu>
      <ActionButton icon={<Pin className="h-3.5 w-3.5" />} label={project.is_pinned ? "Открепить" : "Закрепить"} onClick={onTogglePin} />
      <ActionButton icon={<Plus className="h-3.5 w-3.5" />} label="Создать чат" onClick={onCreateChat} />
      <ActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Переименовать" onClick={onStartRename} />
      <ActionButton destructive icon={<Trash2 className="h-3.5 w-3.5" />} label="Удалить" onClick={onDelete} />
    </ActionMenu>
  );
}

function ChatActionMenu({
  onStartRename,
  onArchive,
  onDelete
}: {
  onStartRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <ActionMenu>
      <ActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Переименовать" onClick={onStartRename} />
      <ActionButton icon={<Archive className="h-3.5 w-3.5" />} label="Архивировать" onClick={onArchive} />
      <ActionButton destructive icon={<Trash2 className="h-3.5 w-3.5" />} label="Удалить" onClick={onDelete} />
    </ActionMenu>
  );
}

function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <motion.div
      onPointerDown={(event) => event.stopPropagation()}
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      className="absolute right-2 top-[calc(100%+6px)] z-50 w-44 rounded-[12px] border border-white/[0.08] bg-[#171819]/95 p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl"
    >
      {children}
    </motion.div>
  );
}

function ActionButton({
  icon,
  label,
  destructive = false,
  onClick
}: {
  icon: ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-xs font-medium transition ${
        destructive ? "text-red-200/80 hover:bg-red-500/10 hover:text-red-100" : "text-white/72 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function InlineNameEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  maxLength
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  maxLength?: number;
}) {
  return (
    <input
      value={value}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      autoFocus
      className="h-7 min-w-0 flex-1 rounded-[8px] border border-lime/65 bg-[#111313] px-2 text-sm font-semibold text-white outline-none shadow-[0_0_0_3px_rgba(185,255,71,0.08)]"
    />
  );
}

function AiStatusSphereAvatar({ active }: { active: boolean }) {
  return (
    <div className="relative mt-1 h-8 w-8 shrink-0 overflow-visible">
      <AiOrbShader
        mode={active ? "working" : "idle"}
        className={`h-full w-full transition-opacity duration-300 ${active ? "opacity-100" : "opacity-82"}`}
        label={active ? "WebBrain AI работает" : "WebBrain AI в ожидании"}
      />
    </div>
  );
}

function SidebarSection({
  title,
  className = "",
  action,
  children
}: {
  title: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const toggleOpen = () => setIsOpen((value) => !value);

  return (
    <section className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }
        }}
        aria-expanded={isOpen}
        aria-label={isOpen ? `Свернуть ${title}` : `Развернуть ${title}`}
        className="mb-2 flex h-8 w-full cursor-pointer items-center rounded-[8px] px-3 text-sm font-medium text-white/42 transition hover:bg-white/[0.055] hover:text-white/72 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/45"
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {action ? (
          <div className="ml-1 shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            {action}
          </div>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleOpen();
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? `Свернуть ${title}` : `Развернуть ${title}`}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition hover:bg-white/[0.07] hover:text-white"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="section-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-visible"
          >
            <div className="space-y-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
