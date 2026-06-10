import { PricingHeader } from "@/components/PricingHeader";
import type { LegalBlock, LegalDocument } from "@/lib/legal-documents";

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "paragraph") {
    return <p className="text-[0.98rem] leading-7 text-white/62 md:text-base">{block.text}</p>;
  }

  if (block.type === "note") {
    return (
      <div className="rounded-[8px] border border-[#c8ff5e]/20 bg-[#c8ff5e]/[0.055] px-4 py-3 text-sm leading-6 text-[#d9ff90]/85">
        {block.text}
      </div>
    );
  }

  if (block.type === "definitions") {
    return (
      <dl className="divide-y divide-white/[0.075] rounded-[8px] border border-white/[0.08] bg-white/[0.018]">
        {block.items.map((item) => (
          <div key={item.term} className="grid gap-2 px-4 py-4 md:grid-cols-[180px_1fr] md:gap-6">
            <dt className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-[#c8ff5e]/80">{item.term}</dt>
            <dd className="text-[0.95rem] leading-6 text-white/62">{item.text}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <ul className="space-y-3">
      {block.items.map((item) => (
        <li key={item} className="grid grid-cols-[18px_1fr] gap-3 text-[0.98rem] leading-7 text-white/62">
          <span className="mt-[0.72rem] size-1.5 rounded-full bg-[#c8ff5e]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020303] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(200,255,94,0.12),transparent_38%),radial-gradient(circle_at_12%_28%,rgba(99,230,255,0.055),transparent_28%),linear-gradient(180deg,#060807_0%,#020303_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:84px_84px] opacity-[0.13]" />

      <PricingHeader />

      <div className="relative mx-auto w-full max-w-[1120px] px-5 pb-8 pt-[8.5rem] md:px-8 md:pb-10 md:pt-36">
        <section className="mb-10 border-b border-white/[0.08] pb-10 text-center md:mb-14 md:pb-14">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-[#c8ff5e]/30 px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[#c8ff5e]">
            {document.badge}
          </div>
          <h1 className="mx-auto max-w-[780px] text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.045em] md:text-6xl">
            {document.title}
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-pretty text-base leading-7 text-white/55 md:text-lg">
            {document.description}
          </p>

          <div className="mx-auto mt-8 grid max-w-[760px] gap-2 rounded-[8px] border border-white/[0.08] bg-white/[0.018] p-4 text-left text-sm text-white/52 md:grid-cols-3 md:p-5">
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/34">Версия</div>
              <div className="mt-1 text-white/72">{document.version}</div>
            </div>
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/34">Действует с</div>
              <div className="mt-1 text-white/72">{document.effectiveDate}</div>
            </div>
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/34">Обновлено</div>
              <div className="mt-1 text-white/72">{document.updatedAt}</div>
            </div>
          </div>
        </section>

        <section className="mb-10 space-y-4 md:mb-14">
          {document.intro.map((item) => (
            <p key={item} className="mx-auto max-w-[820px] text-center text-[1rem] leading-7 text-white/58">
              {item}
            </p>
          ))}
        </section>

        <div className="grid gap-10 lg:grid-cols-[230px_1fr] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-8 space-y-2 border-l border-white/[0.08] pl-4">
              {document.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="block py-1.5 text-sm leading-5 text-white/42 transition hover:text-[#c8ff5e]">
                  {section.title}
                </a>
              ))}
            </div>
          </aside>

          <article className="space-y-10 pb-16">
            {document.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 border-t border-white/[0.08] pt-8">
                <h2 className="mb-5 text-2xl font-semibold leading-tight tracking-[-0.03em] md:text-3xl">{section.title}</h2>
                <div className="space-y-5">
                  {section.blocks.map((block, index) => (
                    <LegalBlockView key={`${section.id}-${block.type}-${index}`} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}
