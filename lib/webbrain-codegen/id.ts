export function createWebBrainElementId(filePath: string, tag: string, salt: string | number) {
  const safeTag = tag.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "el";

  return `wb_${safeTag}_${hashId(`${filePath}:${tag}:${salt}`)}`;
}

function hashId(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).slice(0, 8);
}

