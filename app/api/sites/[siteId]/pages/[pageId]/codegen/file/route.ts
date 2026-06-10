import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { requireAdminRequest } from "@/lib/webbrain-admin";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import { getCodegenPage, saveCodegenPageCompileResult } from "@/lib/webbrain-codegen/store";

const OVERLAY_FILE_PATH = "webbrain-overlay.css";
const MAX_CODE_FILE_SIZE = 1_000_000;

type RouteContext = {
  params: Promise<{
    siteId: string;
    pageId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await requireAdminRequest(request);
    const { siteId, pageId } = await context.params;
    const body = (await request.json()) as {
      filePath?: string;
      content?: string;
    };
    const filePath = body.filePath?.trim();
    const content = typeof body.content === "string" ? body.content : null;

    if (!filePath || content === null) {
      return NextResponse.json({ error: "filePath and content are required" }, { status: 400 });
    }

    if (content.length > MAX_CODE_FILE_SIZE) {
      return NextResponse.json({ error: "Файл слишком большой для сохранения" }, { status: 413 });
    }

    const page = await getCodegenPage(clientId, siteId, pageId);

    if (page.render_engine !== "codegen") {
      return NextResponse.json({ error: "Эта страница не является code-gen страницей" }, { status: 400 });
    }

    if (filePath === OVERLAY_FILE_PATH) {
      const compiled = compileWebBrainCodegen(page.codegen_files, content);
      const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

      return NextResponse.json({ page: nextPage }, { status: 200 });
    }

    const existingFile = page.codegen_files.find((file) => file.path === filePath);

    if (!existingFile) {
      return NextResponse.json({ error: "Code-gen file was not found" }, { status: 404 });
    }

    const files = page.codegen_files.map((file) => file.path === filePath ? { ...file, content } : file);
    const compiled = compileWebBrainCodegen(files, page.codegen_overlay_css);
    const nextPage = await saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, page.codegen_entry);

    return NextResponse.json({ page: nextPage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
