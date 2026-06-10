export type WebBrainRenderEngine = "document_json" | "codegen";

export type WebBrainCodegenViewport = "desktop" | "tablet" | "mobile";

export type WebBrainCodegenFile = {
  path: string;
  content: string;
};

export type WebBrainCodegenStyleValue = string | number | boolean | null;

export type WebBrainCodegenPrimitive =
  | "reveal"
  | "accordion"
  | "tabs"
  | "sticky-stack"
  | "carousel"
  | "drawer"
  | "marquee"
  | "hover-expand";

export type WebBrainCodegenSettingField = {
  key: string;
  label: string;
  type: "number" | "text" | "select" | "boolean" | "color";
  default?: WebBrainCodegenSettingValue;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  cssVar?: string;
  cssUnit?: string;
  options?: Array<{ value: string; label: string }>;
};

export type WebBrainCodegenSettingValue = string | number | boolean | null;

export type WebBrainCodegenSettings = Record<string, WebBrainCodegenSettingValue>;

export type WebBrainCodegenElementPosition = {
  filePath: string;
  start: number;
  end: number;
  openingStart: number;
  openingEnd: number;
};

export type WebBrainCodegenElement = {
  id: string;
  tag: string;
  position: WebBrainCodegenElementPosition;
  style: Record<string, WebBrainCodegenStyleValue>;
  primitive?: WebBrainCodegenPrimitive;
  settings: WebBrainCodegenSettings;
  settingsByViewport?: Partial<Record<WebBrainCodegenViewport, WebBrainCodegenSettings>>;
  settingsSchema: WebBrainCodegenSettingField[];
  text?: string;
  src?: string;
  href?: string;
  parentId: string | null;
  children: string[];
};

export type WebBrainCodegenElementMap = {
  version: 1;
  elements: Record<string, WebBrainCodegenElement>;
  roots: string[];
};

export type WebBrainCodegenOverlay = {
  version: 1;
  css: string;
};

export type WebBrainCodegenCompileResult = {
  files: WebBrainCodegenFile[];
  elementMap: WebBrainCodegenElementMap;
  overlay: WebBrainCodegenOverlay;
};

export type WebBrainInlineStylePatch = {
  filePath: string;
  wbId: string;
  property: string;
  value: WebBrainCodegenStyleValue;
};

export type WebBrainCodegenSettingsPatch = {
  filePath: string;
  wbId: string;
  viewport?: WebBrainCodegenViewport;
  settings: WebBrainCodegenSettings;
};

export type WebBrainCodegenContentKind = "text" | "src" | "href";

export type WebBrainCodegenContentPatch = {
  filePath: string;
  wbId: string;
  kind: WebBrainCodegenContentKind;
  value: string;
};
