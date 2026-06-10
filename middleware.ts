import { NextRequest, NextResponse } from "next/server";

const INTERNAL_PREFIXES = [
  "/_next",
  "/api",
  "/app",
  "/login",
  "/signup",
  "/pricing",
  "/offer",
  "/privacy",
  "/favicon",
  "/robots",
  "/sitemap",
];

function cleanHost(host: string | null) {
  return (host ?? "").split(":")[0]?.toLowerCase() ?? "";
}

function buildInternalRewriteUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.protocol = "http:";
  url.pathname = pathname;
  return url;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-webbrain-pathname", pathname);

  if (INTERNAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const rootDomain = process.env.WEBBRAIN_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase();
  if (!rootDomain) return NextResponse.next({ request: { headers: requestHeaders } });

  const host = cleanHost(request.headers.get("host"));
  // localhost / 127.0.0.1 are ALWAYS the app (dev) — never a published-site host.
  // Otherwise a missing WEBBRAIN_APP_HOSTS turns the homepage into "Сайт не найден".
  if (
    !host ||
    host === rootDomain ||
    host === `www.${rootDomain}` ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const slug = host.slice(0, -rootDomain.length - 1);
    if (!slug || slug === "www") return NextResponse.next();

    const url = buildInternalRewriteUrl(request, `/p/${encodeURIComponent(slug)}${pathname === "/" ? "" : pathname}`);

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  const appHosts = (process.env.WEBBRAIN_APP_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (appHosts.includes(host)) return NextResponse.next({ request: { headers: requestHeaders } });

  const url = buildInternalRewriteUrl(request, `/p/${encodeURIComponent(host)}${pathname === "/" ? "" : pathname}`);

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
