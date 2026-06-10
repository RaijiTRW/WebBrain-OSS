import { NextResponse } from "next/server";
import {
  getPublishedSiteBundle,
  publicationIsAvailable,
} from "@/lib/webbrain-publication-store";

type RouteContext = {
  params: Promise<{
    slug: string;
    path?: string[];
  }>;
};

function pageSlugFromPath(path?: string[]) {
  if (!path?.length) return "home";
  const joined = path.join("/").replace(/^\/+|\/+$/g, "");

  return joined || "home";
}

function unavailableHtml(title: string, text: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      html,body{height:100%;margin:0;background:#090b0b;color:#f7f7f2;font-family:Inter,Arial,sans-serif}
      body{display:grid;place-items:center;background:radial-gradient(circle at 70% 20%,rgba(190,255,76,.14),transparent 34%),#090b0b}
      main{width:min(520px,calc(100% - 32px));border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:34px;background:rgba(255,255,255,.035);box-shadow:0 24px 90px rgba(0,0,0,.42)}
      h1{margin:0 0 12px;font-size:clamp(28px,5vw,44px);letter-spacing:-.04em;line-height:1}
      p{margin:0;color:rgba(255,255,255,.58);font-size:16px;line-height:1.6}
      .dot{width:12px;height:12px;border-radius:999px;background:#beff4c;box-shadow:0 0 34px rgba(190,255,76,.7);margin-bottom:22px}
    </style>
  </head>
  <body>
    <main>
      <div class="dot"></div>
      <h1>${title}</h1>
      <p>${text}</p>
    </main>
  </body>
</html>`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug, path } = await context.params;
  const bundle = await getPublishedSiteBundle(slug);

  if (!bundle) {
    return new NextResponse(unavailableHtml("Сайт не найден", "Публикация не существует или была удалена."), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (!publicationIsAvailable(bundle.publication)) {
    return new NextResponse(unavailableHtml("Сайт временно недоступен", "Публикация приостановлена. Владелец сайта может восстановить доступ после оплаты."), {
      status: 402,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const requestedPageSlug = pageSlugFromPath(path);
  const page =
    bundle.pages.find((item) => item.slug === requestedPageSlug) ??
    (requestedPageSlug === "home" ? bundle.pages[0] : null);

  if (!page) {
    return new NextResponse(unavailableHtml("Страница не найдена", "Такой страницы нет в опубликованном сайте."), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(page.html || bundle.site.html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
