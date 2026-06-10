import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildAttachmentContextForPrompt, type WebBrainChatAttachmentInput } from "@/lib/webbrain-ai/attachment-context";
import { appendUserMessage, listMessages, validateRequestClientId } from "@/lib/webbrain-chat-store";
import { createRunAbortController, releaseRunAbortController } from "@/lib/webbrain-ai/run-abort-registry";

type RouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { chatId } = await context.params;
    const messages = await listMessages(clientId, chatId);

    return NextResponse.json({ messages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { chatId } = await context.params;
    const body = (await request.json()) as {
      text?: string;
      visible?: boolean;
      action?: string;
      runId?: string | null;
      spaceModel?: string | null;
      planMode?: boolean;
      attachments?: WebBrainChatAttachmentInput[];
      editorSelection?: {
        pageId?: string;
        pageSlug?: string;
        componentId?: string;
        componentType?: string;
        componentName?: string;
      } | null;
    };
    const text = body.text?.trim();
    const visibleUserMessage = body.visible !== false;

    if (!text) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const { contexts: attachmentContexts, promptAppendix } = await buildAttachmentContextForPrompt(body.attachments, request.signal);
    const aiUserText = promptAppendix ? `${text}\n${promptAppendix}` : text;

    const acceptsStream =
      request.headers.get("accept")?.includes("text/event-stream") ||
      request.headers.get("x-webbrain-stream") === "1";

    if (acceptsStream) {
      const encoder = new TextEncoder();
      // The run gets its OWN abort controller (registry), detached from the HTTP request:
      // a page reload only kills the SSE stream, the generation keeps going and persists.
      // The explicit Stop action aborts via the registry.
      const runAbort = createRunAbortController(chatId);
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            if (request.signal.aborted) return;
            controller.enqueue(encoder.encode(encodeSse(event, data)));
          };

          try {
            send("status", { status: "Очередь", text: "Начинаю работу." });
            const result = await appendUserMessage(clientId, chatId, text, {
              signal: runAbort.signal,
              aiUserText,
              attachmentContexts,
              visibleUserMessage,
              action: body.action,
              runId: body.runId ?? null,
              spaceModel: body.spaceModel ?? null,
              planMode: body.planMode === true,
              editorSelection: body.editorSelection ?? null,
              onAssistantMessage: async (message) => {
                send("assistant_message", { message });
              },
            });

            send("done", result);
          } catch (error) {
            if (!request.signal.aborted) {
              send("error", { error: getApiErrorMessage(error) });
            }
          } finally {
            releaseRunAbortController(chatId, runAbort);
            if (!request.signal.aborted) {
              controller.close();
            }
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const runAbort = createRunAbortController(chatId);
    try {
      const result = await appendUserMessage(clientId, chatId, text, {
        signal: runAbort.signal,
        aiUserText,
        attachmentContexts,
        visibleUserMessage,
        action: body.action,
        runId: body.runId ?? null,
        spaceModel: body.spaceModel ?? null,
        planMode: body.planMode === true,
        editorSelection: body.editorSelection ?? null,
      });

      return NextResponse.json(result, { status: 201 });
    } finally {
      releaseRunAbortController(chatId, runAbort);
    }
  } catch (error) {
    return jsonError(error);
  }
}
