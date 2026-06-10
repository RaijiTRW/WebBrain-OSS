import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { executeSupabaseProjectSql } from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const body = await request.json().catch(() => ({})) as { projectId?: string; query?: string };
    const projectId = body.projectId?.trim();
    const query = body.query?.trim();

    if (!projectId || !query) {
      return NextResponse.json({ error: "Project id and SQL query are required" }, { status: 400 });
    }

    const result = await executeSupabaseProjectSql(clientId, projectId, query);

    return NextResponse.json({ result });
  } catch (error) {
    return jsonError(error);
  }
}
