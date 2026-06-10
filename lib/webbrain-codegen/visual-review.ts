import { z } from "zod";
import { bundleCodegenPreview } from "@/lib/webbrain-codegen/preview-bundler";
import type { WebBrainCodegenElementMap, WebBrainCodegenFile } from "@/lib/webbrain-codegen/types";
import { parseJsonObjectFromText } from "@/lib/webbrain-ai/json";
import type { RawUsage } from "@/lib/webbrain-ai/pricing";

type PlaywrightBrowser = {
  newPage: (options: { viewport: { width: number; height: number }; deviceScaleFactor?: number }) => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};

type PlaywrightPage = {
  setContent: (html: string, options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeout?: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: () => T | Promise<T>) => Promise<T>;
  screenshot: (options: { type: "jpeg"; quality: number; fullPage: boolean }) => Promise<Buffer>;
  close: () => Promise<void>;
};

type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean; args?: string[] }) => Promise<PlaywrightBrowser>;
  };
};

export type WebBrainVisualScreenshot = {
  viewport: "desktop" | "tablet" | "mobile";
  width: number;
  height: number;
  mimeType: "image/jpeg";
  dataUrl: string;
};

export type WebBrainVisualReviewIssue = {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  target: string;
  reason: string;
  fix: string;
};

export type WebBrainVisualReviewResult = {
  score: number;
  decision: "pass" | "repair";
  summary: string;
  issues: WebBrainVisualReviewIssue[];
  skipped?: boolean;
  skippedReason?: string;
};

export type WebBrainLayoutDiagnostic = {
  viewport: "desktop" | "tablet" | "mobile";
  type:
    | "horizontal_overflow"
    | "offscreen_element"
    | "clipped_text"
    | "raw_color_background"
    | "overlapping_elements"
    | "fake_form_field"
    | "dead_nav_control"
    | "missing_anchor_target"
    | "bad_form_structure"
    | "generic_form_pattern"
    | "hero_missing"
    | "hero_missing_h1"
    | "hero_viewport_too_short"
    | "hero_content_too_low"
    | "hero_content_clipped";
  target: string;
  message: string;
};

const visualIssueSchema = z.object({
  type: z.string().min(1).catch("visual_issue"),
  severity: z.enum(["low", "medium", "high", "critical"]).catch("medium"),
  target: z.string().min(1).catch("page"),
  reason: z.string().min(1).catch("Визуальная проблема требует исправления."),
  fix: z.string().min(1).catch("Перестроить композицию более аккуратно."),
});

const visualReviewSchema = z.object({
  score: z.number().min(0).max(100).catch(0),
  decision: z.enum(["pass", "repair"]).catch("repair"),
  summary: z.string().min(1).catch("Visual review completed."),
  issues: z.array(visualIssueSchema).catch([]),
});

