import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import { getCodegenPage, saveCodegenPageCompileResult } from "@/lib/webbrain-codegen/store";
import { applyCodegenContentPatch } from "@/lib/webbrain-codegen/write-back";
import type { WebBrainCodegenContentKind } from "@/lib/webbrain-codegen/types";

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

const contentKinds = new Set<WebBrainCodegenContentKind>(["text", "src", "href"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId, pageId } = await context.params;
    const body = (await request.json()) as {
      filePath?: string;
      wbId?: string;
      kind?: WebBrainCodegenContentKind;
      value?: string;
    };
    const filePath = body.filePath?.trim();
    const wbId = body.wbId?.trim();
    const kind = body.kind;

    if (!filePath || !wbId || !kind || !contentKinds.has(kind) || typeof body.value !== "string") {
      return NextResponse.json({ error: "filePath, wbId, kind and value are required" }, { status: 400 });
    }

    const page = await getCodegenPage(clientId, siteId, pageId);
    const file = page.codegen_files.find((item) => item.path === filePath);

    if (!file) {
      return NextResponse.json({ error: "Code-gen file was not found" }, { status: 404 });
    }

    const patchedFile = applyCodegenContentPatch(file, {
      filePath,
      wbId,
      kind,
      value: body.value,
    });
    const files = page.codegen_files.map((item) => item.path === filePath ? patchedFile : item);
    const compiled = compileWebBrainCodegen(files, page.codegen_overlay_css);
    const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
