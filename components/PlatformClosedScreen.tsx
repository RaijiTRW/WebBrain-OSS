import { RefreshCw, TriangleAlert } from "lucide-react";
import type { WebBrainPlatformMode } from "@/lib/webbrain-admin";

const modeCopy: Record<Exclude<WebBrainPlatformMode, "open">, { title: string; text: string }> = {
  platform_update: {
    title: "Идет обновление платформы",
    text: "Мы выкатываем обновления WebBrain. Скоро все снова будет доступно.",
  },
  problem: {
    title: "Мы решаем проблему",
    text: "Доступ временно ограничен, команда уже работает над восстановлением.",
  },
};

export function PlatformClosedScreen({
  mode,
  message,
  accessDenied,
}: {
  mode: Exclude<WebBrainPlatformMode, "open">;
  message?: string;
  accessDenied?: boolean;
}) {
  const copy = accessDenied
    ? {
        title: "Доступ запрещен",
        text: message || "Ваш аккаунт временно не может пользоваться WebBrain.",
      }
    : modeCopy[mode];

  const Icon = accessDenied ? TriangleAlert : RefreshCw;

  return (
    <main className="min-h-screen bg-[#101112] px-5 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[760px] flex-col items-center justify-center text-center">
        <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-lime/[0.1] text-lime shadow-[inset_0_0_0_1px_rgba(190,255,76,0.16)]">
          <Icon className={`h-7 w-7 ${accessDenied ? "" : "animate-spin"}`} />
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-lime/76">WebBrain</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/52">{copy.text}</p>
      </div>
    </main>
  );
}
