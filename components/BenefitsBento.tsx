import { benefitCards } from "@/lib/content";

export function BenefitsBento() {
  return (
    <section className="px-5 py-32 md:py-48">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-3xl text-balance text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.95] tracking-normal">
            Вместо долгой разработки - управляемый запуск
          </h2>
          <p className="max-w-sm text-pretty text-base leading-7 text-muted">
            WebBrain закрывает типичные проблемы малого бизнеса: нет времени на
            ТЗ, сложно выбрать структуру, правки теряются, а сайт не ведет к
            заявке.
          </p>
        </div>

        <div className="grid-flow-dense grid auto-rows-[220px] grid-cols-1 gap-3 md:grid-cols-12">
          {benefitCards.map(({ title, body, className, Icon }, index) => (
            <article
              key={title}
              className={`group relative overflow-hidden rounded-card border border-white/10 bg-white/[0.045] p-6 transition duration-500 hover:border-cyan/35 hover:bg-white/[0.065] ${className}`}
            >
              <div
                className={`absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100 ${
                  index === 0
                    ? "bg-[linear-gradient(135deg,rgba(99,230,255,0.20),transparent_62%)]"
                    : "bg-[linear-gradient(135deg,rgba(200,255,94,0.12),transparent_60%)]"
                }`}
              />
              <div className="relative flex h-full flex-col">
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-card border border-white/12 bg-white/8 text-cyan transition duration-700 group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-auto">
                  <h3 className="max-w-md text-pretty text-2xl font-semibold leading-tight tracking-normal text-white">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                    {body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
