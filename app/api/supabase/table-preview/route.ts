import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { getSupabaseProjectTablePreview } from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
    const schema = request.nextUrl.searchParams.get("schema")?.trim();
    const table = request.nextUrl.searchParams.get("table")?.trim();

    if (!projectId || !schema || !table) {
      return NextResponse.json({ error: "Project id, schema and table are required" }, { status: 400 });
    }

    const preview = await getSupabaseProjectTablePreview(clientId, projectId, schema, table);

    return NextResponse.json({ preview });
  } catch (error) {
    return jsonError(error);
  }
}