export async function captureCodegenVisualScreenshots(input: {
  files: WebBrainCodegenFile[];
  entry: string;
  overlayCss: string;
  signal?: AbortSignal;
}): Promise<{ screenshots: WebBrainVisualScreenshot[]; skippedReason?: string }> {
  const playwright = await importOptionalPlaywright();
  if (!playwright) {
    return { screenshots: [], skippedReason: "Playwright is not installed in this workspace." };
  }

  if (input.signal?.aborted) throw input.signal.reason instanceof Error ? input.signal.reason : new Error("Generation stopped");

  const html = await bundleCodegenPreview({
    files: input.files,
    entry: input.entry,
    overlayCss: input.overlayCss,
  });

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });

  const viewports: Array<Omit<WebBrainVisualScreenshot, "mimeType" | "dataUrl">> = [
    { viewport: "desktop", width: 1440, height: 960 },
    { viewport: "tablet", width: 820, height: 1000 },
    { viewport: "mobile", width: 390, height: 844 },
  ];
  const screenshots: WebBrainVisualScreenshot[] = [];

  try {
    for (const viewport of viewports) {
      if (input.signal?.aborted) throw input.signal.reason instanceof Error ? input.signal.reason : new Error("Generation stopped");

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.viewport === "desktop" ? 1 : 2,
      });

      try {
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(550);
        const image = await page.screenshot({ type: "jpeg", quality: 72, fullPage: false });
        screenshots.push({
          ...viewport,
          mimeType: "image/jpeg",
          dataUrl: `data:image/jpeg;base64,${image.toString("base64")}`,
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return { screenshots };
}

export async function inspectCodegenBrowserLayout(input: {
  files: WebBrainCodegenFile[];
  entry: string;
  overlayCss: string;
  signal?: AbortSignal;
}): Promise<{ diagnostics: WebBrainLayoutDiagnostic[]; skippedReason?: string }> {
  const playwright = await importOptionalPlaywright();
  if (!playwright) {
    return { diagnostics: [], skippedReason: "Playwright is not installed in this workspace." };
  }

  if (input.signal?.aborted) throw input.signal.reason instanceof Error ? input.signal.reason : new Error("Generation stopped");

  const html = await bundleCodegenPreview({
    files: input.files,
    entry: input.entry,
    overlayCss: input.overlayCss,
  });
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  const viewports: Array<{ viewport: WebBrainLayoutDiagnostic["viewport"]; width: number; height: number }> = [
    { viewport: "desktop", width: 1440, height: 960 },
    { viewport: "tablet", width: 820, height: 1000 },
    { viewport: "mobile", width: 390, height: 844 },
  ];
  const diagnostics: WebBrainLayoutDiagnostic[] = [];

  try {
    for (const viewport of viewports) {
      if (input.signal?.aborted) throw input.signal.reason instanceof Error ? input.signal.reason : new Error("Generation stopped");

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.viewport === "desktop" ? 1 : 2,
      });

      try {
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(350);
        const pageDiagnostics = await page.evaluate(() => {
          const result: Array<Omit<WebBrainLayoutDiagnostic, "viewport">> = [];
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
          const meaningfulTags = new Set(["A", "BUTTON", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "IMG", "INPUT", "LABEL", "LI", "NAV", "P", "SECTION", "TEXTAREA"]);
          const meaningfulSelector = [
            "[data-wb-id]",
            "a",
            "button",
            "form",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "img",
            "input",
            "label",
            "li",
            "nav",
            "p",
            "section",
            "textarea",
          ].join(",");

          function cssEscape(value: string) {
            if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
            return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
          }

          function diagnosticTarget(element: HTMLElement) {
            return (
              element.getAttribute("data-wb-id") ||
              element.id ||
              element.getAttribute("aria-label") ||
              (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48) ||
              element.tagName.toLowerCase()
            );
          }

          function normalizeNavText(value: string) {
            return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
          }

          function navIntent(value: string) {
            const text = normalizeNavText(value);
            if (!text || text.length > 48) return "";
            if (/меню|товар|услуг|каталог/.test(text)) return "menu";
            if (/о кофейн|о нас|истор|атмосфер|about/.test(text)) return "about";
            if (/отзыв|review/.test(text)) return "reviews";
            if (/карт|адрес|найти|где|map|контакт/.test(text)) return "map";
            if (/брон|столик|запис|заявк|резерв|booking|reservation/.test(text)) return "booking";
            return "";
          }

          function hasAnchorTarget(hash: string) {
            if (!hash || hash === "#") return false;
            const targetId = decodeURIComponent(hash.slice(1));
            return Boolean(
              document.getElementById(targetId) ||
                document.querySelector('[data-wb-id="' + cssEscape(targetId) + '"]') ||
                document.querySelector('[id="' + cssEscape(targetId) + '"]'),
            );
          }

          function isVisibleElement(element: HTMLElement | null) {
            if (!element) return false;
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.05 && rect.width > 2 && rect.height > 2;
          }

          function firstMeaningfulHero() {
            const explicitHero = document.querySelector<HTMLElement>('[data-wb-id="hero"],[data-wb-id="top"],[data-wb-role*="hero"],[data-wb-pattern*="hero"]');
            if (isVisibleElement(explicitHero)) return explicitHero;

            const sections = Array.from(document.querySelectorAll<HTMLElement>("main section, section")).filter(isVisibleElement);
            return sections[0] ?? null;
          }

          if (documentWidth > viewportWidth + 8) {
            result.push({
              type: "horizontal_overflow",
              target: "document",
              message: `Document width ${documentWidth}px exceeds viewport ${viewportWidth}px.`,
            });
          }

          const hero = firstMeaningfulHero();
          if (!hero) {
            result.push({
              type: "hero_missing",
              target: "hero",
              message: "Hero viewport gate: page has no visible first hero section.",
            });
          } else {
            const heroRect = hero.getBoundingClientRect();
            const h1 = hero.querySelector<HTMLElement>("h1") || document.querySelector<HTMLElement>("h1");
            const cta = hero.querySelector<HTMLElement>("a,button");
            const minHeroHeight = viewportWidth <= 430 ? viewportHeight * 0.66 : viewportHeight * 0.72;
            const heroStartsNearTop = heroRect.top <= Math.max(180, viewportHeight * 0.24);

            if (heroRect.height < minHeroHeight) {
              result.push({
                type: "hero_viewport_too_short",
                target: diagnosticTarget(hero),
                message: `Hero viewport gate: hero height ${Math.round(heroRect.height)}px is too short for first viewport ${viewportHeight}px. Use minHeight calc(100vh - header) or 100dvh.`,
              });
            }

            if (!heroStartsNearTop) {
              result.push({
                type: "hero_content_too_low",
                target: diagnosticTarget(hero),
                message: `Hero viewport gate: first hero starts too low at y=${Math.round(heroRect.top)}px. Header should be followed by hero immediately.`,
              });
            }

            if (h1 && isVisibleElement(h1)) {
              const h1Rect = h1.getBoundingClientRect();
              if (h1Rect.top > viewportHeight * 0.54) {
                result.push({
                  type: "hero_content_too_low",
                  target: diagnosticTarget(h1),
                  message: `Hero viewport gate: H1 starts at y=${Math.round(h1Rect.top)}px, below the first-screen focal area. Reduce top padding and place H1 in the first viewport.`,
                });
              }
              if (h1Rect.bottom > viewportHeight - 12) {
                result.push({
                  type: "hero_content_clipped",
                  target: diagnosticTarget(h1),
                  message: `Hero viewport gate: H1 bottom y=${Math.round(h1Rect.bottom)}px is clipped by viewport ${viewportHeight}px. H1 must be fully readable before scrolling.`,
                });
              }
            } else {
              result.push({
                type: "hero_missing_h1",
                target: diagnosticTarget(hero),
                message: "Hero viewport gate: hero has no visible H1.",
              });
            }

            if (cta && isVisibleElement(cta)) {
              const ctaRect = cta.getBoundingClientRect();
              if (ctaRect.top > viewportHeight - 96 || ctaRect.bottom > viewportHeight + 6) {
                result.push({
                  type: "hero_content_clipped",
                  target: diagnosticTarget(cta),
                  message: `Hero viewport gate: primary CTA is not visible in first viewport (top=${Math.round(ctaRect.top)}, bottom=${Math.round(ctaRect.bottom)}, viewport=${viewportHeight}).`,
                });
              }
            }
          }

          const elements = Array.from(document.querySelectorAll<HTMLElement>(meaningfulSelector));
          const seenElements = new Set<HTMLElement>();
          const visibleElements: Array<{
            element: HTMLElement;
            rect: DOMRect;
            id: string;
            tag: string;
            text: string;
            position: string;
          }> = [];

          for (const element of elements) {
            if (seenElements.has(element)) continue;
            seenElements.add(element);
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const id = diagnosticTarget(element);
            const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.05 && rect.width > 2 && rect.height > 2;

            if (!visible) continue;
            visibleElements.push({
              element,
              rect,
              id,
              tag: element.tagName.toLowerCase(),
              text: (element.textContent || "").replace(/\s+/g, " ").trim(),
              position: style.position || "static",
            });

            const isMeaningful = meaningfulTags.has(element.tagName) || element.matches("a *,button *,form *,label *,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,p *");
            if (isMeaningful && (rect.left < -10 || rect.right > viewportWidth + 10)) {
              result.push({
                type: "offscreen_element",
                target: id,
                message: `${element.tagName.toLowerCase()} is outside viewport: left=${Math.round(rect.left)}, right=${Math.round(rect.right)}, viewport=${viewportWidth}.`,
              });
            }

            const hasText = (element.textContent || "").trim().length > 2;
            const clipsOverflow = style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden" || style.overflow === "clip";
            if (hasText && clipsOverflow && (element.scrollWidth > element.clientWidth + 4 || element.scrollHeight > element.clientHeight + 4)) {
              result.push({
                type: "clipped_text",
                target: id,
                message: `${element.tagName.toLowerCase()} clips text: scroll=${element.scrollWidth}x${element.scrollHeight}, client=${element.clientWidth}x${element.clientHeight}.`,
              });
            }

            // Raw, saturated background colour (pure red/green/blue/…) on a sizeable block is
            // almost always a broken placeholder — e.g. the red rectangle behind a missing
            // image. Read the REAL computed background so this catches what actually rendered.
            if (rect.width >= 200 && rect.height >= 160) {
              const bg = style.backgroundColor || "";
              const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(bg);
              if (rgb) {
                const r = Number(rgb[1]);
                const g = Number(rgb[2]);
                const b = Number(rgb[3]);
                const alpha = rgb[4] != null ? Number(rgb[4]) : 1;
                if (alpha >= 0.5 && Math.max(r, g, b) >= 230 && Math.min(r, g, b) <= 40) {
                  result.push({
                    type: "raw_color_background",
                    target: id,
                    message: `${element.tagName.toLowerCase()} uses a raw saturated background rgb(${r}, ${g}, ${b}) on a ${Math.round(rect.width)}x${Math.round(rect.height)} block — looks like a broken placeholder. Use brand/theme colours or a real image, never a pure primary fill.`,
                  });
                }
              }
            }
          }

          function isAncestorOrDescendant(a: HTMLElement, b: HTMLElement) {
            return a.contains(b) || b.contains(a);
          }

          function isInFlow(position: string) {
            return position === "static" || position === "relative";
          }

          function hasMeaningfulOverlapText(item: { tag: string; text: string }) {
            return item.text.length > 2 || ["a", "button", "form", "h1", "h2", "h3", "h4", "h5", "h6", "img", "input", "textarea"].includes(item.tag);
          }

          const overlapChecks = visibleElements
            .filter((item) => isInFlow(item.position) && hasMeaningfulOverlapText(item))
            .slice(0, 180);

          for (let i = 0; i < overlapChecks.length; i += 1) {
            for (let j = i + 1; j < overlapChecks.length; j += 1) {
              const a = overlapChecks[i];
              const b = overlapChecks[j];
              if (!a || !b) continue;
              if (isAncestorOrDescendant(a.element, b.element)) continue;

              const left = Math.max(a.rect.left, b.rect.left);
              const right = Math.min(a.rect.right, b.rect.right);
              const top = Math.max(a.rect.top, b.rect.top);
              const bottom = Math.min(a.rect.bottom, b.rect.bottom);
              const width = right - left;
              const height = bottom - top;
              if (width <= 4 || height <= 4) continue;

              const overlapArea = width * height;
              const aArea = Math.max(1, a.rect.width * a.rect.height);
              const bArea = Math.max(1, b.rect.width * b.rect.height);
              const smallerArea = Math.min(aArea, bArea);
              const significantArea = Math.min(220, Math.max(48, smallerArea * 0.1));
              if (overlapArea < significantArea) continue;

              result.push({
                type: "overlapping_elements",
                target: `${a.id} / ${b.id}`,
                message: `Visible in-flow elements overlap by ${Math.round(width)}x${Math.round(height)}px. Use real gap, auto rows, padding, or one-column responsive layout instead of stacking content on top of content.`,
              });

              if (result.filter((diagnostic) => diagnostic.type === "overlapping_elements").length >= 8) break;
            }

            if (result.filter((diagnostic) => diagnostic.type === "overlapping_elements").length >= 8) break;
          }

          document.querySelectorAll<HTMLElement>("form [data-wb-id]").forEach((element) => {
            const text = (element.textContent || "").trim();
            if (!text) return;
            if (/^(имя|телефон|email|почта|дата|время|комментарий|назначение визита)$/i.test(text) && !element.matches("label,input,textarea,button")) {
              result.push({
                type: "fake_form_field",
                target: element.getAttribute("data-wb-id") || element.id || element.tagName.toLowerCase(),
                message: `Form field "${text}" is plain text instead of label/input/textarea.`,
              });
            }
          });

          document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
            const href = anchor.getAttribute("href") || "";
            if (href && href !== "#" && !hasAnchorTarget(href)) {
              result.push({
                type: "missing_anchor_target",
                target: diagnosticTarget(anchor),
                message: `Anchor ${href} has no matching section target.`,
              });
            }
          });

          document
            .querySelectorAll<HTMLElement>("header a, header button, header [role='button'], header span, header p, header li, header div, nav a, nav button, nav [role='button'], nav span, nav p, nav li, nav div")
            .forEach((control) => {
              if (control.closest("a,button,[role='button']") && !control.matches("a,button,[role='button']")) return;
              if (!control.matches("a,button,[role='button']") && control.querySelector("a,button,[role='button']")) return;
              const label = control.getAttribute("aria-label") || control.textContent || "";
              const intent = navIntent(label);
              if (!intent) return;
              const href = control.matches("a") ? control.getAttribute("href") || "" : "";
              const hasClickHandler = typeof control.onclick === "function";
              if (!control.matches("a")) {
                result.push({
                  type: "dead_nav_control",
                  target: diagnosticTarget(control),
                  message: `Header/nav item "${normalizeNavText(label)}" is ${control.tagName.toLowerCase()}, not a real <a href="#section"> link.`,
                });
                return;
              }
              if (href === "#") {
                result.push({
                  type: "dead_nav_control",
                  target: diagnosticTarget(control),
                  message: `Header/nav item "${normalizeNavText(label)}" uses href="#" instead of a real section target.`,
                });
                return;
              }
              if (href.startsWith("#") && hasAnchorTarget(href)) return;
              if (hasClickHandler) return;
              result.push({
                type: "dead_nav_control",
                target: diagnosticTarget(control),
                message: `Header/nav item "${normalizeNavText(label)}" is not connected to a real section.`,
              });
            });

          document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
            const id = diagnosticTarget(form);
            const fields = form.querySelectorAll("input,textarea,select");
            const submit = form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
            const formText = (form.textContent || "").toLowerCase().replace(/\s+/g, " ");
            const formIdentity = [
              id,
              form.getAttribute("data-wb-id") || "",
              form.getAttribute("data-wb-pattern") || "",
              form.getAttribute("data-wb-role") || "",
              form.closest("[data-wb-id]")?.getAttribute("data-wb-id") || "",
              form.closest("[data-wb-pattern]")?.getAttribute("data-wb-pattern") || "",
              form.closest("[data-wb-role]")?.getAttribute("data-wb-role") || "",
            ].join(" ").toLowerCase();
            const labelsAndPlaceholders = Array.from(fields)
              .map((field) => {
                const element = field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                const label = element.closest("label")?.textContent || "";
                return `${label} ${element.getAttribute("placeholder") || ""} ${element.getAttribute("name") || ""}`;
              })
              .join(" ")
              .toLowerCase()
              .replace(/\s+/g, " ");
            const combinedFormText = `${formText} ${labelsAndPlaceholders}`;
            const nameIndex = combinedFormText.search(/имя|как\s+к\s+вам\s+обращ/);
            const phoneIndex = combinedFormText.search(/телефон|\+7|phone|tel/);
            const emailIndex = combinedFormText.search(/email|почт/);
            const commentIndex = combinedFormText.search(/комментар|пожелан|сообщен|вопрос/);
            const scenarioIndex = combinedFormText.search(/дата|время|гост|персон|человек|select|вариант|формат|услуг|меню|позици|пакет|выбор|способ\s+связи|канал/);
            const hasPatternIdentity = /strip|drawer|rail|selector|split|inline|compact|context|booking|reservation|floating|action/.test(formIdentity);
            const plainContactOrder =
              nameIndex >= 0 &&
              (phoneIndex > nameIndex || emailIndex > nameIndex) &&
              commentIndex > Math.max(phoneIndex, emailIndex);

            if (!fields.length) {
              result.push({
                type: "bad_form_structure",
                target: id,
                message: "Form has no input/textarea/select fields.",
              });
            }
            if (!submit) {
              result.push({
                type: "bad_form_structure",
                target: id,
                message: "Form has no submit button.",
              });
            }
            fields.forEach((field) => {
              const rect = field.getBoundingClientRect();
              const style = window.getComputedStyle(field);
              const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.05;
              if (!visible || rect.width < 120 || rect.height < 30) {
                result.push({
                  type: "bad_form_structure",
                  target: diagnosticTarget(field as HTMLElement),
                  message: `Form field is not visibly styled as an input: ${Math.round(rect.width)}x${Math.round(rect.height)}.`,
                });
              }
            });

            if (plainContactOrder && scenarioIndex < 0 && !hasPatternIdentity) {
              result.push({
                type: "generic_form_pattern",
                target: id,
                message: "Conversion/form diversity gate: form repeats the default Имя -> Телефон/Email -> Комментарий flow without a specific conversion pattern.",
              });
            }
          });

          return result;
        });

        diagnostics.push(...pageDiagnostics.map((diagnostic) => ({ ...diagnostic, viewport: viewport.viewport })));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return { diagnostics };
}

