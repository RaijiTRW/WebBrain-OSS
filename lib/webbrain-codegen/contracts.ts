import type {
  WebBrainCodegenCompileResult,
  WebBrainCodegenElement,
  WebBrainCodegenStyleValue,
} from "@/lib/webbrain-codegen/types";

type CodegenContractInput = {
  files: Array<{ content: string }>;
  compileResult: WebBrainCodegenCompileResult;
};

export function assertCodegenStaticContracts(input: CodegenContractInput) {
  const source = input.files.map((file) => file.content).join("\n");
  const elements = Object.values(input.compileResult.elementMap.elements);
  const elementIds = new Set(elements.map((element) => element.id));
  const issues: string[] = [];

  assertReactSourceContracts({ source, elements, issues });
  assertAnchorContracts({ source, elements, elementIds, issues });
  assertHeaderNavigationContracts({ source, compileResult: input.compileResult, elementIds, issues });
  assertHeroViewportContracts({ source, compileResult: input.compileResult, issues });
  assertBookingContracts({ source, elementIds, issues });
  assertFormContracts({ source, compileResult: input.compileResult, issues });
  assertFormDiversityContracts({ source, compileResult: input.compileResult, issues });
  assertLayoutRiskContracts({ elements, issues });

  if (issues.length) {
    throw new Error(["Codegen static contract failed:", ...issues.map((issue) => `- ${issue}`)].join("\n"));
  }
}

