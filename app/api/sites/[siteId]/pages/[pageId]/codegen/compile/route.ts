import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";
import { compileAndSaveCodegenPage } from "@/lib/webbrain-codegen/store";
import type { WebBrainCodegenFile } from "@/lib/webbrain-codegen/types";

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
    const body = (await request.json()) as {
      files?: WebBrainCodegenFile[];
      overlayCss?: string;
      entry?: string;
    };

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: "At least one React source file is required" }, { status: 400 });
    }

    const files = body.files.map((file) => ({
      path: String(file.path || "").trim(),
      content: String(file.content || ""),
    })).filter((file) => file.path && file.content);

    if (!files.length) {
      return NextResponse.json({ error: "Code-gen files are empty" }, { status: 400 });
    }

    const page = await compileAndSaveCodegenPage(
      clientId,
      siteId,
      pageId,
      files,
      body.overlayCss ?? "",
      body.entry ?? files[0].path,
    );

    return NextResponse.json({ page }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

