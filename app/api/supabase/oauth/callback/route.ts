import { NextRequest, NextResponse } from "next/server";
import { exchangeSupabaseOAuthCode, saveSupabaseOAuthConnection } from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

const OAUTH_COOKIE = "webbrain_sb_oauth";

type StoredOAuthState = {
  state: string;
  verifier: string;
  clientId: string;
  projectId: string;
  createdAt: number;
};

function originFromRequest(request: NextRequest) {
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function appRedirect(request: NextRequest, status: string, detail?: string) {
  const url = new URL("/app", originFromRequest(request));
  url.searchParams.set("supabase", status);
  if (detail) url.searchParams.set("detail", detail);

  return NextResponse.redirect(url);
}

function readOAuthState(value?: string): StoredOAuthState | null {
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as StoredOAuthState;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const origin = originFromRequest(request);
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const returnedError = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description");
  const stored = readOAuthState(request.cookies.get(OAUTH_COOKIE)?.value);

  if (returnedError) {
    return appRedirect(request, "error", returnedError);
  }

  if (!code || !returnedState || !stored || stored.state !== returnedState) {
    return appRedirect(request, "error", "invalid_oauth_state");
  }

  if (Date.now() - stored.createdAt > 10 * 60 * 1000) {
    return appRedirect(request, "error", "oauth_state_expired");
  }

  try {
    const tokens = await exchangeSupabaseOAuthCode(code, stored.verifier, origin);
    await saveSupabaseOAuthConnection(stored.clientId, stored.projectId, tokens);

    const response = appRedirect(request, "connected");
    response.cookies.delete(OAUTH_COOKIE);

    return response;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "supabase_oauth_failed";
    const response = appRedirect(request, "error", detail);
    response.cookies.delete(OAUTH_COOKIE);

    return response;
  }
}
