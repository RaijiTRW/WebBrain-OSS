import { NextResponse } from "next/server";

import { getBetaLeadStats } from "@/lib/beta-leads";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getBetaLeadStats();

  return NextResponse.json({
    ok: true,
    ...stats
  });
}
