"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "motion/react";
import { Nav } from "@/components/Nav";
import { ProductMockup } from "@/components/ProductMockup";

export function Hero() {
  return (
    <section className="grain relative min-h-screen overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36">
      <Nav />
      <div className="absolute inset-0 -z-10">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          src="/media/webbrain-hero-poster.png"
          alt=""
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,0.64),rgba(5,7,10,0.92)_58%,#05070A)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,230,255,0.16),transparent_44%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full flex-col items-center text-center"
        >
          <h1 className="text-balance max-w-6xl text-[clamp(2.05rem,8.5vw,5.6rem)] font-semibold leading-[0.94] tracking-normal text-white">
            Сайт для бизнеса, который собирается{" "}
            <span
              className="mx-1 inline-block h-[0.58em] w-[1.42em] translate-y-[0.08em] rounded-full bg-cover bg-center ring-1 ring-white/20"
              style={{ backgroundImage: "url('/media/inline-business.png')" }}
              aria-hidden="true"
            />
            в чате
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-mist/78 md:text-lg">
            WebBrain помогает малому бизнесу быстро собрать современный сайт:
            сначала вы пишете идею в чат, потом доводите страницу в живом
            визуальном редакторе.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink transition hover:bg-lime sm:w-auto"
            >
              Зарегистрироваться
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#product"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/7 px-6 text-sm font-semibold text-white transition hover:border-white/34 hover:bg-white/12 sm:w-auto"
            >
              Посмотреть редактор
              <Play className="h-4 w-4 fill-current" />
            </a>
          </div>
        </motion.div>

        <motion.div
          id="product"
          initial={{ opacity: 0, y: 38, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 w-full"
        >
          <ProductMockup />
        </motion.div>
      </div>
    </section>
  );
}
