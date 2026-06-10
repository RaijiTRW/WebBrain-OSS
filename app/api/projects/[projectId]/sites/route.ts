import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createProjectSite, findProjectSite, listProjectSites, type WebBrainSiteTemplate } from "@/lib/webbrain-site-store";
import { assertClientCanCreateSite, validateRequestClientId } from "@/lib/webbrain-chat-store";

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
    const sites = await listProjectSites(clientId, projectId);

    return NextResponse.json({ sites });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      html?: string;
      css?: string;
      js?: string;
      template?: WebBrainSiteTemplate;
    };
    const existingSite = await findProjectSite(clientId, projectId);

    if (!existingSite) {
      await assertClientCanCreateSite(clientId);
    }

    const site = await createProjectSite(clientId, projectId, body);

    return NextResponse.json({ site }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
