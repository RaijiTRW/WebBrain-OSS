import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { PlatformClosedScreen } from "@/components/PlatformClosedScreen";
import { getPlatformStates } from "@/lib/webbrain-admin";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "WebBrain",
  title: "WebBrain — ИИ платформа для создания сайтов",
  description:
    "ИИ сервис для создания сайтов.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=20260511-transparent-logo", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=20260511-transparent-logo", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico?v=20260511-transparent-logo", sizes: "64x64", type: "image/x-icon" }
    ],
    apple: [{ url: "/apple-touch-icon.png?v=20260511-transparent-logo", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico?v=20260511-transparent-logo"]
  },
  appleWebApp: {
    title: "WebBrain",
    capable: true,
    statusBarStyle: "black-translucent"
  },
  openGraph: {
    title: "WebBrain — ИИ платформа для создания сайтов",
    description:
      "",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#151616"
};

async function getGlobalClosure() {
  try {
    const states = await getPlatformStates();

    return states.global;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get("x-webbrain-pathname") ?? "";
  const globalClosure = await getGlobalClosure();
  const allowAdminRecoveryRoute = pathname === "/app" || pathname.startsWith("/app/") || pathname === "/login" || pathname === "/signup";
  const globalClosedMode = globalClosure?.mode === "platform_update" || globalClosure?.mode === "problem" ? globalClosure.mode : null;
  const showGlobalClosure = globalClosedMode && !allowAdminRecoveryRoute;

  return (
    <html lang="ru">
      <body>
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109549552', 'ym');

            ym(109549552, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<div><img src="https://mc.yandex.ru/watch/109549552" style="position:absolute; left:-9999px;" alt="" /></div>'
          }}
        />
        {showGlobalClosure ? (
          <PlatformClosedScreen mode={globalClosedMode} message={globalClosure?.message} />
        ) : children}
      </body>
    </html>
  );
}
