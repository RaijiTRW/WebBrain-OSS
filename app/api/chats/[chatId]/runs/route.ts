import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { appendUserMessage, validateRequestClientId } from "@/lib/webbrain-chat-store";
import { stopLatestAiRun } from "@/lib/webbrain-ai-run-store";
import { abortActiveRun, createRunAbortController, releaseRunAbortController } from "@/lib/webbrain-ai/run-abort-registry";

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

function textForAction(action: string, value: string) {
  if (action === "approve_plan") return "Подтверждаю план";
  if (action === "reject_plan") return "Отклоняю план";
  if (action === "approve_backend_apply") return "Подтверждаю backend-изменения";
  if (action === "answer_brief") return value || "Выбираю рекомендованные ответы brief.";

  return value || action;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { chatId } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      text?: string;
      runId?: string | null;
      spaceModel?: string | null;
      planMode?: boolean;
    };
    const action = body.action?.trim();

    if (!action) {
      return NextResponse.json({ error: "Run action is required" }, { status: 400 });
    }

    if (action === "stop") {
      // Halt the in-flight run via the server-side registry (generation is detached from
      // the HTTP connection, so aborting the client fetch alone no longer stops it).
      abortActiveRun(chatId);
      const runId = await stopLatestAiRun(clientId, chatId);
      return NextResponse.json({ ok: true, runId });
    }

    const text = textForAction(action, body.text?.trim() ?? "");

    if (request.headers.get("accept")?.includes("text/event-stream") || request.headers.get("x-webbrain-stream") === "1") {
      const encoder = new TextEncoder();
      // Run is detached from the HTTP request: reload only drops the stream, Stop aborts
      // via the registry.
      const runAbort = createRunAbortController(chatId);
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            if (request.signal.aborted) return;
            controller.enqueue(encoder.encode(encodeSse(event, data)));
          };

          try {
            const result = await appendUserMessage(clientId, chatId, text, {
              signal: runAbort.signal,
              visibleUserMessage: false,
              action,
              runId: body.runId ?? null,
              spaceModel: body.spaceModel ?? null,
              planMode: body.planMode === true,
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
        visibleUserMessage: false,
        action,
        runId: body.runId ?? null,
        spaceModel: body.spaceModel ?? null,
        planMode: body.planMode === true,
      });

      return NextResponse.json(result, { status: 201 });
    } finally {
      releaseRunAbortController(chatId, runAbort);
    }
  } catch (error) {
    return jsonError(error);
  }
}
