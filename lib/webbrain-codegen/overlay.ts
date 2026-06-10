import type { WebBrainCodegenStyleValue } from "@/lib/webbrain-codegen/types";

export type WebBrainCodegenOverlayState = "hover" | "focus" | "mobile" | "tablet";

export type WebBrainCodegenOverlayPatch = {
  wbId: string;
  state: WebBrainCodegenOverlayState;
  declarations: Record<string, WebBrainCodegenStyleValue | undefined>;
};

export function upsertCodegenOverlayRule(css: string, patch: WebBrainCodegenOverlayPatch) {
  const wbId = patch.wbId.trim();
  if (!wbId) throw new Error("wbId is required");

  const key = `${wbId}:${patch.state}`;
  const start = `/* wb-overlay:start:${key} */`;
  const end = `/* wb-overlay:end:${key} */`;
  const blockPattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`, "g");
  const existingBlock = css.match(blockPattern)?.[0] ?? "";
  const mergedDeclarations = {
    ...parseDeclarationBlock(existingBlock),
    ...patch.declarations,
  };
  const declarationText = Object.entries(mergedDeclarations)
    .filter((entry): entry is [string, WebBrainCodegenStyleValue] => entry[1] !== undefined && entry[1] !== null && String(entry[1]).trim() !== "")
    .map(([property, value]) => `  ${toKebabCase(property)}: ${cssValue(value)};`)
    .join("\n");
  const rule = declarationText ? `${start}\n${wrapRule(wbId, patch.state, declarationText)}\n${end}` : "";
  const withoutPrevious = css.replace(blockPattern, "").trim();

  return [withoutPrevious, rule].filter(Boolean).join("\n\n");
}

function parseDeclarationBlock(block: string): Record<string, WebBrainCodegenStyleValue> {
  const result: Record<string, WebBrainCodegenStyleValue> = {};
  const matches = block.matchAll(/^\s*([a-z-]+)\s*:\s*([^;]+);/gim);

  for (const match of matches) {
    const property = toCamelCase(match[1] ?? "");
    const rawValue = (match[2] ?? "").trim();
    if (!property || !rawValue) continue;

    result[property] = rawValue;
  }

  return result;
}

function wrapRule(wbId: string, state: WebBrainCodegenOverlayState, declarations: string) {
  const selector = `[data-wb-id="${escapeCssString(wbId)}"]`;

  if (state === "hover") return `${selector}:hover {\n${declarations}\n}`;
  if (state === "focus") return `${selector}:focus-visible {\n${declarations}\n}`;
  if (state === "mobile") return `@media (max-width: 767px) {\n${selector} {\n${indent(declarations)}\n}\n}`;

  return `@media (min-width: 768px) and (max-width: 1023px) {\n${selector} {\n${indent(declarations)}\n}\n}`;
}

function toKebabCase(property: string) {
  return property.trim().replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function toCamelCase(property: string) {
  return property.trim().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function cssValue(value: WebBrainCodegenStyleValue) {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "boolean") return value ? "1" : "0";

  return String(value).replace(/[;\n\r]/g, " ").trim();
}

function indent(value: string) {
  return value.split("\n").map((line) => `  ${line}`).join("\n");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCssString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
