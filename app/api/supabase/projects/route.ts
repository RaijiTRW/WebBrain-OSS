import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import {
  createSupabaseProjectForWebBrain,
  getSupabaseConnectionStatus,
  getSupabaseProjectCreationError,
  listSupabaseOrganizations,
  listSupabaseProjects,
} from "@/lib/webbrain-supabase-store";

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

    const projectsResult = await listSupabaseProjects(clientId)
      .then((projects) => ({ projects, error: "" }))
      .catch((error) => ({ projects: [], error: getApiErrorMessage(error) }));
    const organizationsResult = await listSupabaseOrganizations(clientId)
      .then((organizations) => ({ organizations, error: "" }))
      .catch((error) => ({ organizations: [], error: getApiErrorMessage(error) }));

    return NextResponse.json({
      projects: projectsResult.projects,
      organizations: organizationsResult.organizations,
      error: projectsResult.error || organizationsResult.error || undefined,
    });
  } catch (error) {
    return jsonError(error);
  }
}

function originFromRequest(request: NextRequest) {
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await validateRequestClientId(request);
    const body = (await request.json()) as {
      projectId?: string;
      name?: string;
      organizationSlug?: string;
      organizationId?: string;
      region?: string;
      dbPass?: string;
    };
    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json({ error: "Project id is required" }, { status: 400 });
    }

    const project = await createSupabaseProjectForWebBrain(clientId, projectId, {
      name: body.name?.trim() || "WebBrain site data",
      organizationSlug: body.organizationSlug?.trim(),
      organizationId: body.organizationId?.trim(),
      region: body.region?.trim(),
      dbPass: body.dbPass?.trim(),
    });
    const status = await getSupabaseConnectionStatus(clientId, projectId, originFromRequest(request));
    const projects = await listSupabaseProjects(clientId);
    const organizations = await listSupabaseOrganizations(clientId);

    return NextResponse.json({ project, status, projects, organizations }, { status: 201 });
  } catch (error) {
    const createError = getSupabaseProjectCreationError(error);

    console.error("[supabase-project-create]", createError.message);

    return NextResponse.json({ error: createError.message }, { status: createError.status });
  }
}
