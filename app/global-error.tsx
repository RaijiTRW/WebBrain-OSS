"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <WebBrainErrorPage
          code="500"
          {...getErrorPage("500")}
          eyebrow="Критическая ошибка"
          action={
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-white/[0.09] bg-white/[0.035] px-5 text-sm font-extrabold text-white transition hover:border-lime/40 hover:bg-lime/[0.09] hover:text-lime"
            >
              <RefreshCw className="h-4 w-4" />
              Перезапустить
            </button>
          }
        />
      </body>
    </html>
  );
}
