import {
  normalizeWebBrainDocumentForAi,
} from "@/lib/webbrain-document-validator";
import type {
  WebBrainComponent,
  WebBrainDocument,
  WebBrainPage,
  WebBrainStyle,
} from "@/lib/webbrain-document";
import type { WebBrainCodegenFile } from "@/lib/webbrain-codegen/types";

export function webBrainDocumentToCodegenFiles(
  document: WebBrainDocument | null,
  input: { slug?: string; name?: string } = {},
): { files: WebBrainCodegenFile[]; entry: string; overlayCss: string } {
  const normalizedDocument = normalizeWebBrainDocumentForAi(document, {
    slug: input.slug,
    name: input.name,
  });
  const page = normalizedDocument.pages[0];
  const componentsById = new Map(normalizedDocument.components.map((component) => [component.id, component]));
  if (page) reconcileDocumentAnchors(page, componentsById);
  const root = page ? componentsById.get(page.rootComponentId) : null;
  const body = root
    ? renderComponent(root, normalizedDocument, componentsById, page)
    : '<main data-wb-id="page-empty" style={{minHeight:"100vh",background:"#070807",color:"#fff"}} />';
  const content = [
    "export default function App() {",
    "  return (",
    indent(body, 4),
    "  );",
    "}",
    "",
  ].join("\n");

  return {
    entry: "src/App.tsx",
    files: [{ path: "src/App.tsx", content }],
    overlayCss: [
      "*{box-sizing:border-box}",
      "body{min-width:320px}",
      "a{color:inherit;text-decoration:none}",
      "img{max-width:100%;display:block}",
      "button,input,textarea{font:inherit}",
    ].join("\n"),
  };
}

function renderComponent(
  component: WebBrainComponent,
  document: WebBrainDocument,
  componentsById: Map<string, WebBrainComponent>,
  page: WebBrainPage,
  parentTag = "",
): string {
  const tag = tagForComponent(component, page, parentTag);
  const children = component.children
    .map((childId) => componentsById.get(childId))
    .filter((child): child is WebBrainComponent => Boolean(child))
    .map((child) => renderComponent(child, document, componentsById, page, tag));
  const inlineStyle = styleForComponent(component, document);
  const attrs = attributesForComponent(component, inlineStyle, tag);
  const text = textForComponent(component);
  const childContent = [...(text ? [escapeText(text)] : []), ...children];

  if (tag === "img" || tag === "input") {
    return `<${tag}${attrs} />`;
  }

  if (!childContent.length) return `<${tag}${attrs} />`;

  return [`<${tag}${attrs}>`, ...childContent.map((child) => indent(child, 2)), `</${tag}>`].join("\n");
}

function tagForComponent(component: WebBrainComponent, page: WebBrainPage, parentTag = "") {
  if (component.id === page.rootComponentId || component.type === "page") return "main";
  if (component.type === "header") return "header";
  if (component.type === "footer") return "footer";
  if (component.type === "section") return "section";
  if (component.type === "heading") return `h${component.props.level ?? 2}`;
  if (component.type === "text") return "p";
  if (component.type === "button" || component.type === "navLink") {
    // A button inside a form is the submit control — render a real <button type="submit">
    // (an <a> there fails the form contract and doesn't submit).
    const action = typeof component.props.action === "string" ? component.props.action : "";
    if (component.type === "button" && (parentTag === "form" || action === "submit" || component.props.href === "submit")) {
      return "button";
    }
    return "a";
  }
  if (component.type === "image") return "img";
  if (component.type === "form") return "form";
  if (component.type === "input") return "input";
  if (component.type === "textarea") return "textarea";

  return "div";
}

