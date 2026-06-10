import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { listActiveChats, validateRequestClientId } from "@/lib/webbrain-chat-store";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const chats = await listActiveChats(clientId);

    return NextResponse.json({ chats });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  return NextResponse.json({ error: "Use /api/projects/:projectId/chats" }, { status: 410 });
}
