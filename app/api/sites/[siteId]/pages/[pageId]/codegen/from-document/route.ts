import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { listSitePages } from "@/lib/webbrain-site-store";
import { webBrainDocumentToCodegenFiles } from "@/lib/webbrain-codegen/document-to-react";
import { compileAndSaveCodegenPage } from "@/lib/webbrain-codegen/store";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const pages = await listSitePages(clientId, siteId);
    const page = pages.find((item) => item.id === pageId);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const codegen = webBrainDocumentToCodegenFiles(page.document_json, {
      slug: page.slug,
      name: page.name,
    });
    const nextPage = await compileAndSaveCodegenPage(
      clientId,
      siteId,
      pageId,
      codegen.files,
      codegen.overlayCss,
      codegen.entry,
    );

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
