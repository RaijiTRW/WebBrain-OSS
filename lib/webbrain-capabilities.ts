import {
  componentInspectorSchemas,
  type InspectorControl,
  type WebBrainComponentType,
} from "@/lib/webbrain-document";
import {
  WEBBRAIN_EDITOR_CONTROL_TYPES,
  WEBBRAIN_EDITOR_MANIFEST_VERSION,
} from "@/lib/webbrain-editor-manifest";

export const WEBBRAIN_EDITOR_CAPABILITIES_VERSION = "2026.05.12";

export const WEBBRAIN_COMPONENT_TYPES = Object.keys(
  componentInspectorSchemas,
) as WebBrainComponentType[];

type ParentRule = WebBrainComponentType[] | "any" | "none";
type ChildRule = WebBrainComponentType[] | "any" | "none";

export type WebBrainComponentCapability = {
  label: string;
  description: string;
  insertable: boolean;
  allowedParents: ParentRule;
  allowedChildren: ChildRule;
  settings: InspectorControl[];
  style: InspectorControl[];
  aiNotes: string[];
};

type ComponentCapabilityMeta = Omit<
  WebBrainComponentCapability,
  "settings" | "style"
>;

const componentCapabilityMeta: Record<WebBrainComponentType, ComponentCapabilityMeta> = {
  page: {
    label: "Страница",
    description: "Корневой компонент одной страницы сайта.",
    insertable: false,
    allowedParents: "none",
    allowedChildren: ["header", "section", "footer", "container", "row", "stack", "grid", "form"],
    aiNotes: [
      "Используй один root-компонент page на страницу.",
      "Не размещай page внутри других компонентов.",
    ],
  },
  header: {
    label: "Хедер",
    description: "Верхняя навигация: бренд, ссылки, фон, фон-медиа, рамка, отступы.",
    insertable: true,
    allowedParents: ["page", "section", "container"],
    allowedChildren: ["navLink"],
    aiNotes: [
      "Для меню добавляй navLink как children.",
      "Не пиши весь header одним текстом: brand и links хранятся в props.",
    ],
  },
  navLink: {
    label: "Ссылка меню",
    description: "Одна навигационная ссылка для header/footer/row.",
    insertable: true,
    allowedParents: ["header", "footer", "row", "column", "stack"],
    allowedChildren: "none",
    aiNotes: ["Используй href как якорь или URL, label как видимый текст."],
  },
  footer: {
    label: "Футер",
    description: "Нижняя зона сайта с текстом, ссылками, CTA и колонками.",
    insertable: true,
    allowedParents: ["page", "section", "container"],
    allowedChildren: ["row", "column", "stack", "text", "navLink", "button", "form", "image"],
    aiNotes: [
      "Для сложного футера собирай footer -> row/grid -> column/stack -> text/navLink/button.",
      "Футер должен быть обычным JSON-деревом, а не монолитным HTML.",
    ],
  },
  section: {
    label: "Секция",
    description: "Основной горизонтальный блок страницы с фоном, фоновым изображением, оверлеем и внутренней композицией.",
    insertable: true,
    allowedParents: ["page"],
    allowedChildren: ["container", "row", "column", "grid", "stack", "heading", "text", "button", "form", "cardGrid", "image"],
    aiNotes: [
      "Каждый крупный смысловой блок сайта лучше делать отдельной section.",
      "Первая section после header считается hero: она должна иметь ясную иерархию, достаточную высоту, понятный CTA и не быть пустым декоративным блоком.",
      "Большая section не должна существовать только ради фона, radius или воздуха. У нее должен быть один job: объяснить, доказать, показать выбор, собрать заявку или дать контакт.",
      "Для физических бизнесов крупная section без фото, media slot, формы или сильного proof-блока выглядит как заглушка и не проходит quality gate.",
      "Для вложенной композиции добавляй container/row/grid/stack внутри section.",
      "Для hero, CTA и атмосферных блоков можно задавать style.backgroundImage + backgroundOverlay/backgroundOverlayOpacity вместо отдельной image.",
    ],
  },
  container: {
    label: "Контейнер",
    description: "Ограничитель ширины и внутренний layout внутри секции.",
    insertable: true,
    allowedParents: ["page", "section", "footer", "card", "column", "stack"],
    allowedChildren: "any",
    aiNotes: [
      "Используй container для maxWidth, padding и общего выравнивания контента.",
      "Не вкладывай слишком много контейнеров без причины.",
      "Не используй padding как украшение: если вокруг контента много пустоты, это должно помогать композиции, а не скрывать отсутствие смысла.",
    ],
  },
  row: {
    label: "Ряд",
    description: "Flex-строка для горизонтального размещения элементов.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "stack"],
    allowedChildren: "any",
    aiNotes: [
      "Для кнопок рядом, ссылок футера и горизонтальных частей используй row.",
      "Настраивай gap, justify, align и wrap вместо абсолютного позиционирования.",
    ],
  },
  column: {
    label: "Колонка",
    description: "Вертикальная flex-колонка для группировки контента.",
    insertable: true,
    allowedParents: ["row", "grid", "section", "container", "footer", "card"],
    allowedChildren: "any",
    aiNotes: [
      "Используй column как смысловую группу внутри row/grid.",
      "Хорошо подходит для футеров, карточек и hero-композиций.",
    ],
  },
  grid: {
    label: "Сетка",
    description: "Grid-контейнер для карточек, галерей и многоколонных блоков.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card"],
    allowedChildren: "any",
    aiNotes: [
      "Для набора однотипных элементов выбирай grid.",
      "Не используй grid для обычной пары кнопок, там лучше row.",
      "Для премиального сайта избегай одинаковых 3 карточек как главного решения; лучше mixed grid с одной акцентной карточкой или другой визуальной массой.",
    ],
  },
  stack: {
    label: "Стек",
    description: "Вертикальный или горизонтальный стек с управляемым gap.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "form"],
    allowedChildren: "any",
    aiNotes: [
      "Используй stack для простых групп текста, ссылок и кнопок.",
      "Это самый безопасный контейнер для ИИ-генерации небольших композиций.",
    ],
  },
  heading: {
    label: "Заголовок",
    description: "H1-H4 текстовый акцент.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "stack", "form"],
    allowedChildren: "none",
    aiNotes: [
      "Для H1 на странице используй один главный heading.",
      "Не добавляй radius/background к heading, это не карточка.",
      "Для акцента внутри заголовка используй props.textAccentEnabled/textAccentText/textAccentColor/textAccentLineBreak/textAccentWeight: это рендерится как безопасный span внутри текста.",
    ],
  },
  text: {
    label: "Текст",
    description: "Абзац, подпись или короткая строка.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "stack", "form"],
    allowedChildren: "none",
    aiNotes: [
      "Используй text для параграфов и коротких подписей.",
      "Если часть фразы должна быть выделена цветом или вынесена на новую строку, используй props.textAccentEnabled/textAccentText/textAccentColor/textAccentLineBreak/textAccentWeight.",
    ],
  },
  button: {
    label: "Кнопка",
    description: "CTA или ссылка с визуальным стилем кнопки, включая primary/secondary/glass/lime3d/outline.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "stack", "form"],
    allowedChildren: "none",
    aiNotes: [
      "Кнопка хранит label и href/action в props.",
      "Для пары CTA используй row -> button + button.",
      "Для главной conversion-кнопки по умолчанию используй primary; lime3d только если пользователь попросил 3D/футуристичный стиль или это действительно подходит нише.",
      "Кнопка должна быть понятной, контрастной и достаточно крупной; hover/press добавляй только когда это не перегружает дизайн.",
    ],
  },
  form: {
    label: "Форма",
    description: "Редактируемая форма для заявки, брони, регистрации или авторизации. Submit перехватывается runtime и идет в action contract.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "stack"],
    allowedChildren: ["input", "textarea", "button", "row", "column", "stack", "text", "heading"],
    aiNotes: [
      "Используй form для заявок, бронирования, подписки, регистрации и авторизации вместо декоративной кнопки.",
      "props.action должен быть коротким contract id: lead_submit, booking_create, login, register, subscribe.",
      "Форма не должна вести на /api или /app; backend-логика описывается отдельными virtual artifacts.",
      "Submit-кнопка внутри формы должна иметь props.action=\"submit\" или props.href=\"submit\".",
    ],
  },
  input: {
    label: "Поле ввода",
    description: "Однострочное поле формы с label/name/placeholder/type/required.",
    insertable: true,
    allowedParents: ["form", "column", "stack", "row"],
    allowedChildren: "none",
    aiNotes: [
      "Всегда задавай label и name; name должен совпадать с backend action payload.",
      "Для контактов выбирай inputType email или tel, для имени text.",
    ],
  },
  textarea: {
    label: "Текстовое поле",
    description: "Многострочное поле формы для комментариев, пожеланий и сообщений.",
    insertable: true,
    allowedParents: ["form", "column", "stack", "row"],
    allowedChildren: "none",
    aiNotes: [
      "Используй textarea для пожеланий к брони, комментария к заявке или описания задачи.",
      "Всегда задавай label, name и понятный placeholder.",
    ],
  },
  cardGrid: {
    label: "Сетка карточек",
    description: "Готовый блок карточек, совместимый со старым шаблоном.",
    insertable: true,
    allowedParents: ["page", "section", "container"],
    allowedChildren: ["card"],
    aiNotes: [
      "Новые сложные карточные блоки лучше делать через grid + card.",
      "cardGrid оставлен для совместимости.",
    ],
  },
  card: {
    label: "Карточка",
    description: "Поверхность с padding, background/image overlay, border, radius и вложенным контентом.",
    insertable: true,
    allowedParents: ["cardGrid", "grid", "row", "column", "stack", "section", "container"],
    allowedChildren: "any",
    aiNotes: [
      "Карточка должна содержать heading/text/button/image, а не один длинный props.text.",
      "Используй card для повторяемых элементов и акцентных панелей.",
      "Для image-led cards задавай backgroundImage, minHeight, overlay и контент поверх, чтобы карточка была редактируемой.",
    ],
  },
  image: {
    label: "Изображение",
    description: "Картинка с src, alt, fit, position и размерами.",
    insertable: true,
    allowedParents: ["page", "section", "container", "footer", "card", "column", "row", "grid", "stack"],
    allowedChildren: "none",
    aiNotes: [
      "Всегда заполняй alt.",
      "Для неизвестного изображения ставь понятный placeholder и реалистичные размеры.",
      "Если картинка должна быть фоном секции или карточки, используй style.backgroundImage на контейнере, а не отдельный image.",
    ],
  },
};

