import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import { getCodegenPage, saveCodegenPageCompileResult } from "@/lib/webbrain-codegen/store";
import { applyCodegenAnchorPatch } from "@/lib/webbrain-codegen/write-back";

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
      nextWbId?: string;
    };
    const filePath = body.filePath?.trim();
    const wbId = body.wbId?.trim();
    const nextWbId = normalizeCodegenAnchorId(body.nextWbId);

    if (!filePath || !wbId || !nextWbId) {
      return NextResponse.json({ error: "filePath, wbId and nextWbId are required" }, { status: 400 });
    }

    const page = await getCodegenPage(clientId, siteId, pageId);

    if (page.codegen_element_map?.elements?.[nextWbId] && nextWbId !== wbId) {
      return NextResponse.json({ error: "Такой ID уже есть на странице" }, { status: 409 });
    }

    const file = page.codegen_files.find((item) => item.path === filePath);

    if (!file) {
      return NextResponse.json({ error: "Code-gen file was not found" }, { status: 404 });
    }

    const patchedFile = applyCodegenAnchorPatch(file, {
      filePath,
      wbId,
      nextWbId,
    });
    const files = page.codegen_files.map((item) => item.path === filePath ? patchedFile : item);
    const compiled = compileWebBrainCodegen(files, page.codegen_overlay_css);
    const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

function normalizeCodegenAnchorId(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
