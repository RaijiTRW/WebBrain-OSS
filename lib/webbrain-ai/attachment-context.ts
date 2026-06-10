export type WebBrainChatAttachmentInput = {
  name: string;
  size: number;
  mimeType: string;
  kind?: "file" | "photo" | "video";
  dataUrl?: string;
};

export type WebBrainAttachmentContext = {
  name: string;
  size: number;
  mimeType: string;
  kind: "image" | "video" | "text" | "binary" | "unknown";
  summary: string;
  text?: string;
  frameCount?: number;
  warnings?: string[];
};

export async function buildAttachmentContextForPrompt(attachments: WebBrainChatAttachmentInput[] | undefined, signal?: AbortSignal) {
  void signal;
  const contexts: WebBrainAttachmentContext[] = (attachments ?? []).slice(0, 4).map((attachment) => ({
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
    kind: attachment.mimeType.startsWith("image/") ? "image" : attachment.mimeType.startsWith("video/") ? "video" : "unknown",
    summary: "Attachment analysis is omitted from the public OSS build.",
  }));
  return { contexts, promptAppendix: "" };
}
