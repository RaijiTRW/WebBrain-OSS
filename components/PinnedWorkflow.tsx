"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { workflowSteps } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function PinnedWorkflow() {
  const root = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".workflow-pin", {
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            pin: ".workflow-pin",
            pinSpacing: false
          }
        });

        gsap.utils.toArray<HTMLElement>(".workflow-card").forEach((card) => {
          gsap.fromTo(
            card,
            { autoAlpha: 0.28, y: 70, scale: 0.94 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top 78%",
                end: "top 42%",
                scrub: true
              }
            }
          );
        });

        gsap.utils.toArray<HTMLElement>(".reveal-word").forEach((word, index) => {
          gsap.fromTo(
            word,
            { opacity: 0.14 },
            {
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: ".workflow-copy",
                start: `top+=${index * 11} 76%`,
                end: `top+=${index * 11 + 90} 48%`,
                scrub: true
              }
            }
          );
        });
      });

      return () => media.revert();
    },
    { scope: root }
  );

  const words =
    "Чат нужен для скорости, редактор нужен для контроля. WebBrain соединяет оба режима, чтобы владелец бизнеса мог получить страницу быстро и не потерять вкус в деталях.".split(
      " "
    );

  return (
    <section ref={root} className="relative px-5 py-32 md:py-48">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="workflow-pin h-fit lg:pt-12">
          <h2 className="max-w-xl text-balance text-[clamp(2.6rem,5vw,5.25rem)] font-semibold leading-[0.95] tracking-normal">
            Сначала словами, потом руками
          </h2>
          <p className="workflow-copy mt-7 max-w-md text-pretty text-lg leading-8 text-muted">
            {words.map((word, index) => (
              <span key={`${word}-${index}`} className="reveal-word">
                {word}{" "}
              </span>
            ))}
          </p>
        </div>

        <div className="space-y-5">
          {workflowSteps.map(({ title, body, command, Icon }) => (
            <article
              key={title}
              className="workflow-card group overflow-hidden rounded-card border border-white/10 bg-white/[0.045] p-5 transition hover:border-cyan/35"
            >
              <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
                <div className="flex flex-col justify-between">
                  <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-card border border-white/12 bg-white/8 text-cyan transition duration-700 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-semibold leading-none tracking-normal">
                      {title}
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-muted">{body}</p>
                  </div>
                </div>
                <div className="relative min-h-[220px] overflow-hidden rounded-card border border-white/10 bg-[#070B10] p-4">
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan/10 to-transparent" />
                  <div className="relative rounded-card border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-mist">
                    {command}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="h-16 rounded-card border border-white/10 bg-white/[0.035]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
