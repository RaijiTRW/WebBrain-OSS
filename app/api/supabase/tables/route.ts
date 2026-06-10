import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { listSupabaseProjectTables } from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const projectId = request.nextUrl.searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const tables = await listSupabaseProjectTables(clientId, projectId);

    return NextResponse.json({ tables });
  } catch (error) {
    return jsonError(error);
  }
}