function assertReactSourceContracts(input: {
  source: string;
  elements: WebBrainCodegenElement[];
  issues: string[];
}) {
  if (!/export\s+default\s+function\s+App\s*\(/.test(input.source) && !/export\s+default\s+App\b/.test(input.source)) {
    input.issues.push("Codegen page must export a default App component.");
  }

  if (/\bclassName\s*=/.test(input.source) || /\bclass\s*=/.test(input.source)) {
    input.issues.push("Unsupported styling: generated pages must not use className/class/Tailwind. Put base visual styles inline and use overlayCss only for hover/focus/mobile.");
  }

  const styleableElements = input.elements.filter((element) =>
    !["main", "header", "nav", "footer", "form", "ul", "li", "span"].includes(element.tag) &&
    element.tag !== "input" &&
    element.tag !== "textarea",
  );
  const styledElements = styleableElements.filter((element) => Object.keys(element.style).length > 0);

  if (styleableElements.length >= 8 && styledElements.length / styleableElements.length < 0.55) {
    input.issues.push("Too many visual elements have no inline style. The result is likely relying on missing CSS/classes; make the page self-contained with inline styles.");
  }

  if (/\bTODO\b|lorem ipsum|здесь будет|placeholder section|coming soon/i.test(input.source)) {
    input.issues.push("Generated page contains placeholder/TODO content. Return finished page content, not placeholders.");
  }
}

function assertAnchorContracts(input: {
  source: string;
  elements: WebBrainCodegenElement[];
  elementIds: Set<string>;
  issues: string[];
}) {
  const anchors = input.elements.filter((element) => element.tag === "a" && typeof element.href === "string");

  for (const anchor of anchors) {
    const href = anchor.href?.trim() ?? "";
    if (!href) continue;
    if (href === "#") {
      input.issues.push(`Anchor ${anchor.id} uses href="#". Point it to a real section, mailto: or tel:.`);
      continue;
    }
    if (/^(\/app|\/signup|\/login|\/api|https?:\/\/(?:localhost|127\.0\.0\.1))/i.test(href)) {
      input.issues.push(`Anchor ${anchor.id} points to internal WebBrain/runtime URL ${href}. Generated sites must use real section anchors, mailto: or tel:.`);
      continue;
    }
    if (!href.startsWith("#")) continue;

    const targetId = href.slice(1);
    if (!hasStaticTarget(input.source, input.elementIds, targetId)) {
      input.issues.push(`Anchor ${anchor.id} points to ${href}, but no matching data-wb-id/id exists.`);
    }
  }
}

function assertHeaderNavigationContracts(input: {
  source: string;
  compileResult: WebBrainCodegenCompileResult;
  elementIds: Set<string>;
  issues: string[];
}) {
  const headerSource = input.source.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? "";
  if (!headerSource) {
    input.issues.push("Page has no header. Generated sites need a real header with working section links.");
    return;
  }

  const inertHeaderButtonPattern =
    /<button(?![^>]*\btype=["']submit["'])[^>]*>[\s\S]{0,260}(меню|о\s+кофейн|о\s+нас|отзыв|карт|контакт|заброни|брон|booking|reservation)[\s\S]{0,120}<\/button>/i;
  const deadHashLinkPattern =
    /<a[^>]*href=["']#["'][^>]*>[\s\S]{0,220}(меню|о\s+кофейн|о\s+нас|отзыв|карт|контакт|заброни|брон|booking|reservation)[\s\S]{0,80}<\/a>/i;
  const textOnlyNavPattern =
    /<(span|p|li|div)(?![^>]*\bdata-wb-nav-target=)(?![^>]*\bdata-wb-target=)(?![^>]*\brole=["']button["'])(?![^>]*\bonClick=)[^>]*>\s*(меню|о\s+кофейн|о\s+нас|отзывы?|карта|контакты?|забронировать|бронь|booking|reservation)\s*<\/\1>/i;

  if (inertHeaderButtonPattern.test(headerSource)) {
    input.issues.push("Header navigation/booking CTA is a button. Header menu items and scroll CTAs must be real <a href=\"#section\"> links with matching data-wb-id sections.");
  }

  if (deadHashLinkPattern.test(headerSource)) {
    input.issues.push("Header navigation/booking CTA uses href=\"#\". Use a real existing anchor like #menu, #about, #reviews, #map or #booking.");
  }

  if (textOnlyNavPattern.test(headerSource)) {
    input.issues.push("Header navigation contains plain text menu items. Use real <a href=\"#section\"> links for every header nav item and CTA.");
  }

  const headerRoots = Object.values(input.compileResult.elementMap.elements).filter((element) => element.tag === "header" || element.tag === "nav");
  const checked = new Set<string>();

  for (const root of headerRoots) {
    const descendants = collectElementDescendants(root.id, input.compileResult);
    for (const element of descendants) {
      if (checked.has(element.id)) continue;
      checked.add(element.id);
      if (!["a", "button", "span", "p", "li", "div"].includes(element.tag)) continue;
      if (hasAncestorTag(element, input.compileResult, "a")) continue;
      if (element.tag !== "a" && hasInteractiveDescendant(element.id, input.compileResult)) continue;

      const label = collectElementText(element.id, input.compileResult);
      const intent = navIntent(label);
      if (!intent) continue;

      if (element.tag !== "a") {
        input.issues.push(`Header/nav item "${compactText(label)}" is ${element.tag}, not a real <a href="#section"> link.`);
        continue;
      }

      const href = element.href?.trim() ?? "";
      if (!href || href === "#") {
        input.issues.push(`Header/nav link "${compactText(label)}" has empty href/#. Point it to an existing section like #${intent}.`);
        continue;
      }

      if (!href.startsWith("#")) {
        input.issues.push(`Header/nav link "${compactText(label)}" must point to a local section anchor, not ${href}.`);
        continue;
      }

      const targetId = href.slice(1);
      if (!hasStaticTarget(input.source, input.elementIds, targetId)) {
        input.issues.push(`Header/nav link "${compactText(label)}" points to ${href}, but no matching section target exists.`);
      }
    }
  }
}

function assertHeroViewportContracts(input: {
  source: string;
  compileResult: WebBrainCodegenCompileResult;
  issues: string[];
}) {
  const elements = input.compileResult.elementMap.elements;
  const roots = input.compileResult.elementMap.roots
    .map((id) => elements[id])
    .filter((element): element is WebBrainCodegenElement => Boolean(element));
  const hero =
    elements.hero ??
    Object.values(elements).find((element) => element.tag === "section" && /hero|top|intro|cover|first|main/i.test(element.id)) ??
    roots.find((element) => element.tag === "section") ??
    Object.values(elements).find((element) => element.tag === "section");

  if (!hero || hero.tag !== "section") {
    input.issues.push("Hero viewport gate: first screen must be a real <section data-wb-id=\"hero\">, not an unnamed div or missing block.");
    return;
  }

  const heroSourcePattern = new RegExp(`<section(?=[\\s\\S]{0,900}data-wb-id=["']${escapeRegExp(hero.id)}["'])[\\s\\S]*?>`, "i");
  const heroOpening = input.source.match(heroSourcePattern)?.[0] ?? "";
  const minHeight = hero.style.minHeight;
  const height = hero.style.height;
  const hasViewportHeight = [minHeight, height].some(isViewportHeroHeight) || /minHeight\s*:\s*["'](?:calc\()?100d?vh|height\s*:\s*["'](?:calc\()?100d?vh/i.test(heroOpening);

  if (!hasViewportHeight) {
    input.issues.push(`Hero viewport gate: ${hero.id} must declare minHeight/height as 100vh, 100dvh, or calc(100vh - header). Current minHeight=${String(minHeight ?? "")}, height=${String(height ?? "")}.`);
  }

  const paddingTop = numericStyleValue(hero.style.paddingTop);
  const marginTop = numericStyleValue(hero.style.marginTop);

  if (paddingTop > 180 || marginTop > 120) {
    input.issues.push(`Hero viewport gate: ${hero.id} has too much top spacing (${paddingTop}px paddingTop, ${marginTop}px marginTop). H1/CTA must be visible in the first viewport.`);
  }
}

function assertBookingContracts(input: { source: string; elementIds: Set<string>; issues: string[] }) {
  const needsBooking = /брон|столик|резерв|booking|reservation|заброни/i.test(input.source);
  if (!needsBooking) return;

  // A booking CTA must land on a REAL form, but the anchor doesn't have to be literally
  // #booking — a request form living in #contact / #cta is normal UX. Demanding the exact
  // id killed valid pages (including the deterministic converter output).
  const hasBookingTarget =
    hasStaticTarget(input.source, input.elementIds, "booking") ||
    hasStaticTarget(input.source, input.elementIds, "contact") ||
    hasStaticTarget(input.source, input.elementIds, "cta");
  const hasBookingForm =
    /<form[\s\S]{0,2600}(booking_create|брон|столик|phone|tel|date|time)/i.test(input.source) ||
    /data-wb-id=["'][^"']*booking[^"']*form/i.test(input.source);

  if (!hasBookingTarget || !hasBookingForm) {
    input.issues.push("Booking/reservation CTA exists, but the page has no booking/contact target with a real booking form.");
  }
}

function assertFormContracts(input: {
  source: string;
  compileResult: WebBrainCodegenCompileResult;
  issues: string[];
}) {
  const forms = Object.values(input.compileResult.elementMap.elements).filter((element) => element.tag === "form");

  for (const form of forms) {
    const descendants = collectElementDescendants(form.id, input.compileResult);
    const hasField = descendants.some((element) => element.tag === "input" || element.tag === "textarea");
    const hasSubmit =
      descendants.some((element) => element.tag === "button") ||
      /<button[\s\S]{0,500}(submit|отправ|заброни|заявк)/i.test(input.source);
    const fakeFields = descendants.filter((element) => {
      if (["label", "input", "textarea", "button"].includes(element.tag)) return false;
      const text = collectElementText(element.id, input.compileResult);
      return /^(имя|телефон|email|почта|дата|время|комментарий|назначение визита)$/i.test(text);
    });

    if (!hasField) input.issues.push(`Form ${form.id} has no input/textarea fields.`);
    if (!hasSubmit) input.issues.push(`Form ${form.id} has no submit button.`);
    if (fakeFields.length) {
      input.issues.push(`Form ${form.id} has fake text fields instead of real label/input controls: ${fakeFields.map((element) => element.id).slice(0, 4).join(", ")}.`);
    }
  }
}

function assertFormDiversityContracts(input: {
  source: string;
  compileResult: WebBrainCodegenCompileResult;
  issues: string[];
}) {
  const forms = Object.values(input.compileResult.elementMap.elements).filter((element) => element.tag === "form");
  const hasLeadIntent = /заявк|брон|столик|запис|визит|консультац|contact|booking|reservation|lead/i.test(input.source);
  if (!forms.length || !hasLeadIntent) return;

  const hasExplicitConversionPattern =
    /data-wb-(?:id|pattern|role)=["'][^"']*(?:hero-booking-strip|booking-drawer|selector-request|proof-form-split|inline-request|compact-final-cta|floating-contact-rail|contact-rail|action-strip|selector-to-form|context-request)[^"']*["']/i.test(input.source) ||
    /data-wb-primitive=["'](?:drawer|reveal)["']/i.test(input.source);

  for (const form of forms) {
    const descendants = collectElementDescendants(form.id, input.compileResult);
    const formText = [form.text ?? "", ...descendants.map((element) => element.text ?? ""), form.id]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const formSource = extractStaticFormSource(input.source, form.id);
    const sourceText = `${formText} ${formSource.toLowerCase().replace(/&nbsp;|\\u00a0/g, " ").replace(/\s+/g, " ")}`;
    const nameIndex = sourceText.search(/имя|как\s+к\s+вам\s+обращ/);
    const phoneIndex = sourceText.search(/телефон|\+7|phone|tel/);
    const emailIndex = sourceText.search(/email|почт/);
    const commentIndex = sourceText.search(/комментар|пожелан|сообщен|вопрос/);
    const dateIndex = sourceText.search(/дата|date/);
    const timeIndex = sourceText.search(/время|time/);
    const guestsIndex = sourceText.search(/гост|персон|человек|guests/);
    const selectIndex = sourceText.search(/select|вариант|формат|услуг|меню|позици|пакет|выбор|category/);
    const plainContactOrder =
      nameIndex >= 0 &&
      (phoneIndex > nameIndex || emailIndex > nameIndex) &&
      commentIndex > Math.max(phoneIndex, emailIndex);
    const scenarioFieldCount = [dateIndex, timeIndex, guestsIndex, selectIndex].filter((index) => index >= 0).length;
    const bookingFieldsAfterContact =
      plainContactOrder &&
      ((dateIndex > nameIndex && dateIndex > phoneIndex) || (timeIndex > nameIndex && timeIndex > phoneIndex) || guestsIndex > phoneIndex);
    const formHasPatternIdentity =
      /(?:strip|drawer|rail|selector|split|inline|compact|context|booking|reservation|floating|action)/i.test(form.id) ||
      /data-wb-(?:id|pattern|role)=["'][^"']*(?:strip|drawer|rail|selector|split|inline|compact|context|booking|reservation|floating|action)[^"']*["']/i.test(formSource) ||
      /data-wb-primitive=["'](?:drawer|reveal)["']/i.test(formSource);

    if (plainContactOrder && scenarioFieldCount === 0 && !formHasPatternIdentity) {
      input.issues.push(
        `Conversion/form diversity gate: generic_form_pattern on ${form.id}. Do not reuse the default Имя -> Телефон/Email -> Комментарий card. Pick a real conversion pattern: hero strip, drawer, selector-to-form, proof+form split, inline request, compact CTA or contact rail.`,
      );
    }

    if (bookingFieldsAfterContact) {
      input.issues.push(
        `Conversion/form diversity gate: repeated_form_order on ${form.id}. Booking forms must put date/time/guests or selected option before contact fields, or use a booking strip/selector.`,
      );
    }
  }

  const normalized = input.source
    .toLowerCase()
    .replace(/&nbsp;|\\u00a0/g, " ")
    .replace(/\s+/g, " ");
  const genericBottomContact =
    /(?:меню|услуг|faq|вопрос)[\s\S]{0,2600}(?:быстрая\s+бронь|оставьте\s+заявк|связаться\s+с\s+нами|напишите\s+нам)[\s\S]{0,1400}<form/i.test(normalized);

  if (genericBottomContact && !hasExplicitConversionPattern) {
    input.issues.push(
      "Conversion/form diversity gate: lead form is again a generic bottom section after menu/FAQ. Tie the form to a specific conversion pattern and visitor decision path.",
    );
  }
}

function assertLayoutRiskContracts(input: { elements: WebBrainCodegenElement[]; issues: string[] }) {
  const dangerousFixedLayout = input.elements.filter((element) => {
    const width = numericStyleValue(element.style.width);
    const minWidth = numericStyleValue(element.style.minWidth);
    const left = numericStyleValue(element.style.left);
    const right = numericStyleValue(element.style.right);
    const marginLeft = numericStyleValue(element.style.marginLeft);
    const marginRight = numericStyleValue(element.style.marginRight);

    return width > 1320 || minWidth > 900 || left < -220 || right < -220 || marginLeft < -260 || marginRight < -260;
  });

  if (dangerousFixedLayout.length) {
    input.issues.push(`Obvious overflow risk: fixed/negative layout on ${dangerousFixedLayout.map((element) => element.id).slice(0, 6).join(", ")}.`);
  }
}

function collectElementDescendants(elementId: string, compileResult: WebBrainCodegenCompileResult) {
  const result: WebBrainCodegenElement[] = [];
  const visit = (id: string) => {
    const element = compileResult.elementMap.elements[id];
    if (!element) return;

    for (const childId of element.children) {
      const child = compileResult.elementMap.elements[childId];
      if (!child) continue;
      result.push(child);
      visit(childId);
    }
  };

  visit(elementId);
  return result;
}

function collectElementText(elementId: string, compileResult: WebBrainCodegenCompileResult) {
  const element = compileResult.elementMap.elements[elementId];
  if (!element) return "";

  const parts = [element.text ?? ""];
  for (const descendant of collectElementDescendants(elementId, compileResult)) {
    if (descendant.text) parts.push(descendant.text);
  }

  return compactText(parts.join(" "));
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function extractStaticFormSource(source: string, formId: string) {
  if (formId) {
    const escaped = escapeRegExp(formId);
    const byIdPattern = new RegExp(`<form(?=[\\s\\S]{0,800}data-wb-id=["']${escaped}["'])[\\s\\S]*?<\\/form>`, "i");
    const byId = source.match(byIdPattern)?.[0];
    if (byId) return byId;
  }

  return source.match(/<form\b[\s\S]*?<\/form>/i)?.[0] ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isViewportHeroHeight(value: WebBrainCodegenStyleValue | undefined) {
  if (typeof value === "number") return value >= 680;
  if (typeof value !== "string") return false;

  const normalized = value.toLowerCase().replace(/\s+/g, "");

  return (
    normalized === "100vh" ||
    normalized === "100dvh" ||
    normalized.includes("calc(100vh-") ||
    normalized.includes("calc(100dvh-") ||
    normalized.includes("min(100vh") ||
    normalized.includes("min(100dvh")
  );
}

function navIntent(value: string) {
  const text = value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  if (!text || text.length > 80) return "";
  if (/меню|товар|услуг|каталог|напитк|блюд/.test(text)) return "menu";
  if (/о кофейн|о нас|истор|атмосфер|about|детал/.test(text)) return "about";
  if (/отзыв|review|гост|proof/.test(text)) return "reviews";
  if (/карт|адрес|найти|где|map|контакт|location/.test(text)) return "map";
  if (/брон|столик|запис|заявк|резерв|booking|reservation|заказ/.test(text)) return "booking";
  return "";
}

function hasAncestorTag(element: WebBrainCodegenElement, compileResult: WebBrainCodegenCompileResult, tag: string) {
  let parentId = element.parentId;

  while (parentId) {
    const parent = compileResult.elementMap.elements[parentId];
    if (!parent) return false;
    if (parent.tag === tag) return true;
    parentId = parent.parentId;
  }

  return false;
}

function hasInteractiveDescendant(elementId: string, compileResult: WebBrainCodegenCompileResult) {
  return collectElementDescendants(elementId, compileResult).some((element) => element.tag === "a" || element.tag === "button");
}

function hasStaticTarget(source: string, elementIds: Set<string>, targetId: string) {
  return (
    elementIds.has(targetId) ||
    source.includes(`id="${targetId}"`) ||
    source.includes(`id='${targetId}'`) ||
    source.includes(`data-wb-id="${targetId}"`) ||
    source.includes(`data-wb-id='${targetId}'`)
  );
}

function numericStyleValue(value: WebBrainCodegenStyleValue | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/%|vw|vh|dvw|dvh|fr|auto|fit-content|max-content|min-content|calc|clamp|min|max/i.test(trimmed)) return 0;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
