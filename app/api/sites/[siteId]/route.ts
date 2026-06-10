import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { deleteSite, getSite, updateSite, type WebBrainSiteStatus } from "@/lib/webbrain-site-store";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

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
    const site = await getSite(clientId, siteId);

    return NextResponse.json({ site });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      html?: string;
      css?: string;
      js?: string;
      status?: WebBrainSiteStatus;
    };

    if (body.status && body.status !== "draft" && body.status !== "published") {
      return NextResponse.json({ error: "Invalid site status" }, { status: 400 });
    }

    const site = await updateSite(clientId, siteId, body);

    return NextResponse.json({ site });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    await deleteSite(clientId, siteId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
