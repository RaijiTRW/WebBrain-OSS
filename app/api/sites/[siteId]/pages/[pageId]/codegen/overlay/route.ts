import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import { upsertCodegenOverlayRule, type WebBrainCodegenOverlayState } from "@/lib/webbrain-codegen/overlay";
import { getCodegenPage, saveCodegenPageCompileResult } from "@/lib/webbrain-codegen/store";
import type { WebBrainCodegenStyleValue } from "@/lib/webbrain-codegen/types";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

const overlayStates = new Set<WebBrainCodegenOverlayState>(["hover", "focus", "mobile", "tablet"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      wbId?: string;
      state?: WebBrainCodegenOverlayState;
      declarations?: Record<string, WebBrainCodegenStyleValue | undefined>;
    };
    const wbId = body.wbId?.trim();
    const state = body.state;

    if (!wbId || !state || !overlayStates.has(state) || !body.declarations || typeof body.declarations !== "object") {
      return NextResponse.json({ error: "wbId, state and declarations are required" }, { status: 400 });
    }

    const page = await getCodegenPage(clientId, siteId, pageId);

    if (!page.codegen_element_map?.elements[wbId]) {
      return NextResponse.json({ error: "Code-gen element was not found" }, { status: 404 });
    }

    const overlayCss = upsertCodegenOverlayRule(page.codegen_overlay_css, {
      wbId,
      state,
      declarations: body.declarations,
    });
    const compiled = compileWebBrainCodegen(page.codegen_files, overlayCss);
    const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
