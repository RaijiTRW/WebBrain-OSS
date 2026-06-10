import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { validateClientId } from "@/lib/webbrain-chat-store";
import { getSupabaseOAuthConfig } from "@/lib/webbrain-supabase-store";

export const runtime = "nodejs";

const OAUTH_COOKIE = "webbrain_sb_oauth";

function originFromRequest(request: NextRequest) {
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function codeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(request: NextRequest) {
  const clientId = validateClientId(request.nextUrl.searchParams.get("client_id"));
  const projectId = request.nextUrl.searchParams.get("project_id")?.trim();
  const origin = originFromRequest(request);
  const config = getSupabaseOAuthConfig(origin);

  if (!projectId) {
    return NextResponse.redirect(new URL("/app?supabase=missing-project", origin));
  }

  if (!config.configured) {
    const url = new URL("/app", origin);
    url.searchParams.set("supabase", "missing-config");
    url.searchParams.set("missing", config.missingEnv.join(","));

    return NextResponse.redirect(url);
  }

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const authorizeUrl = new URL("https://api.supabase.com/v1/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.callbackUrl);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_COOKIE,
    base64UrlJson({
      state,
      verifier,
      clientId,
      projectId,
      createdAt: Date.now(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    },
  );

  return response;
}
