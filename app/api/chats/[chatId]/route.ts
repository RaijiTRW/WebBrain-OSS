import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { deleteChat, updateChat, validateRequestClientId } from "@/lib/webbrain-chat-store";

type RouteContext = {
  params: Promise<{
    chatId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { chatId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { title?: string; isArchived?: boolean };
    const changes: { title?: string; isArchived?: boolean } = {};

    if (typeof body.title === "string") {
      if (!body.title.trim()) {
        return NextResponse.json({ error: "Chat title is required" }, { status: 400 });
      }

      changes.title = body.title;
    }

    if (typeof body.isArchived === "boolean") {
      changes.isArchived = body.isArchived;
    }

    if (!("title" in changes) && !("isArchived" in changes)) {
      return NextResponse.json({ error: "Chat changes are required" }, { status: 400 });
    }

    const chat = await updateChat(clientId, chatId, changes);

    return NextResponse.json({ chat });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { chatId } = await context.params;
    await deleteChat(clientId, chatId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
