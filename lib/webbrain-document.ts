import type { WebBrainEditorManifest } from "@/lib/webbrain-editor-manifest";

export type WebBrainComponentType =
  | "page"
  | "header"
  | "navLink"
  | "footer"
  | "section"
  | "container"
  | "row"
  | "column"
  | "grid"
  | "heading"
  | "text"
  | "button"
  | "form"
  | "input"
  | "textarea"
  | "cardGrid"
  | "card"
  | "image"
  | "stack";

export type SpacingValues = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type WebBrainStyle = {
  width?: number;
  widthMode?: "auto" | "fixed" | "fit" | "full";
  height?: number;
  heightMode?: "auto" | "fixed" | "fit" | "full";
  minWidth?: number;
  maxWidth?: number;
  maxHeight?: number;
  padding?: SpacingValues;
  margin?: SpacingValues;
  gap?: number;
  radius?: number;
  minHeight?: number;
  background?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundPosition?: string;
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  backgroundOverlay?: string;
  backgroundOverlayOpacity?: number;
  backgroundBlendMode?: "normal" | "multiply" | "screen" | "overlay" | "soft-light";
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
  hoverColor?: string;
  align?: "left" | "center" | "right";
  alignItems?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "between";
  direction?: "row" | "column";
  wrap?: boolean;
  grow?: "none" | "fill" | "fit";
  position?: "relative" | "absolute" | "sticky";
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  overflow?: "visible" | "hidden" | "auto";
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through" | "underline line-through";
  shadow?: number;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
};

export type WebBrainTransition = {
  type?: "ease" | "spring";
  duration?: number;
  delay?: number;
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "custom";
  bezier?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
};

export type WebBrainTransform = {
  opacity?: number;
  scale?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  skewX?: number;
  skewY?: number;
  offsetX?: number;
  offsetY?: number;
  shadow?: number;
};

export type WebBrainOverlay = {
  enabled?: boolean;
  text?: string;
  color?: string;
  opacity?: number;
  blendMode?: "normal" | "multiply" | "screen" | "overlay";
  position?: "top" | "right" | "bottom" | "left" | "center";
  align?: "start" | "center" | "end";
  offsetX?: number;
  offsetY?: number;
  dismiss?: "auto" | "click";
  collision?: "auto" | "none";
  collisionPadding?: number;
  zIndex?: number;
};

export type WebBrainTextEffect = {
  enabled?: boolean;
  trigger?: "appear" | "hover" | "scroll";
  preset?: "blur" | "fade" | "slide" | "scale";
  per?: "character" | "word" | "line";
  enter?: WebBrainTransform;
  delay?: number;
};

export type WebBrainAppearEffect = {
  enabled?: boolean;
  trigger?: "appear" | "scroll";
  preset?: "fade-in" | "blur" | "slide-up" | "scale";
  enter?: WebBrainTransform;
  delay?: number;
};

export type WebBrainPressEffect = WebBrainTransform & {
  enabled?: boolean;
  rotateMode?: "2d" | "3d";
  transition?: WebBrainTransition;
};

export type WebBrainLoopEffect = WebBrainTransform & {
  enabled?: boolean;
  mode?: "loop" | "mirror";
  rotateMode?: "2d" | "3d";
  delay?: number;
  offscreen?: "play" | "pause";
  transition?: WebBrainTransition;
};

export type WebBrainDragEffect = {
  enabled?: boolean;
  freeform?: boolean;
  snapBack?: boolean;
  transition?: WebBrainTransition;
};

export type WebBrainScrollSpeedEffect = {
  enabled?: boolean;
  speed?: number;
};

export type WebBrainScrollTransformEffect = {
  enabled?: boolean;
  trigger?: "scroll";
  from?: WebBrainTransform;
  to?: WebBrainTransform;
  transition?: WebBrainTransition;
};

export type WebBrainFlowEffect = {
  enabled?: boolean;
  transition?: WebBrainTransition;
};

export type WebBrainTickerEffect = {
  enabled?: boolean;
  speed?: number;
  hoverSpeed?: number;
  direction?: "up" | "down" | "left" | "right";
  draggable?: boolean;
};

export type WebBrainEffects = {
  visible?: boolean;
  opacity?: number;
  cursor?: "auto" | "default" | "pointer" | "copy" | "grab";
  transform?: WebBrainTransform;
  hover?: WebBrainTransform & {
    enabled?: boolean;
  };
  textEffect?: WebBrainTextEffect;
  appear?: WebBrainAppearEffect;
  press?: WebBrainPressEffect;
  loop?: WebBrainLoopEffect;
  drag?: WebBrainDragEffect;
  scrollSpeed?: WebBrainScrollSpeedEffect;
  scrollTransform?: WebBrainScrollTransformEffect;
  flow?: WebBrainFlowEffect;
  ticker?: WebBrainTickerEffect;
  overlay?: WebBrainOverlay;
  transition?: WebBrainTransition;
};

export type WebBrainProps = {
  text?: string;
  textAccentEnabled?: boolean;
  textAccentText?: string;
  textAccentColor?: string;
  textAccentLineBreak?: boolean;
  textAccentWeight?: number;
  textAccentItalic?: boolean;
  textAccentTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textAccentDecoration?: "none" | "underline" | "line-through" | "underline line-through";
  brand?: string;
  label?: string;
  anchorId?: string;
  href?: string;
  target?: "_self" | "_blank";
  buttonIconEnabled?: boolean;
  buttonIcon?: "arrowRight" | "arrowUpRight" | "chevronRight" | "plus" | "send";
  buttonIconPosition?: "left" | "right";
  buttonIconSize?: number;
  buttonIconGap?: number;
  buttonIconColor?: string;
  buttonIconBackground?: string;
  buttonIconRadius?: number;
  ariaLabel?: string;
  tag?: "div" | "section" | "article" | "header" | "footer" | "nav" | "main" | "p" | "span";
  alt?: string;
  src?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: "primary" | "secondary" | "ghost" | "glass" | "lime3d" | "outline";
  size?: "sm" | "md" | "lg";
  layout?: "vertical" | "horizontal" | "grid";
  columns?: number;
  name?: string;
  placeholder?: string;
  inputType?: "text" | "email" | "tel" | "number" | "date" | "time" | "hidden";
  required?: boolean;
  action?: string;
  method?: "get" | "post";
};

export type WebBrainComponent = {
  id: string;
  type: WebBrainComponentType;
  name: string;
  props: WebBrainProps;
  style: WebBrainStyle;
  effects: WebBrainEffects;
  children: string[];
};

export type WebBrainPage = {
  id: string;
  name: string;
  slug: string;
  rootComponentId: string;
};

export type WebBrainDocument = {
  version: 1;
  theme: {
    name: string;
    background: string;
    text: string;
    accent: string;
    primary: string;
    onPrimary: string;
    muted: string;
    panel: string;
    line: string;
    surface: string;
    surfaceSoft: string;
    surfaceStrong: string;
    border: string;
    borderSoft: string;
  };
  pages: WebBrainPage[];
  components: WebBrainComponent[];
  editorManifest?: WebBrainEditorManifest;
};

export type InspectorControl =
  | "brand"
  | "links"
  | "sticky"
  | "text"
  | "textAccent"
  | "label"
  | "name"
  | "placeholder"
  | "inputType"
  | "required"
  | "action"
  | "method"
  | "anchorId"
  | "href"
  | "target"
  | "ariaLabel"
  | "semanticTag"
  | "level"
  | "fontSize"
  | "fontWeight"
  | "letterSpacing"
  | "textColor"
  | "hoverColor"
  | "align"
  | "padding"
  | "margin"
  | "background"
  | "backgroundImageUpload"
  | "backgroundImageSrc"
  | "backgroundSize"
  | "backgroundPosition"
  | "backgroundRepeat"
  | "backgroundOverlay"
  | "backgroundOverlayOpacity"
  | "backgroundBlendMode"
  | "borderColor"
  | "radius"
  | "gap"
  | "direction"
  | "justify"
  | "alignItems"
  | "wrap"
  | "minHeight"
  | "height"
  | "heightMode"
  | "minWidth"
  | "maxWidth"
  | "maxHeight"
  | "widthMode"
  | "position"
  | "positionOffsets"
  | "zIndex"
  | "grow"
  | "overflow"
  | "buttonVariant"
  | "buttonSize"
  | "buttonIcon"
  | "columns"
  | "lineHeight"
  | "width"
  | "imageUpload"
  | "imageSrc"
  | "imageAlt"
  | "imageFit"
  | "imagePosition"
  | "shadow";

export type InspectorSchema = {
  title: string;
  settings: InspectorControl[];
  style: InspectorControl[];
};

const defaultTheme: WebBrainDocument["theme"] = {
  name: "WebBrain Dark",
  background: "#090b0b",
  text: "#f4f5f0",
  accent: "#b9ff47",
  primary: "#b9ff47",
  onPrimary: "#090b0b",
  muted: "rgba(244, 245, 240, 0.62)",
  panel: "#171a1b",
  line: "rgba(244, 245, 240, 0.13)",
  surface: "rgba(255, 255, 255, 0.04)",
  surfaceSoft: "rgba(255, 255, 255, 0.035)",
  surfaceStrong: "rgba(255, 255, 255, 0.055)",
  border: "rgba(244, 245, 240, 0.13)",
  borderSoft: "rgba(244, 245, 240, 0.10)"
};

const backgroundMediaControls: InspectorControl[] = [
  "backgroundImageUpload",
  "backgroundImageSrc",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundOverlay",
  "backgroundOverlayOpacity",
  "backgroundBlendMode"
];

export const emptySpacingValues: SpacingValues = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