export const WEBBRAIN_EDITOR_CAPABILITIES = {
  version: WEBBRAIN_EDITOR_CAPABILITIES_VERSION,
  documentVersion: 1,
  sourceOfTruth: "document_json",
  rendererContract: {
    componentIdAttribute: "data-webbrain-id",
    componentTypeAttribute: "data-webbrain-type",
    rule: "Preview всегда рендерится из JSON. HTML/CSS/JS могут быть только derived cache.",
  },
  editorManifestContract: {
    version: WEBBRAIN_EDITOR_MANIFEST_VERSION,
    rule: "ИИ может писать свободную композицию из доступных компонентов, но обязан описывать редактируемость через editorManifest.nodes.",
    nodeRule: "Каждый редактируемый component.id должен иметь node.componentId, label, type и controls. Если manifest неполный, сервер построит fallback из component type schemas.",
    bindingTargets: ["props", "style", "effects", "theme", "children", "component", "custom"],
    controlTypes: WEBBRAIN_EDITOR_CONTROL_TYPES,
    bindingExamples: [
      { control: "title", type: "richText", binding: { target: "props", path: "text" } },
      { control: "background", type: "color", binding: { target: "style", path: "background" } },
      { control: "items", type: "list", binding: { target: "children" } },
    ],
  },
  themeTokens: [
    "background",
    "text",
    "accent",
    "primary",
    "onPrimary",
    "muted",
    "panel",
    "line",
    "surface",
    "surfaceSoft",
    "surfaceStrong",
    "border",
    "borderSoft",
  ],
  componentTypes: WEBBRAIN_COMPONENT_TYPES.reduce(
    (accumulator, type) => {
      const schema = componentInspectorSchemas[type];
      accumulator[type] = {
        ...componentCapabilityMeta[type],
        settings: schema.settings,
        style: schema.style,
      };
      return accumulator;
    },
    {} as Record<WebBrainComponentType, WebBrainComponentCapability>,
  ),
  effects: {
    appear: {
      label: "Появление",
      description: "Анимация при появлении элемента в viewport через IntersectionObserver.",
      targetTypes: "all",
    },
    text: {
      label: "Текстовый эффект",
      description: "Анимация текста по символам, словам или строкам.",
      targetTypes: ["heading", "text", "button", "navLink"],
    },
    hover: {
      label: "Hover",
      description: "Реакция элемента при наведении.",
      targetTypes: "all",
    },
    press: {
      label: "Нажатие",
      description: "Реакция элемента при pointer/tap down.",
      targetTypes: "all",
    },
    loop: {
      label: "Цикл",
      description: "Бесконечная анимация без стыка.",
      targetTypes: "all",
    },
    drag: {
      label: "Перетаскивание",
      description: "Интерактивный drag-эффект для опубликованного сайта.",
      targetTypes: "all",
    },
    scrollTransform: {
      label: "Трансформация по скроллу",
      description: "Реальное изменение opacity/scale/offset/rotateZ от scroll progress.",
      targetTypes: "all",
    },
    scrollSpeed: {
      label: "Скорость скролла",
      description: "Параллакс-смещение элемента или фонового визуального слоя относительно скролла.",
      targetTypes: "all",
    },
    flow: {
      label: "Flow",
      description: "Анимация вокруг интерактивных секций.",
      targetTypes: ["button", "navLink"],
    },
    ticker: {
      label: "Ticker",
      description: "Бегущая строка или повторяющийся поток контента.",
      targetTypes: ["row", "stack", "grid", "section"],
    },
  },
  aiWorkflow: [
    "Сначала прочитать capabilities.",
    "Перед полной генерацией выполнить Research / Assets stage: сформировать поисковые запросы, найти и проверить изображения/данные, не использовать непроверенные URL.",
    "Сгенерировать или изменить только document_json.",
    "Для новых или перестроенных блоков добавить/обновить editorManifest: stable componentId, label, control type и binding target/path.",
    "Использовать стабильные id и существующие theme tokens.",
    "Перед сохранением пройти WebBrain Site Creation Gate: ясный первый экран, нормальные кнопки, читаемая иерархия текста, safe hrefs, уместные медиа и restrained effects.",
    "Проверить документ через validator перед сохранением.",
    "Сохранять страницу через PATCH /api/sites/:siteId/pages/:pageId.",
  ],
};

export function isWebBrainComponentType(value: unknown): value is WebBrainComponentType {
  return (
    typeof value === "string" &&
    WEBBRAIN_COMPONENT_TYPES.includes(value as WebBrainComponentType)
  );
}

export function getWebBrainComponentCapability(
  type: WebBrainComponentType,
): WebBrainComponentCapability {
  return WEBBRAIN_EDITOR_CAPABILITIES.componentTypes[type];
}
