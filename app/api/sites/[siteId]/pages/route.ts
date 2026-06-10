import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { createSitePage, listSitePages } from "@/lib/webbrain-site-store";

type RouteContext = {
  params: Promise<{
    siteId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const pages = await listSitePages(clientId, siteId);

    return NextResponse.json({ pages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const page = await createSitePage(clientId, siteId, { name: body.name });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