export async function reviewCodegenVisualDesign(input: {
  apiKey: string;
  baseURL: string;
  modelId: string;
  httpReferer: string;
  appTitle: string;
  prompt: string;
  elementMap: WebBrainCodegenElementMap;
  screenshots: WebBrainVisualScreenshot[];
  onUsage?: (usage: RawUsage | null | undefined, realCostUsd?: number) => void;
  signal?: AbortSignal;
}) {
  if (!input.screenshots.length) {
    return {
      score: 0,
      decision: "pass",
      summary: "Visual review skipped: screenshots were not available.",
      issues: [],
      skipped: true,
      skippedReason: "screenshots_not_available",
    } satisfies WebBrainVisualReviewResult;
  }

  const compactElements = Object.values(input.elementMap.elements)
    .slice(0, 90)
    .map((element) => ({
      id: element.id,
      tag: element.tag,
      primitive: element.primitive,
      text: element.text?.slice(0, 90),
      style: pickVisualStyleHints(element.style),
    }));

  const response = await fetch(`${input.baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
      "HTTP-Referer": input.httpReferer,
      "X-Title": input.appTitle,
    },
    body: JSON.stringify({
      model: input.modelId,
      temperature: 0.12,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are WebBrain visual QA. You judge screenshots like a senior art director and return strict JSON only. No Markdown.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Оцени сайт визуально по скриншотам. Верни только JSON:",
                "{",
                "  \"score\": 0-100,",
                "  \"decision\": \"pass\" | \"repair\",",
                "  \"summary\": \"коротко\",",
                "  \"issues\": [{ \"type\": \"...\", \"severity\": \"low|medium|high|critical\", \"target\": \"data-wb-id или section\", \"reason\": \"...\", \"fix\": \"конкретная правка\" }]",
                "}",
                "",
                "Критерии:",
                "- repair если сайт выглядит шаблонно, плоско, как список блоков без композиции.",
                "- repair если сайт повторяет типовой маршрут: hero -> преимущества/why us -> меню/услуги -> процесс/how it works -> контакты/форма.",
                "- repair если навигация и секции выглядят как универсальный набор Услуги / Процесс / Контакты без конкретного сценария бизнеса.",
                "- repair если отличия от обычного шаблона только в цвете, фото или тексте, а архитектура секций и расположение блоков стандартные.",
                "- repair если proof/benefits секция сделана плоским списком 01/02/03 без визуального якоря, depth, media, reveal, comparison или другой композиционной идеи.",
                "- repair если первый экран слабый, нет визуального центра, плохой rhythm/spacing, слишком пусто или все секции одинаковые.",
                "- repair если hero/первый экран не занимает viewport, H1 или CTA обрезаются первым экраном, H1 начинается слишком низко, или сверху есть огромная пустая зона.",
                "- repair если форма заявки снова выглядит как отдельная стандартная карточка с порядком Имя -> Телефон -> Комментарий без сценария conversion pattern.",
                "- repair если заявка всегда стоит нижней секцией после меню/FAQ и не связана с путем посетителя, выбранной услугой, бронью, proof или first viewport.",
                "- repair если разные сайты визуально собираются в один и тот же порядок блоков; требуй другой section rhythm, другой conversion placement и другой visual anchor.",
                "- repair если мобильный вид ломает иерархию, текст огромный, элементы пересекаются или CTA теряется.",
                "- pass только если дизайн выглядит цельным, дорогим, профессиональным и пригодным к показу клиенту.",
                "- Не придирайся к мелочам, но жестко блокируй шаблонный/дешевый результат.",
                "",
                "Задача пользователя:",
                input.prompt,
                "",
                "Element map hints:",
                JSON.stringify(compactElements),
              ].join("\n"),
            },
            ...input.screenshots.map((screenshot) => ({
              type: "image_url",
              image_url: {
                url: screenshot.dataUrl,
                detail: screenshot.viewport === "desktop" ? "high" : "low",
              },
            })),
          ],
        },
      ],
    }),
    signal: input.signal,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Visual review failed: ${response.status} ${text.slice(0, 500)}`);
  }

  const payload = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: RawUsage;
    providerMetadata?: Record<string, unknown>;
    experimental_providerMetadata?: Record<string, unknown>;
  };
  input.onUsage?.(payload.usage ?? null, extractVisualReviewCostUsd(payload));
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonObjectFromText(content, visualReviewSchema);
  const blockingIssues = parsed.issues.filter((issue) => issue.severity === "high" || issue.severity === "critical");

  return {
    ...parsed,
    decision: parsed.decision === "repair" || parsed.score < 78 || blockingIssues.length > 0 ? "repair" : "pass",
  } satisfies WebBrainVisualReviewResult;
}

