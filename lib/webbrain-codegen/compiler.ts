import ts from "typescript";
import { createWebBrainElementId } from "@/lib/webbrain-codegen/id";
import type {
  WebBrainCodegenCompileResult,
  WebBrainCodegenElement,
  WebBrainCodegenElementMap,
  WebBrainCodegenFile,
  WebBrainCodegenPrimitive,
  WebBrainCodegenSettingField,
  WebBrainCodegenSettings,
  WebBrainCodegenStyleValue,
} from "@/lib/webbrain-codegen/types";

const WB_ID_ATTR = "data-wb-id";
const WB_PRIMITIVE_ATTR = "data-wb-primitive";
const WB_SETTINGS_ATTR = "data-wb-settings";
const WB_TABLET_SETTINGS_ATTR = "data-wb-settings-tablet";
const WB_MOBILE_SETTINGS_ATTR = "data-wb-settings-mobile";
const WB_SETTINGS_SCHEMA_ATTR = "data-wb-settings-schema";
const PUBLIC_ID_ATTR = "id";
const ANCHORABLE_TAGS = new Set(["article", "aside", "div", "footer", "form", "header", "main", "nav", "section"]);
const CODEGEN_PRIMITIVES = new Set<WebBrainCodegenPrimitive>([
  "reveal",
  "accordion",
  "tabs",
  "sticky-stack",
  "carousel",
  "drawer",
  "marquee",
  "hover-expand",
]);
const VISUAL_INTRINSIC_TAGS = new Set([
  "a",
  "article",
  "aside",
  "button",
  "div",
  "fieldset",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "img",
  "input",
  "label",
  "li",
  "main",
  "nav",
  "p",
  "section",
  "span",
  "textarea",
  "ul",
]);

type TextEdit = {
  index: number;
  text: string;
};

export function compileWebBrainCodegen(files: WebBrainCodegenFile[], overlayCss = ""): WebBrainCodegenCompileResult {
  const filesWithIds = files.map((file) => addMissingWebBrainIds(file));

  return {
    files: filesWithIds,
    elementMap: buildElementMap(filesWithIds),
    overlay: {
      version: 1,
      css: overlayCss,
    },
  };
}

