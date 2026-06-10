import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { assertCodegenStaticContracts } from "@/lib/webbrain-codegen/contracts";
import { compileWebBrainCodegen } from "@/lib/webbrain-codegen/compiler";
import type {
  WebBrainCodegenCompileResult,
  WebBrainCodegenElementMap,
  WebBrainCodegenFile,
  WebBrainRenderEngine,
} from "@/lib/webbrain-codegen/types";

export type WebBrainCodegenPage = {
  id: string;
  client_id: string;
  site_id: string;
  name: string;
  slug: string;
  html: string;
  document_json: unknown;
  render_engine: WebBrainRenderEngine;
  codegen_entry: string;
  codegen_files: WebBrainCodegenFile[];
  codegen_overlay_css: string;
  codegen_element_map: WebBrainCodegenElementMap | null;
  sort_order: number;
  updated_at: string;
};

const codegenPageColumns =
  "id,client_id,site_id,name,slug,html,document_json,render_engine,codegen_entry,codegen_files,codegen_overlay_css,codegen_element_map,sort_order,updated_at";

function isMissingCodegenSchema(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "42703" || code === "PGRST204" || message.includes("codegen_") || message.includes("render_engine");
}

export async function getCodegenPage(clientId: string, siteId: string, pageId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .select(codegenPageColumns)
    .eq("id", pageId)
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .single();

  if (error) {
    if (isMissingCodegenSchema(error)) {
      throw new Error("Code-gen schema is not installed. Apply the latest Supabase migration before using code-gen pages.");
    }

    throw error;
  }

  return normalizeCodegenPage(data);
}

export async function saveCodegenPageCompileResult(
  clientId: string,
  siteId: string,
  pageId: string,
  compileResult: WebBrainCodegenCompileResult,
  entry = "src/App.tsx",
) {
  assertCodegenStaticContracts({
    files: compileResult.files,
    compileResult,
  });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .update({
      render_engine: "codegen",
      codegen_entry: entry,
      codegen_files: compileResult.files,
      codegen_overlay_css: compileResult.overlay.css,
      codegen_element_map: compileResult.elementMap,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .select(codegenPageColumns)
    .single();

  if (error) {
    if (isMissingCodegenSchema(error)) {
      throw new Error("Code-gen schema is not installed. Apply the latest Supabase migration before saving code-gen pages.");
    }

    throw error;
  }

  return normalizeCodegenPage(data);
}

export async function saveCodegenPageErrorFallback(
  clientId: string,
  siteId: string,
  pageId: string,
  compileResult: WebBrainCodegenCompileResult,
  fallbackHtml: string,
  entry = "src/App.tsx",
) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_site_pages")
    .update({
      render_engine: "codegen",
      html: fallbackHtml,
      codegen_entry: entry,
      codegen_files: compileResult.files,
      codegen_overlay_css: compileResult.overlay.css,
      codegen_element_map: compileResult.elementMap,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("client_id", clientId)
    .eq("site_id", siteId)
    .select(codegenPageColumns)
    .single();

  if (error) {
    if (isMissingCodegenSchema(error)) {
      throw new Error("Code-gen schema is not installed. Apply the latest Supabase migration before saving code-gen pages.");
    }

    throw error;
  }

  return normalizeCodegenPage(data);
}

export async function compileAndSaveCodegenPage(
  clientId: string,
  siteId: string,
  pageId: string,
  files: WebBrainCodegenFile[],
  overlayCss = "",
  entry = "src/App.tsx",
) {
  const compiled = compileWebBrainCodegen(files, overlayCss);

  return saveCodegenPageCompileResult(clientId, siteId, pageId, compiled, entry);
}

function normalizeCodegenPage(value: unknown): WebBrainCodegenPage {
  const row = value as WebBrainCodegenPage;

  return {
    ...row,
    render_engine: row.render_engine === "codegen" ? "codegen" : "document_json",
    codegen_files: Array.isArray(row.codegen_files) ? row.codegen_files : [],
    codegen_overlay_css: row.codegen_overlay_css ?? "",
    codegen_element_map: row.codegen_element_map ?? null,
  };
}
