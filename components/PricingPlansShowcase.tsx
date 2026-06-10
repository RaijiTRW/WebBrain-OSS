"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { AccountSubscriptionPlan, WebBrainBillingPeriod } from "@/lib/webbrain-pricing-plans";

const SCRAMBLE_LETTERS = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLIDING_DIGITS = Array.from({ length: 10 }, (_, index) => String(index));

function randomLetter() {
  return SCRAMBLE_LETTERS[Math.floor(Math.random() * SCRAMBLE_LETTERS.length)] ?? "а";
}

function isLetter(char: string) {
  return /\p{L}/u.test(char);
}

function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState(text);
  const previousText = useRef(text);

  useEffect(() => {
    if (previousText.current === text) return;

    previousText.current = text;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setDisplayText(text), 0);
      return () => window.clearTimeout(timer);
    }

    const target = text;
    const frames = 18;
    let frame = 0;

    const timer = window.setInterval(() => {
      frame += 1;
      const progress = frame / frames;
      const next = Array.from(target, (char, index) => {
        const revealAt = index / Math.max(target.length, 1);
        if (progress >= revealAt || !isLetter(char)) return char;
        return randomLetter();
      }).join("");

      setDisplayText(next);

      if (frame >= frames) {
        window.clearInterval(timer);
        setDisplayText(target);
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [text]);

  return <span className={className}>{displayText}</span>;
}

function SlidingPrice({ value }: { value: string }) {
  return (
    <span className="wb-pricing-slide-number inline-flex items-baseline gap-[0.01em] whitespace-nowrap tracking-normal" aria-label={value}>
      {Array.from(value).map((char, index) => (
        /\d/.test(char) ? (
          <span key={`digit-${index}`} className="wb-pricing-slide-digit inline-block h-[1em] w-[0.6em] overflow-hidden align-baseline" aria-hidden="true">
            <span
              className="wb-pricing-slide-reel flex flex-col transition-transform duration-[720ms] ease-[cubic-bezier(0.2,0.9,0.22,1)] will-change-transform motion-reduce:transition-none"
              style={{
                transform: `translateY(calc(${Number(char) * -1} * 1em))`,
                transitionDelay: `${index * 18}ms`,
              }}
            >
              {SLIDING_DIGITS.map((digit) => (
                <span key={digit} className="wb-pricing-slide-reel-digit block h-[1em] leading-[1em]">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`separator-${index}`} className="wb-pricing-slide-separator mx-[0.06em] inline-block" aria-hidden="true">
            {char === " " ? "\u00a0" : char}
          </span>
        )
      ))}
    </span>
  );
}

function BillingToggle({
  period,
  onChange,
  className = "",
}: {
  period: WebBrainBillingPeriod;
  onChange: (period: WebBrainBillingPeriod) => void;
  className?: string;
}) {
  const yearly = period === "yearly";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`text-xs font-extrabold transition ${yearly ? "text-white/42 hover:text-white/70" : "text-lime"}`}
      >
        В месяц
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={yearly}
        aria-label="Переключить период оплаты"
        onClick={() => onChange(yearly ? "monthly" : "yearly")}
        className={`relative h-8 w-[58px] rounded-full border p-[3px] transition ${
          yearly
            ? "border-lime/70 bg-lime/20 shadow-[0_0_0_1px_rgba(200,255,94,0.18),0_12px_34px_rgba(200,255,94,0.14)]"
            : "border-white/[0.12] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`block h-[26px] w-[26px] rounded-full transition-transform duration-300 ${
            yearly
              ? "translate-x-[26px] bg-lime shadow-[0_8px_24px_rgba(200,255,94,0.24)]"
              : "translate-x-0 bg-white/90 shadow-[0_8px_22px_rgba(0,0,0,0.38)]"
          }`}
        />
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`inline-flex items-center gap-1.5 text-xs font-extrabold transition ${yearly ? "text-lime" : "text-white/42 hover:text-white/70"}`}
      >
        <span>В год</span>
        <span className="rounded-full border border-lime/30 bg-lime/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-black leading-none tracking-[0.02em] text-lime">
          -20%
        </span>
      </button>
    </div>
  );
}

export function PricingPlansShowcase({ plans }: { plans: AccountSubscriptionPlan[] }) {
  const [period, setPeriod] = useState<WebBrainBillingPeriod>("monthly");
  const [selectedPlanKey, setSelectedPlanKey] = useState(() => plans.find((plan) => plan.key === "start")?.key ?? plans[0]?.key ?? "start");
  const mobileFeaturesRef = useRef<HTMLUListElement | null>(null);
  const [mobileFeaturesHeight, setMobileFeaturesHeight] = useState<string>();
  const selectedPlan = plans.find((plan) => plan.key === selectedPlanKey) ?? plans[0];
  const billing = selectedPlan.billing?.[period] ?? selectedPlan.billing.monthly;
  const currencySymbol = billing.currencySymbol ?? selectedPlan.currencySymbol ?? "";
  const maxFeatureCount = Math.max(
    ...plans.flatMap((plan) => [plan.billing?.monthly?.features.length ?? plan.features.length, plan.billing?.yearly?.features.length ?? plan.features.length]),
  );
  const mobileFeaturesKey = billing.features.join("|");

  useEffect(() => {
    const element = mobileFeaturesRef.current;
    if (!element) return undefined;

    const updateHeight = () => {
      setMobileFeaturesHeight(`${element.scrollHeight}px`);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [mobileFeaturesKey]);

  return (
    <div className="w-full">
      <div className="mb-6 md:mb-10">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-lime/80">Тарифы</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(2rem,12vw,5.9rem)] font-semibold leading-[0.96] tracking-[-0.045em] sm:tracking-[-0.055em]">
            Тарифы WebBrain
          </h1>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-3 lg:grid-cols-4">
        {plans.map((plan) => {
          const selected = plan.key === selectedPlan.key;

          return (
            <button
              key={plan.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedPlanKey(plan.key)}
              className={`relative h-12 rounded-[14px] border px-3 text-left transition sm:h-14 sm:px-4 ${
                selected
                  ? "border-lime/50 bg-lime/[0.11] text-white shadow-[0_18px_60px_rgba(200,255,94,0.1)]"
                  : "border-white/[0.07] bg-white/[0.025] text-white/54 hover:border-white/[0.14] hover:text-white"
              }`}
            >
              <span className="block truncate text-sm font-extrabold tracking-[-0.02em] sm:text-base">{plan.name}</span>
              {plan.badge ? (
                <span className="absolute right-2 top-0 -translate-y-1/2 rounded-full bg-lime px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.06em] text-black shadow-[0_10px_26px_rgba(200,255,94,0.18)] sm:right-3 sm:text-[0.6rem]">
                  🔥 {plan.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <article className="relative overflow-visible px-0 py-5 sm:px-1 sm:py-8 md:px-0 md:py-10">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div>
            <div className="flex min-h-6 flex-wrap items-center gap-2 sm:min-h-7">
              {selectedPlan.comingSoon ? (
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-white/55 sm:px-2.5 sm:py-1 sm:text-[0.68rem]">
                  Скоро
                </span>
              ) : selectedPlan.badge ? (
                <span className="rounded-full bg-lime px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-black sm:px-2.5 sm:py-1 sm:text-[0.68rem]">
                  {selectedPlan.badge}
                </span>
              ) : null}
            </div>
            <BillingToggle period={period} onChange={setPeriod} className="mt-4 w-full max-w-[216px] sm:mt-5 sm:max-w-[236px]" />
            <p className="mt-4 max-w-xl text-[0.93rem] leading-6 text-white/58 sm:mt-5 md:text-base md:leading-7">
              <ScrambleText text={selectedPlan.note} />
            </p>

            <div className="mt-6 lg:hidden">
              <p className="mb-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/36 sm:mb-4 sm:text-xs">Условия тарифа</p>
              <div
                className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                style={{ height: mobileFeaturesHeight }}
              >
                <ul ref={mobileFeaturesRef} className="grid gap-3">
                  {billing.features.map((feature, index) => (
                    <li
                      key={`mobile-feature-${index}`}
                      className="flex min-h-0 translate-y-0 gap-2.5 text-[0.9rem] leading-5 text-white/72 opacity-100 transition duration-300"
                      style={{ transitionDelay: `${(index % 4) * 24}ms` }}
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime/[0.08] text-lime">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <ScrambleText text={feature} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 border-y border-white/[0.075] py-5 sm:mt-8 sm:py-6">
              <p className="mb-3 min-h-5 font-mono text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/38 sm:text-[0.72rem]">
                <ScrambleText text={billing.priceTitle} />
              </p>
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="font-mono text-[clamp(2.8rem,15vw,4.7rem)] font-bold leading-none tracking-normal sm:text-[clamp(3.3rem,7vw,6.8rem)]">
                  <SlidingPrice value={billing.price} />
                </span>
                {currencySymbol ? (
                  <span className="font-mono text-[clamp(2.8rem,15vw,4.7rem)] font-bold leading-none tracking-normal text-lime sm:text-[clamp(3.3rem,7vw,6.8rem)]">
                    {currencySymbol}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 min-h-5 text-xs text-white/42 sm:text-sm">
                <ScrambleText text={billing.suffix} />
              </p>
              <p className="mt-1 min-h-5 text-xs font-semibold text-lime/72">
                <ScrambleText text={billing.caption} />
              </p>
            </div>

            {selectedPlan.comingSoon ? (
              <span
                aria-disabled="true"
                className="mt-6 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-sm font-extrabold text-white/40 sm:w-auto sm:px-9"
              >
                Скоро
              </span>
            ) : (
              <Link
                href={selectedPlan.href}
                className={`pricing-action-cta mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-extrabold transition sm:mt-6 sm:w-auto sm:px-9 ${
                  selectedPlan.featured ? "pricing-action-cta-featured" : ""
                }`}
              >
                <span>{selectedPlan.cta.pricing}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="hidden lg:block">
            <p className="mb-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/36 sm:mb-4 sm:text-xs">Условия тарифа</p>
            <ul className="grid gap-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-rows-4 sm:gap-x-5 sm:gap-y-3">
              {Array.from({ length: maxFeatureCount }).map((_, index) => {
                const feature = billing.features[index] ?? "";

                return (
                  <li
                    key={`selected-feature-${index}`}
                    className={`flex min-h-0 gap-2.5 text-[0.9rem] leading-5 transition duration-300 sm:min-h-12 sm:text-sm ${
                      feature ? "translate-y-0 opacity-100 text-white/72" : "-translate-y-1 opacity-0"
                    }`}
                    style={{ transitionDelay: `${(index % 4) * 24}ms` }}
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime/[0.08] text-lime">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <ScrambleText text={feature} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </article>
    </div>
  );
}
