import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { listLatestAiRunsForChats } from "@/lib/webbrain-ai-run-store";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const runs = await listLatestAiRunsForChats(clientId);

    return NextResponse.json({ runs });
  } catch (error) {
    return jsonError(error);
  }
}
