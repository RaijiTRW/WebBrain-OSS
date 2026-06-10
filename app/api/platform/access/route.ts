import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getPlatformStates, isMissingAdminSchemaError } from "@/lib/webbrain-admin";

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const token = bearerToken(request);

    if (!token) {
      return NextResponse.json({ error: "Требуется вход в аккаунт" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json({ error: "Сессия истекла. Войдите снова." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("webbrain_profiles")
      .select("is_admin,is_banned,ban_reason,access_denied,access_denied_reason")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError && !isMissingAdminSchemaError(profileError)) throw profileError;

    return NextResponse.json({
      platform: await getPlatformStates(),
      access: {
        isAdmin: profile?.is_admin === true,
        isBanned: profile?.is_banned === true,
        banReason: typeof profile?.ban_reason === "string" ? profile.ban_reason : "",
        accessDenied: profile?.access_denied === true,
        accessDeniedReason: typeof profile?.access_denied_reason === "string" ? profile.access_denied_reason : "",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
