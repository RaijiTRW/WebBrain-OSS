import { StoreIcon, marqueeItems } from "@/lib/content";

export function Marquee() {
  const row = [...marqueeItems, ...marqueeItems];

  return (
    <section className="border-y border-white/10 bg-white/[0.025] py-6">
      <div className="no-scrollbar flex overflow-hidden">
        <div className="flex min-w-max animate-marquee items-center gap-10 pr-10 motion-reduce:animate-none">
          {row.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex items-center gap-3 text-sm font-semibold text-muted"
            >
              <StoreIcon className="h-4 w-4 text-cyan" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
