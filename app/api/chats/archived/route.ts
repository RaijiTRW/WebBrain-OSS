import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { listArchivedChats, validateRequestClientId } from "@/lib/webbrain-chat-store";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const chats = await listArchivedChats(clientId);

    return NextResponse.json({ chats });
  } catch (error) {
    return jsonError(error);
  }
}
