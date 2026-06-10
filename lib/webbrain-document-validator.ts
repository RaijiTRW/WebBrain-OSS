import {
  createStarterDocument,
  normalizeWebBrainDocument,
  type WebBrainComponent,
  type WebBrainComponentType,
  type WebBrainDocument,
} from "@/lib/webbrain-document";
import {
  WEBBRAIN_EDITOR_CAPABILITIES_VERSION,
  isWebBrainComponentType,
} from "@/lib/webbrain-capabilities";
import {
  getEditorManifestValidationIssues,
  normalizeEditorManifest,
} from "@/lib/webbrain-editor-manifest";

export type WebBrainValidationIssue = {
  level: "warning" | "error";
  path: string;
  message: string;
};

export type WebBrainValidationResult = {
  ok: boolean;
  document: WebBrainDocument;
  issues: WebBrainValidationIssue[];
  capabilitiesVersion: string;
};

export type WebBrainDocumentValidationOptions = {
  slug?: string;
  name?: string;
};

const leafComponentTypes = new Set<WebBrainComponentType>([
  "heading",
  "text",
  "button",
  "input",
  "textarea",
  "image",
  "navLink",
]);

function makeComponentId(type: WebBrainComponentType, index: number) {
  return `wb-${type}-${index + 1}`;
}

function normalizeComponentType(
  value: unknown,
  hasChildren: boolean,
): WebBrainComponentType {
  if (isWebBrainComponentType(value)) {
    return value;
  }

  return hasChildren ? "container" : "text";
}

function addIssue(
  issues: WebBrainValidationIssue[],
  level: WebBrainValidationIssue["level"],
  path: string,
  message: string,
) {
  issues.push({ level, path, message });
}

function sanitizeComponents(
  components: WebBrainComponent[],
  issues: WebBrainValidationIssue[],
) {
  const usedIds = new Set<string>();
  const idMap = new Map<string, string>();
  const sanitized = components.map((component, index) => {
    const originalId = component.id;
    const type = normalizeComponentType(
      component.type,
      Array.isArray(component.children) && component.children.length > 0,
    );

    if (type !== component.type) {
      addIssue(
        issues,
        "warning",
        `components.${index}.type`,
        `Unknown component type "${component.type}" was converted to "${type}".`,
      );
    }

    const baseId =
      typeof originalId === "string" && originalId.trim()
        ? originalId.trim()
        : makeComponentId(type, index);
    let nextId = baseId;
    let duplicateIndex = 2;

    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    if (nextId !== originalId) {
      addIssue(
        issues,
        "warning",
        `components.${index}.id`,
        `Component id "${originalId || "(empty)"}" was normalized to "${nextId}".`,
      );
    }

    usedIds.add(nextId);
    idMap.set(originalId, nextId);

    return {
      ...component,
      id: nextId,
      type,
    };
  });

  const componentIds = new Set(sanitized.map((component) => component.id));
  const componentTypesById = new Map(
    sanitized.map((component) => [component.id, component.type] as const),
  );

  const nextComponents = sanitized.map((component, index) => {
    let children = Array.isArray(component.children)
      ? component.children
          .map((childId) => idMap.get(childId) || childId)
          .filter((childId, childIndex, list) => {
            if (childId === component.id) {
              addIssue(
                issues,
                "warning",
                `components.${index}.children`,
                `Self reference "${childId}" was removed.`,
              );
              return false;
            }

            if (!componentIds.has(childId)) {
              addIssue(
                issues,
                "warning",
                `components.${index}.children.${childIndex}`,
                `Missing child "${childId}" was removed.`,
              );
              return false;
            }

            return list.indexOf(childId) === childIndex;
          })
      : [];

    if (leafComponentTypes.has(component.type) && children.length > 0) {
      addIssue(
        issues,
        "warning",
        `components.${index}.children`,
        `Leaf component "${component.type}" cannot contain children; children were removed.`,
      );
      children = [];
    }

    if (component.type === "header") {
      const nonLinks = children.filter(
        (childId) => componentTypesById.get(childId) !== "navLink",
      );

      if (nonLinks.length > 0) {
        addIssue(
          issues,
          "warning",
          `components.${index}.children`,
          "Header should contain only navLink children. Keep complex header content in row/container components.",
        );
      }
    }

    return {
      ...component,
      children,
    };
  });

  return { components: nextComponents, idMap, componentIds };
}

function sanitizePages(
  document: WebBrainDocument,
  idMap: Map<string, string>,
  componentIds: Set<string>,
  issues: WebBrainValidationIssue[],
) {
  const pageRoot = document.components.find((component) => component.type === "page");
  const fallbackRoot = pageRoot?.id || document.components[0]?.id;

  return document.pages
    .map((page, index) => {
      const rootComponentId = idMap.get(page.rootComponentId) || page.rootComponentId;

      if (componentIds.has(rootComponentId)) {
        return { ...page, rootComponentId };
      }

      if (fallbackRoot) {
        addIssue(
          issues,
          "warning",
          `pages.${index}.rootComponentId`,
          `Missing root component "${page.rootComponentId}" was replaced with "${fallbackRoot}".`,
        );
        return { ...page, rootComponentId: fallbackRoot };
      }

      addIssue(
        issues,
        "error",
        `pages.${index}.rootComponentId`,
        `Page "${page.id}" has no valid root component.`,
      );
      return null;
    })
    .filter(Boolean) as WebBrainDocument["pages"];
}

export function validateWebBrainDocument(
  value: unknown,
  options: WebBrainDocumentValidationOptions = {},
): WebBrainValidationResult {
  const issues: WebBrainValidationIssue[] = [];

  if (!value || typeof value !== "object") {
    addIssue(
      issues,
      "warning",
      "document",
      "Input was not a document object; starter document was created.",
    );
  }

  let document = normalizeWebBrainDocument(value, options.slug, options.name);

  if (!document.components.length || !document.pages.length) {
    addIssue(
      issues,
      "warning",
      "document",
      "Document had no valid pages/components; starter document was created.",
    );
    document = createStarterDocument(options.slug || "home", options.name);
  }

  const sanitizedComponents = sanitizeComponents(document.components, issues);
  const manifestIssues = getEditorManifestValidationIssues(document);
  manifestIssues.forEach((issue) => addIssue(issues, "warning", issue.path, issue.message));
  const pages = sanitizePages(
    document,
    sanitizedComponents.idMap,
    sanitizedComponents.componentIds,
    issues,
  );

  if (!pages.length) {
    addIssue(
      issues,
      "error",
      "pages",
      "Document has no usable pages after validation; starter document was created.",
    );
    document = createStarterDocument(options.slug || "home", options.name);
  } else {
    document = normalizeWebBrainDocument(
      {
        ...document,
        pages,
        components: sanitizedComponents.components,
      },
      options.slug,
      options.name,
    );
  }

  document = {
    ...document,
    editorManifest: normalizeEditorManifest(document),
  };

  return {
    ok: !issues.some((issue) => issue.level === "error"),
    document,
    issues,
    capabilitiesVersion: WEBBRAIN_EDITOR_CAPABILITIES_VERSION,
  };
}

export function normalizeWebBrainDocumentForAi(
  value: unknown,
  options: WebBrainDocumentValidationOptions = {},
) {
  return validateWebBrainDocument(value, options).document;
}