export function addMissingWebBrainIds(file: WebBrainCodegenFile): WebBrainCodegenFile {
  const sourceFile = parseTsx(file.path, file.content);
  const usedIds = new Set<string>();
  const inserts: TextEdit[] = [];
  let generatedIndex = 0;

  function rememberExistingId(node: ts.JsxOpeningLikeElement) {
    const id = getJsxAttributeString(node, WB_ID_ATTR);

    if (id) usedIds.add(id);
  }

  function collectExistingIds(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      rememberExistingId(node);
    }

    ts.forEachChild(node, collectExistingIds);
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      const existingWbId = getJsxAttributeString(node, WB_ID_ATTR);
      const canReceivePublicAnchor = isAnchorableTag(tag);

      if (isVisualTag(tag) && !existingWbId) {
        let id = createWebBrainElementId(file.path, tag, `${node.getStart(sourceFile)}:${generatedIndex}`);
        generatedIndex += 1;

        while (usedIds.has(id)) {
          id = createWebBrainElementId(file.path, tag, `${node.getStart(sourceFile)}:${generatedIndex}`);
          generatedIndex += 1;
        }

        usedIds.add(id);
        inserts.push({
          index: node.tagName.getEnd(),
          text: ` ${WB_ID_ATTR}="${id}"${canReceivePublicAnchor ? ` ${PUBLIC_ID_ATTR}="${id}"` : ""}`,
        });
      } else if (existingWbId && canReceivePublicAnchor && !getJsxAttribute(node, PUBLIC_ID_ATTR)) {
        inserts.push({
          index: node.tagName.getEnd(),
          text: ` ${PUBLIC_ID_ATTR}="${existingWbId}"`,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  collectExistingIds(sourceFile);
  visit(sourceFile);

  if (!inserts.length) return file;

  return {
    ...file,
    content: applyTextEdits(file.content, inserts),
  };
}

export function buildElementMap(files: WebBrainCodegenFile[]): WebBrainCodegenElementMap {
  const elements: Record<string, WebBrainCodegenElement> = {};
  const roots: string[] = [];

  for (const file of files) {
    const sourceFile = parseTsx(file.path, file.content);

    function registerOpening(node: ts.JsxOpeningLikeElement, parentId: string | null) {
      const tag = node.tagName.getText(sourceFile);
      const id = getJsxAttributeString(node, WB_ID_ATTR);

      if (!id || !isVisualTag(tag)) return null;

      const element: WebBrainCodegenElement = {
        id,
        tag,
        position: {
          filePath: file.path,
          start: node.parent ? node.parent.getStart(sourceFile) : node.getStart(sourceFile),
          end: node.parent ? node.parent.getEnd() : node.getEnd(),
          openingStart: node.getStart(sourceFile),
          openingEnd: node.getEnd(),
        },
        style: getInlineStyleObject(node),
        primitive: getCodegenPrimitive(node) ?? undefined,
        settings: getCodegenSettings(node),
        settingsByViewport: {
          desktop: getCodegenSettings(node),
          tablet: getCodegenSettings(node, "tablet"),
          mobile: getCodegenSettings(node, "mobile"),
        },
        settingsSchema: getCodegenSettingsSchema(node),
        text: ts.isJsxOpeningElement(node) ? getDirectText(node.parent, sourceFile) : undefined,
        src: getJsxAttributeString(node, "src") ?? undefined,
        href: getJsxAttributeString(node, "href") ?? undefined,
        parentId,
        children: [],
      };

      elements[id] = element;

      if (parentId && elements[parentId]) {
        elements[parentId].children.push(id);
      } else {
        roots.push(id);
      }

      return id;
    }

    function visit(node: ts.Node, parentId: string | null) {
      if (ts.isJsxElement(node)) {
        const id = registerOpening(node.openingElement, parentId);

        for (const child of node.children) {
          visit(child, id ?? parentId);
        }

        return;
      }

      if (ts.isJsxSelfClosingElement(node)) {
        registerOpening(node, parentId);
        return;
      }

      ts.forEachChild(node, (child) => visit(child, parentId));
    }

    visit(sourceFile, null);
  }

  return {
    version: 1,
    elements,
    roots,
  };
}

function parseTsx(filePath: string, content: string) {
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isVisualTag(tag: string) {
  if (!tag) return false;
  if (tag.includes(".")) return false;
  if (tag[0] === tag[0]?.toUpperCase()) return false;

  return VISUAL_INTRINSIC_TAGS.has(tag);
}

function isAnchorableTag(tag: string) {
  return isVisualTag(tag) && ANCHORABLE_TAGS.has(tag);
}

function getJsxAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  return node.attributes.properties.find((property): property is ts.JsxAttribute => {
    return ts.isJsxAttribute(property) && property.name.getText() === name;
  });
}

function getJsxAttributeString(node: ts.JsxOpeningLikeElement, name: string) {
  const attribute = getJsxAttribute(node, name);

  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (!ts.isJsxExpression(attribute.initializer)) return null;

  const expression = attribute.initializer.expression;
  if (expression && ts.isStringLiteralLike(expression)) return expression.text;

  return null;
}

function getCodegenPrimitive(node: ts.JsxOpeningLikeElement): WebBrainCodegenPrimitive | null {
  const primitive = getJsxAttributeString(node, WB_PRIMITIVE_ATTR)?.trim();

  return primitive && CODEGEN_PRIMITIVES.has(primitive as WebBrainCodegenPrimitive)
    ? primitive as WebBrainCodegenPrimitive
    : null;
}

function getCodegenSettings(node: ts.JsxOpeningLikeElement, viewport: "desktop" | "tablet" | "mobile" = "desktop"): WebBrainCodegenSettings {
  const attributeName =
    viewport === "mobile"
      ? WB_MOBILE_SETTINGS_ATTR
      : viewport === "tablet"
        ? WB_TABLET_SETTINGS_ATTR
        : WB_SETTINGS_ATTR;
  const value = parseJsonAttribute(node, attributeName);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, string | number | boolean | null] => {
      const setting = entry[1];

      return setting === null || typeof setting === "string" || typeof setting === "number" || typeof setting === "boolean";
    }),
  );
}

