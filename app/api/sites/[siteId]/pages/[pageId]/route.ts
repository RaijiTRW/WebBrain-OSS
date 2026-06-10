import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { validateWebBrainDocument } from "@/lib/webbrain-document-validator";
import { deleteSitePage, listSitePages, updateSitePageDocument } from "@/lib/webbrain-site-store";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const validation = validateWebBrainDocument(body.document_json, {
      name: body.name,
      slug: body.slug,
    });
    const page = await updateSitePageDocument(
      clientId,
      siteId,
      pageId,
      validation.document,
    );

    return NextResponse.json({
      page,
      validation: {
        ok: validation.ok,
        issues: validation.issues,
        capabilitiesVersion: validation.capabilitiesVersion,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const pages = await listSitePages(clientId, siteId);
    const page = pages.find((item) => item.id === pageId);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const validation = validateWebBrainDocument(page.document_json, {
      name: page.name,
      slug: page.slug,
    });

    return NextResponse.json({
      page: {
        ...page,
        document_json: validation.document,
      },
      document_json: validation.document,
      validation: {
        ok: validation.ok,
        issues: validation.issues,
        capabilitiesVersion: validation.capabilitiesVersion,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const pages = await deleteSitePage(clientId, siteId, pageId);

    return NextResponse.json({ pages });
  } catch (error) {
    return jsonError(error);
  }
}
