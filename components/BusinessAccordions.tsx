"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { businesses } from "@/lib/content";

export function BusinessAccordions() {
  const [active, setActive] = useState(0);

  return (
    <section id="business" className="px-5 py-32 md:py-48">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-3xl text-balance text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.95] tracking-normal">
            Один конструктор, разные сценарии бизнеса
          </h2>
          <p className="max-w-sm text-pretty text-base leading-7 text-muted">
            В первом запуске WebBrain продается как универсальный конструктор,
            но страница показывает конкретные варианты, чтобы владелец бизнеса
            видел себя внутри продукта.
          </p>
        </div>

        <div className="flex min-h-[560px] flex-col gap-3 lg:flex-row">
          {businesses.map((business, index) => {
            const Icon = business.Icon;
            const isActive = active === index;

            return (
              <button
                key={business.name}
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className={`group relative overflow-hidden rounded-card border border-white/10 bg-white/[0.045] p-5 text-left transition-all duration-500 hover:border-white/22 lg:min-w-0 ${
                  isActive ? "lg:flex-[3.2]" : "lg:flex-1"
                }`}
              >
                <div
                  className="absolute inset-0 opacity-35 transition duration-700 group-hover:opacity-55"
                  style={{
                    background: `linear-gradient(135deg, ${business.accent}33, transparent 58%)`
                  }}
                />
                <div className="relative flex h-full flex-col">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-card border border-white/12 bg-white/8 text-white transition duration-700 group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted">
                      {business.name}
                    </span>
                  </div>

                  <div className="mt-auto">
                    <h3 className="max-w-md text-pretty text-3xl font-semibold leading-none tracking-normal">
                      {business.title}
                    </h3>
                    <p
                      className={`mt-4 max-w-md text-sm leading-6 text-muted transition-opacity duration-500 ${
                        isActive ? "opacity-100" : "opacity-0 lg:opacity-0"
                      }`}
                    >
                      {business.body}
                    </p>
                    <div
                      className={`mt-6 rounded-card border border-white/10 bg-[#05070A]/70 p-4 transition-opacity duration-500 ${
                        isActive ? "opacity-100" : "opacity-0 lg:opacity-0"
                      }`}
                    >
                      <p className="text-sm leading-6 text-mist">
                        {business.prompt}
                      </p>
                    </div>
                    <div
                      className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition-opacity duration-500 ${
                        isActive ? "opacity-100" : "opacity-0 lg:opacity-0"
                      }`}
                    >
                      Собрать такой сайт
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
