import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import { getCodegenPage, saveCodegenPageCompileResult } from "@/lib/webbrain-codegen/store";
import { applyInlineStylePatch } from "@/lib/webbrain-codegen/write-back";
import type { WebBrainCodegenStyleValue } from "@/lib/webbrain-codegen/types";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const body = (await request.json()) as {
      filePath?: string;
      wbId?: string;
      property?: string;
      value?: WebBrainCodegenStyleValue;
    };
    const filePath = body.filePath?.trim();
    const wbId = body.wbId?.trim();
    const property = body.property?.trim();

    if (!filePath || !wbId || !property) {
      return NextResponse.json({ error: "filePath, wbId and property are required" }, { status: 400 });
    }

    const page = await getCodegenPage(clientId, siteId, pageId);
    const file = page.codegen_files.find((item) => item.path === filePath);

    if (!file) {
      return NextResponse.json({ error: "Code-gen file was not found" }, { status: 404 });
    }

    const patchedFile = applyInlineStylePatch(file, {
      filePath,
      wbId,
      property,
      value: body.value ?? null,
    });
    const files = page.codegen_files.map((item) => item.path === filePath ? patchedFile : item);
    const compiled = compileWebBrainCodegen(files, page.codegen_overlay_css);
    const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

