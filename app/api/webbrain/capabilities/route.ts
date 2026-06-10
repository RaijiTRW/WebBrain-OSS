import { NextResponse } from "next/server";
import { WEBBRAIN_EDITOR_CAPABILITIES } from "@/lib/webbrain-capabilities";

export async function GET() {
  return NextResponse.json({
    capabilities: WEBBRAIN_EDITOR_CAPABILITIES,
  });
}
