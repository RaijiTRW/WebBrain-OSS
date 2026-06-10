"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { PlatformClosedScreen } from "@/components/PlatformClosedScreen";
import { WorkspaceLoadingScreen } from "@/components/WorkspaceLoadingScreen";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { WebBrainPlatformMode } from "@/lib/webbrain-admin";

const appMobileBlockQuery = "(max-width: 767px), (pointer: coarse) and (max-width: 1024px)";

type AppAuthGateStatus =
  | { type: "checking" }
  | { type: "allowed" }
  | { type: "closed"; mode: Exclude<WebBrainPlatformMode, "open">; message: string }
  | { type: "denied"; message: string };

type PlatformAccessResponse = {
  platform?: {
    app?: { mode: WebBrainPlatformMode; message?: string };
    global?: { mode: WebBrainPlatformMode; message?: string };
  };
  access?: {
    isAdmin?: boolean;
    isBanned?: boolean;
    banReason?: string;
    accessDenied?: boolean;
    accessDeniedReason?: string;
  };
};

function shouldBlockMobileApp() {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const isMobileUserAgent = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTabletUserAgent = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  const isTouchIpad = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;

  return isMobileUserAgent || isTabletUserAgent || isTouchIpad || window.matchMedia(appMobileBlockQuery).matches;
}

function AppMobileUnavailableScreen() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#050707] px-5 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(190,255,76,0.16),transparent_32%),linear-gradient(180deg,#0b100d_0%,#050707_52%,#020303_100%)]" />
      <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-lime/[0.08] blur-[110px]" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[520px] flex-col items-center justify-center text-center">
        <div className="relative mb-7 grid h-24 w-24 place-items-center rounded-[28px] border border-lime/18 bg-lime/[0.07] shadow-[0_28px_90px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Smartphone className="h-10 w-10 text-lime" strokeWidth={1.9} />
          <span className="absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-[14px] border border-white/[0.08] bg-[#151817] text-white/70 shadow-[0_18px_46px_rgba(0,0,0,0.38)]">
            <Monitor className="h-5 w-5" strokeWidth={1.9} />
          </span>
        </div>

        <p className="mb-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] text-lime/78">
          WebBrain App
        </p>
        <h1 className="max-w-[420px] text-[clamp(2rem,12vw,3.35rem)] font-black leading-[0.96] tracking-normal text-white">
          Мобильная версия в разработке
        </h1>
        <p className="mt-5 max-w-[430px] text-base font-medium leading-7 text-white/58">
          Редактор WebBrain сейчас работает только на компьютере или ноутбуке. Откройте приложение на большом экране, чтобы продолжить работу с проектами.
        </p>

        <div className="mt-8 rounded-[18px] border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-sm font-semibold leading-6 text-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          Лендинг и страницы сайта останутся доступны, ограничение касается только рабочего приложения.
        </div>
      </section>
    </main>
  );
}

export function AppAuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppAuthGateStatus>({ type: "checking" });
  const [mobileBlocked, setMobileBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(appMobileBlockQuery);
    const update = () => setMobileBlocked(shouldBlockMobileApp());

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mobileBlocked !== false) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function checkAuth() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session && !cancelled) {
            window.location.replace("/login");
          }
        });

        unsubscribe = () => authListener.subscription.unsubscribe();

        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!sessionData.session || userError || !userData.user) {
          await supabase.auth.signOut().catch(() => undefined);
          window.location.replace("/login");
          return;
        }

        const accessResponse = await fetch("/api/platform/access", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        const accessPayload = (await accessResponse.json().catch(() => ({}))) as PlatformAccessResponse;

        if (accessPayload.access?.isBanned || accessPayload.access?.accessDenied) {
          setStatus({
            type: "denied",
            message: accessPayload.access.banReason || accessPayload.access.accessDeniedReason || "Ваш аккаунт временно не может пользоваться WebBrain.",
          });
          return;
        }

        const isAdmin = accessPayload.access?.isAdmin === true;
        const globalMode = accessPayload.platform?.global?.mode ?? "open";
        const appMode = accessPayload.platform?.app?.mode ?? "open";
        const closedMode = globalMode !== "open" ? globalMode : appMode !== "open" ? appMode : "open";

        if (!isAdmin && closedMode !== "open") {
          setStatus({
            type: "closed",
            mode: closedMode,
            message: accessPayload.platform?.global?.message || accessPayload.platform?.app?.message || "",
          });
          return;
        }

        setStatus({ type: "allowed" });
      } catch {
        if (!cancelled) {
          window.location.replace("/login");
        }
      }
    }

    void checkAuth();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [mobileBlocked]);

  if (mobileBlocked === true) {
    return <AppMobileUnavailableScreen />;
  }

  if (status.type === "denied") {
    return <PlatformClosedScreen mode="problem" message={status.message} accessDenied />;
  }

  if (status.type === "closed") {
    return <PlatformClosedScreen mode={status.mode} message={status.message} />;
  }

  if (status.type !== "allowed") {
    return <WorkspaceLoadingScreen />;
  }

  return children;
}
