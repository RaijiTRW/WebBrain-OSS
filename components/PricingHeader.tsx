"use client";

import type { CSSProperties, SVGProps } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

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

function HeaderArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function HeaderLiquidGlassStatic() {
  const width = 800;
  const height = 200;
  const noiseStrength = 142;

  return (
    <span
      className="site-header-liquid-glass"
      style={
        {
          "--webbrain-glass-width": `${width}px`,
          "--webbrain-glass-height": `${height}px`,
          "--webbrain-glass-radius": "var(--webbrain-header-radius, 28px)",
          "--webbrain-glass-inner-shadow-color": "#000000",
          "--webbrain-glass-inner-shadow-blur": "21px",
          "--webbrain-glass-inner-shadow-spread": "-2px",
          "--webbrain-glass-tint-color": "rgba(255, 255, 255, 0)",
          "--webbrain-glass-tint-opacity": 0,
          "--webbrain-glass-frost-blur": "3px",
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <svg className="site-header-liquid-glass__filters" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="presentation" focusable="false">
        <defs>
          <filter
            id="site-header-glass-distortion"
            x={-noiseStrength}
            y={-noiseStrength}
            width={width + noiseStrength * 2}
            height={height + noiseStrength * 2}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" seed="11" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
            <feDisplacementMap in="SourceGraphic" in2="monoNoise" scale={noiseStrength} xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="3" result="frosted" />
            <feComposite in="frosted" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>
      <span className="site-header-liquid-glass__frost" />
      <span className="site-header-liquid-glass__refraction" />
      <span className="site-header-liquid-glass__inner-shadow" />
    </span>
  );
}

export function PricingHeader() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuthState = () => setAuthenticated(hasLocalAuthHint());

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <HeaderLiquidGlassStatic />
        <Link href="/" className="site-logo">
          Web<span style={{ color: "#c8ff5e" }}>Brain</span>
        </Link>
        <span className="site-nav" aria-hidden="true" />
        <div className="site-actions">
          {!authenticated ? (
            <Link href="/login" className="site-login">
              Вход
            </Link>
          ) : null}
          <Link href={authenticated ? "/app" : "/signup"} className="site-cta" style={{ "--cta-accent": "#c8ff5e", "--cta-accent-rgb": "200, 255, 94" } as CSSProperties}>
            {authenticated ? "Вход" : "Регистрация"} <HeaderArrow width="14" height="14" />
          </Link>
        </div>
      </div>
    </header>
  );
}
