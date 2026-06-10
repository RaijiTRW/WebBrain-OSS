import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import {
  disconnectSupabaseConnection,
  getSupabaseConnectionStatus,
  selectSupabaseProject,
  type WebBrainSupabaseProjectOption,
} from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

function originFromRequest(request: NextRequest) {
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const projectId = request.nextUrl.searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const status = await getSupabaseConnectionStatus(clientId, projectId, originFromRequest(request));

    return NextResponse.json({ status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const body = (await request.json()) as {
      projectId?: string;
      project?: WebBrainSupabaseProjectOption;
    };
    const projectId = body.projectId?.trim();

    if (!projectId || !body.project?.ref || !body.project.apiUrl) {
      return NextResponse.json({ error: "Project id and Supabase project are required" }, { status: 400 });
    }

    const connection = await selectSupabaseProject(clientId, projectId, body.project);
    const status = await getSupabaseConnectionStatus(clientId, projectId, originFromRequest(request));

    return NextResponse.json({ connection, status });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const body = (await request.json()) as {
      projectId?: string;
    };
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    await disconnectSupabaseConnection(clientId);
    const status = await getSupabaseConnectionStatus(clientId, projectId, originFromRequest(request));

    return NextResponse.json({ status });
  } catch (error) {
    return jsonError(error);
  }
}