export const componentInspectorSchemas: Record<WebBrainComponentType, InspectorSchema> = {
  page: {
    title: "Страница",
    settings: ["ariaLabel"],
    style: ["padding", "background", "overflow"]
  },
  header: {
    title: "Хедер",
    settings: ["brand", "links", "sticky", "anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "heightMode", "height", "maxWidth", "padding", "justify", "alignItems", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  navLink: {
    title: "Ссылка",
    settings: ["label", "href", "target", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "fontSize", "fontWeight", "letterSpacing", "textColor", "hoverColor", "margin"]
  },
  footer: {
    title: "Футер",
    settings: ["anchorId", "semanticTag", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "widthMode", "width", "heightMode", "height", "minHeight", "maxWidth", "maxHeight", "padding", "margin", "gap", "direction", "justify", "alignItems", "wrap", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  section: {
    title: "Секция",
    settings: ["anchorId", "semanticTag", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "widthMode", "width", "heightMode", "height", "minHeight", "maxWidth", "maxHeight", "padding", "margin", "gap", "align", "justify", "alignItems", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  container: {
    title: "Контейнер",
    settings: ["anchorId", "semanticTag", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "grow", "padding", "margin", "gap", "direction", "justify", "alignItems", "wrap", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  row: {
    title: "Ряд",
    settings: ["anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minHeight", "maxHeight", "grow", "gap", "padding", "margin", "justify", "alignItems", "wrap", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  column: {
    title: "Колонка",
    settings: ["anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minWidth", "minHeight", "maxHeight", "grow", "gap", "padding", "margin", "justify", "alignItems", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  grid: {
    title: "Сетка",
    settings: ["anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minHeight", "maxWidth", "maxHeight", "grow", "columns", "gap", "padding", "margin", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  heading: {
    title: "Заголовок",
    settings: ["text", "textAccent", "level", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "minWidth", "maxWidth", "grow", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "textColor", "align", "padding", "margin", "overflow"]
  },
  text: {
    title: "Текст",
    settings: ["text", "textAccent", "semanticTag", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "minWidth", "maxWidth", "grow", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "textColor", "align", "padding", "margin", "overflow"]
  },
  button: {
    title: "Кнопка",
    settings: ["label", "href", "target", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "buttonVariant", "buttonSize", "buttonIcon", "widthMode", "width", "heightMode", "height", "minWidth", "maxWidth", "grow", "fontSize", "fontWeight", "letterSpacing", "padding", "margin", "background", "textColor", "borderColor", "radius", "shadow", "overflow"]
  },
  form: {
    title: "Форма",
    settings: ["action", "method", "anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minHeight", "maxWidth", "maxHeight", "grow", "padding", "margin", "gap", "direction", "justify", "alignItems", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  input: {
    title: "Поле",
    settings: ["label", "name", "placeholder", "inputType", "required", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "minWidth", "maxWidth", "grow", "fontSize", "fontWeight", "letterSpacing", "padding", "margin", "background", "textColor", "borderColor", "radius", "shadow", "overflow"]
  },
  textarea: {
    title: "Текстовое поле",
    settings: ["label", "name", "placeholder", "required", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "minWidth", "maxWidth", "grow", "fontSize", "fontWeight", "letterSpacing", "padding", "margin", "background", "textColor", "borderColor", "radius", "shadow", "overflow"]
  },
  cardGrid: {
    title: "Сетка карточек",
    settings: ["anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minHeight", "maxWidth", "maxHeight", "grow", "columns", "gap", "padding", "margin", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  card: {
    title: "Карточка",
    settings: ["anchorId", "semanticTag", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "grow", "padding", "gap", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  },
  image: {
    title: "Изображение",
    settings: ["imageUpload", "imageAlt", "imageSrc", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minWidth", "maxWidth", "maxHeight", "grow", "imageFit", "imagePosition", "radius", "margin", "shadow", "overflow"]
  },
  stack: {
    title: "Группа",
    settings: ["anchorId", "ariaLabel"],
    style: ["position", "positionOffsets", "zIndex", "width", "widthMode", "heightMode", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "grow", "gap", "padding", "margin", "direction", "justify", "alignItems", "wrap", "background", ...backgroundMediaControls, "borderColor", "radius", "shadow", "overflow"]
  }
};

function spacing(top: number, right = top, bottom = top, left = right): SpacingValues {
  return { top, right, bottom, left };
}

function component(
  id: string,
  type: WebBrainComponentType,
  name: string,
  props: WebBrainProps = {},
  style: WebBrainStyle = {},
  children: string[] = [],
  effects: WebBrainEffects = {}
): WebBrainComponent {
  return {
    id,
    type,
    name,
    props,
    style,
    effects: normalizeEffects(effects),
    children
  };
}

function pageCopy(slug: string) {
  if (slug === "services") {
    return {
      name: "Услуги",
      eyebrow: "Услуги",
      heading: "Услуги для первого запуска",
      copy: "От первого экрана до формы заявки: страница собирается как отдельный документ, а не как прокрутка к секции.",
      processHeading: "Что входит в страницу.",
      processSteps: ["Оффер под нишу.", "Блоки доверия.", "Путь к заявке."]
    };
  }

  if (slug === "process") {
    return {
      name: "Процесс",
      eyebrow: "Процесс",
      heading: "Процесс работы",
      copy: "Каждая страница хранится отдельно, поэтому редактор сможет переключать документы сайта без прыжков по якорям.",
      processHeading: "От идеи к готовой странице.",
      processSteps: ["Опишите нишу, стиль и цель.", "Получите черновик сайта.", "Правьте блоки визуально."]
    };
  }

  if (slug === "contacts") {
    return {
      name: "Контакты",
      eyebrow: "Контакты",
      heading: "Контакты и заявка",
      copy: "Финальная страница сайта для заявки, связи и короткого объяснения следующего шага.",
      processHeading: "Готовы обсудить запуск?",
      processSteps: ["Оставьте заявку.", "Уточните задачу.", "Получите первый черновик."]
    };
  }

  return {
    name: "Главная",
    eyebrow: "Сайт для бизнеса",
    heading: "Запустите аккуратную страницу без долгой сборки.",
    copy: "Чистый HTML, CSS и JS-шаблон для первого редактора WebBrain: герой, преимущества, шаги работы и контактный блок.",
    processHeading: "От идеи к странице за один поток.",
    processSteps: ["Опишите бизнес и цель.", "Получите черновик сайта.", "Отредактируйте блоки визуально."]
  };
}

export function createStarterDocument(slug = "home", name?: string): WebBrainDocument {
  const page = pageCopy(slug);
  const prefix = slug.replace(/[^a-z0-9]+/gi, "-") || "home";
  const pageId = `${prefix}-page`;
  const headerId = `${prefix}-header`;
  const rootId = `${prefix}-root`;
  const heroId = `${prefix}-hero`;
  const actionStackId = `${prefix}-hero-actions`;
  const cardsId = `${prefix}-cards`;
  const processId = `${prefix}-process`;
  const processListId = `${prefix}-process-list`;
  const contactId = `${prefix}-contact`;

  const components = [
    component(rootId, "page", page.name, {}, { background: "#090b0b", padding: spacing(16) }, [headerId, heroId, cardsId, processId, contactId]),
    component(
      headerId,
      "header",
      "Хедер",
      { brand: "Studio" },
      {
        maxWidth: 1120,
        padding: spacing(14, 16),
        radius: 20,
        background: "rgba(18, 20, 21, 0.78)",
        borderColor: "rgba(244, 245, 240, 0.13)"
      },
      [`${prefix}-nav-services`, `${prefix}-nav-process`, `${prefix}-nav-contacts`]
    ),
    component(`${prefix}-nav-services`, "navLink", "Услуги", { label: "Услуги", href: "#services" }, { textColor: "rgba(244, 245, 240, 0.68)" }),
    component(`${prefix}-nav-process`, "navLink", "Процесс", { label: "Процесс", href: "#work" }, { textColor: "rgba(244, 245, 240, 0.68)" }),
    component(`${prefix}-nav-contacts`, "navLink", "Контакты", { label: "Контакты", href: "#contact" }, { textColor: "rgba(244, 245, 240, 0.68)" }),
    component(
      heroId,
      "section",
      "Первый экран",
      {},
      {
        maxWidth: 1120,
        padding: spacing(106, 0, 78),
        margin: spacing(0),
        align: "left"
      },
      [`${prefix}-eyebrow`, `${prefix}-hero-heading`, `${prefix}-hero-copy`, actionStackId]
    ),
    component(
      `${prefix}-eyebrow`,
      "text",
      "Надзаголовок",
      { text: page.eyebrow },
      { fontSize: 14, fontWeight: 800, textColor: defaultTheme.accent, margin: spacing(0, 0, 18), lineHeight: 1.2 }
    ),
    component(
      `${prefix}-hero-heading`,
      "heading",
      "Главный заголовок",
      { text: page.heading, level: 1 },
      { fontSize: 70, fontWeight: 900, textColor: defaultTheme.text, margin: spacing(0, 0, 28), lineHeight: 0.96 }
    ),
    component(
      `${prefix}-hero-copy`,
      "text",
      "Описание",
      { text: page.copy },
      { fontSize: 19, fontWeight: 500, textColor: defaultTheme.muted, margin: spacing(0, 0, 34), lineHeight: 1.65 }
    ),
    component(actionStackId, "stack", "Кнопки героя", { layout: "horizontal" }, { gap: 14 }, [`${prefix}-primary-button`, `${prefix}-secondary-button`]),
    component(
      `${prefix}-primary-button`,
      "button",
      "Основная кнопка",
      { label: "Оставить заявку", href: "#contact", variant: "primary", size: "lg" },
      {
        widthMode: "auto",
        padding: spacing(18, 30),
        radius: 18,
        background: defaultTheme.accent,
        textColor: "#090b0b",
        borderColor: defaultTheme.accent
      }
    ),
    component(
      `${prefix}-secondary-button`,
      "button",
      "Вторичная кнопка",
      { label: "Посмотреть блоки", href: "#services", variant: "secondary", size: "lg" },
      {
        widthMode: "auto",
        padding: spacing(18, 30),
        radius: 18,
        background: "rgba(255, 255, 255, 0.03)",
        textColor: defaultTheme.text,
        borderColor: "rgba(244, 245, 240, 0.18)"
      }
    ),
    component(cardsId, "cardGrid", "Преимущества", { columns: 3 }, { maxWidth: 1120, gap: 0, padding: spacing(0), margin: spacing(0, 0, 84) }, [
      `${prefix}-card-1`,
      `${prefix}-card-2`,
      `${prefix}-card-3`
    ]),
    ...[1, 2, 3].flatMap((index) => {
      const titles = ["Структура", "Визуал", "Запуск"];
      const texts = [
        "Первый экран, оффер, CTA и понятная логика для клиента.",
        "Темный стиль, мягкие акценты и секции, готовые к редактированию.",
        "Легкий код без зависимостей, который можно сохранять и публиковать."
      ];
      const cardId = `${prefix}-card-${index}`;

      return [
        component(
          cardId,
          "card",
          titles[index - 1],
          {},
          {
            padding: spacing(48, 42),
            gap: 28,
            radius: 28,
            background: "rgba(255, 255, 255, 0.045)",
            borderColor: "rgba(244, 245, 240, 0.13)",
            shadow: 0
          },
          [`${cardId}-number`, `${cardId}-title`, `${cardId}-copy`]
        ),
        component(`${cardId}-number`, "text", `Номер ${index}`, { text: `0${index}` }, { fontSize: 18, fontWeight: 900, textColor: defaultTheme.accent }),
        component(`${cardId}-title`, "heading", titles[index - 1], { text: titles[index - 1], level: 2 }, { fontSize: 36, fontWeight: 900, textColor: defaultTheme.text }),
        component(`${cardId}-copy`, "text", "Описание карточки", { text: texts[index - 1] }, { fontSize: 17, fontWeight: 600, textColor: defaultTheme.muted, lineHeight: 1.55 })
      ];
    }),
    component(processId, "section", "Процесс", {}, { maxWidth: 1120, padding: spacing(48), margin: spacing(0, 0, 72), radius: 28, background: "rgba(255, 255, 255, 0.045)", borderColor: "rgba(244, 245, 240, 0.13)" }, [
      `${prefix}-process-eyebrow`,
      `${prefix}-process-heading`,
      processListId
    ]),
    component(`${prefix}-process-eyebrow`, "text", "Надзаголовок процесса", { text: "Процесс" }, { fontSize: 14, fontWeight: 800, textColor: defaultTheme.accent, margin: spacing(0, 0, 18) }),
    component(`${prefix}-process-heading`, "heading", "Заголовок процесса", { text: page.processHeading, level: 2 }, { fontSize: 44, fontWeight: 900, textColor: defaultTheme.text, margin: spacing(0, 0, 22), lineHeight: 1.06 }),
    component(processListId, "stack", "Шаги", { layout: "vertical" }, { gap: 14 }, page.processSteps.map((_, index) => `${prefix}-step-${index + 1}`)),
    ...page.processSteps.map((step, index) =>
      component(`${prefix}-step-${index + 1}`, "text", `Шаг ${index + 1}`, { text: `${index + 1}. ${step}` }, { fontSize: 18, fontWeight: 650, textColor: defaultTheme.muted })
    ),
    component(contactId, "section", "Финал", {}, { maxWidth: 1120, padding: spacing(64, 44), margin: spacing(0, 0, 48), radius: 28, align: "center", background: "rgba(255, 255, 255, 0.055)", borderColor: "rgba(244, 245, 240, 0.13)" }, [
      `${prefix}-contact-heading`,
      `${prefix}-contact-copy`,
      `${prefix}-contact-button`
    ]),
    component(`${prefix}-contact-heading`, "heading", "Финальный заголовок", { text: "Готовы собрать первый сайт?", level: 2 }, { fontSize: 42, fontWeight: 900, textColor: defaultTheme.text, margin: spacing(0, 0, 14) }),
    component(`${prefix}-contact-copy`, "text", "Финальное описание", { text: "Замените текст, цвета и блоки в будущем редакторе WebBrain." }, { fontSize: 18, fontWeight: 500, textColor: defaultTheme.muted, margin: spacing(0, 0, 28) }),
    component(`${prefix}-contact-button`, "button", "Финальная кнопка", { label: "Начать", href: "#top", variant: "primary", size: "md" }, { widthMode: "auto", padding: spacing(16, 28), radius: 18, background: defaultTheme.accent, textColor: "#090b0b", borderColor: defaultTheme.accent })
  ];

  return {
    version: 1,
    theme: defaultTheme,
    pages: [
      {
        id: pageId,
        name: name ?? page.name,
        slug,
        rootComponentId: rootId
      }
    ],
    components
  };
}

export function createBlankHeroDocument(slug = "home", name = "Главная"): WebBrainDocument {
  const prefix = slug.replace(/[^a-z0-9]+/gi, "-") || "home";
  const pageId = `${prefix}-blank-page`;
  const rootId = `${prefix}-blank-root`;
  const heroId = `${prefix}-blank-hero`;
  const eyebrowId = `${prefix}-blank-eyebrow`;
  const headingId = `${prefix}-blank-heading`;
  const copyId = `${prefix}-blank-copy`;
  const buttonId = `${prefix}-blank-button`;

  return {
    version: 1,
    theme: defaultTheme,
    pages: [
      {
        id: pageId,
        name,
        slug,
        rootComponentId: rootId
      }
    ],
    components: [
      component(rootId, "page", name, {}, { background: "#090b0b", padding: spacing(16) }, [heroId]),
      component(
        heroId,
        "section",
        "Первый экран",
        {},
        {
          maxWidth: 1120,
          minHeight: 620,
          padding: spacing(112, 0, 112),
          margin: spacing(0),
          align: "left",
          background: "rgba(255, 255, 255, 0.025)",
          borderColor: "rgba(244, 245, 240, 0.1)",
          radius: 28
        },
        [eyebrowId, headingId, copyId, buttonId]
      ),
      component(
        eyebrowId,
        "text",
        "Надзаголовок",
        { text: "Новая страница" },
        { fontSize: 14, fontWeight: 800, textColor: defaultTheme.accent, margin: spacing(0, 0, 18), lineHeight: 1.2 }
      ),
      component(
        headingId,
        "heading",
        "Главный заголовок",
        { text: "Расскажите о своем бизнесе", level: 1 },
        { fontSize: 70, fontWeight: 900, textColor: defaultTheme.text, margin: spacing(0, 0, 28), lineHeight: 0.96 }
      ),
      component(
        copyId,
        "text",
        "Описание",
        { text: "Добавьте короткое описание предложения, преимуществ и следующего шага для клиента." },
        { fontSize: 19, fontWeight: 500, textColor: defaultTheme.muted, margin: spacing(0, 0, 34), lineHeight: 1.65 }
      ),
      component(
        buttonId,
        "button",
        "Основная кнопка",
        { label: "Оставить заявку", href: "#contact", variant: "primary", size: "lg" },
        {
          widthMode: "auto",
          padding: spacing(18, 30),
          radius: 18,
          background: defaultTheme.accent,
          textColor: "#090b0b",
          borderColor: defaultTheme.accent,
          fontSize: 16,
          fontWeight: 800
        }
      )
    ]
  };
}

export function normalizeSpacingValues(value: unknown, fallback: SpacingValues = emptySpacingValues): SpacingValues {
  if (!value || typeof value !== "object") return fallback;
  const spacingValue = value as Partial<SpacingValues>;

  return {
    top: clampNumber(spacingValue.top, fallback.top, 0, 240),
    right: clampNumber(spacingValue.right, fallback.right, 0, 240),
    bottom: clampNumber(spacingValue.bottom, fallback.bottom, 0, 240),
    left: clampNumber(spacingValue.left, fallback.left, 0, 240)
  };
}

function normalizeTheme(theme?: Partial<WebBrainDocument["theme"]>): WebBrainDocument["theme"] {
  const source = theme ?? {};
  const primary = source.primary ?? source.accent ?? defaultTheme.primary;
  const border = source.border ?? source.line ?? defaultTheme.border;
  const surface = source.surface ?? source.panel ?? defaultTheme.surface;

  return {
    ...defaultTheme,
    ...source,
    primary,
    onPrimary: source.onPrimary ?? defaultTheme.onPrimary,
    accent: source.accent ?? primary,
    surface,
    surfaceSoft: source.surfaceSoft ?? surface,
    surfaceStrong: source.surfaceStrong ?? source.panel ?? defaultTheme.surfaceStrong,
    border,
    borderSoft: source.borderSoft ?? border,
    panel: source.panel ?? surface,
    line: source.line ?? border
  };
}

export function normalizeWebBrainDocument(value: unknown, slug = "home", name?: string): WebBrainDocument {
  if (!value || typeof value !== "object") return createStarterDocument(slug, name);

  const document = value as Partial<WebBrainDocument>;
  if (document.version !== 1 || !Array.isArray(document.pages) || !Array.isArray(document.components)) {
    return createStarterDocument(slug, name);
  }

  const normalizedComponents = document.components
    .filter((item): item is WebBrainComponent => Boolean(item && typeof item.id === "string" && typeof item.type === "string"))
    .map((item) => {
      const type = item.type as WebBrainComponentType;

      return {
        id: item.id,
        type,
        name: item.name || componentInspectorSchemas[type]?.title || item.type,
        props: item.props ?? {},
        style: normalizeComponentStyle(type, item.style),
        effects: normalizeEffects(item.effects),
        children: Array.isArray(item.children) ? item.children.filter((childId) => typeof childId === "string") : []
      };
    });

  if (!normalizedComponents.length) return createStarterDocument(slug, name);

  return {
    version: 1,
    theme: normalizeTheme(document.theme),
    pages: document.pages.map((page, index) => ({
      id: page.id || `${slug}-page-${index}`,
      name: page.name || name || pageCopy(slug).name,
      slug: page.slug || slug,
      rootComponentId: page.rootComponentId || normalizedComponents[0].id
    })),
    components: normalizedComponents,
    editorManifest: normalizeDocumentEditorManifest(document.editorManifest)
  };
}

function normalizeDocumentEditorManifest(value: unknown): WebBrainEditorManifest | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<WebBrainEditorManifest>;
  if (source.version !== 1 || !Array.isArray(source.nodes)) return undefined;

  return {
    version: 1,
    nodes: source.nodes
  };
}

function normalizeComponentStyle(type: WebBrainComponentType, style?: WebBrainStyle): WebBrainStyle {
  const normalizedStyle = normalizeStyle(style);

  if (type === "page" && normalizedStyle.padding === undefined) {
    return {
      ...normalizedStyle,
      padding: spacing(16)
    };
  }

  return normalizedStyle;
}

function normalizeStyle(style?: WebBrainStyle): WebBrainStyle {
  const source = style ?? {};

  return {
    ...source,
    width: source.width === undefined ? undefined : clampNumber(source.width, 100, 1, 300),
    height: source.height === undefined ? undefined : clampNumber(source.height, 120, 1, 1400),
    minWidth: source.minWidth === undefined ? undefined : clampNumber(source.minWidth, 0, 0, 1800),
    maxWidth: source.maxWidth === undefined ? undefined : clampNumber(source.maxWidth, 1120, 120, 1800),
    maxHeight: source.maxHeight === undefined ? undefined : clampNumber(source.maxHeight, 0, 0, 1800),
    gap: source.gap === undefined ? undefined : clampNumber(source.gap, 0, 0, 120),
    radius: source.radius === undefined ? undefined : clampNumber(source.radius, 0, 0, 80),
    minHeight: source.minHeight === undefined ? undefined : clampNumber(source.minHeight, 0, 0, 1200),
    top: source.top === undefined ? undefined : clampNumber(source.top, 0, -2000, 2000),
    right: source.right === undefined ? undefined : clampNumber(source.right, 0, -2000, 2000),
    bottom: source.bottom === undefined ? undefined : clampNumber(source.bottom, 0, -2000, 2000),
    left: source.left === undefined ? undefined : clampNumber(source.left, 0, -2000, 2000),
    zIndex: source.zIndex === undefined ? undefined : clampNumber(source.zIndex, 0, -10, 999),
    fontSize: source.fontSize === undefined ? undefined : clampNumber(source.fontSize, 16, 8, 120),
    fontWeight: source.fontWeight === undefined ? undefined : clampNumber(source.fontWeight, 500, 100, 1000),
    fontStyle: normalizeTextFontStyle(source.fontStyle),
    letterSpacing: source.letterSpacing === undefined ? undefined : clampFloat(source.letterSpacing, 0, -2, 8),
    lineHeight: source.lineHeight === undefined ? undefined : source.lineHeight,
    textTransform: normalizeTextTransform(source.textTransform),
    textDecoration: normalizeTextDecoration(source.textDecoration),
    backgroundOverlayOpacity: source.backgroundOverlayOpacity === undefined ? undefined : clampFloat(source.backgroundOverlayOpacity, 0.42, 0, 1),
    borderWidth: source.borderWidth === undefined ? undefined : clampNumber(source.borderWidth, 1, 1, 24),
    padding: source.padding ? normalizeSpacingValues(source.padding) : undefined,
    margin: source.margin ? normalizeSpacingValues(source.margin) : undefined
  };
}

function normalizeEffects(effects?: WebBrainEffects): WebBrainEffects {
  const source = effects ?? {};

  return {
    visible: source.visible,
    opacity: source.opacity === undefined ? undefined : clampFloat(source.opacity, 1, 0, 1),
    cursor: source.cursor,
    transform: normalizeTransform(source.transform),
    hover: {
      ...normalizeTransform(source.hover),
      enabled: source.hover?.enabled
    },
    textEffect: normalizeTextEffect(source.textEffect),
    appear: normalizeAppearEffect(source.appear),
    press: normalizePressEffect(source.press),
    loop: normalizeLoopEffect(source.loop),
    drag: normalizeDragEffect(source.drag),
    scrollSpeed: normalizeScrollSpeedEffect(source.scrollSpeed),
    scrollTransform: normalizeScrollTransformEffect(source.scrollTransform),
    flow: normalizeFlowEffect(source.flow),
    ticker: normalizeTickerEffect(source.ticker),
    overlay: normalizeOverlay(source.overlay),
    transition: normalizeTransition(source.transition)
  };
}

function normalizeTextFontStyle(value: WebBrainStyle["fontStyle"]) {
  return value === "italic" ? "italic" : value === "normal" ? "normal" : undefined;
}

function normalizeTextTransform(value: WebBrainStyle["textTransform"]) {
  if (value === "uppercase" || value === "lowercase" || value === "capitalize" || value === "none") return value;
  return undefined;
}

function normalizeTextDecoration(value: WebBrainStyle["textDecoration"]) {
  if (value === "underline" || value === "line-through" || value === "underline line-through" || value === "none") return value;
  return undefined;
}

function normalizeTextEffect(effect?: WebBrainTextEffect): WebBrainTextEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    trigger: source.trigger ?? "appear",
    preset: source.preset ?? "blur",
    per: source.per ?? "character",
    enter: normalizeTransform(source.enter),
    delay: source.delay === undefined ? undefined : clampFloat(source.delay, 0, 0, 3)
  };
}

function normalizeAppearEffect(effect?: WebBrainAppearEffect): WebBrainAppearEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    trigger: source.trigger ?? "appear",
    preset: source.preset ?? "fade-in",
    enter: normalizeTransform(source.enter),
    delay: source.delay === undefined ? undefined : clampFloat(source.delay, 0, 0, 3)
  };
}

function normalizePressEffect(effect?: WebBrainPressEffect): WebBrainPressEffect {
  const source = effect ?? {};

  return {
    ...normalizeTransform(source),
    enabled: source.enabled,
    rotateMode: source.rotateMode ?? "2d",
    transition: normalizeTransition(source.transition)
  };
}

function normalizeLoopEffect(effect?: WebBrainLoopEffect): WebBrainLoopEffect {
  const source = effect ?? {};

  return {
    ...normalizeTransform(source),
    enabled: source.enabled,
    mode: source.mode ?? "loop",
    rotateMode: source.rotateMode ?? "2d",
    delay: source.delay === undefined ? undefined : clampFloat(source.delay, 0, 0, 3),
    offscreen: source.offscreen ?? "play",
    transition: normalizeTransition(source.transition)
  };
}

function normalizeDragEffect(effect?: WebBrainDragEffect): WebBrainDragEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    freeform: source.freeform ?? true,
    snapBack: source.snapBack ?? true,
    transition: normalizeTransition(source.transition)
  };
}

function normalizeScrollSpeedEffect(effect?: WebBrainScrollSpeedEffect): WebBrainScrollSpeedEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    speed: source.speed === undefined ? undefined : clampFloat(source.speed, 100, 10, 300)
  };
}

function normalizeScrollTransformEffect(effect?: WebBrainScrollTransformEffect): WebBrainScrollTransformEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    trigger: "scroll",
    from: normalizeTransform(source.from),
    to: normalizeTransform(source.to),
    transition: normalizeTransition(source.transition)
  };
}

function normalizeFlowEffect(effect?: WebBrainFlowEffect): WebBrainFlowEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    transition: normalizeTransition(source.transition)
  };
}

function normalizeTickerEffect(effect?: WebBrainTickerEffect): WebBrainTickerEffect {
  const source = effect ?? {};

  return {
    enabled: source.enabled,
    speed: source.speed === undefined ? undefined : clampFloat(source.speed, 100, 10, 300),
    hoverSpeed: source.hoverSpeed === undefined ? undefined : clampFloat(source.hoverSpeed, 100, 10, 300),
    direction: source.direction ?? "left",
    draggable: source.draggable ?? false
  };
}

function normalizeTransform(transform?: WebBrainTransform): WebBrainTransform {
  const source = transform ?? {};

  return {
    opacity: source.opacity === undefined ? undefined : clampFloat(source.opacity, 1, 0, 1),
    scale: source.scale === undefined ? undefined : clampFloat(source.scale, 1, 0.1, 3),
    rotateX: source.rotateX === undefined ? undefined : clampFloat(source.rotateX, 0, -180, 180),
    rotateY: source.rotateY === undefined ? undefined : clampFloat(source.rotateY, 0, -180, 180),
    rotateZ: source.rotateZ === undefined ? undefined : clampFloat(source.rotateZ, 0, -180, 180),
    skewX: source.skewX === undefined ? undefined : clampFloat(source.skewX, 0, -60, 60),
    skewY: source.skewY === undefined ? undefined : clampFloat(source.skewY, 0, -60, 60),
    offsetX: source.offsetX === undefined ? undefined : clampFloat(source.offsetX, 0, -240, 240),
    offsetY: source.offsetY === undefined ? undefined : clampFloat(source.offsetY, 0, -240, 240),
    shadow: source.shadow === undefined ? undefined : clampFloat(source.shadow, 0, 0, 80)
  };
}

function normalizeTransition(transition?: WebBrainTransition): WebBrainTransition {
  const source = transition ?? {};

  return {
    type: source.type ?? "ease",
    duration: source.duration === undefined ? undefined : clampFloat(source.duration, 0.28, 0, 4),
    delay: source.delay === undefined ? undefined : clampFloat(source.delay, 0, 0, 3),
    easing: source.easing,
    bezier: source.bezier,
    stiffness: source.stiffness === undefined ? undefined : clampFloat(source.stiffness, 260, 20, 700),
    damping: source.damping === undefined ? undefined : clampFloat(source.damping, 22, 1, 80),
    mass: source.mass === undefined ? undefined : clampFloat(source.mass, 1, 0.1, 5)
  };
}

function normalizeOverlay(overlay?: WebBrainOverlay): WebBrainOverlay {
  const source = overlay ?? {};

  return {
    enabled: source.enabled,
    text: source.text,
    color: source.color,
    opacity: source.opacity === undefined ? undefined : clampFloat(source.opacity, 0.35, 0, 1),
    blendMode: source.blendMode,
    position: source.position ?? "bottom",
    align: source.align ?? "center",
    offsetX: source.offsetX === undefined ? undefined : clampFloat(source.offsetX, 0, -240, 240),
    offsetY: source.offsetY === undefined ? undefined : clampFloat(source.offsetY, 10, -240, 240),
    dismiss: source.dismiss ?? "auto",
    collision: source.collision ?? "auto",
    collisionPadding: source.collisionPadding === undefined ? undefined : clampFloat(source.collisionPadding, 20, 0, 120),
    zIndex: source.zIndex === undefined ? undefined : clampFloat(source.zIndex, 0, 0, 999)
  };
}

export function findWebBrainComponent(document: WebBrainDocument, componentId: string | null): WebBrainComponent | null {
  if (!componentId) return null;

  return document.components.find((componentItem) => componentItem.id === componentId) ?? null;
}

export function getComponentChildren(document: WebBrainDocument, component: WebBrainComponent) {
  return component.children
    .map((childId) => document.components.find((componentItem) => componentItem.id === childId))
    .filter((child): child is WebBrainComponent => Boolean(child));
}

export function updateWebBrainComponent(
  document: WebBrainDocument,
  componentId: string,
  updater: (component: WebBrainComponent) => WebBrainComponent
): WebBrainDocument {
  return {
    ...document,
    components: document.components.map((componentItem) => (componentItem.id === componentId ? updater(componentItem) : componentItem))
  };
}

export function patchWebBrainComponent(
  document: WebBrainDocument,
  componentId: string,
  patch: {
    props?: Partial<WebBrainProps>;
    style?: Partial<WebBrainStyle>;
    effects?: Partial<WebBrainEffects>;
  }
): WebBrainDocument {
  return updateWebBrainComponent(document, componentId, (componentItem) => ({
    ...componentItem,
    props: {
      ...componentItem.props,
      ...(patch.props ?? {})
    },
    style: normalizeStyle({
      ...componentItem.style,
      ...(patch.style ?? {})
    }),
    effects: normalizeEffects({
      ...componentItem.effects,
      ...(patch.effects ?? {}),
      transform: {
        ...(componentItem.effects?.transform ?? {}),
        ...(patch.effects?.transform ?? {})
      },
      hover: {
        ...(componentItem.effects?.hover ?? {}),
        ...(patch.effects?.hover ?? {})
      },
      textEffect: {
        ...(componentItem.effects?.textEffect ?? {}),
        ...(patch.effects?.textEffect ?? {}),
        enter: {
          ...(componentItem.effects?.textEffect?.enter ?? {}),
          ...(patch.effects?.textEffect?.enter ?? {})
        }
      },
      appear: {
        ...(componentItem.effects?.appear ?? {}),
        ...(patch.effects?.appear ?? {}),
        enter: {
          ...(componentItem.effects?.appear?.enter ?? {}),
          ...(patch.effects?.appear?.enter ?? {})
        }
      },
      press: {
        ...(componentItem.effects?.press ?? {}),
        ...(patch.effects?.press ?? {}),
        transition: {
          ...(componentItem.effects?.press?.transition ?? {}),
          ...(patch.effects?.press?.transition ?? {})
        }
      },
      loop: {
        ...(componentItem.effects?.loop ?? {}),
        ...(patch.effects?.loop ?? {}),
        transition: {
          ...(componentItem.effects?.loop?.transition ?? {}),
          ...(patch.effects?.loop?.transition ?? {})
        }
      },
      drag: {
        ...(componentItem.effects?.drag ?? {}),
        ...(patch.effects?.drag ?? {}),
        transition: {
          ...(componentItem.effects?.drag?.transition ?? {}),
          ...(patch.effects?.drag?.transition ?? {})
        }
      },
      scrollSpeed: {
        ...(componentItem.effects?.scrollSpeed ?? {}),
        ...(patch.effects?.scrollSpeed ?? {})
      },
      scrollTransform: {
        ...(componentItem.effects?.scrollTransform ?? {}),
        ...(patch.effects?.scrollTransform ?? {}),
        from: {
          ...(componentItem.effects?.scrollTransform?.from ?? {}),
          ...(patch.effects?.scrollTransform?.from ?? {})
        },
        to: {
          ...(componentItem.effects?.scrollTransform?.to ?? {}),
          ...(patch.effects?.scrollTransform?.to ?? {})
        },
        transition: {
          ...(componentItem.effects?.scrollTransform?.transition ?? {}),
          ...(patch.effects?.scrollTransform?.transition ?? {})
        }
      },
      flow: {
        ...(componentItem.effects?.flow ?? {}),
        ...(patch.effects?.flow ?? {}),
        transition: {
          ...(componentItem.effects?.flow?.transition ?? {}),
          ...(patch.effects?.flow?.transition ?? {})
        }
      },
      ticker: {
        ...(componentItem.effects?.ticker ?? {}),
        ...(patch.effects?.ticker ?? {})
      },
      overlay: {
        ...(componentItem.effects?.overlay ?? {}),
        ...(patch.effects?.overlay ?? {})
      },
      transition: {
        ...(componentItem.effects?.transition ?? {}),
        ...(patch.effects?.transition ?? {})
      }
    })
  }));
}

export function removeWebBrainComponent(document: WebBrainDocument, componentId: string): WebBrainDocument {
  if (!componentId || document.pages.some((page) => page.rootComponentId === componentId)) return document;

  const componentsById = new Map(document.components.map((componentItem) => [componentItem.id, componentItem]));
  const removedIds = new Set<string>();

  function markForRemoval(id: string) {
    if (removedIds.has(id)) return;

    removedIds.add(id);
    const componentItem = componentsById.get(id);
    componentItem?.children.forEach(markForRemoval);
  }

  markForRemoval(componentId);

  return {
    ...document,
    components: document.components
      .filter((componentItem) => !removedIds.has(componentItem.id))
      .map((componentItem) => ({
        ...componentItem,
        children: componentItem.children.filter((childId) => !removedIds.has(childId))
      }))
  };
}

export function moveWebBrainComponent(
  document: WebBrainDocument,
  componentId: string,
  nextParentId: string,
  nextIndex: number
): WebBrainDocument {
  if (!componentId || !nextParentId || componentId === nextParentId) return document;
  if (document.pages.some((page) => page.rootComponentId === componentId)) return document;

  const componentsById = new Map(document.components.map((componentItem) => [componentItem.id, componentItem]));
  const componentItem = componentsById.get(componentId);
  const nextParent = componentsById.get(nextParentId);

  if (!componentItem || !nextParent) return document;

  function containsComponent(rootId: string, targetId: string): boolean {
    const root = componentsById.get(rootId);
    if (!root) return false;
    if (root.children.includes(targetId)) return true;

    return root.children.some((childId) => containsComponent(childId, targetId));
  }

  if (containsComponent(componentId, nextParentId)) return document;

  const currentParent = document.components.find((currentComponent) => currentComponent.children.includes(componentId));
  const currentIndex = currentParent?.children.indexOf(componentId) ?? -1;
  let normalizedIndex = Number.isFinite(nextIndex) ? Math.max(0, Math.round(nextIndex)) : nextParent.children.length;

  if (currentParent?.id === nextParentId && currentIndex >= 0 && normalizedIndex > currentIndex) {
    normalizedIndex -= 1;
  }

  return {
    ...document,
    components: document.components.map((currentComponent) => {
      let children = currentComponent.children;

      if (children.includes(componentId)) {
        children = children.filter((childId) => childId !== componentId);
      }

      if (currentComponent.id === nextParentId) {
        const insertIndex = Math.max(0, Math.min(normalizedIndex, children.length));
        children = [...children.slice(0, insertIndex), componentId, ...children.slice(insertIndex)];
      }

      return children === currentComponent.children
        ? currentComponent
        : {
            ...currentComponent,
            children
          };
    })
  };
}

export function moveWebBrainComponentToSide(
  document: WebBrainDocument,
  componentId: string,
  targetId: string,
  side: "left" | "right",
  rowId: string
): WebBrainDocument {
  if (!componentId || !targetId || !rowId || componentId === targetId) return document;
  if (document.pages.some((page) => page.rootComponentId === componentId || page.rootComponentId === targetId)) return document;

  const componentsById = new Map(document.components.map((componentItem) => [componentItem.id, componentItem]));
  const movedComponent = componentsById.get(componentId);
  const targetComponent = componentsById.get(targetId);
  const targetParent = document.components.find((componentItem) => componentItem.children.includes(targetId));

  if (!movedComponent || !targetComponent || !targetParent || componentsById.has(rowId)) return document;

  function containsComponent(rootId: string, childId: string): boolean {
    const root = componentsById.get(rootId);
    if (!root) return false;
    if (root.children.includes(childId)) return true;

    return root.children.some((nextChildId) => containsComponent(nextChildId, childId));
  }

  if (containsComponent(componentId, targetId)) return document;

  const rowComponent: WebBrainComponent = {
    id: rowId,
    type: "row",
    name: "Ряд",
    props: {},
    style: {
      widthMode: "full",
      gap: 28,
      alignItems: "stretch",
      justify: "start"
    },
    effects: {},
    children: side === "left" ? [componentId, targetId] : [targetId, componentId]
  };

  return {
    ...document,
    components: [
      ...document.components.map((componentItem) => {
        let children = componentItem.children;

        if (children.includes(componentId)) {
          children = children.filter((childId) => childId !== componentId);
        }

        if (componentItem.id === targetParent.id) {
          children = children.map((childId) => (childId === targetId ? rowId : childId));
        }

        return children === componentItem.children
          ? componentItem
          : {
              ...componentItem,
              children
            };
      }),
      rowComponent
    ]
  };
}

export function getWebBrainPage(document: WebBrainDocument, slug?: string) {
  return document.pages.find((page) => page.slug === slug) ?? document.pages[0] ?? null;
}

export function renderWebBrainDocument(document: WebBrainDocument, slug?: string) {
  const normalizedDocument = normalizeWebBrainDocument(document, slug);
  const activePage = getWebBrainPage(normalizedDocument, slug);
  const componentsById = new Map(normalizedDocument.components.map((componentItem) => [componentItem.id, componentItem]));
  const root = activePage ? componentsById.get(activePage.rootComponentId) : null;
  const content = root ? renderComponent(root, componentsById, normalizedDocument.theme) : "";

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(activePage?.name || "WebBrain Site")}</title>
    <style>${documentCss(normalizedDocument.theme)}</style>
  </head>
  <body>${content}<script>${documentRuntimeScript()}</script></body>
</html>`;
}

export function renderWebBrainComponentHtml(document: WebBrainDocument, componentId: string) {
  const normalizedDocument = normalizeWebBrainDocument(document);
  const componentsById = new Map(normalizedDocument.components.map((componentItem) => [componentItem.id, componentItem]));
  const componentItem = componentsById.get(componentId);

  return componentItem ? renderComponent(componentItem, componentsById, normalizedDocument.theme) : "";
}

function renderComponent(componentItem: WebBrainComponent, componentsById: Map<string, WebBrainComponent>, theme: WebBrainDocument["theme"]): string {
  const attrs = editableAttrs(componentItem);
  const children = componentItem.children
    .map((childId) => componentsById.get(childId))
    .filter((child): child is WebBrainComponent => Boolean(child))
    .map((child) => renderComponent(child, componentsById, theme))
    .join("");

  if (componentItem.type === "page") {
    return `<main ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${children}</main>`;
  }

  if (componentItem.type === "header") {
    return `<header ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)} wb-container" style="${componentStyleToString(componentItem)}">
      <a class="wb-brand" href="#top">${escapeHtml(componentItem.props.brand || "Studio")}</a>
      <nav class="wb-nav" aria-label="Навигация">${children}</nav>
    </header>`;
  }

  if (componentItem.type === "navLink") {
    const href = sanitizeHref(componentItem.props.href || "#");
    const style = componentStyleToString(componentItem);

    return `<a ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" href="${href}"${targetAttrs(componentItem)} style="${style}">${escapeHtml(componentItem.props.label || componentItem.name)}</a>`;
  }

  if (componentItem.type === "section") {
    const tag = semanticContainerTag(componentItem, "section");
    return `<${tag} ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)} wb-container" style="${componentStyleToString(componentItem)}">${children}</${tag}>`;
  }

  if (componentItem.type === "footer") {
    const tag = semanticContainerTag(componentItem, "footer");
    return `<${tag} ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)} wb-container" style="${componentStyleToString(componentItem)}">${children}</${tag}>`;
  }

  if (componentItem.type === "container") {
    const tag = semanticContainerTag(componentItem, "div");
    return `<${tag} ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${children}</${tag}>`;
  }

  if (componentItem.type === "row") {
    return `<div ${attrs} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${children}</div>`;
  }

  if (componentItem.type === "column") {
    return `<div ${attrs} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${children}</div>`;
  }

  if (componentItem.type === "grid") {
    const columns = clampNumber(componentItem.props.columns, 3, 1, 6);

    return `<div ${attrs} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)};--wb-columns:${columns};">${children}</div>`;
  }

  if (componentItem.type === "heading") {
    const level = clampNumber(componentItem.props.level, 2, 1, 6);
    const Tag = `h${level}`;

    return `<${Tag} ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${renderRichTextContent(componentItem)}</${Tag}>`;
  }

  if (componentItem.type === "text") {
    const tag = textTag(componentItem.props.tag);
    return `<${tag} ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${renderRichTextContent(componentItem)}</${tag}>`;
  }

  if (componentItem.type === "button") {
    const href = sanitizeHref(componentItem.props.href || "#");
    const variant = componentItem.props.variant || "primary";
    const action = sanitizeActionName(componentItem.props.action);
    const isSubmitButton = action === "submit" || componentItem.props.href === "submit";
    const buttonContent = renderButtonContent(componentItem, isSubmitButton ? "Отправить" : "Кнопка");

    if (isSubmitButton) {
      return `<button ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)} wb-button-${variant}" type="submit" data-webbrain-action="submit" style="${componentStyleToString(componentItem)}">${buttonContent}</button>`;
    }

    return `<a ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)} wb-button-${variant}" href="${href}"${targetAttrs(componentItem)} style="${componentStyleToString(componentItem)}">${buttonContent}</a>`;
  }

  if (componentItem.type === "form") {
    const method = componentItem.props.method === "get" ? "get" : "post";
    const action = sanitizeActionName(componentItem.props.action);

    return `<form ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" action="#" method="${method}" data-webbrain-action="${escapeAttribute(
      action || "lead_submit"
    )}" style="${componentStyleToString(componentItem)}">${children}</form>`;
  }

  if (componentItem.type === "input") {
    const type = inputType(componentItem.props.inputType);
    const name = sanitizeFieldName(componentItem.props.name || componentItem.id);
    const label = componentItem.props.label || componentItem.name || "Поле";
    const required = componentItem.props.required ? " required" : "";

    return `<label ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}"><span class="wb-input-label">${escapeHtml(
      label
    )}</span><input class="wb-input-control" type="${type}" name="${escapeAttribute(name)}" placeholder="${escapeAttribute(
      componentItem.props.placeholder || ""
    )}"${required} /></label>`;
  }

  if (componentItem.type === "textarea") {
    const name = sanitizeFieldName(componentItem.props.name || componentItem.id);
    const label = componentItem.props.label || componentItem.name || "Сообщение";
    const required = componentItem.props.required ? " required" : "";

    return `<label ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}"><span class="wb-input-label">${escapeHtml(
      label
    )}</span><textarea class="wb-input-control wb-textarea-control" name="${escapeAttribute(name)}" placeholder="${escapeAttribute(
      componentItem.props.placeholder || ""
    )}"${required}></textarea></label>`;
  }

  if (componentItem.type === "cardGrid") {
    const columns = clampNumber(componentItem.props.columns, 3, 1, 6);

    return `<section ${attrs} id="services" class="${componentClassName(componentItem)} wb-container" style="${componentStyleToString(componentItem)};--wb-columns:${columns};">${children}</section>`;
  }

  if (componentItem.type === "card") {
    return `<article ${attrs} class="${componentClassName(componentItem)}" style="${componentStyleToString(componentItem)}">${children}</article>`;
  }

  if (componentItem.type === "image") {
    const src = componentItem.props.src || "";

    return `<img ${attrs}${ariaAttrs(componentItem)} class="${componentClassName(componentItem)}" src="${escapeAttribute(src)}" alt="${escapeAttribute(componentItem.props.alt || "")}" style="${componentStyleToString(
      componentItem
    )}" />`;
  }

  const stackStyle: WebBrainStyle = {
    ...componentItem.style,
    direction: componentItem.style.direction ?? (componentItem.props.layout === "vertical" ? "column" : "row")
  };

  return `<div ${attrs} class="${componentClassName(componentItem)}" style="${componentStyleToString({ ...componentItem, style: stackStyle })}">${children}</div>`;
}

function renderButtonContent(componentItem: WebBrainComponent, fallbackLabel: string) {
  const props = componentItem.props;
  const text = `<span class="wb-button-icon-text">${escapeHtml(props.label || fallbackLabel)}</span>`;
  const iconEnabled = isButtonIconEnabled(props);

  if (!iconEnabled) return text;

  const position = props.buttonIconPosition === "left" ? "left" : "right";
  const size = clampNumber(props.buttonIconSize, 30, 14, 72);
  const gap = clampNumber(props.buttonIconGap, 12, 0, 40);
  const radius = clampNumber(props.buttonIconRadius, 999, 0, 999);
  const color = props.buttonIconColor || "currentColor";
  const background = props.buttonIconBackground || "rgba(0,0,0,0.12)";
  const iconStyle = [
    `width:${size}px`,
    `height:${size}px`,
    `border-radius:${radius}px`,
    `color:${escapeAttribute(color)}`,
    `background:${escapeAttribute(background)}`,
    position === "left" ? `margin-right:${gap}px` : `margin-left:${gap}px`
  ].join(";");
  const icon = `<span class="wb-button-icon wb-button-icon-${position}" aria-hidden="true" style="${iconStyle}">${buttonIconSvg(props.buttonIcon)}</span>`;

  return position === "left" ? `${icon}${text}` : `${text}${icon}`;
}

function isButtonIconEnabled(props: WebBrainProps) {
  if (props.buttonIconEnabled !== undefined) return props.buttonIconEnabled;
  return props.variant === "primary" || props.variant === "lime3d" || props.variant === undefined;
}

function buttonIconSvg(icon: WebBrainProps["buttonIcon"]) {
  if (icon === "arrowUpRight") {
    return '<svg viewBox="0 0 24 24"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
  }

  if (icon === "chevronRight") {
    return '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
  }

  if (icon === "plus") {
    return '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  }

  if (icon === "send") {
    return '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  }

  return '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
}

function renderRichTextContent(componentItem: WebBrainComponent) {
  const props = componentItem.props;
  const text = props.text || "";
  const accentText = props.textAccentText?.trim() ?? "";

  if (!text) return "";
  if (!props.textAccentEnabled || !accentText) return escapeHtmlWithLineBreaks(text);

  const accentStart = text.toLocaleLowerCase().indexOf(accentText.toLocaleLowerCase());
  if (accentStart < 0) return escapeHtmlWithLineBreaks(text);

  const before = text.slice(0, accentStart);
  const accent = text.slice(accentStart, accentStart + accentText.length);
  const after = text.slice(accentStart + accentText.length);
  const accentStyle = [
    props.textAccentColor ? `--wb-rich-accent-color:${escapeAttribute(props.textAccentColor)}` : "",
    props.textAccentWeight ? `--wb-rich-accent-weight:${clampNumber(props.textAccentWeight, 900, 100, 1000)}` : "",
    props.textAccentItalic ? "font-style:italic" : "",
    props.textAccentTransform && props.textAccentTransform !== "none" ? `text-transform:${props.textAccentTransform}` : "",
    props.textAccentDecoration && props.textAccentDecoration !== "none" ? `text-decoration-line:${props.textAccentDecoration}` : ""
  ].filter(Boolean).join(";");
  const accentClass = props.textAccentLineBreak ? "wb-rich-accent wb-rich-accent-block" : "wb-rich-accent";

  return `${escapeHtmlWithLineBreaks(before)}<span class="${accentClass}"${accentStyle ? ` style="${accentStyle}"` : ""}>${escapeHtmlWithLineBreaks(accent)}</span>${escapeHtmlWithLineBreaks(after)}`;
}

function escapeHtmlWithLineBreaks(value: string) {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br/>");
}

function ariaAttrs(componentItem: WebBrainComponent) {
  return componentItem.props.ariaLabel ? ` aria-label="${escapeAttribute(componentItem.props.ariaLabel)}"` : "";
}

function targetAttrs(componentItem: WebBrainComponent) {
  return componentItem.props.target === "_blank" ? ` target="_blank" rel="noreferrer"` : "";
}

function semanticContainerTag(componentItem: WebBrainComponent, fallback: "div" | "section" | "footer") {
  const tag = componentItem.props.tag;
  if (tag === "section" || tag === "article" || tag === "header" || tag === "footer" || tag === "nav" || tag === "main" || tag === "div") return tag;

  return fallback;
}

function textTag(tag?: WebBrainProps["tag"]) {
  if (tag === "span" || tag === "div" || tag === "p") return tag;

  return "p";
}

function inputType(type?: WebBrainProps["inputType"]) {
  if (type === "email" || type === "tel" || type === "number" || type === "date" || type === "time" || type === "hidden") return type;

  return "text";
}

function sanitizeActionName(action?: string) {
  const value = String(action || "").trim();
  if (!value) return "";

  return value.replace(/[^\w:.-]/g, "_").slice(0, 80);
}

function sanitizeFieldName(name: string) {
  const value = String(name || "").trim().replace(/[^\w.-]/g, "_");

  return value || "field";
}

function documentRuntimeScript() {
  return `(() => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── In-page navigation: make header/nav links actually scroll to their section ──
  // The AI's hash often doesn't match the section id (Russian labels), so we resolve by
  // hash → by intent → by heading text, and offset the scroll by the sticky-header height.
  const wbStickyHeader = document.querySelector("[data-webbrain-type='header']");
  const wbApplyScrollPadding = () => {
    if (!wbStickyHeader) return;
    const cs = window.getComputedStyle(wbStickyHeader);
    if (cs.position === "sticky" || cs.position === "fixed") {
      document.documentElement.style.scrollPaddingTop = (wbStickyHeader.getBoundingClientRect().height + 16) + "px";
    }
  };
  wbApplyScrollPadding();
  window.addEventListener("resize", wbApplyScrollPadding);
  const wbNorm = (v) => String(v || "").toLowerCase().split("ё").join("е").trim();
  const wbById = (id) => { if (!id) return null; try { return document.getElementById(id); } catch (e) { return null; } };
  const wbIntentTarget = (label) => {
    const t = wbNorm(label);
    if (!t) return null;
    const has = (arr) => arr.some((w) => t.indexOf(w) !== -1);
    const tryIds = (ids) => { for (const id of ids) { const el = wbById(id); if (el) return el; } return null; };
    let el = null;
    if (has(["меню", "товар", "услуг", "каталог", "прайс", "цен"])) el = tryIds(["menu", "services", "pricing", "catalog", "price"]);
    else if (has(["атмосфер", "о нас", "о кофейн", "истор", "about", "команд"])) el = tryIds(["about", "atmosphere", "story", "team"]);
    else if (has(["отзыв", "review"])) el = tryIds(["reviews", "testimonials"]);
    else if (has(["карт", "адрес", "найти", "контакт", "map", "contact"])) el = tryIds(["contact", "map", "location", "contacts"]);
    else if (has(["преимущ", "почему", "features", "выгод"])) el = tryIds(["features", "benefits", "why"]);
    else if (has(["галере", "фото", "gallery"])) el = tryIds(["gallery", "photos"]);
    else if (has(["бронир", "заявк", "запис", "booking"])) el = tryIds(["booking", "contact", "cta"]);
    if (el) return el;
    const secs = Array.from(document.querySelectorAll("section[id], [data-webbrain-type='section']"));
    for (const sec of secs) {
      const h = sec.querySelector("h1,h2,h3");
      if (h && wbNorm(h.textContent).indexOf(t) !== -1) return sec;
    }
    return null;
  };
  document.addEventListener("click", (event) => {
    const link = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const hash = decodeURIComponent((link.getAttribute("href") || "").slice(1) || "");
    let target = null;
    if (hash && hash !== "top") target = wbById(hash);
    if (!target) target = wbIntentTarget(link.textContent || link.getAttribute("aria-label") || "");
    if (!target && (hash === "top" || hash === "")) target = document.querySelector(".wb-page") || document.body;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });

  const getNumber = (style, name, fallback) => {
    const raw = style.getPropertyValue(name).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  const markVisible = (element) => element.classList.add("wb-in-view");
  const revealElements = Array.from(document.querySelectorAll(".wb-has-appear-effect, .wb-has-text-effect"));
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(markVisible);
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          markVisible(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.14 });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-webbrain-type='form']")) return;

    event.preventDefault();
    form.dataset.webbrainSubmitState = "prepared";
    form.dispatchEvent(new CustomEvent("webbrain:action", {
      bubbles: true,
      detail: {
        action: form.dataset.webbrainAction || "lead_submit",
        values: Object.fromEntries(new FormData(form).entries())
      }
    }));
  });

  const scrollElements = Array.from(document.querySelectorAll(".wb-has-scroll-transform-effect, .wb-has-scroll-speed-effect"));
  if (!scrollElements.length || prefersReducedMotion) return;

  let ticking = false;
  const updateScrollEffects = () => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    scrollElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + Math.max(rect.height, 1)), 0, 1);
      const style = window.getComputedStyle(element);

      if (element.classList.contains("wb-has-scroll-transform-effect")) {
        const fromOpacity = getNumber(style, "--wb-scroll-from-opacity", getNumber(style, "--wb-opacity", 1));
        const toOpacity = getNumber(style, "--wb-scroll-to-opacity", getNumber(style, "--wb-opacity", 1));
        const fromScale = getNumber(style, "--wb-scroll-from-scale", getNumber(style, "--wb-scale", 1));
        const toScale = getNumber(style, "--wb-scroll-to-scale", getNumber(style, "--wb-scale", 1));
        const fromOffsetX = getNumber(style, "--wb-scroll-from-offset-x", getNumber(style, "--wb-offset-x", 0));
        const toOffsetX = getNumber(style, "--wb-scroll-to-offset-x", getNumber(style, "--wb-offset-x", 0));
        const fromOffsetY = getNumber(style, "--wb-scroll-from-offset-y", getNumber(style, "--wb-offset-y", 0));
        const toOffsetY = getNumber(style, "--wb-scroll-to-offset-y", getNumber(style, "--wb-offset-y", 0));
        const fromRotateZ = getNumber(style, "--wb-scroll-from-rotate-z", getNumber(style, "--wb-rotate-z", 0));
        const toRotateZ = getNumber(style, "--wb-scroll-to-rotate-z", getNumber(style, "--wb-rotate-z", 0));

        element.style.setProperty("--wb-opacity", String(fromOpacity + (toOpacity - fromOpacity) * progress));
        element.style.setProperty("--wb-scale", String(fromScale + (toScale - fromScale) * progress));
        element.style.setProperty("--wb-offset-x", \`\${fromOffsetX + (toOffsetX - fromOffsetX) * progress}px\`);
        element.style.setProperty("--wb-offset-y", \`\${fromOffsetY + (toOffsetY - fromOffsetY) * progress}px\`);
        element.style.setProperty("--wb-rotate-z", \`\${fromRotateZ + (toRotateZ - fromRotateZ) * progress}deg\`);
      }

      if (element.classList.contains("wb-has-scroll-speed-effect")) {
        const speed = getNumber(style, "--wb-scroll-speed", 110);
        const distance = clamp((speed - 100) * 0.9, -120, 180);
        element.style.setProperty("--wb-offset-y", \`\${(0.5 - progress) * distance}px\`);
      }
    });
    ticking = false;
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScrollEffects);
    }
  };

  requestUpdate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
})();`;
}

function documentCss(theme: WebBrainDocument["theme"]) {
  return `
:root {
  color-scheme: dark;
  --wb-bg: ${theme.background};
  --wb-text: ${theme.text};
  --wb-muted: ${theme.muted};
  --wb-accent: ${theme.accent};
  --wb-primary: ${theme.primary};
  --wb-on-primary: ${theme.onPrimary};
  --wb-panel: ${theme.panel};
  --wb-line: ${theme.line};
  --wb-surface: ${theme.surface};
  --wb-surface-soft: ${theme.surfaceSoft};
  --wb-surface-strong: ${theme.surfaceStrong};
  --wb-border: ${theme.border};
  --wb-border-soft: ${theme.borderSoft};
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: var(--wb-bg); }
html { overflow-x: hidden; overflow-y: auto; }
/* clip (not hidden): kills horizontal scroll from full-bleed sections WITHOUT
   turning body/.wb-page into scroll containers — otherwise they'd steal
   position:sticky from the header (it would stop pinning on scroll). */
body { overflow-x: clip; }
body {
  color: var(--wb-text);
  font-family: Geist, "Geist Sans", "SF Pro Display", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; }
[data-webbrain-type="page"],
[data-webbrain-type="section"],
[data-webbrain-type="footer"],
[data-webbrain-type="container"],
[data-webbrain-type="row"],
[data-webbrain-type="column"],
[data-webbrain-type="grid"],
[data-webbrain-type="stack"],
[data-webbrain-type="form"],
[data-webbrain-type="card"],
[data-webbrain-type="cardGrid"] {
  position: relative;
}
.wb-page {
  min-height: 100vh;
  /* clip, not hidden — see note above: keeps position:sticky working on the header. */
  overflow-x: clip;
  background: var(--wb-bg);
}
.wb-container {
  width: min(var(--wb-max-width, 1120px), calc(100% - 32px));
  margin-left: auto;
  margin-right: auto;
}
.wb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 3;
  backdrop-filter: blur(18px);
}
.wb-brand { font-size: 1.05rem; font-weight: 850; }
.wb-nav { display: flex; align-items: center; gap: 22px; }
.wb-nav-link { font-size: 0.94rem; font-weight: 650; transition: color 160ms ease; }
.wb-nav-link:hover { color: var(--wb-hover-color, var(--wb-primary)) !important; }
.wb-section { display: flex; flex-direction: column; }
.wb-page > .wb-section:first-of-type {
  min-height: max(720px, calc(100dvh - 32px));
}
.wb-footer {
  display: flex;
  flex-direction: column;
}
.wb-layout-container {
  display: flex;
  flex-direction: column;
  width: min(var(--wb-max-width, 1120px), 100%);
  margin-left: auto;
  margin-right: auto;
}
.wb-row {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}
.wb-column {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
}
.wb-grid {
  display: grid;
  grid-template-columns: repeat(var(--wb-columns, 3), minmax(0, 1fr));
}
.wb-heading {
  max-width: 20em;
  letter-spacing: -0.025em;
  line-height: 1.08;
  font-weight: 800;
  text-wrap: balance;
}
.wb-text {
  max-width: 40ch;
  line-height: 1.62;
  text-wrap: pretty;
}
/* Premium hero: big, confident, responsive headline (the "expensive" look) */
.wb-page > .wb-section:first-of-type .wb-heading,
.wb-page > .wb-section:first-of-type .wb-hero-heading {
  font-size: clamp(2.75rem, 6.5vw, 5.25rem) !important;
  line-height: 1.02;
  letter-spacing: -0.035em;
  max-width: 16em;
}
@media (max-width: 720px) {
  .wb-page > .wb-section:first-of-type .wb-heading {
    font-size: clamp(2.1rem, 10vw, 3rem) !important;
  }
}
.wb-rich-accent {
  color: var(--wb-rich-accent-color, var(--wb-primary));
  font-weight: var(--wb-rich-accent-weight, inherit);
}
.wb-rich-accent-block {
  display: block;
}
.wb-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.wb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 46px;
  border-radius: 999px;
  padding: 0 1.45rem;
  font-weight: 850;
  position: relative;
  isolation: isolate;
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms cubic-bezier(0.22, 1, 0.36, 1);
  border: 0;
  cursor: pointer;
}
.wb-button:hover { transform: translateY(-1px); opacity: 0.92; }
.wb-button-primary {
  background: var(--wb-primary);
  color: var(--wb-on-primary);
  box-shadow: 0 18px 44px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.18);
}
.wb-button-secondary { background: rgba(255,255,255,0.035); }
.wb-button-outline {
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--wb-primary) 70%, white 8%);
}
.wb-button-glass {
  border-color: rgba(255,255,255,0.16) !important;
  background: rgba(255,255,255,0.07);
  backdrop-filter: blur(18px) saturate(1.25);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 18px 60px rgba(0,0,0,0.28);
}
.wb-button-lime3d {
  border-color: color-mix(in srgb, var(--wb-primary) 78%, white 12%) !important;
  background: var(--wb-primary);
  color: var(--wb-on-primary);
  box-shadow: 0 10px 0 color-mix(in srgb, var(--wb-primary) 42%, black 58%), 0 22px 52px rgba(0,0,0,0.36);
}
.wb-button-lime3d:hover {
  transform: translateY(-3px);
  box-shadow: 0 13px 0 color-mix(in srgb, var(--wb-primary) 42%, black 58%), 0 28px 66px rgba(0,0,0,0.42);
}
.wb-button-lime3d:active {
  transform: translateY(3px) scale(0.99);
  box-shadow: 0 5px 0 color-mix(in srgb, var(--wb-primary) 42%, black 58%), 0 15px 36px rgba(0,0,0,0.36);
}
.wb-button-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transform: translate3d(0, 0, 0);
  transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), background 360ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wb-button-icon svg {
  display: block;
  width: 62%;
  height: 62%;
  stroke: currentColor;
  stroke-width: 2.25;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.wb-button-icon-text {
  min-width: 0;
}
.wb-button:hover .wb-button-icon {
  transform: translate3d(3px, -1px, 0);
}
.wb-button:hover .wb-button-icon-left {
  transform: translate3d(-3px, -1px, 0);
}
.wb-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}
.wb-input-field,
.wb-textarea-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.wb-input-label {
  color: color-mix(in srgb, var(--wb-text) 76%, transparent);
  font-size: 0.82rem;
  font-weight: 760;
}
.wb-input-control {
  width: 100%;
  min-height: 50px;
  border: 1px solid var(--wb-border);
  border-radius: 16px;
  background: rgba(255,255,255,0.055);
  color: var(--wb-text);
  font: inherit;
  padding: 0 16px;
  outline: none;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.wb-input-control::placeholder { color: color-mix(in srgb, var(--wb-muted) 72%, transparent); }
.wb-input-control:focus {
  border-color: color-mix(in srgb, var(--wb-primary) 72%, white 8%);
  background: rgba(255,255,255,0.075);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wb-primary) 16%, transparent);
}
.wb-textarea-control {
  min-height: 118px;
  padding-top: 14px;
  resize: vertical;
}
.wb-card-grid {
  display: grid;
  grid-template-columns: repeat(var(--wb-columns, 3), minmax(0, 1fr));
}
.wb-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.wb-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 48px rgba(0,0,0,0.14);
}
.wb-card > .wb-image {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
}
.wb-image {
  display: block;
  max-width: min(100%, var(--wb-max-width, 720px));
  height: auto;
}
[data-webbrain-id] {
  cursor: var(--wb-cursor, default);
  opacity: var(--wb-opacity, 1);
  transform:
    translate3d(var(--wb-offset-x, 0px), var(--wb-offset-y, 0px), 0)
    rotateX(var(--wb-rotate-x, 0deg))
    rotateY(var(--wb-rotate-y, 0deg))
    rotateZ(var(--wb-rotate-z, 0deg))
    skew(var(--wb-skew-x, 0deg), var(--wb-skew-y, 0deg))
    scale(var(--wb-scale, 1));
  transform-style: preserve-3d;
  transform-origin: center;
  transition:
    transform var(--wb-transition-duration, 180ms) var(--wb-transition-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--wb-transition-delay, 0ms),
    opacity var(--wb-transition-duration, 180ms) var(--wb-transition-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--wb-transition-delay, 0ms),
    box-shadow var(--wb-transition-duration, 180ms) var(--wb-transition-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--wb-transition-delay, 0ms);
  will-change: transform, opacity;
}
.wb-effect-hidden { display: none !important; }
.wb-has-overlay {
  position: relative;
  isolation: isolate;
}
.wb-has-overlay::after {
  content: attr(data-webbrain-overlay);
  position: absolute;
  top: calc(100% + var(--wb-overlay-offset-y, 10px));
  left: 50%;
  z-index: var(--wb-overlay-z, 40);
  min-width: max-content;
  max-width: min(280px, 82vw);
  padding: 10px 12px;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--wb-border) 80%, white 8%);
  border-radius: 14px;
  background: var(--wb-overlay-color, rgba(18,20,21,0.96));
  color: var(--wb-text);
  box-shadow: 0 18px 50px rgba(0,0,0,0.46);
  font-size: 14px;
  font-weight: 750;
  line-height: 1.35;
  opacity: 0;
  white-space: normal;
  text-align: left;
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), -8px) scale(0.98);
  transition:
    opacity var(--wb-transition-duration, 180ms) var(--wb-transition-ease, cubic-bezier(0.22, 1, 0.36, 1)),
    transform var(--wb-transition-duration, 180ms) var(--wb-transition-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.wb-has-overlay:hover::after,
.wb-has-overlay:focus-visible::after {
  opacity: var(--wb-overlay-opacity, 1);
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), 0) scale(1);
}
.wb-has-overlay[data-webbrain-overlay-position="top"]::after {
  top: auto;
  bottom: calc(100% + var(--wb-overlay-offset-y, 10px));
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), 8px) scale(0.98);
}
.wb-has-overlay[data-webbrain-overlay-position="top"]:hover::after,
.wb-has-overlay[data-webbrain-overlay-position="top"]:focus-visible::after {
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), 0) scale(1);
}
.wb-has-overlay[data-webbrain-overlay-position="right"]::after {
  top: 50%;
  left: calc(100% + var(--wb-overlay-offset-x, 10px));
  transform: translate(8px, calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(0.98);
}
.wb-has-overlay[data-webbrain-overlay-position="right"]:hover::after,
.wb-has-overlay[data-webbrain-overlay-position="right"]:focus-visible::after {
  transform: translate(0, calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(1);
}
.wb-has-overlay[data-webbrain-overlay-position="left"]::after {
  top: 50%;
  right: calc(100% + var(--wb-overlay-offset-x, 10px));
  left: auto;
  transform: translate(-8px, calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(0.98);
}
.wb-has-overlay[data-webbrain-overlay-position="left"]:hover::after,
.wb-has-overlay[data-webbrain-overlay-position="left"]:focus-visible::after {
  transform: translate(0, calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(1);
}
.wb-has-overlay[data-webbrain-overlay-position="center"]::after {
  top: 50%;
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(0.98);
}
.wb-has-overlay[data-webbrain-overlay-position="center"]:hover::after,
.wb-has-overlay[data-webbrain-overlay-position="center"]:focus-visible::after {
  transform: translate(calc(-50% + var(--wb-overlay-offset-x, 0px)), calc(-50% + var(--wb-overlay-offset-y, 0px))) scale(1);
}
.wb-has-hover-effect:hover {
  opacity: var(--wb-hover-opacity, var(--wb-opacity, 1));
  transform:
    translate3d(var(--wb-hover-offset-x, var(--wb-offset-x, 0px)), var(--wb-hover-offset-y, var(--wb-offset-y, 0px)), 0)
    rotateX(var(--wb-hover-rotate-x, var(--wb-rotate-x, 0deg)))
    rotateY(var(--wb-hover-rotate-y, var(--wb-rotate-y, 0deg)))
    rotateZ(var(--wb-hover-rotate-z, var(--wb-rotate-z, 0deg)))
    skew(var(--wb-hover-skew-x, var(--wb-skew-x, 0deg)), var(--wb-hover-skew-y, var(--wb-skew-y, 0deg)))
    scale(var(--wb-hover-scale, var(--wb-scale, 1)));
  box-shadow: var(--wb-hover-shadow, inherit);
}
.wb-has-press-effect:active {
  opacity: var(--wb-press-opacity, var(--wb-opacity, 1));
  transform:
    translate3d(var(--wb-press-offset-x, var(--wb-offset-x, 0px)), var(--wb-press-offset-y, var(--wb-offset-y, 0px)), 0)
    rotateX(var(--wb-press-rotate-x, var(--wb-rotate-x, 0deg)))
    rotateY(var(--wb-press-rotate-y, var(--wb-rotate-y, 0deg)))
    rotateZ(var(--wb-press-rotate-z, var(--wb-rotate-z, 0deg)))
    skew(var(--wb-press-skew-x, var(--wb-skew-x, 0deg)), var(--wb-press-skew-y, var(--wb-skew-y, 0deg)))
    scale(var(--wb-press-scale, var(--wb-scale, 1)));
  box-shadow: var(--wb-press-shadow, inherit);
}
.wb-has-loop-effect {
  animation: wb-loop-effect var(--wb-loop-duration, 4s) var(--wb-loop-ease, linear) var(--wb-loop-delay, 0ms) infinite;
  animation-direction: var(--wb-loop-direction, normal);
}
.wb-has-appear-effect {
  opacity: var(--wb-appear-opacity, 0);
  filter: blur(var(--wb-appear-blur, 0px));
  transform:
    translate3d(var(--wb-appear-offset-x, 0px), var(--wb-appear-offset-y, 16px), 0)
    scale(var(--wb-appear-scale, 1));
}
.wb-has-appear-effect.wb-in-view {
  animation: wb-appear-effect var(--wb-appear-duration, 520ms) var(--wb-appear-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--wb-appear-delay, 0ms) both;
}
.wb-has-text-effect {
  opacity: 0;
  filter: blur(var(--wb-text-blur, 10px));
  transform: translateY(var(--wb-text-offset-y, 12px));
}
.wb-has-text-effect.wb-in-view {
  animation: wb-text-effect var(--wb-text-duration, 680ms) var(--wb-text-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--wb-text-delay, 0ms) both;
}
.wb-has-scroll-transform-effect,
.wb-has-scroll-speed-effect {
  will-change: transform, opacity;
}
.wb-has-drag-effect {
  cursor: grab;
}
.wb-has-drag-effect:active {
  cursor: grabbing;
}
.wb-has-ticker-effect {
  animation: wb-ticker-effect var(--wb-ticker-duration, 10s) linear infinite;
}
@keyframes wb-loop-effect {
  from {
    opacity: var(--wb-opacity, 1);
    transform:
      translate3d(var(--wb-offset-x, 0px), var(--wb-offset-y, 0px), 0)
      rotateX(var(--wb-rotate-x, 0deg))
      rotateY(var(--wb-rotate-y, 0deg))
      rotateZ(var(--wb-rotate-z, 0deg))
      skew(var(--wb-skew-x, 0deg), var(--wb-skew-y, 0deg))
      scale(var(--wb-scale, 1));
  }
  to {
    opacity: var(--wb-loop-opacity, var(--wb-opacity, 1));
    transform:
      translate3d(var(--wb-loop-offset-x, var(--wb-offset-x, 0px)), var(--wb-loop-offset-y, var(--wb-offset-y, 0px)), 0)
      rotateX(var(--wb-loop-rotate-x, var(--wb-rotate-x, 0deg)))
      rotateY(var(--wb-loop-rotate-y, var(--wb-rotate-y, 0deg)))
      rotateZ(var(--wb-loop-rotate-z, var(--wb-rotate-z, 0deg)))
      skew(var(--wb-loop-skew-x, var(--wb-skew-x, 0deg)), var(--wb-loop-skew-y, var(--wb-skew-y, 0deg)))
      scale(var(--wb-loop-scale, var(--wb-scale, 1)));
  }
}
@keyframes wb-appear-effect {
  from {
    opacity: var(--wb-appear-opacity, 0);
    filter: blur(var(--wb-appear-blur, 0px));
    transform:
      translate3d(var(--wb-appear-offset-x, 0px), var(--wb-appear-offset-y, 16px), 0)
      scale(var(--wb-appear-scale, 1));
  }
  to {
    opacity: var(--wb-opacity, 1);
    filter: blur(0);
    transform:
      translate3d(var(--wb-offset-x, 0px), var(--wb-offset-y, 0px), 0)
      rotateX(var(--wb-rotate-x, 0deg))
      rotateY(var(--wb-rotate-y, 0deg))
      rotateZ(var(--wb-rotate-z, 0deg))
      skew(var(--wb-skew-x, 0deg), var(--wb-skew-y, 0deg))
      scale(var(--wb-scale, 1));
  }
}
@keyframes wb-text-effect {
  from {
    opacity: 0;
    filter: blur(var(--wb-text-blur, 10px));
    transform: translateY(var(--wb-text-offset-y, 12px));
  }
  to {
    opacity: var(--wb-opacity, 1);
    filter: blur(0);
    transform: translateY(0);
  }
}
@keyframes wb-ticker-effect {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(var(--wb-ticker-x, -16px), var(--wb-ticker-y, 0px), 0); }
}
@media (max-width: 760px) {
  .wb-nav { display: none; }
  .wb-heading { font-size: min(var(--wb-font-size, 48px), 46px) !important; }
  .wb-card-grid,
  .wb-grid { grid-template-columns: 1fr; }
  .wb-row { flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .wb-has-appear-effect,
  .wb-has-text-effect {
    animation: none !important;
    filter: none !important;
    opacity: var(--wb-opacity, 1) !important;
    transform:
      translate3d(var(--wb-offset-x, 0px), var(--wb-offset-y, 0px), 0)
      rotateX(var(--wb-rotate-x, 0deg))
      rotateY(var(--wb-rotate-y, 0deg))
      rotateZ(var(--wb-rotate-z, 0deg))
      skew(var(--wb-skew-x, 0deg), var(--wb-skew-y, 0deg))
      scale(var(--wb-scale, 1)) !important;
  }
}
`;
}

function componentClassName(componentItem: WebBrainComponent) {
  const classes = [componentBaseClassName(componentItem.type)];

  if (componentItem.effects?.hover?.enabled) classes.push("wb-has-hover-effect");
  if (componentItem.effects?.textEffect?.enabled) classes.push("wb-has-text-effect");
  if (componentItem.effects?.appear?.enabled) classes.push("wb-has-appear-effect");
  if (componentItem.effects?.press?.enabled) classes.push("wb-has-press-effect");
  if (componentItem.effects?.loop?.enabled) classes.push("wb-has-loop-effect");
  if (componentItem.effects?.drag?.enabled) classes.push("wb-has-drag-effect");
  if (componentItem.effects?.scrollTransform?.enabled) classes.push("wb-has-scroll-transform-effect");
  if (componentItem.effects?.scrollSpeed?.enabled) classes.push("wb-has-scroll-speed-effect");
  if (componentItem.effects?.flow?.enabled) classes.push("wb-has-flow-effect");
  if (componentItem.effects?.ticker?.enabled) classes.push("wb-has-ticker-effect");
  if (componentItem.type !== "page" && componentItem.effects?.overlay?.enabled) classes.push("wb-has-overlay");
  if (componentItem.effects?.visible === false) classes.push("wb-effect-hidden");

  return classes.join(" ");
}

function componentBaseClassName(type: WebBrainComponentType) {
  if (type === "page") return "wb-page";
  if (type === "header") return "wb-header";
  if (type === "navLink") return "wb-nav-link";
  if (type === "section") return "wb-section";
  if (type === "footer") return "wb-footer";
  if (type === "container") return "wb-layout-container";
  if (type === "row") return "wb-row";
  if (type === "column") return "wb-column";
  if (type === "grid") return "wb-grid";
  if (type === "heading") return "wb-heading";
  if (type === "text") return "wb-text";
  if (type === "button") return "wb-button";
  if (type === "form") return "wb-form";
  if (type === "input") return "wb-input-field";
  if (type === "textarea") return "wb-textarea-field";
  if (type === "cardGrid") return "wb-card-grid";
  if (type === "card") return "wb-card";
  if (type === "image") return "wb-image";
  return "wb-stack";
}

function componentStyleToString(componentItem: WebBrainComponent) {
  return [styleToString(renderableComponentStyle(componentItem)), effectsToString(componentItem.effects)].filter(Boolean).join(";");
}

function renderableComponentStyle(componentItem: WebBrainComponent): WebBrainStyle {
  if (componentItem.type !== "page") return componentItem.style;

  const style = { ...componentItem.style };
  delete style.backgroundImage;
  delete style.backgroundSize;
  delete style.backgroundPosition;
  delete style.backgroundRepeat;
  delete style.backgroundOverlay;
  delete style.backgroundOverlayOpacity;
  delete style.backgroundBlendMode;

  return style;
}

export function effectsToString(effects?: WebBrainEffects) {
  const normalizedEffects = normalizeEffects(effects);
  const transform = normalizedEffects.transform ?? {};
  const hover = normalizedEffects.hover ?? {};
  const overlay = normalizedEffects.overlay ?? {};
  const transition = normalizedEffects.transition ?? {};
  const rules: string[] = [];

  if (normalizedEffects.opacity !== undefined) rules.push(`--wb-opacity:${formatCssNumber(normalizedEffects.opacity)}`);
  if (normalizedEffects.cursor && normalizedEffects.cursor !== "auto") rules.push(`--wb-cursor:${normalizedEffects.cursor}`);
  if (transform.scale !== undefined) rules.push(`--wb-scale:${formatCssNumber(transform.scale)}`);
  if (transform.rotateX !== undefined) rules.push(`--wb-rotate-x:${formatCssNumber(transform.rotateX)}deg`);
  if (transform.rotateY !== undefined) rules.push(`--wb-rotate-y:${formatCssNumber(transform.rotateY)}deg`);
  if (transform.rotateZ !== undefined) rules.push(`--wb-rotate-z:${formatCssNumber(transform.rotateZ)}deg`);
  if (transform.skewX !== undefined) rules.push(`--wb-skew-x:${formatCssNumber(transform.skewX)}deg`);
  if (transform.skewY !== undefined) rules.push(`--wb-skew-y:${formatCssNumber(transform.skewY)}deg`);
  if (transform.offsetX !== undefined) rules.push(`--wb-offset-x:${formatCssNumber(transform.offsetX)}px`);
  if (transform.offsetY !== undefined) rules.push(`--wb-offset-y:${formatCssNumber(transform.offsetY)}px`);
  if (transform.shadow !== undefined && transform.shadow > 0) rules.push(`box-shadow:0 ${transform.shadow}px ${transform.shadow * 3}px rgba(0,0,0,0.28)`);

  if (hover.opacity !== undefined) rules.push(`--wb-hover-opacity:${formatCssNumber(hover.opacity)}`);
  if (hover.scale !== undefined) rules.push(`--wb-hover-scale:${formatCssNumber(hover.scale)}`);
  if (hover.rotateX !== undefined) rules.push(`--wb-hover-rotate-x:${formatCssNumber(hover.rotateX)}deg`);
  if (hover.rotateY !== undefined) rules.push(`--wb-hover-rotate-y:${formatCssNumber(hover.rotateY)}deg`);
  if (hover.rotateZ !== undefined) rules.push(`--wb-hover-rotate-z:${formatCssNumber(hover.rotateZ)}deg`);
  if (hover.skewX !== undefined) rules.push(`--wb-hover-skew-x:${formatCssNumber(hover.skewX)}deg`);
  if (hover.skewY !== undefined) rules.push(`--wb-hover-skew-y:${formatCssNumber(hover.skewY)}deg`);
  if (hover.offsetX !== undefined) rules.push(`--wb-hover-offset-x:${formatCssNumber(hover.offsetX)}px`);
  if (hover.offsetY !== undefined) rules.push(`--wb-hover-offset-y:${formatCssNumber(hover.offsetY)}px`);
  if (hover.shadow !== undefined && hover.shadow > 0) rules.push(`--wb-hover-shadow:0 ${hover.shadow}px ${hover.shadow * 3}px rgba(0,0,0,0.32)`);

  const press = normalizedEffects.press ?? {};
  if (press.opacity !== undefined) rules.push(`--wb-press-opacity:${formatCssNumber(press.opacity)}`);
  if (press.scale !== undefined) rules.push(`--wb-press-scale:${formatCssNumber(press.scale)}`);
  if (press.rotateX !== undefined) rules.push(`--wb-press-rotate-x:${formatCssNumber(press.rotateX)}deg`);
  if (press.rotateY !== undefined) rules.push(`--wb-press-rotate-y:${formatCssNumber(press.rotateY)}deg`);
  if (press.rotateZ !== undefined) rules.push(`--wb-press-rotate-z:${formatCssNumber(press.rotateZ)}deg`);
  if (press.skewX !== undefined) rules.push(`--wb-press-skew-x:${formatCssNumber(press.skewX)}deg`);
  if (press.skewY !== undefined) rules.push(`--wb-press-skew-y:${formatCssNumber(press.skewY)}deg`);
  if (press.offsetX !== undefined) rules.push(`--wb-press-offset-x:${formatCssNumber(press.offsetX)}px`);
  if (press.offsetY !== undefined) rules.push(`--wb-press-offset-y:${formatCssNumber(press.offsetY)}px`);
  if (press.shadow !== undefined && press.shadow > 0) rules.push(`--wb-press-shadow:0 ${press.shadow}px ${press.shadow * 3}px rgba(0,0,0,0.32)`);

  const loop = normalizedEffects.loop ?? {};
  if (loop.opacity !== undefined) rules.push(`--wb-loop-opacity:${formatCssNumber(loop.opacity)}`);
  if (loop.scale !== undefined) rules.push(`--wb-loop-scale:${formatCssNumber(loop.scale)}`);
  if (loop.rotateMode === "3d") {
    if (loop.rotateX !== undefined) rules.push(`--wb-loop-rotate-x:${formatCssNumber(loop.rotateX)}deg`);
    if (loop.rotateY !== undefined) rules.push(`--wb-loop-rotate-y:${formatCssNumber(loop.rotateY)}deg`);
  }
  if (loop.rotateZ !== undefined) rules.push(`--wb-loop-rotate-z:${formatCssNumber(loop.rotateZ)}deg`);
  if (loop.skewX !== undefined) rules.push(`--wb-loop-skew-x:${formatCssNumber(loop.skewX)}deg`);
  if (loop.skewY !== undefined) rules.push(`--wb-loop-skew-y:${formatCssNumber(loop.skewY)}deg`);
  if (loop.offsetX !== undefined) rules.push(`--wb-loop-offset-x:${formatCssNumber(loop.offsetX)}px`);
  if (loop.offsetY !== undefined) rules.push(`--wb-loop-offset-y:${formatCssNumber(loop.offsetY)}px`);
  if (loop.mode === "mirror") rules.push("--wb-loop-direction:alternate");
  if (loop.transition) {
    const loopDuration = loop.transition.type === "spring" ? 1800 : (loop.transition.duration ?? 2.8) * 1000;
    rules.push(`--wb-loop-duration:${formatCssNumber(loopDuration)}ms`);
    rules.push(`--wb-loop-ease:${transitionEaseToCss(loop.transition)}`);
  }
  if (loop.delay !== undefined) rules.push(`--wb-loop-delay:${formatCssNumber(loop.delay * 1000)}ms`);

  const appear = normalizedEffects.appear ?? {};
  if (appear.delay !== undefined) rules.push(`--wb-appear-delay:${formatCssNumber(appear.delay * 1000)}ms`);
  if (appear.enter?.opacity !== undefined) rules.push(`--wb-appear-opacity:${formatCssNumber(appear.enter.opacity)}`);
  if (appear.enter?.scale !== undefined) rules.push(`--wb-appear-scale:${formatCssNumber(appear.enter.scale)}`);
  if (appear.enter?.offsetX !== undefined) rules.push(`--wb-appear-offset-x:${formatCssNumber(appear.enter.offsetX)}px`);
  if (appear.enter?.offsetY !== undefined) rules.push(`--wb-appear-offset-y:${formatCssNumber(appear.enter.offsetY)}px`);
  if (appear.preset === "blur") rules.push("--wb-appear-blur:12px");

  const textEffect = normalizedEffects.textEffect ?? {};
  if (textEffect.delay !== undefined) rules.push(`--wb-text-delay:${formatCssNumber(textEffect.delay * 1000)}ms`);
  if (textEffect.preset === "blur") rules.push("--wb-text-blur:12px");
  if (textEffect.preset === "slide") rules.push("--wb-text-offset-y:18px");

  const scrollSpeed = normalizedEffects.scrollSpeed ?? {};
  if (scrollSpeed.speed !== undefined) rules.push(`--wb-scroll-speed:${formatCssNumber(scrollSpeed.speed)}`);

  const scrollTransform = normalizedEffects.scrollTransform ?? {};
  const pushScrollTransformVars = (prefix: "from" | "to", value?: WebBrainTransform) => {
    if (!value) return;
    if (value.opacity !== undefined) rules.push(`--wb-scroll-${prefix}-opacity:${formatCssNumber(value.opacity)}`);
    if (value.scale !== undefined) rules.push(`--wb-scroll-${prefix}-scale:${formatCssNumber(value.scale)}`);
    if (value.rotateZ !== undefined) rules.push(`--wb-scroll-${prefix}-rotate-z:${formatCssNumber(value.rotateZ)}deg`);
    if (value.offsetX !== undefined) rules.push(`--wb-scroll-${prefix}-offset-x:${formatCssNumber(value.offsetX)}px`);
    if (value.offsetY !== undefined) rules.push(`--wb-scroll-${prefix}-offset-y:${formatCssNumber(value.offsetY)}px`);
  };
  pushScrollTransformVars("from", scrollTransform.from);
  pushScrollTransformVars("to", scrollTransform.to);

  const ticker = normalizedEffects.ticker ?? {};
  if (ticker.speed !== undefined) {
    const tickerDuration = 10000 / Math.max(0.1, ticker.speed / 100);
    rules.push(`--wb-ticker-duration:${formatCssNumber(tickerDuration)}ms`);
  }
  if (ticker.direction === "right") rules.push("--wb-ticker-x:16px", "--wb-ticker-y:0px");
  if (ticker.direction === "up") rules.push("--wb-ticker-x:0px", "--wb-ticker-y:-16px");
  if (ticker.direction === "down") rules.push("--wb-ticker-x:0px", "--wb-ticker-y:16px");

  if (overlay.color) rules.push(`--wb-overlay-color:${overlay.color}`);
  if (overlay.opacity !== undefined) rules.push(`--wb-overlay-opacity:${formatCssNumber(overlay.opacity)}`);
  if (overlay.blendMode) rules.push(`--wb-overlay-blend:${overlay.blendMode}`);
  if (overlay.offsetX !== undefined) rules.push(`--wb-overlay-offset-x:${formatCssNumber(overlay.offsetX)}px`);
  if (overlay.offsetY !== undefined) rules.push(`--wb-overlay-offset-y:${formatCssNumber(overlay.offsetY)}px`);
  if (overlay.zIndex !== undefined) rules.push(`--wb-overlay-z:${formatCssNumber(overlay.zIndex)}`);

  const duration = transition.type === "spring" ? 420 : (transition.duration ?? 0.18) * 1000;
  const delay = (transition.delay ?? 0) * 1000;
  rules.push(`--wb-transition-duration:${formatCssNumber(duration)}ms`);
  rules.push(`--wb-transition-delay:${formatCssNumber(delay)}ms`);
  rules.push(`--wb-transition-ease:${transitionEaseToCss(transition)}`);

  return rules.join(";");
}

function transitionEaseToCss(transition: WebBrainTransition) {
  if (transition.type === "spring") {
    const stiffness = transition.stiffness ?? 260;
    const damping = transition.damping ?? 22;
    const overshoot = Math.max(1, Math.min(1.42, 1 + (stiffness - damping * 8) / 900));

    return `cubic-bezier(0.18, 0.89, 0.32, ${formatCssNumber(overshoot)})`;
  }

  if (transition.bezier && /^-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+$/.test(transition.bezier)) {
    return `cubic-bezier(${transition.bezier})`;
  }

  if (transition.easing === "linear") return "linear";
  if (transition.easing === "ease-in") return "cubic-bezier(0.4, 0, 1, 1)";
  if (transition.easing === "ease-out") return "cubic-bezier(0, 0, 0.2, 1)";
  if (transition.easing === "ease") return "ease";

  return "cubic-bezier(0.44, 0, 0.56, 1)";
}

function styleToString(style: WebBrainStyle) {
  const rules: string[] = [];

  if (style.width !== undefined && style.widthMode !== "auto" && style.widthMode !== "full" && style.widthMode !== "fit") {
    rules.push(`width:${clampNumber(style.width, 100, 1, 300)}%`);
  }
  if (style.widthMode === "full") rules.push("width:100%");
  if (style.widthMode === "fit") rules.push("width:fit-content");
  if (style.heightMode === "fixed" && style.height !== undefined) rules.push(`height:${clampNumber(style.height, 120, 1, 1400)}px`);
  if (style.heightMode === "full") rules.push("height:100%");
  if (style.heightMode === "fit") rules.push("height:fit-content");
  if (style.minWidth !== undefined) rules.push(`min-width:${clampNumber(style.minWidth, 0, 0, 1800)}px`);
  if (style.maxWidth !== undefined) {
    const normalizedMaxWidth = clampNumber(style.maxWidth, 1120, 120, 1800);
    rules.push(`--wb-max-width:${normalizedMaxWidth}px`, `max-width:${normalizedMaxWidth}px`);
  }
  if (style.minHeight !== undefined) rules.push(`min-height:${clampNumber(style.minHeight, 0, 0, 1200)}px`);
  if (style.maxHeight !== undefined) rules.push(`max-height:${clampNumber(style.maxHeight, 0, 0, 1800)}px`);
  if (style.position) {
    rules.push(`position:${style.position}`);
    if (style.top !== undefined) rules.push(`top:${clampNumber(style.top, 0, -2000, 2000)}px`);
    if (style.right !== undefined) rules.push(`right:${clampNumber(style.right, 0, -2000, 2000)}px`);
    if (style.bottom !== undefined) rules.push(`bottom:${clampNumber(style.bottom, 0, -2000, 2000)}px`);
    if (style.left !== undefined) rules.push(`left:${clampNumber(style.left, 0, -2000, 2000)}px`);
  }
  if (style.zIndex !== undefined) rules.push(`z-index:${clampNumber(style.zIndex, 0, -10, 999)}`);
  if (style.grow === "fill") rules.push("flex:1 1 0");
  if (style.grow === "fit") rules.push("flex:0 0 auto");
  if (style.overflow) rules.push(`overflow:${style.overflow}`);
  if (style.padding) rules.push(`padding:${spacingToCss(style.padding)}`);
  if (style.margin) rules.push(`margin:${spacingToCss(style.margin)}`);
  if (style.gap !== undefined) rules.push(`gap:${clampNumber(style.gap, 0, 0, 120)}px`);
  if (style.radius !== undefined) rules.push(`border-radius:${clampNumber(style.radius, 0, 0, 80)}px`);
  if (style.background) rules.push(`background:${style.background}`);
  const backgroundImage = backgroundImageToCss(style);
  if (backgroundImage) {
    const backgroundSize = style.backgroundSize ?? "cover";
    const backgroundPosition = style.backgroundPosition || "center";
    const backgroundRepeat = style.backgroundRepeat ?? "no-repeat";

    rules.push(`background-image:${backgroundImage}`);
    rules.push(`background-size:${backgroundSize}`);
    rules.push(`background-position:${backgroundPosition}`);
    rules.push(`background-repeat:${backgroundRepeat}`);
    if (style.backgroundBlendMode) rules.push(`background-blend-mode:${style.backgroundBlendMode}`);
  }
  if (style.borderColor) rules.push(`border:${clampNumber(style.borderWidth, 1, 1, 24)}px solid ${style.borderColor}`);
  if (style.textColor) rules.push(`color:${style.textColor}`);
  if (style.hoverColor) rules.push(`--wb-hover-color:${style.hoverColor}`);
  if (style.align) rules.push(`text-align:${style.align}`);
  if (style.direction) rules.push(`flex-direction:${style.direction}`);
  if (style.wrap !== undefined) rules.push(`flex-wrap:${style.wrap ? "wrap" : "nowrap"}`);
  if (style.justify === "between") rules.push("justify-content:space-between");
  if (style.justify === "center") rules.push("justify-content:center");
  if (style.justify === "start") rules.push("justify-content:flex-start");
  if (style.alignItems === "start") rules.push("align-items:flex-start");
  if (style.alignItems === "center") rules.push("align-items:center");
  if (style.alignItems === "end") rules.push("align-items:flex-end");
  if (style.alignItems === "stretch") rules.push("align-items:stretch");
  if (style.fontSize !== undefined) rules.push(`font-size:${clampNumber(style.fontSize, 16, 8, 120)}px`, `--wb-font-size:${clampNumber(style.fontSize, 16, 8, 120)}px`);
  if (style.fontWeight !== undefined) rules.push(`font-weight:${clampNumber(style.fontWeight, 500, 100, 1000)}`);
  if (style.fontStyle) rules.push(`font-style:${style.fontStyle}`);
  if (style.letterSpacing !== undefined) rules.push(`letter-spacing:${clampFloat(style.letterSpacing, 0, -2, 8)}px`);
  if (style.lineHeight !== undefined) rules.push(`line-height:${style.lineHeight}`);
  if (style.textTransform && style.textTransform !== "none") rules.push(`text-transform:${style.textTransform}`);
  if (style.textDecoration && style.textDecoration !== "none") rules.push(`text-decoration-line:${style.textDecoration}`);
  if (style.shadow !== undefined && style.shadow > 0) rules.push(`box-shadow:0 ${style.shadow}px ${style.shadow * 3}px rgba(0,0,0,0.28)`);
  if (style.objectFit) rules.push(`object-fit:${style.objectFit}`);
  if (style.objectPosition) rules.push(`object-position:${style.objectPosition}`);

  return rules.join(";");
}

function backgroundImageToCss(style: WebBrainStyle) {
  const imageUrl = sanitizeCssImageUrl(style.backgroundImage);
  if (!imageUrl) return "";

  const overlayOpacity = style.backgroundOverlayOpacity;
  const overlayColor = style.backgroundOverlay;
  const layers = [];

  if (overlayColor || overlayOpacity !== undefined) {
    const baseColor = overlayColor || "#000000";
    const strong = cssColorWithOpacity(baseColor, Math.min((overlayOpacity ?? 0.42) + 0.28, 0.9));
    const mid = cssColorWithOpacity(baseColor, overlayOpacity ?? 0.42);
    const soft = cssColorWithOpacity(baseColor, Math.max((overlayOpacity ?? 0.42) - 0.28, 0.05));
    // Directional scrim: lighter at top, darker at bottom → text sitting low stays legible (premium hero look)
    layers.push(`linear-gradient(180deg, ${soft} 0%, ${mid} 52%, ${strong} 100%)`);
  }

  layers.push(imageUrl);

  return layers.join(",");
}

function sanitizeCssImageUrl(value?: string) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return "";
  if (/^data:image\//i.test(trimmedValue)) return `url("${escapeCssString(trimmedValue)}")`;
  if (/^blob:/i.test(trimmedValue)) return `url("${escapeCssString(trimmedValue)}")`;
  if (/^https?:\/\//i.test(trimmedValue)) {
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i.test(trimmedValue)) return "";

    return `url("${escapeCssString(trimmedValue)}")`;
  }
  if (/^\/(?:media|sites|uploads)\//i.test(trimmedValue)) return `url("${escapeCssString(trimmedValue)}")`;

  return "";
}

function cssColorWithOpacity(color: string, opacity: number) {
  const safeOpacity = clampFloat(opacity, 0.42, 0, 1);

  if (safeOpacity >= 0.995) return color;
  if (safeOpacity <= 0.005) return "transparent";

  return `color-mix(in srgb, ${color} ${formatCssNumber(safeOpacity * 100)}%, transparent)`;
}

function escapeCssString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "");
}

function spacingToCss(value: SpacingValues) {
  const spacingValue = normalizeSpacingValues(value);

  return `${spacingValue.top}px ${spacingValue.right}px ${spacingValue.bottom}px ${spacingValue.left}px`;
}

function editableAttrs(componentItem: WebBrainComponent) {
  const overlay = componentItem.type === "page" ? undefined : componentItem.effects?.overlay;
  const overlayAttrs = overlay?.enabled
    ? ` data-webbrain-overlay="${escapeAttribute(overlay.text || overlayDefaultText(componentItem))}" data-webbrain-overlay-position="${escapeAttribute(
        overlay.position || "bottom"
      )}" data-webbrain-overlay-align="${escapeAttribute(overlay.align || "center")}"`
    : "";
  const publicId = sanitizeAnchorId(componentItem.props.anchorId) || componentItem.id;

  return `id="${escapeAttribute(publicId)}" data-webbrain-id="${escapeAttribute(componentItem.id)}" data-webbrain-type="${escapeAttribute(componentItem.type)}"${overlayAttrs}`;
}

function sanitizeAnchorId(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function overlayDefaultText(componentItem: WebBrainComponent) {
  if (componentItem.type === "button") return componentItem.props.label || "Действие";
  if (componentItem.type === "navLink") return componentItem.props.label || "Ссылка";
  if (componentItem.type === "heading" || componentItem.type === "text") return componentItem.props.text || "Подсказка";
  if (componentItem.type === "image") return componentItem.props.alt || "Изображение";

  return componentItem.name || "Подсказка";
}

function sanitizeHref(href: string) {
  const value = href.trim();

  if (!value) return "#";
  if (value.startsWith("#")) return escapeAttribute(value);
  if (/^(mailto:|tel:)/i.test(value)) return escapeAttribute(value);
  if (/^https?:\/\//i.test(value)) {
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|$)/i.test(value)) return "#";

    return escapeAttribute(value);
  }

  // WebBrain v1 renders generated sites as single-page documents.
  // Local absolute paths would leave the generated site and open the app shell.
  if (value.startsWith("/")) return "#";

  return "#";
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) return fallback;

  return Math.max(min, Math.min(max, Math.round(parsedValue)));
}

export function clampFloat(value: unknown, fallback: number, min: number, max: number) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue)) return fallback;

  return Math.max(min, Math.min(max, parsedValue));
}

function formatCssNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

export function componentDisplayName(componentItem: WebBrainComponent) {
  if (componentItem.type === "heading" || componentItem.type === "text") return componentItem.props.text || componentItem.name;
  if (componentItem.type === "button" || componentItem.type === "navLink" || componentItem.type === "input" || componentItem.type === "textarea") return componentItem.props.label || componentItem.name;
  if (componentItem.type === "header") return componentItem.props.brand || componentItem.name;
  if (componentItem.type === "form") return componentItem.props.action || componentItem.name;

  return componentItem.name;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
