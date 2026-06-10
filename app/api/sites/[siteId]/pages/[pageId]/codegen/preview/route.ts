import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { bundleCodegenPreview } from "@/lib/webbrain-codegen/preview-bundler";
import { getCodegenPage } from "@/lib/webbrain-codegen/store";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const page = await getCodegenPage(clientId, siteId, pageId);

    if (page.render_engine !== "codegen") {
      return NextResponse.json({ error: "This page is not a code-gen page" }, { status: 400 });
    }

    const html = await bundleCodegenPreview({
      files: page.codegen_files,
      entry: page.codegen_entry,
      overlayCss: page.codegen_overlay_css,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

