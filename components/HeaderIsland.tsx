"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HeaderLiquidGlass } from "@/components/HeaderLiquidGlass";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const CLIENT_ID_STORAGE_KEY = "webbrain-client-id";

function hasLocalAuthHint() {
  if (typeof window === "undefined") return false;

  if (window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)) return true;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.includes("auth-token")) continue;

    const value = window.localStorage.getItem(key);
    if (value?.includes("access_token")) return true;
  }

  return false;
}

async function hasHeaderAuthSession() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();

  return Boolean(data.session) || hasLocalAuthHint();
}

export function HeaderIsland() {
  const headerRef = useRef<HTMLElement | null>(null);
  const [authStatus, setAuthStatus] = useState<"authenticated" | "guest">("guest");

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = getSupabaseBrowserClient();

      void hasHeaderAuthSession().then((authenticated) => {
        if (!mounted) return;
        setAuthStatus(authenticated ? "authenticated" : "guest");
      }).catch(() => {
        if (!mounted) return;
        setAuthStatus(hasLocalAuthHint() ? "authenticated" : "guest");
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setAuthStatus(session || hasLocalAuthHint() ? "authenticated" : "guest");
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    } catch {
      const fallbackFrame = window.requestAnimationFrame(() => {
        if (mounted) setAuthStatus(hasLocalAuthHint() ? "authenticated" : "guest");
      });
      return () => {
        mounted = false;
        window.cancelAnimationFrame(fallbackFrame);
      };
    }
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let frame = 0;
    type HeaderMetrics = {
      width: number;
      height: number;
      radius: number;
      top: number;
      y: number;
    };
    let currentMetrics: HeaderMetrics | null = null;
    let targetMetrics: HeaderMetrics | null = null;

    const getTargetMetrics = (): HeaderMetrics => {
      const viewportWidth = window.innerWidth;
      const scrollStart = 24;
      const scrollDistance = viewportWidth >= 1024 ? 1180 : 820;
      const progress = Math.min(1, Math.max(0, (window.scrollY - scrollStart) / scrollDistance));
      const easedProgress = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const topGap = viewportWidth >= 768 ? 20 : 12;
      const startSideGap = viewportWidth >= 1024 ? 48 : 12;
      const endWidth = Math.min(viewportWidth - 24, viewportWidth >= 1024 ? 980 : viewportWidth - 24);
      const startWidth = viewportWidth - startSideGap * 2;

      return {
        width: Math.max(0, startWidth + (endWidth - startWidth) * easedProgress),
        height: (viewportWidth >= 768 ? 86 : 74) - 8 * easedProgress,
        radius: 28 + 18 * easedProgress,
        top: topGap,
        y: -2 * easedProgress,
      };
    };

    const applyMetrics = (metrics: HeaderMetrics) => {
      header.style.setProperty("--webbrain-header-width", `${metrics.width}px`);
      header.style.setProperty("--webbrain-header-height", `${metrics.height}px`);
      header.style.setProperty("--webbrain-header-radius", `${metrics.radius}px`);
      header.style.setProperty("--webbrain-header-top", `${metrics.top}px`);
      header.style.setProperty("--webbrain-header-y", `${metrics.y}px`);
    };

    const animateHeader = () => {
      frame = 0;
      if (!targetMetrics) return;

      if (!currentMetrics) {
        currentMetrics = targetMetrics;
        applyMetrics(currentMetrics);
        return;
      }

      const smoothing = 0.075;
      currentMetrics = {
        width: currentMetrics.width + (targetMetrics.width - currentMetrics.width) * smoothing,
        height: currentMetrics.height + (targetMetrics.height - currentMetrics.height) * smoothing,
        radius: currentMetrics.radius + (targetMetrics.radius - currentMetrics.radius) * smoothing,
        top: currentMetrics.top + (targetMetrics.top - currentMetrics.top) * smoothing,
        y: currentMetrics.y + (targetMetrics.y - currentMetrics.y) * smoothing,
      };

      const isSettled =
        Math.abs(currentMetrics.width - targetMetrics.width) < 0.25 &&
        Math.abs(currentMetrics.height - targetMetrics.height) < 0.05 &&
        Math.abs(currentMetrics.radius - targetMetrics.radius) < 0.05;

      if (isSettled) {
        currentMetrics = targetMetrics;
      }

      applyMetrics(currentMetrics);

      if (!isSettled) {
        frame = window.requestAnimationFrame(animateHeader);
      }
    };

    const requestUpdate = () => {
      targetMetrics = getTargetMetrics();
      if (frame) return;
      frame = window.requestAnimationFrame(animateHeader);
    };

    targetMetrics = getTargetMetrics();
    currentMetrics = targetMetrics;
    applyMetrics(currentMetrics);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="header-island fixed left-1/2 z-50 w-[var(--webbrain-header-width,calc(100%-1.5rem))] max-w-[calc(100%-1.5rem)] -translate-x-1/2"
    >
      <nav
        aria-label="Главная навигация"
        className="webbrain-header-glass relative flex h-[var(--webbrain-header-height,74px)] items-center justify-between overflow-hidden px-4 md:h-[var(--webbrain-header-height,86px)] md:px-6"
      >
        <HeaderLiquidGlass />

        <Link href="/" className="relative z-10 shrink-0 text-[1.35rem] font-semibold leading-none tracking-normal md:text-[1.55rem]" aria-label="WebBrain">
          Web<span className="text-lime">Brain</span>
        </Link>

        <div className="relative z-10 hidden items-center gap-1 text-sm font-medium text-white/[0.72] md:flex">
          <a href="#how" className="rounded-full px-4 py-2.5 transition hover:bg-white/[0.06] hover:text-white">
            Как работает
          </a>
          <a href="#benefits" className="rounded-full px-4 py-2.5 transition hover:bg-white/[0.06] hover:text-white">
            Преимущества
          </a>
          <a href="#vs" className="rounded-full px-4 py-2.5 transition hover:bg-white/[0.06] hover:text-white">
            Сравнение
          </a>
          <a href="#pricing" className="rounded-full px-4 py-2.5 transition hover:bg-white/[0.06] hover:text-white">
            Тарифы
          </a>
          <a href="#faq" className="rounded-full px-4 py-2.5 transition hover:bg-white/[0.06] hover:text-white">
            Вопросы
          </a>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-2 md:gap-3">
          {authStatus === "guest" ? (
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-white/58 transition hover:bg-white/[0.06] hover:text-white md:inline-flex"
            >
              Вход
            </Link>
          ) : null}

          <Link
            href={authStatus === "authenticated" ? "/app" : "/signup"}
            className="relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full border border-lime/70 bg-black/70 px-6 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset,0_18px_48px_rgba(0,0,0,0.32)] transition before:absolute before:inset-[-1px] before:-z-10 before:rounded-full before:bg-[linear-gradient(110deg,rgba(190,255,69,0.95),rgba(255,255,255,0.8),rgba(75,209,255,0.75),rgba(190,255,69,0.55))] hover:border-lime hover:bg-black md:h-12 md:px-7 md:text-base [&>svg]:text-lime"
          >
            {authStatus === "authenticated" ? "Вход" : "Регистрация"}
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
