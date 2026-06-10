import * as esbuild from "esbuild";
import type { WebBrainCodegenFile } from "@/lib/webbrain-codegen/types";

export type WebBrainCodegenPreviewInput = {
  files: WebBrainCodegenFile[];
  entry: string;
  overlayCss?: string;
};

const ENTRY_WRAPPER = "__webbrain_preview_entry.tsx";

export async function bundleCodegenPreview(input: WebBrainCodegenPreviewInput) {
  const fileMap = new Map(input.files.map((file) => [normalizePath(file.path), file.content]));
  const entry = normalizePath(input.entry || input.files[0]?.path || "src/App.tsx");

  if (!fileMap.has(entry)) {
    throw new Error(`Code-gen entry file ${entry} was not found.`);
  }

  const result = await esbuild.build({
    entryPoints: [ENTRY_WRAPPER],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "Fragment",
    logLevel: "silent",
    plugins: [virtualFilesPlugin(fileMap, entry)],
  });
  const js = result.outputFiles[0]?.text ?? "";

  return renderPreviewHtml(js, input.overlayCss ?? "");
}

function virtualFilesPlugin(fileMap: Map<string, string>, appEntry: string): esbuild.Plugin {
  return {
    name: "webbrain-codegen-virtual-files",
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${escapeRegExp(ENTRY_WRAPPER)}$`) }, () => ({
        path: ENTRY_WRAPPER,
        namespace: "webbrain-codegen",
      }));

      build.onResolve({ filter: /^\.+\//, namespace: "webbrain-codegen" }, (args) => ({
        path: normalizePath(resolveRelativePath(args.importer, args.path)),
        namespace: "webbrain-codegen",
      }));

      build.onLoad({ filter: /.*/, namespace: "webbrain-codegen" }, (args) => {
        if (args.path === ENTRY_WRAPPER) {
          return {
            loader: "tsx",
            contents: [
              `import App from './${appEntry}';`,
              "const Fragment = ({ children }) => Array.isArray(children) ? children : [children];",
              "function h(tag, props, ...children) {",
              "  if (typeof tag === 'function') return tag({ ...(props || {}), children });",
              "  const element = document.createElement(tag);",
              "  const nextProps = props || {};",
              "  for (const key of Object.keys(nextProps)) {",
              "    const value = nextProps[key];",
              "    if (value == null || value === false) continue;",
              "    if (key === 'children') continue;",
              "    if (key === 'className') { element.setAttribute('class', String(value)); continue; }",
              "    if (key === 'style' && typeof value === 'object') { applyStyle(element, value); continue; }",
              "    if (key.startsWith('on') && typeof value === 'function') { element.addEventListener(key.slice(2).toLowerCase(), value); continue; }",
              "    if (value === true) element.setAttribute(key, '');",
              "    else element.setAttribute(key, String(value));",
              "  }",
              "  appendChildren(element, children);",
              "  return element;",
              "}",
              "function appendChildren(parent, children) {",
              "  for (const child of children.flat(Infinity)) {",
              "    if (child == null || child === false || child === true) continue;",
              "    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));",
              "  }",
              "}",
              "function applyStyle(element, style) {",
              "  const unitless = new Set(['opacity','zIndex','fontWeight','lineHeight','flex','flexGrow','flexShrink','order']);",
              "  for (const key of Object.keys(style)) {",
              "    const value = style[key];",
              "    if (value == null) continue;",
              "    element.style[key] = typeof value === 'number' && !unitless.has(key) ? `${value}px` : String(value);",
              "  }",
              "}",
              // The JSX factory `h`/`Fragment` are defined in this entry module, but the
              // generated App.tsx is a SEPARATE bundled module and its compiled JSX calls a
              // free `h(...)`. Expose them on globalThis so every module resolves them.
              "globalThis.h = h;",
              "globalThis.Fragment = Fragment;",
              "const root = document.getElementById('webbrain-root');",
              "if (!root) throw new Error('WebBrain preview root was not found');",
              "root.replaceChildren(App());",
              "initializeWebBrainGeneratedSite(root);",
              "initializeWebBrainPrimitives(root);",
              "function initializeWebBrainGeneratedSite(rootElement) {",
              "  var usedIds = new Set();",
              "  rootElement.querySelectorAll('[data-wb-id]').forEach(function (element) {",
              "    var rawId = String(element.getAttribute('data-wb-id') || '').trim();",
              "    if (!rawId) return;",
              "    var safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-');",
              "    if (!safeId) return;",
              "    var nextId = safeId;",
              "    var index = 2;",
              "    while (usedIds.has(nextId) || (document.getElementById(nextId) && document.getElementById(nextId) !== element)) {",
              "      nextId = safeId + '-' + index;",
              "      index += 1;",
              "    }",
              "    usedIds.add(nextId);",
              "    if (!element.id) element.id = nextId;",
              "  });",
              "  rootElement.querySelectorAll('a[href^=\"#\"]').forEach(function (link) {",
              "    link.addEventListener('click', function (event) {",
              "      var href = link.getAttribute('href') || '';",
              "      if (href === '#') return;",
              "      var targetId = decodeURIComponent(href.slice(1));",
              "      var target = findWebBrainHashTarget(rootElement, targetId);",
              "      if (!target) return;",
              "      event.preventDefault();",
              "      target.scrollIntoView({ behavior: 'smooth', block: 'start' });",
              "    });",
              "  });",
              "  setupSmartWebBrainNavigation(rootElement);",
              "  rootElement.querySelectorAll('form').forEach(function (form) {",
              "    form.addEventListener('submit', function (event) {",
              "      event.preventDefault();",
              "      form.setAttribute('data-wb-submit-state', 'sent');",
              "      form.dispatchEvent(new CustomEvent('webbrain:action', { bubbles: true, detail: { action: form.getAttribute('data-webbrain-action') || form.getAttribute('data-wb-action') || 'lead_submit', values: Object.fromEntries(new FormData(form).entries()) } }));",
              "      var submit = form.querySelector('[type=\"submit\"],button:not([type]),button[type=\"button\"]');",
              "      if (submit && !submit.getAttribute('data-wb-original-label')) {",
              "        submit.setAttribute('data-wb-original-label', submit.textContent || '');",
              "        submit.textContent = 'Заявка отправлена';",
              "      }",
              "    });",
              "  });",
              "}",
              "function cssEscape(value) {",
              "  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);",
              "  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');",
              "}",
              "function findWebBrainHashTarget(rootElement, targetId) {",
              "  return document.getElementById(targetId) || rootElement.querySelector('[data-wb-id=\"' + cssEscape(targetId) + '\"]') || rootElement.querySelector('[id=\"' + cssEscape(targetId) + '\"]');",
              "}",
              "function findSmartWebBrainHashTarget(rootElement, targetId) {",
              "  var target = findWebBrainHashTarget(rootElement, targetId);",
              "  if (target) return { id: targetId, element: target };",
              "  var fallbacks = {",
              "    booking: ['reservation', 'reserve', 'contact', 'lead', 'form'],",
              "    reviews: ['testimonials', 'proof'],",
              "    map: ['location', 'contacts', 'contact'],",
              "    about: ['story', 'atmosphere', 'details'],",
              "    menu: ['catalog', 'products', 'services']",
              "  };",
              "  var ids = fallbacks[targetId] || [];",
              "  for (var i = 0; i < ids.length; i += 1) {",
              "    var fallbackTarget = findWebBrainHashTarget(rootElement, ids[i]);",
              "    if (fallbackTarget) return { id: ids[i], element: fallbackTarget };",
              "  }",
              "  var sectionTarget = findWebBrainSectionByIntent(rootElement, targetId);",
              "  if (sectionTarget) return { id: sectionTarget.getAttribute('data-wb-id') || sectionTarget.id || targetId, element: sectionTarget };",
              "  return null;",
              "}",
              "function normalizeNavText(value) {",
              "  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\\s+/g, ' ').trim();",
              "}",
              "function inferWebBrainTargetId(label) {",
              "  var text = normalizeNavText(label);",
              "  if (!text) return '';",
              "  if (/меню|товар|услуг|каталог/.test(text)) return 'menu';",
              "  if (/о кофейн|о нас|истор|атмосфер|about/.test(text)) return 'about';",
              "  if (/отзыв|review/.test(text)) return 'reviews';",
              "  if (/карт|адрес|найти|где|map|контакт/.test(text)) return 'map';",
              "  if (/брон|столик|запис|заявк|резерв|booking|reservation/.test(text)) return 'booking';",
              "  return '';",
              "}",
              "function findWebBrainSectionByIntent(rootElement, targetId) {",
              "  var sections = Array.prototype.slice.call(rootElement.querySelectorAll('section,form,footer'));",
              "  var patterns = {",
              "    menu: /меню|товар|услуг|каталог/i,",
              "    about: /о кофейн|о нас|истор|атмосфер|детал/i,",
              "    reviews: /отзыв|гост|review|proof/i,",
              "    map: /карт|адрес|найти|где|контакт/i,",
              "    booking: /брон|столик|запис|заявк|резерв/i",
              "  };",
              "  var pattern = patterns[targetId];",
              "  if (!pattern) return null;",
              "  for (var i = 0; i < sections.length; i += 1) {",
              "    var text = normalizeNavText(sections[i].textContent || '');",
              "    if (pattern.test(text)) return sections[i];",
              "  }",
              "  return null;",
              "}",
              "function setupSmartWebBrainNavigation(rootElement) {",
              "  var controls = new Set();",
              "  rootElement.querySelectorAll('button:not([type=\"submit\"]), [role=\"button\"], a[href=\"#\"]').forEach(function (control) { controls.add(control); });",
              "  rootElement.querySelectorAll('header a, header span, header p, header li, header div, nav a, nav span, nav p, nav li, nav div').forEach(function (control) {",
              "    if (control.closest('a,button,[role=\"button\"]') && !control.matches('a,button,[role=\"button\"]')) return;",
              "    var text = normalizeNavText(control.textContent || control.getAttribute('aria-label') || '');",
              "    if (!text || text.length > 42) return;",
              "    if (inferWebBrainTargetId(text)) controls.add(control);",
              "  });",
              "  controls.forEach(function (control) {",
              "    var explicitTarget = String(control.getAttribute('data-wb-target') || control.getAttribute('data-webbrain-target') || '').replace(/^#/, '');",
              "    var targetId = explicitTarget || inferWebBrainTargetId(control.textContent || control.getAttribute('aria-label') || '');",
              "    if (!targetId) return;",
              "    var resolvedTarget = findSmartWebBrainHashTarget(rootElement, targetId);",
              "    if (!resolvedTarget) return;",
              "    control.setAttribute('data-wb-nav-target', resolvedTarget.id);",
              "    if (!/^(a|button)$/i.test(control.tagName) && !control.getAttribute('role')) control.setAttribute('role', 'button');",
              "    if (!/^(a|button)$/i.test(control.tagName) && !control.getAttribute('tabindex')) control.setAttribute('tabindex', '0');",
              "    if (!/^(a|button)$/i.test(control.tagName)) control.style.cursor = control.style.cursor || 'pointer';",
              "    control.addEventListener('click', function (event) {",
              "      var currentTargetId = control.getAttribute('data-wb-nav-target') || targetId;",
              "      var currentTarget = findWebBrainHashTarget(rootElement, currentTargetId);",
              "      if (!currentTarget) return;",
              "      event.preventDefault();",
              "      currentTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });",
              "    });",
              "    control.addEventListener('keydown', function (event) {",
              "      if (event.key !== 'Enter' && event.key !== ' ') return;",
              "      event.preventDefault();",
              "      control.click();",
              "    });",
              "  });",
              "}",
              "function initializeWebBrainPrimitives(rootElement) {",
              "  rootElement.querySelectorAll('[data-wb-settings-schema]').forEach(function (element) { applySettingsCssVariables(element); });",
              "  window.addEventListener('resize', function () { rootElement.querySelectorAll('[data-wb-settings-schema]').forEach(function (element) { applySettingsCssVariables(element); }); });",
              "  rootElement.querySelectorAll('[data-wb-primitive]').forEach(function (element) {",
              "    var primitive = element.getAttribute('data-wb-primitive');",
              "    if (primitive === 'reveal' || primitive === 'drawer' || primitive === 'hover-expand') setupRevealPrimitive(element);",
              "    if (primitive === 'accordion') setupAccordionPrimitive(element);",
              "  });",
              "}",
              "function readSettings(element) {",
              "  var base = {};",
              "  var scoped = {};",
              "  try { base = JSON.parse(element.getAttribute('data-wb-settings') || '{}') || {}; } catch (error) { base = {}; }",
              "  var attr = window.innerWidth <= 767 ? 'data-wb-settings-mobile' : window.innerWidth <= 1023 ? 'data-wb-settings-tablet' : '';",
              "  if (attr) { try { scoped = JSON.parse(element.getAttribute(attr) || '{}') || {}; } catch (error) { scoped = {}; } }",
              "  return Object.assign({}, base, scoped);",
              "}",
              "function readSettingsSchema(element) {",
              "  try { var schema = JSON.parse(element.getAttribute('data-wb-settings-schema') || '[]'); return Array.isArray(schema) ? schema : []; } catch (error) { return []; }",
              "}",
              "function applySettingsCssVariables(element) {",
              "  var settings = readSettings(element);",
              "  var schema = readSettingsSchema(element);",
              "  schema.forEach(function (field) {",
              "    if (!field || typeof field.cssVar !== 'string' || !field.cssVar.startsWith('--')) return;",
              "    var value = Object.prototype.hasOwnProperty.call(settings, field.key) ? settings[field.key] : field.default;",
              "    if (value == null || value === '') { element.style.removeProperty(field.cssVar); return; }",
              "    element.style.setProperty(field.cssVar, formatSettingCssValue(value, field));",
              "  });",
              "}",
              "function formatSettingCssValue(value, field) {",
              "  if (typeof value === 'boolean') return value ? '1' : '0';",
              "  if (typeof value === 'number') return String(value) + (field.cssUnit || '');",
              "  return String(value).replace(/[;\\n\\r]/g, ' ');",
              "}",
              "function setupRevealPrimitive(element) {",
              "  var settings = readSettings(element);",
              "  var trigger = element.querySelector('[data-wb-role=\"reveal-trigger\"]') || element.querySelector('button');",
              "  var content = element.querySelector('[data-wb-role=\"reveal-content\"]') || element.querySelector('[data-wb-role=\"drawer-content\"]');",
              "  if (!trigger || !content) return;",
              "  var open = Boolean(settings.openByDefault);",
              "  var closedHeight = Number(settings.closedHeight || 0);",
              "  var openHeight = Number(settings.openHeight || 0);",
              "  var duration = Number(settings.duration || 520);",
              "  var easing = String(settings.easing || 'cubic-bezier(.22,1,.36,1)');",
              "  content.style.overflow = 'hidden';",
              "  content.style.transition = ['max-height ' + duration + 'ms ' + easing, 'opacity ' + Math.round(duration * 0.72) + 'ms ease', 'transform ' + duration + 'ms ' + easing].join(', ');",
              "  function sync() {",
              "    element.setAttribute('data-wb-open', open ? 'true' : 'false');",
              "    content.style.maxHeight = open ? (openHeight > 0 ? openHeight + 'px' : content.scrollHeight + 'px') : (closedHeight > 0 ? closedHeight + 'px' : '0px');",
              "    content.style.opacity = open ? '1' : String(settings.closedOpacity == null ? 0.18 : settings.closedOpacity);",
              "    content.style.transform = open ? 'translateY(0px)' : 'translateY(' + Number(settings.closedOffsetY || 10) + 'px)';",
              "    if (trigger.tagName.toLowerCase() === 'button') trigger.setAttribute('aria-expanded', open ? 'true' : 'false');",
              "  }",
              "  sync();",
              "  trigger.addEventListener('click', function (event) {",
              "    open = !open;",
              "    sync();",
              "    event.preventDefault();",
              "  });",
              "}",
              "function setupAccordionPrimitive(element) {",
              "  var settings = readSettings(element);",
              "  var items = Array.prototype.slice.call(element.querySelectorAll('[data-wb-role=\"accordion-item\"]'));",
              "  items.forEach(function (item, index) {",
              "    var trigger = item.querySelector('[data-wb-role=\"accordion-trigger\"]') || item.querySelector('button');",
              "    var panel = item.querySelector('[data-wb-role=\"accordion-panel\"]');",
              "    if (!trigger || !panel) return;",
              "    var open = index === Number(settings.defaultOpen || 0);",
              "    panel.style.overflow = 'hidden';",
              "    panel.style.transition = 'max-height 420ms cubic-bezier(.22,1,.36,1), opacity 260ms ease';",
              "    function syncItem() {",
              "      item.setAttribute('data-wb-open', open ? 'true' : 'false');",
              "      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';",
              "      panel.style.opacity = open ? '1' : '0';",
              "      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');",
              "    }",
              "    syncItem();",
              "    trigger.addEventListener('click', function (event) {",
              "      open = !open;",
              "      syncItem();",
              "      event.preventDefault();",
              "    });",
              "  });",
              "}",
            ].join("\n"),
            resolveDir: "/",
          };
        }

        const contents = fileMap.get(args.path);

        if (contents == null) {
          throw new Error(`Code-gen file ${args.path} was not found.`);
        }

        return {
          loader: loaderForPath(args.path),
          contents,
          resolveDir: "/",
        };
      });
    },
  };
}

function renderPreviewHtml(js: string, overlayCss: string) {
  return [
    "<!doctype html>",
    '<html lang="ru">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<style>",
    "*{box-sizing:border-box}",
    "html,body,#webbrain-root{min-height:100%;margin:0}",
    "html{overflow-x:hidden;scroll-behavior:smooth}",
    "body{overflow-x:clip;background:#050605;color:#fff;font-family:Inter,Arial,sans-serif}",
    "img,video,canvas,svg{max-width:100%}",
    "img{height:auto;display:block}",
    "main,section,header,footer,nav,div,form,article,aside{min-width:0}",
    "[data-wb-id]{max-width:100%}",
    "h1,h2,h3,h4,h5,h6,p,a,button,label,li,span,input,textarea{overflow-wrap:anywhere}",
    "a,button{touch-action:manipulation}",
    "button,input,textarea{font:inherit}",
    "input,textarea{max-width:100%;min-width:0}",
    "@media(max-width:767px){section,header,footer,nav,form,[data-wb-id]{max-width:100%;overflow-x:clip}h1,h2,h3{max-width:100%}}",
    overlayCss,
    "</style>",
    "</head>",
    "<body>",
    '<div id="webbrain-root"></div>',
    "<script>",
    js,
    "</script>",
    "<script>",
    buildSelectionBridgeScript(),
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function buildSelectionBridgeScript() {
  return `
(function () {
  function rectFor(element) {
    var rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      label: element.tagName.toLowerCase(),
      componentId: element.getAttribute("data-wb-id") || "",
      componentType: element.tagName.toLowerCase()
    };
  }

  function editableFrom(target) {
    if (!target || !target.closest) return null;
    return target.closest("[data-wb-id]");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function findSelectableElement(componentId) {
    if (!componentId) return null;
    return document.querySelector('[data-wb-id="' + cssEscape(componentId) + '"]') || document.getElementById(componentId);
  }

  function scrollToHash(hash) {
    if (!hash || hash === "#") return false;
    var targetId = decodeURIComponent(String(hash).slice(1));
    var target = findSelectableElement(targetId);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
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
      var selectedElement = findSelectableElement(String(data.componentId || ""));
      if (!selectedElement) return;

      selectedElement.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(function () {
        window.parent.postMessage({ type: "webbrain:component-selected", selection: rectFor(selectedElement) }, "*");
      }, 220);
    }
  });

  document.addEventListener("click", function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (link && scrollToHash(link.getAttribute("href") || "")) {
      event.preventDefault();
      return;
    }

    if (event.target && event.target.closest && event.target.closest('button,[type="submit"]')) {
      return;
    }

    if (event.target && event.target.closest && event.target.closest('[data-wb-nav-target]')) {
      return;
    }

    var element = editableFrom(event.target);
    if (!element) return;

    if (event.target && event.target.closest && event.target.closest('[data-wb-role="reveal-trigger"],[data-wb-role="drawer-trigger"],[data-wb-role="accordion-trigger"]')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({ type: "webbrain:component-selected", selection: rectFor(element) }, "*");
  }, true);

  document.addEventListener("mousemove", function (event) {
    var element = editableFrom(event.target);
    if (!element) {
      window.parent.postMessage({ type: "webbrain:component-hover-cleared" }, "*");
      return;
    }

    window.parent.postMessage({ type: "webbrain:component-hovered", selection: rectFor(element) }, "*");
  }, true);
})();`;
}

function loaderForPath(path: string): esbuild.Loader {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".css")) return "css";

  return "tsx";
}

function resolveRelativePath(importer: string, relativePath: string) {
  const importerParts = importer.split("/");
  importerParts.pop();

  for (const part of relativePath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      importerParts.pop();
      continue;
    }

    importerParts.push(part);
  }

  const joined = importerParts.join("/");

  if (joined.match(/\.[cm]?[tj]sx?$/)) return joined;

  return `${joined}.tsx`;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
