import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { createProject, listProjects, validateRequestClientId } from "@/lib/webbrain-chat-store";

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);
  const errorStatus = /достигнут лимит проектов/i.test(message) ? 403 : getApiErrorStatus(error, status);

  return NextResponse.json({ error: message }, { status: errorStatus });
}

export async function GET(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const projects = await listProjects(clientId);

    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const project = await createProject(clientId, body.name);

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
