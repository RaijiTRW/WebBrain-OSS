import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { deleteProject, updateProject, validateRequestClientId } from "@/lib/webbrain-chat-store";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      is_pinned?: boolean;
    };
    const project = await updateProject(clientId, projectId, {
      name: body.name,
      is_pinned: body.is_pinned
    });

    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { projectId } = await context.params;
    await deleteProject(clientId, projectId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
