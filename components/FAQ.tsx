import { faqs } from "@/lib/content";

export function FAQ() {
  return (
    <section id="faq" className="px-5 py-32 md:py-48">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[0.75fr_1.25fr]">
        <div>
          <h2 className="text-balance text-[clamp(2.4rem,5vw,5rem)] font-semibold leading-[0.95] tracking-normal">
            Перед первым запуском
          </h2>
          <p className="mt-6 max-w-sm text-pretty text-base leading-7 text-muted">
            Ответы закрывают основные сомнения до регистрации, без цен и
            лишнего обещания того, что еще не описано.
          </p>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map((item) => (
            <details key={item.question} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-xl font-semibold leading-tight tracking-normal">
                {item.question}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-muted transition group-open:rotate-45 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
