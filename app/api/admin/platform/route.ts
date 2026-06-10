import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getPlatformStates,
  normalizePlatformMode,
  normalizePlatformScope,
  requireAdminRequest,
  updatePlatformState,
} from "@/lib/webbrain-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request);

    return NextResponse.json({ platform: await getPlatformStates() });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminId = await requireAdminRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      scope?: string;
      mode?: string;
      message?: string;
    };

    const platform = await updatePlatformState({
      scope: normalizePlatformScope(body.scope),
      mode: normalizePlatformMode(body.mode),
      message: body.message,
      updatedBy: adminId,
    });

    return NextResponse.json({ platform });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
