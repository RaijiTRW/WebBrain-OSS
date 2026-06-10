import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createProjectChat, listProjectChats, validateRequestClientId } from "@/lib/webbrain-chat-store";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { projectId } = await context.params;
    const chats = await listProjectChats(clientId, projectId);

    return NextResponse.json({ chats });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { title?: string; seed?: boolean };
    const result = await createProjectChat(clientId, projectId, body.title, body.seed !== false);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
