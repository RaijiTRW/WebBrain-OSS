import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isMissingAdminSchemaError, requireAdminRequest } from "@/lib/webbrain-admin";

type AdminUserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_admin: boolean | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  access_denied: boolean | null;
  access_denied_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function countRows(table: string, clientId: string, filters: Array<{ column: string; value: string }> = []) {
  const supabase = createSupabaseAdmin();
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("client_id", clientId);

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;
  if (error) {
    if (isMissingAdminSchemaError(error)) return 0;
    throw error;
  }

  return count ?? 0;
}

async function getRecentRequests(clientId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("webbrain_messages")
    .select("id,chat_id,text,created_at")
    .eq("client_id", clientId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    if (isMissingAdminSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    chatId: String(row.chat_id ?? ""),
    text: String(row.text ?? "").slice(0, 500),
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  }));
}

async function getUserStats(clientId: string) {
  const [
    projects,
    chats,
    sites,
    publishedSites,
    activePublishedSites,
    messages,
    recentRequests,
  ] = await Promise.all([
    countRows("webbrain_projects", clientId),
    countRows("webbrain_chats", clientId),
    countRows("webbrain_sites", clientId),
    countRows("webbrain_published_sites", clientId),
    countRows("webbrain_published_sites", clientId, [{ column: "status", value: "active" }]),
    countRows("webbrain_messages", clientId),
    getRecentRequests(clientId),
  ]);

  return {
    projects,
    chats,
    sites,
    publishedSites,
    activePublishedSites,
    messages,
    recentRequests,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request);

    const supabase = createSupabaseAdmin();
    const { data: profiles, error } = await supabase
      .from("webbrain_profiles")
      .select("id,email,display_name,is_admin,is_banned,ban_reason,access_denied,access_denied_reason,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingAdminSchemaError(error)) {
        return NextResponse.json({ users: [] });
      }

      throw error;
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 }).catch(() => ({ data: { users: [] } }));
    const authById = new Map((authUsers.users ?? []).map((user) => [user.id, user]));
    const users = await Promise.all((profiles as AdminUserProfileRow[] ?? []).map(async (profile) => {
      const authUser = authById.get(profile.id);

      return {
        id: profile.id,
        email: profile.email ?? authUser?.email ?? "Без почты",
        name: profile.display_name ?? authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null,
        isAdmin: profile.is_admin === true,
        isBanned: profile.is_banned === true,
        banReason: profile.ban_reason ?? "",
        accessDenied: profile.access_denied === true,
        accessDeniedReason: profile.access_denied_reason ?? "",
        createdAt: profile.created_at ?? authUser?.created_at ?? null,
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        stats: await getUserStats(profile.id),
      };
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
