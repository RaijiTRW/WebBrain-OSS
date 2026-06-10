import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { listProjectArtifacts } from "@/lib/webbrain-ai-run-store";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

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
    const artifacts = await listProjectArtifacts(clientId, projectId);

    return NextResponse.json({ artifacts });
  } catch (error) {
    return jsonError(error);
  }
}
