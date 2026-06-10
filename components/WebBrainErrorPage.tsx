import Link from "next/link";
import { ArrowLeft, ArrowRight, Home, RefreshCw } from "lucide-react";

type WebBrainErrorPageProps = {
  code: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  action?: React.ReactNode;
};

export function WebBrainErrorPage({
  code,
  eyebrow = "Системное сообщение",
  title,
  description,
  primaryHref = "/",
  primaryLabel = "На главную",
  secondaryHref = "/app",
  secondaryLabel = "В WebBrain",
  action,
}: WebBrainErrorPageProps) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#020303] px-5 py-5 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_0%,rgba(200,255,94,0.16),transparent_42%),radial-gradient(circle_at_12%_70%,rgba(99,230,255,0.055),transparent_34%),linear-gradient(180deg,#060807_0%,#020303_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.14]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1180px] grid-rows-[auto_1fr]">
        <header className="flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-normal">
            Web<span className="text-lime">Brain</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/48 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </header>

        <div className="grid items-center py-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(360px,0.7fr)] lg:gap-14">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lime">
              {eyebrow}
            </div>
            <div className="mb-5 font-mono text-[clamp(5rem,15vw,13rem)] font-black leading-none tracking-[-0.12em] text-white/8">
              {code}
            </div>
            <h1 className="max-w-3xl text-balance text-[clamp(2.2rem,5vw,5.2rem)] font-semibold leading-[0.98] tracking-normal">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-white/50 sm:text-lg">
              {description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-lime px-5 text-sm font-extrabold text-black shadow-[0_18px_52px_rgba(200,255,94,0.16)] transition hover:bg-white"
              >
                <Home className="h-4 w-4" />
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-white/[0.09] bg-white/[0.035] px-5 text-sm font-extrabold text-white transition hover:border-lime/40 hover:bg-lime/[0.09] hover:text-lime"
              >
                {secondaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {action}
            </div>
          </div>

          <div className="mt-12 rounded-[24px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] p-2 shadow-[0_44px_140px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.04)] lg:mt-0">
            <div className="relative overflow-hidden rounded-[18px] border border-white/[0.06] bg-black/[0.2] p-6">
              <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-lime/10 blur-3xl" />
              <div className="relative">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm font-bold text-white/72">WebBrain status</span>
                  <span className="rounded-full border border-lime/25 bg-lime/[0.07] px-2.5 py-1 text-xs font-bold text-lime">
                    {code}
                  </span>
                </div>
                <div className="space-y-3">
                  {["Проверяем маршрут", "Сохраняем контекст", "Возвращаем вас к работе"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-[14px] border border-white/[0.055] bg-white/[0.025] px-3.5 py-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-lime/[0.08] text-xs font-black text-lime">
                        {index + 1}
                      </span>
                      <span className="text-sm text-white/62">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex items-center gap-2 text-sm text-white/34">
                  <RefreshCw className="h-4 w-4 text-lime" />
                  Ошибка не ломает проект. Просто выберите следующий шаг.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

