import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdminRequest } from "@/lib/webbrain-admin";

type RouteParams = {
  params: Promise<{ userId: string }>;
};

function normalizeUserAction(value: unknown) {
  return value === "ban" || value === "deny" || value === "restore" ? value : null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminId = await requireAdminRequest(request);
    const { userId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      reason?: string;
    };
    const action = normalizeUserAction(body.action);
    const reason = body.reason?.trim().slice(0, 500) ?? "";

    if (!action) {
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
    }

    if ((action === "ban" || action === "deny") && !reason) {
      return NextResponse.json({ error: "Укажите причину" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: authUserResult } = await supabase.auth.admin.getUserById(userId);
    const authUser = authUserResult?.user;

    if (!authUser) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const accessPatch =
      action === "restore"
        ? {
            is_banned: false,
            ban_reason: "",
            access_denied: false,
            access_denied_reason: "",
            banned_at: null,
            banned_by: null,
          }
        : action === "ban"
          ? {
              is_banned: true,
              ban_reason: reason,
              access_denied: true,
              access_denied_reason: reason,
              banned_at: new Date().toISOString(),
              banned_by: adminId,
            }
          : {
              access_denied: true,
              access_denied_reason: reason,
            };

    const { error } = await supabase
      .from("webbrain_profiles")
      .upsert({
        id: userId,
        email: authUser.email ?? null,
        display_name:
          (authUser.user_metadata?.full_name as string | undefined) ||
          (authUser.user_metadata?.name as string | undefined) ||
          null,
        avatar_url: (authUser.user_metadata?.avatar_url as string | undefined) || null,
        metadata: {
          provider: authUser.app_metadata?.provider ?? "email",
        },
        ...accessPatch,
      }, { onConflict: "id" });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