/** Emit a JSX attribute as a PLAIN string attr when safe (contract regexes match id="x"). */
function jsxAttr(name: string, value: string) {
  return /^[^"{}<>\n\\]*$/.test(value) ? ` ${name}="${value}"` : ` ${name}={${JSON.stringify(value)}}`;
}

function attributesForComponent(component: WebBrainComponent, style: Record<string, string | number>, tag = "") {
  // Plain string attrs (not JSX expressions) — the static contracts look for the literal
  // substrings id="..."/data-wb-id="..." when validating anchors and booking targets.
  const attrs = [jsxAttr("data-wb-id", component.id)];
  const anchorId = sanitizeCodegenAnchorId(component.props.anchorId);

  if (anchorId) {
    attrs.push(jsxAttr("id", anchorId));
  }

  if (Object.keys(style).length) {
    attrs.push(` style={${JSON.stringify(style)}}`);
  }

  if (tag === "button") {
    attrs.push(` type="submit"`);
  } else if (component.type === "button" || component.type === "navLink") {
    attrs.push(jsxAttr("href", String(component.props.href || "#")));
    if (component.props.target) attrs.push(jsxAttr("target", String(component.props.target)));
  }

  if (component.type === "image") {
    attrs.push(` src={${JSON.stringify(component.props.src || "")}}`);
    attrs.push(` alt={${JSON.stringify(component.props.alt || component.name || "")}}`);
  }

  if (component.type === "input") {
    attrs.push(` name={${JSON.stringify(component.props.name || component.id)}}`);
    attrs.push(` type={${JSON.stringify(component.props.inputType || "text")}}`);
    attrs.push(` placeholder={${JSON.stringify(component.props.placeholder || "")}}`);
  }

  if (component.type === "textarea") {
    attrs.push(` name={${JSON.stringify(component.props.name || component.id)}}`);
    attrs.push(` placeholder={${JSON.stringify(component.props.placeholder || "")}}`);
  }

  return attrs.join("");
}

function sanitizeCodegenAnchorId(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Make every in-page link land on a real target. Blueprint links use semantic hashes
 * (#hero, #features, #contact) while sections often have no anchorId — the static contracts
 * then reject the page. Resolve each unmatched hash to the best section by intent and either
 * assign it as that section's anchorId or rewrite the link to an existing target.
 */
function reconcileDocumentAnchors(page: WebBrainPage, componentsById: Map<string, WebBrainComponent>) {
  const root = componentsById.get(page.rootComponentId);
  if (!root) return;

  const ordered: WebBrainComponent[] = [];
  const walk = (component: WebBrainComponent) => {
    ordered.push(component);
    for (const childId of component.children) {
      const child = componentsById.get(childId);
      if (child) walk(child);
    }
  };
  walk(root);

  const sections = ordered.filter((component) => component.type === "section");
  if (!sections.length) return;

  const subtreeHasType = (component: WebBrainComponent, type: WebBrainComponent["type"]): boolean => {
    if (component.type === type) return true;
    return component.children.some((childId) => {
      const child = componentsById.get(childId);
      return child ? subtreeHasType(child, type) : false;
    });
  };
  const headingTextOf = (component: WebBrainComponent): string => {
    if (component.type === "heading") return String(component.props.text || "").toLowerCase();
    for (const childId of component.children) {
      const child = componentsById.get(childId);
      if (!child) continue;
      const text = headingTextOf(child);
      if (text) return text;
    }
    return "";
  };

  const formSection = sections.find((section) => subtreeHasType(section, "form")) ?? null;
  const existingTargets = new Set<string>();
  for (const component of ordered) {
    const anchor = sanitizeCodegenAnchorId(component.props.anchorId);
    if (anchor) existingTargets.add(anchor);
    existingTargets.add(component.id);
  }

  const pickSectionForAnchor = (name: string): WebBrainComponent | null => {
    if (/^(hero|top|main|home|start)$/.test(name)) return sections[0] ?? null;
    if (/(contact|kontakt|booking|reserv|zayavk|request|form|cta|visit)/.test(name)) {
      return formSection ?? sections[sections.length - 1] ?? null;
    }
    const intentMap: Array<[RegExp, RegExp]> = [
      [/(menu|price|pricing|catalog)/, /меню|прайс|цен|каталог|напит|десерт|позици/],
      [/(feature|advant|benefit|why|service|uslug)/, /преимущ|почему|выгод|услуг|детал/],
      [/(about|story|atmosphere)/, /о нас|о кофе|истор|атмосфер|about/],
      [/(gallery|photo)/, /галере|фото/],
      [/(review|testimonial)/, /отзыв/],
      [/(map|location|address)/, /карт|адрес|найти|добрат/],
    ];
    for (const [namePattern, headingPattern] of intentMap) {
      if (namePattern.test(name)) {
        const match = sections.find((section) => headingPattern.test(headingTextOf(section)));
        if (match) return match;
      }
    }
    return sections.find((section) => headingTextOf(section).includes(name)) ?? null;
  };

  const links = ordered.filter(
    (component) =>
      (component.type === "button" || component.type === "navLink") &&
      typeof component.props.href === "string" &&
      component.props.href.startsWith("#"),
  );

  for (const link of links) {
    const name = sanitizeCodegenAnchorId(link.props.href);
    if (!name || existingTargets.has(name)) continue;

    const target = pickSectionForAnchor(name);
    if (!target) {
      // No sensible section — point at the first section's real id so the link still works.
      link.props.href = `#${sections[0]!.id}`;
      continue;
    }

    const currentAnchor = sanitizeCodegenAnchorId(target.props.anchorId);
    if (currentAnchor) {
      // Section already has a public anchor — reuse it instead of double-assigning ids.
      link.props.href = `#${currentAnchor}`;
    } else {
      target.props.anchorId = name;
      existingTargets.add(name);
    }
  }
}

function textForComponent(component: WebBrainComponent) {
  if (component.type === "button" || component.type === "navLink") return component.props.label || component.props.text || component.name;
  if (component.type === "heading" || component.type === "text" || component.type === "card") return component.props.text || component.props.label || "";

  return "";
}

function styleForComponent(component: WebBrainComponent, document: WebBrainDocument) {
  const style = component.style ?? {};
  const output: Record<string, string | number> = {};

  assignLayoutStyle(output, component, style);
  assignBoxStyle(output, style);
  assignTextStyle(output, style);

  if (component.type === "page") {
    output.minHeight = output.minHeight ?? "100vh";
    output.background = output.background ?? document.theme.background ?? "#070807";
    output.color = output.color ?? document.theme.text ?? "#ffffff";
  }

  if (component.type === "row") output.display = "flex";
  if (component.type === "column" || component.type === "stack") {
    output.display = "flex";
    output.flexDirection = "column";
  }
  if (component.type === "grid" || component.type === "cardGrid") {
    output.display = "grid";
    output.gridTemplateColumns = `repeat(${component.props.columns ?? 3}, minmax(0, 1fr))`;
    output.gap = output.gap ?? 24;
    output.alignItems = output.alignItems ?? "stretch";
  }
  if (component.type === "container") {
    output.width = output.width ?? "min(100%, 1120px)";
    output.margin = output.margin ?? "0 auto";
  }
  if (component.type === "image") {
    output.objectFit = style.objectFit ?? "cover";
  }

  return output;
}

function assignLayoutStyle(output: Record<string, string | number>, component: WebBrainComponent, style: WebBrainStyle) {
  if (style.widthMode === "full") output.width = "100%";
  else if (style.width) output.width = `${style.width}%`;
  if (style.height) output.height = style.height;
  if (style.minWidth) output.minWidth = style.minWidth;
  if (style.maxWidth) output.maxWidth = style.maxWidth;
  if (style.maxHeight) output.maxHeight = style.maxHeight;
  if (style.minHeight) output.minHeight = style.minHeight;
  if (style.gap != null) output.gap = style.gap;
  if (style.alignItems) output.alignItems = alignValue(style.alignItems);
  if (style.justify) output.justifyContent = justifyValue(style.justify);
  if (style.direction) output.flexDirection = style.direction;
  if (style.wrap) output.flexWrap = "wrap";
  if (component.type === "section" && output.width == null) output.width = "100%";
}

function assignBoxStyle(output: Record<string, string | number>, style: WebBrainStyle) {
  if (style.padding) output.padding = spacingValue(style.padding);
  if (style.margin) output.margin = spacingValue(style.margin);
  if (style.radius != null) output.borderRadius = style.radius;
  if (style.background) output.background = style.background;
  if (style.backgroundImage) output.backgroundImage = `url(${style.backgroundImage})`;
  if (style.backgroundSize) output.backgroundSize = style.backgroundSize;
  if (style.backgroundPosition) output.backgroundPosition = style.backgroundPosition;
  if (style.backgroundRepeat) output.backgroundRepeat = style.backgroundRepeat;
  if (style.borderColor) output.borderColor = style.borderColor;
  if (style.borderWidth != null) {
    output.borderWidth = style.borderWidth;
    output.borderStyle = "solid";
  } else if (style.borderColor) {
    output.borderWidth = 1;
    output.borderStyle = "solid";
  }
  if (style.position) output.position = style.position;
  if (style.top != null) output.top = style.top;
  if (style.right != null) output.right = style.right;
  if (style.bottom != null) output.bottom = style.bottom;
  if (style.left != null) output.left = style.left;
  if (style.zIndex != null) output.zIndex = style.zIndex;
  if (style.overflow) output.overflow = style.overflow;
  if (style.shadow) output.boxShadow = `0 ${Math.round(style.shadow * 0.8)}px ${Math.round(style.shadow * 2.4)}px rgba(0,0,0,0.28)`;
}

function assignTextStyle(output: Record<string, string | number>, style: WebBrainStyle) {
  if (style.textColor) output.color = style.textColor;
  if (style.fontSize) output.fontSize = style.fontSize;
  if (style.fontWeight) output.fontWeight = style.fontWeight;
  if (style.fontStyle) output.fontStyle = style.fontStyle;
  if (style.letterSpacing != null) output.letterSpacing = style.letterSpacing;
  if (style.lineHeight) output.lineHeight = style.lineHeight;
  if (style.textTransform) output.textTransform = style.textTransform;
  if (style.textDecoration) output.textDecoration = style.textDecoration;
  if (style.align) output.textAlign = style.align;
}

function spacingValue(spacing: { top: number; right: number; bottom: number; left: number }) {
  return `${spacing.top}px ${spacing.right}px ${spacing.bottom}px ${spacing.left}px`;
}

function alignValue(value: NonNullable<WebBrainStyle["alignItems"]>): string {
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  return value;
}

function justifyValue(value: NonNullable<WebBrainStyle["justify"]>): string {
  if (value === "start") return "flex-start";
  if (value === "between") return "space-between";
  return value ?? "flex-start";
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function indent(value: string, size: number) {
  const padding = " ".repeat(size);
  return value.split("\n").map((line) => `${padding}${line}`).join("\n");
}