function extractVisualReviewCostUsd(payload: Record<string, unknown>): number | undefined {
  const candidates = [
    readObjectPath(payload, ["usage", "cost"]),
    readObjectPath(payload, ["usage", "costUSD"]),
    readObjectPath(payload, ["usage", "total_cost"]),
    readObjectPath(payload, ["providerMetadata", "openrouter", "usage", "cost"]),
    readObjectPath(payload, ["providerMetadata", "openrouter", "cost"]),
    readObjectPath(payload, ["experimental_providerMetadata", "openrouter", "usage", "cost"]),
    readObjectPath(payload, ["experimental_providerMetadata", "openrouter", "cost"]),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) return candidate;
  }

  return undefined;
}

function readObjectPath(value: unknown, path: string[]) {
  let current = value;

  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function pickVisualStyleHints(style: Record<string, unknown>) {
  const keys = [
    "display",
    "position",
    "gridTemplateColumns",
    "gap",
    "padding",
    "marginTop",
    "minHeight",
    "fontSize",
    "background",
    "borderRadius",
    "boxShadow",
    "transform",
    "overflow",
    "zIndex",
  ];
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    if (style[key] !== undefined && style[key] !== null && String(style[key]).trim() !== "") {
      result[key] = style[key];
    }
  }

  return result;
}

async function importOptionalPlaywright(): Promise<PlaywrightModule | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}