function getCodegenSettingsSchema(node: ts.JsxOpeningLikeElement): WebBrainCodegenSettingField[] {
  const value = parseJsonAttribute(node, WB_SETTINGS_SCHEMA_ATTR);
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => normalizeSettingField(item))
    .filter((item): item is WebBrainCodegenSettingField => Boolean(item));
}

function normalizeSettingField(value: unknown): WebBrainCodegenSettingField | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const key = typeof raw.key === "string" ? raw.key.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : key;
  const type = raw.type;

  if (!key || !label || !["number", "text", "select", "boolean", "color"].includes(String(type))) return null;

  const field: WebBrainCodegenSettingField = {
    key,
    label,
    type: type as WebBrainCodegenSettingField["type"],
  };

  if (raw.default === null || typeof raw.default === "string" || typeof raw.default === "number" || typeof raw.default === "boolean") {
    field.default = raw.default;
  }
  if (typeof raw.min === "number") field.min = raw.min;
  if (typeof raw.max === "number") field.max = raw.max;
  if (typeof raw.step === "number") field.step = raw.step;
  if (typeof raw.unit === "string") field.unit = raw.unit;
  if (typeof raw.cssVar === "string" && /^--[a-z0-9_-]+$/i.test(raw.cssVar.trim())) field.cssVar = raw.cssVar.trim();
  if (typeof raw.cssUnit === "string" && /^[a-z%]*$/i.test(raw.cssUnit.trim())) field.cssUnit = raw.cssUnit.trim();
  if (Array.isArray(raw.options)) {
    field.options = raw.options
      .map((option) => {
        if (!option || typeof option !== "object" || Array.isArray(option)) return null;
        const optionRecord = option as Record<string, unknown>;
        const optionValue = typeof optionRecord.value === "string" ? optionRecord.value : "";
        const optionLabel = typeof optionRecord.label === "string" ? optionRecord.label : optionValue;

        return optionValue ? { value: optionValue, label: optionLabel } : null;
      })
      .filter((option): option is { value: string; label: string } => Boolean(option));
  }

  return field;
}

function parseJsonAttribute(node: ts.JsxOpeningLikeElement, name: string) {
  const raw = getJsxAttributeString(node, name);
  if (!raw?.trim()) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getInlineStyleObject(node: ts.JsxOpeningLikeElement) {
  const attribute = getJsxAttribute(node, "style");
  const expression = attribute?.initializer && ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression
    : null;

  if (!expression || !ts.isObjectLiteralExpression(expression)) return {};

  const style: Record<string, WebBrainCodegenStyleValue> = {};

  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) continue;

    const key = property.name.getText().replace(/^["']|["']$/g, "");
    style[key] = literalValue(property.initializer);
  }

  return style;
}

function literalValue(node: ts.Expression): WebBrainCodegenStyleValue {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    const value = Number(node.operand.text);

    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }

  return node.getText();
}

function getDirectText(node: ts.JsxElement, sourceFile: ts.SourceFile) {
  const text = node.children
    .filter(ts.isJsxText)
    .map((child) => child.getText(sourceFile).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");

  return text || undefined;
}

function applyTextEdits(content: string, edits: TextEdit[]) {
  return [...edits]
    .sort((a, b) => b.index - a.index)
    .reduce((next, edit) => `${next.slice(0, edit.index)}${edit.text}${next.slice(edit.index)}`, content);
}
