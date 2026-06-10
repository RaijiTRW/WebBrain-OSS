import {
  componentInspectorSchemas,
  type InspectorControl,
  type WebBrainComponent,
  type WebBrainComponentType,
  type WebBrainDocument,
} from "@/lib/webbrain-document";

export const WEBBRAIN_EDITOR_MANIFEST_VERSION = 1;

export type WebBrainEditorControlType =
  | "text"
  | "richText"
  | "image"
  | "color"
  | "number"
  | "spacing"
  | "select"
  | "toggle"
  | "link"
  | "list"
  | "form"
  | "dataSource"
  | "animation";

export type WebBrainEditorBindingTarget =
  | "component"
  | "props"
  | "style"
  | "effects"
  | "theme"
  | "children"
  | "custom";

export type WebBrainEditorBinding = {
  target: WebBrainEditorBindingTarget;
  path?: string;
};

export type WebBrainEditorControl = {
  key: string;
  type: WebBrainEditorControlType;
  label: string;
  description?: string;
  binding?: WebBrainEditorBinding;
  inspectorControl?: InspectorControl;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type WebBrainEditorNodeManifest = {
  id: string;
  componentId: string;
  label: string;
  type: "page" | "section" | "layout" | "element" | "form" | "media" | "navigation";
  controls: WebBrainEditorControl[];
  aiActions?: Array<{
    key: string;
    label: string;
    prompt: string;
  }>;
};

export type WebBrainEditorManifest = {
  version: typeof WEBBRAIN_EDITOR_MANIFEST_VERSION;
  nodes: WebBrainEditorNodeManifest[];
};

export type WebBrainEditorManifestIssue = {
  path: string;
  message: string;
};

const componentKindByType: Record<WebBrainComponentType, WebBrainEditorNodeManifest["type"]> = {
  page: "page",
  header: "navigation",
  navLink: "navigation",
  footer: "section",
  section: "section",
  container: "layout",
  row: "layout",
  column: "layout",
  grid: "layout",
  stack: "layout",
  cardGrid: "layout",
  card: "layout",
  heading: "element",
  text: "element",
  button: "element",
  form: "form",
  input: "form",
  textarea: "form",
  image: "media",
};

const inspectorControlMeta: Partial<Record<InspectorControl, Omit<WebBrainEditorControl, "key">>> = {
  brand: { type: "text", label: "Бренд", binding: { target: "props", path: "brand" } },
  links: { type: "list", label: "Ссылки", binding: { target: "children" } },
  sticky: { type: "toggle", label: "Закрепить", binding: { target: "style", path: "position" } },
  text: { type: "richText", label: "Текст", binding: { target: "props", path: "text" } },
  textAccent: { type: "richText", label: "Акцент текста", binding: { target: "props", path: "textAccentText" } },
  label: { type: "text", label: "Текст", binding: { target: "props", path: "label" } },
  name: { type: "text", label: "Name", binding: { target: "props", path: "name" } },
  placeholder: { type: "text", label: "Placeholder", binding: { target: "props", path: "placeholder" } },
  inputType: { type: "select", label: "Тип поля", binding: { target: "props", path: "inputType" } },
  required: { type: "toggle", label: "Обязательное", binding: { target: "props", path: "required" } },
  action: { type: "text", label: "Действие формы", binding: { target: "props", path: "action" } },
  method: { type: "select", label: "Метод", binding: { target: "props", path: "method" } },
  anchorId: { type: "text", label: "Якорь", binding: { target: "props", path: "anchorId" } },
  href: { type: "link", label: "Ссылка", binding: { target: "props", path: "href" } },
  target: { type: "select", label: "Открывать", binding: { target: "props", path: "target" } },
  ariaLabel: { type: "text", label: "Описание", binding: { target: "props", path: "ariaLabel" } },
  semanticTag: { type: "select", label: "HTML-тег", binding: { target: "props", path: "tag" } },
  level: { type: "select", label: "Уровень", binding: { target: "props", path: "level" } },
  fontSize: { type: "number", label: "Размер текста", binding: { target: "style", path: "fontSize" }, min: 8, max: 120, unit: "px" },
  fontWeight: { type: "number", label: "Насыщенность", binding: { target: "style", path: "fontWeight" }, min: 100, max: 1000 },
  letterSpacing: { type: "number", label: "Трекинг", binding: { target: "style", path: "letterSpacing" }, min: -2, max: 8, step: 0.1, unit: "px" },
  lineHeight: { type: "number", label: "Высота строки", binding: { target: "style", path: "lineHeight" }, min: 0.8, max: 2.4, step: 0.05 },
  textColor: { type: "color", label: "Цвет текста", binding: { target: "style", path: "textColor" } },
  hoverColor: { type: "color", label: "Hover цвет", binding: { target: "style", path: "hoverColor" } },
  align: { type: "select", label: "Выравнивание", binding: { target: "style", path: "align" } },
  padding: { type: "spacing", label: "Внутренние отступы", binding: { target: "style", path: "padding" } },
  margin: { type: "spacing", label: "Внешние отступы", binding: { target: "style", path: "margin" } },
  background: { type: "color", label: "Фон", binding: { target: "style", path: "background" } },
  backgroundImageUpload: { type: "image", label: "Фоновое изображение", binding: { target: "style", path: "backgroundImage" } },
  backgroundImageSrc: { type: "image", label: "URL фона", binding: { target: "style", path: "backgroundImage" } },
  backgroundSize: { type: "select", label: "Размер фона", binding: { target: "style", path: "backgroundSize" } },
  backgroundPosition: { type: "text", label: "Позиция фона", binding: { target: "style", path: "backgroundPosition" } },
  backgroundRepeat: { type: "select", label: "Повтор фона", binding: { target: "style", path: "backgroundRepeat" } },
  backgroundOverlay: { type: "color", label: "Оверлей", binding: { target: "style", path: "backgroundOverlay" } },
  backgroundOverlayOpacity: { type: "number", label: "Сила оверлея", binding: { target: "style", path: "backgroundOverlayOpacity" }, min: 0, max: 1, step: 0.05 },
  backgroundBlendMode: { type: "select", label: "Смешивание", binding: { target: "style", path: "backgroundBlendMode" } },
  borderColor: { type: "color", label: "Граница", binding: { target: "style", path: "borderColor" } },
  radius: { type: "number", label: "Скругление", binding: { target: "style", path: "radius" }, min: 0, max: 80, unit: "px" },
  gap: { type: "number", label: "Расстояние", binding: { target: "style", path: "gap" }, min: 0, max: 120, unit: "px" },
  direction: { type: "select", label: "Направление", binding: { target: "style", path: "direction" } },
  justify: { type: "select", label: "Распределение", binding: { target: "style", path: "justify" } },
  alignItems: { type: "select", label: "Выравнивание элементов", binding: { target: "style", path: "alignItems" } },
  wrap: { type: "toggle", label: "Перенос", binding: { target: "style", path: "wrap" } },
  minHeight: { type: "number", label: "Мин. высота", binding: { target: "style", path: "minHeight" }, min: 0, max: 1200, unit: "px" },
  height: { type: "number", label: "Высота", binding: { target: "style", path: "height" }, min: 1, max: 1400, unit: "px" },
  width: { type: "number", label: "Ширина", binding: { target: "style", path: "width" }, min: 1, max: 300, unit: "%" },
  maxWidth: { type: "number", label: "Макс. ширина", binding: { target: "style", path: "maxWidth" }, min: 120, max: 1800, unit: "px" },
  columns: { type: "number", label: "Колонки", binding: { target: "props", path: "columns" }, min: 1, max: 6 },
  imageUpload: { type: "image", label: "Изображение", binding: { target: "props", path: "src" } },
  imageSrc: { type: "image", label: "URL изображения", binding: { target: "props", path: "src" } },
  imageAlt: { type: "text", label: "Alt", binding: { target: "props", path: "alt" } },
  imageFit: { type: "select", label: "Заполнение", binding: { target: "style", path: "objectFit" } },
  imagePosition: { type: "text", label: "Позиция", binding: { target: "style", path: "objectPosition" } },
  shadow: { type: "number", label: "Тень", binding: { target: "style", path: "shadow" }, min: 0, max: 80, unit: "px" },
};

export const WEBBRAIN_EDITOR_CONTROL_TYPES: WebBrainEditorControlType[] = [
  "text",
  "richText",
  "image",
  "color",
  "number",
  "spacing",
  "select",
  "toggle",
  "link",
  "list",
  "form",
  "dataSource",
  "animation",
];

export function createEditorManifestForDocument(document: WebBrainDocument): WebBrainEditorManifest {
  return {
    version: WEBBRAIN_EDITOR_MANIFEST_VERSION,
    nodes: document.components.map((component) => createEditorNodeManifest(component)),
  };
}

export function createEditorNodeManifest(component: WebBrainComponent): WebBrainEditorNodeManifest {
  const schema = componentInspectorSchemas[component.type] ?? componentInspectorSchemas.stack;
  const controls = [
    {
      key: "componentName",
      type: "text",
      label: "Название слоя",
      binding: { target: "component", path: "name" },
    } satisfies WebBrainEditorControl,
    ...themeControlsForComponent(component),
    ...schema.settings
    .map((control) => inspectorControlToEditorControl(control))
    .filter((control): control is WebBrainEditorControl => Boolean(control)),
    ...schema.style
      .map((control) => inspectorControlToEditorControl(control))
      .filter((control): control is WebBrainEditorControl => Boolean(control)),
  ];

  return {
    id: `${component.id}:editor`,
    componentId: component.id,
    label: component.name || schema.title || component.type,
    type: componentKindByType[component.type] ?? "element",
    controls,
    aiActions: defaultAiActionsForComponent(component),
  };
}

export function getEditorNodeManifest(document: WebBrainDocument, component: WebBrainComponent): WebBrainEditorNodeManifest {
  const explicitNode = document.editorManifest?.nodes?.find((node) => node.componentId === component.id || node.id === component.id);
  const fallbackNode = createEditorNodeManifest(component);

  if (!explicitNode) return fallbackNode;

  const controls = sanitizeEditorControls(explicitNode.controls);

  return {
    ...fallbackNode,
    ...explicitNode,
    id: explicitNode.id || fallbackNode.id,
    componentId: component.id,
    label: explicitNode.label || fallbackNode.label,
    type: explicitNode.type || fallbackNode.type,
    controls: controls.length ? mergeEditorControls(fallbackNode.controls, controls) : fallbackNode.controls,
    aiActions: explicitNode.aiActions?.length ? explicitNode.aiActions : fallbackNode.aiActions,
  };
}

export function normalizeEditorManifest(document: WebBrainDocument): WebBrainEditorManifest {
  const componentIds = new Set(document.components.map((component) => component.id));
  const explicitNodes = Array.isArray(document.editorManifest?.nodes) ? document.editorManifest.nodes : [];
  const nodesByComponentId = new Map<string, WebBrainEditorNodeManifest>();

  for (const node of explicitNodes) {
    if (!node || typeof node !== "object" || !componentIds.has(node.componentId)) continue;
    const component = document.components.find((item) => item.id === node.componentId);
    if (!component) continue;
    nodesByComponentId.set(node.componentId, getEditorNodeManifest({ ...document, editorManifest: { version: 1, nodes: [node] } }, component));
  }

  for (const component of document.components) {
    if (!nodesByComponentId.has(component.id)) {
      nodesByComponentId.set(component.id, createEditorNodeManifest(component));
    }
  }

  return {
    version: WEBBRAIN_EDITOR_MANIFEST_VERSION,
    nodes: [...nodesByComponentId.values()],
  };
}

export function getEditorManifestValidationIssues(document: WebBrainDocument): WebBrainEditorManifestIssue[] {
  const issues: WebBrainEditorManifestIssue[] = [];
  const manifest = document.editorManifest;
  if (!manifest) return issues;

  if (manifest.version !== WEBBRAIN_EDITOR_MANIFEST_VERSION) {
    issues.push({
      path: "editorManifest.version",
      message: `Unsupported editorManifest version "${String(manifest.version)}"; fallback manifest was generated.`,
    });
  }

  const componentIds = new Set(document.components.map((component) => component.id));
  const seenComponentIds = new Set<string>();
  const nodes = Array.isArray(manifest.nodes) ? manifest.nodes : [];

  nodes.forEach((node, nodeIndex) => {
    if (!node || typeof node !== "object") {
      issues.push({ path: `editorManifest.nodes.${nodeIndex}`, message: "Manifest node must be an object." });
      return;
    }

    if (!componentIds.has(node.componentId)) {
      issues.push({
        path: `editorManifest.nodes.${nodeIndex}.componentId`,
        message: `Manifest node references missing component "${node.componentId}".`,
      });
      return;
    }

    if (seenComponentIds.has(node.componentId)) {
      issues.push({
        path: `editorManifest.nodes.${nodeIndex}.componentId`,
        message: `Duplicate manifest node for component "${node.componentId}".`,
      });
    }
    seenComponentIds.add(node.componentId);

    if (!Array.isArray(node.controls)) {
      issues.push({ path: `editorManifest.nodes.${nodeIndex}.controls`, message: "Manifest node controls must be an array." });
      return;
    }

    node.controls.forEach((control, controlIndex) => {
      if (!control || typeof control !== "object") {
        issues.push({ path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}`, message: "Control must be an object." });
        return;
      }

      if (!control.key || typeof control.key !== "string") {
        issues.push({ path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}.key`, message: "Control key is required." });
      }

      if (!WEBBRAIN_EDITOR_CONTROL_TYPES.includes(control.type)) {
        issues.push({
          path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}.type`,
          message: `Unsupported control type "${String(control.type)}".`,
        });
      }

      const binding = control.binding;
      const target = binding?.target;
      if (!target) {
        issues.push({
          path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}.binding`,
          message: "Control binding target is required.",
        });
        return;
      }

      if (!["component", "props", "style", "effects", "theme", "children", "custom"].includes(target)) {
        issues.push({
          path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}.binding.target`,
          message: `Unsupported binding target "${String(target)}".`,
        });
      }

      if (!binding.path && target !== "children" && target !== "custom") {
        issues.push({
          path: `editorManifest.nodes.${nodeIndex}.controls.${controlIndex}.binding.path`,
          message: `Binding path is required for target "${target}".`,
        });
      }
    });
  });

  return issues;
}

export function inspectorControlToEditorControl(control: InspectorControl): WebBrainEditorControl | null {
  const meta = inspectorControlMeta[control];
  if (!meta) return null;

  return {
    key: control,
    inspectorControl: control,
    ...meta,
  };
}

function sanitizeEditorControls(controls: unknown): WebBrainEditorControl[] {
  if (!Array.isArray(controls)) return [];

  const sanitized = controls
    .map((control): WebBrainEditorControl | null => {
      if (!control || typeof control !== "object") return null;
      const source = control as Partial<WebBrainEditorControl>;
      if (!source.key || typeof source.key !== "string") return null;
      if (!source.type || !WEBBRAIN_EDITOR_CONTROL_TYPES.includes(source.type)) return null;

      return {
        key: source.key,
        type: source.type,
        label: source.label || source.key,
        description: source.description,
        binding: sanitizeBinding(source.binding),
        inspectorControl: source.inspectorControl,
        options: Array.isArray(source.options)
          ? source.options
              .filter((option) => option && typeof option.value === "string")
              .map((option) => ({ value: option.value, label: option.label || option.value }))
          : undefined,
        placeholder: source.placeholder,
        min: source.min,
        max: source.max,
        step: source.step,
        unit: source.unit,
      };
    })
    .filter((control): control is WebBrainEditorControl => Boolean(control));

  return sanitized;
}

function mergeEditorControls(baseControls: WebBrainEditorControl[], explicitControls: WebBrainEditorControl[]) {
  const controlsByKey = new Map<string, WebBrainEditorControl>();

  baseControls.forEach((control) => controlsByKey.set(control.key, control));
  explicitControls.forEach((control) => controlsByKey.set(control.key, control));

  return [...controlsByKey.values()];
}

function themeControlsForComponent(component: WebBrainComponent): WebBrainEditorControl[] {
  if (component.type !== "page") return [];

  return [
    { key: "themeBackground", type: "color", label: "Фон темы", binding: { target: "theme", path: "background" } },
    { key: "themeText", type: "color", label: "Текст темы", binding: { target: "theme", path: "text" } },
    { key: "themePrimary", type: "color", label: "Акцент темы", binding: { target: "theme", path: "primary" } },
    { key: "themeMuted", type: "color", label: "Вторичный текст", binding: { target: "theme", path: "muted" } },
    { key: "themeSurface", type: "color", label: "Поверхность", binding: { target: "theme", path: "surface" } },
  ];
}

function sanitizeBinding(binding: unknown): WebBrainEditorBinding | undefined {
  if (!binding || typeof binding !== "object") return undefined;
  const source = binding as Partial<WebBrainEditorBinding>;
  if (!source.target) return undefined;

  return {
    target: source.target,
    path: typeof source.path === "string" ? source.path : undefined,
  };
}

function defaultAiActionsForComponent(component: WebBrainComponent): WebBrainEditorNodeManifest["aiActions"] {
  if (component.type === "page") {
    return [
      { key: "improve_page", label: "Улучшить страницу", prompt: "Улучши текущую страницу целиком: композицию, тексты, визуальную иерархию и редакторские связи. Сохрани все важные смыслы." },
    ];
  }

  if (component.type === "section" || component.type === "header" || component.type === "footer") {
    return [
      { key: "improve_block", label: "Улучшить блок", prompt: "Улучши выбранный блок: сделай его богаче композиционно, понятнее для посетителя и сохрани редактируемые поля." },
      { key: "restructure_block", label: "Перестроить", prompt: "Перестрой выбранный блок в более сильную структуру. Можно менять вложенные элементы, но не трогай остальную страницу." },
    ];
  }

  return [
    { key: "rewrite", label: "Улучшить", prompt: "Улучши выбранный элемент без изменения остальной страницы. Сохрани роль элемента и все важные ссылки." },
  ];
}
