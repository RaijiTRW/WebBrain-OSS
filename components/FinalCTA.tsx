import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <footer className="px-5 pb-8 pt-16">
      <section className="grain relative mx-auto overflow-hidden rounded-card border border-white/10 bg-white/[0.045] p-6 text-center md:p-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,230,255,0.16),transparent_48%),linear-gradient(315deg,rgba(200,255,94,0.12),transparent_48%)]" />
        <div className="relative mx-auto max-w-5xl">
          <h2 className="text-balance text-[clamp(2.6rem,7vw,6.6rem)] font-semibold leading-[0.9] tracking-normal">
            Начните с одного сообщения
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-pretty text-base leading-7 text-muted md:text-lg">
            Зарегистрируйтесь и соберите первый сайт для бизнеса в формате,
            который легко объяснить, увидеть и поправить.
          </p>
          <Link
            href="/signup"
            className="mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-ink transition hover:bg-lime"
          >
            Зарегистрироваться
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 py-8 text-sm text-muted md:flex-row">
        <p>WebBrain</p>
        <div className="flex gap-5">
          <a href="#product" className="transition hover:text-white">
            Продукт
          </a>
          <a href="#business" className="transition hover:text-white">
            Для бизнеса
          </a>
          <a href="#faq" className="transition hover:text-white">
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}
