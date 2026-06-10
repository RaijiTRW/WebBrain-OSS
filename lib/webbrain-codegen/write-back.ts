import ts from "typescript";
import type {
  WebBrainCodegenContentPatch,
  WebBrainCodegenFile,
  WebBrainCodegenSettingsPatch,
  WebBrainCodegenStyleValue,
  WebBrainInlineStylePatch,
} from "@/lib/webbrain-codegen/types";

const WB_ID_ATTR = "data-wb-id";
const WB_SETTINGS_ATTR = "data-wb-settings";
const WB_TABLET_SETTINGS_ATTR = "data-wb-settings-tablet";
const WB_MOBILE_SETTINGS_ATTR = "data-wb-settings-mobile";
const ANCHORABLE_TAGS = new Set(["article", "aside", "div", "footer", "form", "header", "main", "nav", "section"]);

export function applyInlineStylePatch(file: WebBrainCodegenFile, patch: WebBrainInlineStylePatch): WebBrainCodegenFile {
  if (file.path !== patch.filePath) {
    throw new Error(`Patch targets ${patch.filePath}, but file is ${file.path}.`);
  }

  const sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const target = findOpeningByWebBrainId(sourceFile, patch.wbId);

  if (!target) {
    throw new Error(`Element ${patch.wbId} was not found in ${file.path}.`);
  }

  const styleAttribute = getJsxAttribute(target, "style");
  const nextValue = formatStyleValue(patch.value);

  if (!styleAttribute) {
    return {
      ...file,
      content: insertAt(file.content, target.tagName.getEnd(), ` style={{ ${patch.property}: ${nextValue} }}`),
    };
  }

  const initializer = styleAttribute.initializer;

  if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression || !ts.isObjectLiteralExpression(initializer.expression)) {
    return {
      ...file,
      content: replaceRange(file.content, styleAttribute.getStart(sourceFile), styleAttribute.getEnd(), `style={{ ${patch.property}: ${nextValue} }}`),
    };
  }

  const objectLiteral = initializer.expression;
  const existingProperty = objectLiteral.properties.find((property): property is ts.PropertyAssignment => {
    if (!ts.isPropertyAssignment(property)) return false;

    return property.name.getText(sourceFile).replace(/^["']|["']$/g, "") === patch.property;
  });

  if (existingProperty) {
    return {
      ...file,
      content: replaceRange(file.content, existingProperty.initializer.getStart(sourceFile), existingProperty.initializer.getEnd(), nextValue),
    };
  }

  const insertPosition = objectLiteral.properties.length
    ? objectLiteral.properties[objectLiteral.properties.length - 1].getEnd()
    : objectLiteral.getStart(sourceFile) + 1;
  const prefix = objectLiteral.properties.length ? "," : "";

  return {
    ...file,
    content: insertAt(file.content, insertPosition, `${prefix} ${patch.property}: ${nextValue}`),
  };
}

export function applyCodegenSettingsPatch(file: WebBrainCodegenFile, patch: WebBrainCodegenSettingsPatch): WebBrainCodegenFile {
  if (file.path !== patch.filePath) {
    throw new Error(`Patch targets ${patch.filePath}, but file is ${file.path}.`);
  }

  const sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const target = findOpeningByWebBrainId(sourceFile, patch.wbId);

  if (!target) {
    throw new Error(`Element ${patch.wbId} was not found in ${file.path}.`);
  }

  return applyJsxStringAttributePatch(file, sourceFile, target, codegenSettingsAttributeForViewport(patch.viewport), JSON.stringify(patch.settings));
}

export function applyCodegenContentPatch(file: WebBrainCodegenFile, patch: WebBrainCodegenContentPatch): WebBrainCodegenFile {
  if (file.path !== patch.filePath) {
    throw new Error(`Patch targets ${patch.filePath}, but file is ${file.path}.`);
  }

  const sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const target = findOpeningByWebBrainId(sourceFile, patch.wbId);

  if (!target) {
    throw new Error(`Element ${patch.wbId} was not found in ${file.path}.`);
  }

  if (patch.kind === "src" || patch.kind === "href") {
    return applyJsxStringAttributePatch(file, sourceFile, target, patch.kind, patch.value);
  }

  if (!ts.isJsxOpeningElement(target) || !ts.isJsxElement(target.parent)) {
    throw new Error(`Element ${patch.wbId} cannot contain editable text.`);
  }

  const openEnd = target.getEnd();
  const closeStart = target.parent.closingElement.getStart(sourceFile);
  const nextText = escapeJsxText(patch.value);

  return {
    ...file,
    content: replaceRange(file.content, openEnd, closeStart, nextText),
  };
}

export function applyCodegenAnchorPatch(
  file: WebBrainCodegenFile,
  patch: {
    filePath: string;
    wbId: string;
    nextWbId: string;
  },
): WebBrainCodegenFile {
  if (file.path !== patch.filePath) {
    throw new Error(`Patch targets ${patch.filePath}, but file is ${file.path}.`);
  }

  const sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const target = findOpeningByWebBrainId(sourceFile, patch.wbId);

  if (!target) {
    throw new Error(`Element ${patch.wbId} was not found in ${file.path}.`);
  }

  const tagName = target.tagName.getText(sourceFile);
  const fileWithPublicId = ANCHORABLE_TAGS.has(tagName)
    ? applyJsxStringAttributePatch(file, sourceFile, target, "id", patch.nextWbId)
    : file;
  const nextSourceFile = ts.createSourceFile(fileWithPublicId.path, fileWithPublicId.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nextTarget = findOpeningByWebBrainId(nextSourceFile, patch.wbId);

  if (!nextTarget) {
    throw new Error(`Element ${patch.wbId} was not found in ${file.path}.`);
  }

  return applyJsxStringAttributePatch(fileWithPublicId, nextSourceFile, nextTarget, WB_ID_ATTR, patch.nextWbId);
}

function codegenSettingsAttributeForViewport(viewport: WebBrainCodegenSettingsPatch["viewport"]) {
  if (viewport === "mobile") return WB_MOBILE_SETTINGS_ATTR;
  if (viewport === "tablet") return WB_TABLET_SETTINGS_ATTR;

  return WB_SETTINGS_ATTR;
}

function findOpeningByWebBrainId(sourceFile: ts.SourceFile, wbId: string): ts.JsxOpeningElement | ts.JsxSelfClosingElement | null {
  let found: ts.JsxOpeningElement | ts.JsxSelfClosingElement | null = null;

  function visit(node: ts.Node) {
    if (found) return;

    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && getJsxAttributeString(node, WB_ID_ATTR) === wbId) {
      found = node;
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return found;
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

function applyJsxStringAttributePatch(
  file: WebBrainCodegenFile,
  sourceFile: ts.SourceFile,
  target: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
  value: string,
): WebBrainCodegenFile {
  const attribute = getJsxAttribute(target, name);
  const nextAttribute = `${name}={${JSON.stringify(value)}}`;

  if (!attribute) {
    return {
      ...file,
      content: insertAt(file.content, target.tagName.getEnd(), ` ${nextAttribute}`),
    };
  }

  return {
    ...file,
    content: replaceRange(file.content, attribute.getStart(sourceFile), attribute.getEnd(), nextAttribute),
  };
}

function formatStyleValue(value: WebBrainCodegenStyleValue) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  if (typeof value === "boolean") return value ? "true" : "false";

  return "null";
}

function insertAt(content: string, index: number, text: string) {
  return `${content.slice(0, index)}${text}${content.slice(index)}`;
}

function replaceRange(content: string, start: number, end: number, text: string) {
  return `${content.slice(0, start)}${text}${content.slice(end)}`;
}

function escapeJsxText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
