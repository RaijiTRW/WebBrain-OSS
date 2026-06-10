// WebBrain — registration landing
// High-conversion single-page, registration focus.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const CLIENT_ID_STORAGE_KEY = "webbrain-client-id";

function hasLocalAuthHint() {
  if (typeof window === "undefined") return false;

  if (window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)) return true;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.includes("auth-token")) continue;

    const value = window.localStorage.getItem(key);
    if (value && value.includes("access_token")) return true;
  }

  return false;
}

function useLandingAuthState() {
  const [authenticated, setAuthenticated] = useState(() => hasLocalAuthHint());

  useEffect(() => {
    const syncAuthState = () => setAuthenticated(hasLocalAuthHint());

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);
    window.addEventListener("pageshow", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
      window.removeEventListener("pageshow", syncAuthState);
    };
  }, []);

  return authenticated;
}

// ─── Reveal-on-scroll hook ─────────────────────────────────────────────────
// Adds `.is-revealed` to elements with `.reveal` class once they enter viewport.
// Honours prefers-reduced-motion by revealing immediately.
function useScrollReveal() {
  useEffect(() => {
    if (!document.body) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactMobile = window.matchMedia("(max-width: 540px)").matches;

    if (reduced || compactMobile || !("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.setAttribute("data-revealed", "true"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "true");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    // Observe initially, and re-observe on DOM mutations (React re-renders
    // can replace elements; new .reveal nodes need to be picked up).
    const observed = new WeakSet();
    const scan = () => {
      document.querySelectorAll(".reveal:not([data-revealed])").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        io.observe(el);
      });
    };
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

function useGsapLandingMotion(accent) {
  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    if (!gsap || !ScrollTrigger) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactMobile = window.matchMedia("(max-width: 540px)").matches;
    const root = document.documentElement;
    gsap.registerPlugin(ScrollTrigger);

    if (reduced || compactMobile) {
      document.querySelectorAll(".reveal").forEach((el) => el.setAttribute("data-revealed", "true"));
      return;
    }

    root.classList.add("gsap-ready");

    const cleanupFns = [];
    const ctx = gsap.context(() => {
      gsap.set(".hero-anim", { opacity: 0, y: 34, filter: "blur(14px)" });
      gsap.set(".hero-anim-mockup", {
        opacity: 0,
        x: 42,
        y: 28,
        rotateY: -12,
        rotateX: 5,
        filter: "blur(10px)"
      });

      gsap.timeline({ defaults: { ease: "power3.out" } })
        .to(".hero-anim:not(.hero-anim-mockup)", {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.92,
          stagger: 0.075
        })
        .to(".hero-anim-mockup", {
          opacity: 1,
          x: 0,
          y: 0,
          rotateY: -6,
          rotateX: 2,
          filter: "blur(0px)",
          duration: 1.15
        }, "-=0.48");

      gsap.to(".hero-bg-radial", {
        xPercent: 8,
        yPercent: -8,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8
        }
      });

      gsap.to(".hero-mockup", {
        yPercent: -7,
        rotateX: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8
        }
      });

      gsap.utils.toArray(".section-head").forEach((head) => {
        gsap.fromTo(
          head.querySelectorAll(".section-eyebrow, .section-h2, .section-sub"),
          { opacity: 0, y: 28, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.78,
            stagger: 0.075,
            ease: "power3.out",
            scrollTrigger: { trigger: head, start: "top 84%", once: true }
          }
        );
      });

      gsap.utils.toArray(".benefit-card, .step-card, .pricing-plan-tab, .pricing-panel, .founding-card, .roadmap-card, .final-form-card").forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 52, scale: 0.965, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.95,
            ease: "power3.out",
            delay: (index % 4) * 0.025,
            scrollTrigger: { trigger: card, start: "top 88%", once: true }
          }
        );
      });

      if (document.querySelector(".counter-bar-fill")) {
        gsap.fromTo(
          ".counter-bar-fill",
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1.25,
            ease: "power3.out",
            scrollTrigger: { trigger: ".counter-grid", start: "top 82%", once: true }
          }
        );
      }

      if (document.querySelector(".roadmap-path")) {
        gsap.set(".roadmap-path", { "--roadmap-progress": 0 });
        gsap.to(".roadmap-path", {
          "--roadmap-progress": 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".roadmap-path",
            start: "top 74%",
            end: "bottom 56%",
            scrub: 0.7
          }
        });

        gsap.utils.toArray(".roadmap-node").forEach((node) => {
          gsap.fromTo(
            node,
            { scale: 0.72, opacity: 0.45 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.55,
              ease: "back.out(1.7)",
              scrollTrigger: { trigger: node, start: "top 78%", once: true }
            }
          );
        });
      }

      gsap.to(".final-bg-radial", {
        xPercent: 10,
        yPercent: -12,
        scale: 1.15,
        ease: "none",
        scrollTrigger: {
          trigger: ".final",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8
        }
      });
    });

    const magneticTargets = gsap.utils.toArray(".beta-submit, .counter-cta, .site-cta, .benefit-card, .step-card, .pricing-plan-tab, .pricing-panel, .founding-card");
    magneticTargets.forEach((target) => {
      const xTo = gsap.quickTo(target, "x", { duration: 0.36, ease: "power3.out" });
      const yTo = gsap.quickTo(target, "y", { duration: 0.36, ease: "power3.out" });
      const rotateXTo = gsap.quickTo(target, "rotateX", { duration: 0.36, ease: "power3.out" });
      const rotateYTo = gsap.quickTo(target, "rotateY", { duration: 0.36, ease: "power3.out" });

      const move = (event) => {
        const rect = target.getBoundingClientRect();
        const relX = (event.clientX - rect.left) / rect.width - 0.5;
        const relY = (event.clientY - rect.top) / rect.height - 0.5;
        const isCard = target.classList.contains("benefit-card") || target.classList.contains("step-card") || target.classList.contains("pricing-plan-tab") || target.classList.contains("pricing-panel") || target.classList.contains("founding-card");
        const strength = isCard ? 8 : 5;
        target.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
        xTo(relX * strength);
        yTo(relY * strength);
        rotateXTo(relY * -4);
        rotateYTo(relX * 5);
      };

      const leave = () => {
        xTo(0);
        yTo(0);
        rotateXTo(0);
        rotateYTo(0);
      };

      target.addEventListener("pointermove", move);
      target.addEventListener("pointerleave", leave);
      cleanupFns.push(() => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerleave", leave);
      });
    });

    ScrollTrigger.refresh();

    return () => {
      cleanupFns.forEach((fn) => fn());
      ctx.revert();
      root.classList.remove("gsap-ready");
    };
  }, [accent.hex, accent.rgb]);
}

function SectionWebglField({ accent, variant = "how" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true
    });

    if (!gl) return undefined;

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;

      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_accent;
      uniform float u_variant;

      float contour(vec2 p, vec2 origin, float scale, float width, float phase) {
        vec2 q = (p - origin) * vec2(1.0, 1.38);
        float warp = sin((q.x * 3.2 + q.y * 1.7) + phase) * 0.018;
        float d = length(q) + warp;
        float v = abs(fract(d * scale) - 0.5);
        return smoothstep(width, 0.0, v);
      }

      float hairline(float value, float position, float width) {
        return smoothstep(width, 0.0, abs(value - position));
      }

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.0, 289.0))) * 43758.5453);
      }

      void main() {
        vec2 uv = v_uv;
        float aspect = max(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
        vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
        float t = u_time * 0.04;

        float topFade = smoothstep(0.10, 0.34, uv.y);
        float bottomFade = smoothstep(0.96, 0.70, uv.y);
        float sideFade = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x);
        float veil = topFade * bottomFade * sideFade;
        float edgeBias = smoothstep(0.10, 0.52, abs(uv.x - 0.5));
        float centerGuard = 0.20 + edgeBias * 0.80;

        vec2 slow = p + vec2(sin(t + u_variant) * 0.018, cos(t * 0.74) * 0.014);
        float leftContours = contour(slow, vec2(-0.96, mix(0.28, 0.12, u_variant)), 4.85, 0.018, t * 1.9);
        float rightContours = contour(slow, vec2(1.08, mix(0.62, 0.74, u_variant)), 4.25, 0.016, -t * 1.5);
        float contourField = (leftContours * 0.72 + rightContours * 0.58) * (0.38 + edgeBias * 0.62);

        vec2 rotated = slow * mat2(0.91, -0.42, 0.42, 0.91);
        float opticalLineA = hairline(fract((rotated.x * 0.72 + rotated.y * 0.18 + t * 0.018 + u_variant * 0.13) * 6.0), 0.0, 0.010);
        float opticalLineB = hairline(fract((rotated.x * -0.36 + rotated.y * 0.54 - t * 0.014) * 5.0), 0.0, 0.008);
        float opticalLines = (opticalLineA * 0.65 + opticalLineB * 0.42) * edgeBias;

        float gridX = hairline(fract((uv.x + t * 0.004) * 12.0), 0.0, 0.006);
        float gridY = hairline(fract((uv.y - t * 0.003) * 9.0), 0.0, 0.005);
        float grid = (gridX + gridY) * 0.45 * (0.35 + edgeBias * 0.65);

        float horizon = hairline(uv.y, mix(0.42, 0.50, u_variant), 0.010) * (0.38 + edgeBias * 0.62);
        float scan = hairline(uv.y, 0.66 + sin(t * 1.6 + u_variant) * 0.055, 0.006) * edgeBias;
        float dust = hash(floor(uv * vec2(170.0, 120.0))) * 0.004;

        vec3 cyan = vec3(0.32, 0.88, 1.0);
        vec3 white = vec3(0.92, 0.98, 1.0);
        vec3 color = u_accent * (contourField * 0.25 + opticalLines * 0.12 + horizon * 0.10)
          + cyan * (rightContours * 0.10 + scan * 0.08 + grid * 0.08)
          + white * (grid * 0.08);

        float alpha = (contourField * 0.030 + opticalLines * 0.016 + grid * 0.012 + horizon * 0.018 + scan * 0.012 + dust) * veil * centerGuard;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return undefined;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const accentLocation = gl.getUniformLocation(program, "u_accent");
    const variantLocation = gl.getUniformLocation(program, "u_variant");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accentRgb = (accent?.rgb || "200,255,94").split(",").map((value) => Number(value.trim()) / 255);
    const variantValue = variant === "pricing" ? 1 : 0;

    let frame = 0;
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
    };

    const render = (time = 0) => {
      if (disposed) return;
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, reducedMotion ? 0 : time * 0.001);
      gl.uniform3f(accentLocation, accentRgb[0] || 0.78, accentRgb[1] || 1, accentRgb[2] || 0.37);
      gl.uniform1f(variantLocation, variantValue);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!reducedMotion) frame = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    render(0);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [accent?.rgb, variant]);

  return (
    <div className={`section-webgl-field section-webgl-field-${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const ACCENTS = {
  lime: { hex: "#c8ff5e", rgb: "200,255,94", text: "#0a0c00", soft: "#1a2107", name: "Lime" },
  cyan: { hex: "#63e6ff", rgb: "99,230,255", text: "#001318", soft: "#062028", name: "Cyan" },
  violet: { hex: "#b794ff", rgb: "183,148,255", text: "#10001f", soft: "#180a2b", name: "Violet" }
};

// ─── Hero copy variants ─────────────────────────────────────────────────────
const HERO_VARIANTS = {
  outcome: {
    badge: "Регистрация открыта",
    h1: ["Создание сайтов за минуты ", { accent: "НЕ МЕСЯЦЫ" }],
    sub: "Создавайте сайты через чат и визуальный редактор без знания программирвоания и сложных знаний. Зарегистрируйтесь и получите доступ уже сейчас."
  },
  aggressive: {
    badge: "Регистрация открыта",
    h1: ["Не набор блоков.", "  ", { accent: "Проект" }, " в одном рабочем месте."],
    sub: "WebBrain объединяет чат, проекты и редактор. Мы не обещаем все интеграции сразу — функции будут открываться по мере готовности платформы."
  },
  speed: {
    badge: "Регистрация открыта",
    h1: ["Опишите сайт → ", { accent: "соберите проект" }, " в WebBrain."],
    sub: "Начните с описания задачи, сохраните проект и продолжайте правки в одном интерфейсе. Публикация и интеграции будут расширяться обновлениями."
  }
};

const CTA_LABELS = {
  "early-access": "Создать сайт",
  "enter-beta": "Создать аккаунт",
  "reserve": "Начать регистрацию"
};

// ─── Tiny icon set (SVG inline) ─────────────────────────────────────────────
const Ic = {
  arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7" /></svg>,
  chevron: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6" /></svg>,
  spark: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7z" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12l5 5L20 6" /></svg>,
  x: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  plus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  tg: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.93c-.88-.28-.89-.88.2-1.31l16-6.17c.73-.33 1.43.18 1.15 1.31l-2.72 12.81c-.19.92-.74 1.14-1.5.71L13.6 16.4l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>,
  send: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  dot: (p) => <svg viewBox="0 0 8 8" {...p}><circle cx="4" cy="4" r="3" fill="currentColor" /></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" /></svg>,
  layers: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" /></svg>,
  shield: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" /></svg>,
  chart: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21h18M6 17V9M11 17V4M16 17v-6M21 17v-9" /></svg>,
  msg: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l2-5.5A8.5 8.5 0 1121 11.5z" /></svg>,
  vote: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z" /></svg>,
  tag: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 12l-8 8-9-9V3h8l9 9z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></svg>
};

// ─── Animated counter ───────────────────────────────────────────────────────
function useCountUp(target, duration = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const DEFAULT_BETA_STATS = {
  totalSpots: 100,
  seedCount: 23,
  submittedCount: 0,
  claimedCount: 23,
  spotsLeft: 77,
  nextPosition: 24,
  isFull: false
};

function useBetaStats() {
  const [stats, setStats] = useState(DEFAULT_BETA_STATS);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/beta-stats", { cache: "no-store" });
      const result = await response.json();

      if (result && result.ok) {
        setStats({
          totalSpots: result.totalSpots ?? DEFAULT_BETA_STATS.totalSpots,
          seedCount: result.seedCount ?? DEFAULT_BETA_STATS.seedCount,
          submittedCount: result.submittedCount ?? DEFAULT_BETA_STATS.submittedCount,
          claimedCount: result.claimedCount ?? DEFAULT_BETA_STATS.claimedCount,
          spotsLeft: result.spotsLeft ?? DEFAULT_BETA_STATS.spotsLeft,
          nextPosition: result.nextPosition ?? DEFAULT_BETA_STATS.nextPosition,
          isFull: Boolean(result.isFull)
        });
      }
    } catch (error) {
      setStats(DEFAULT_BETA_STATS);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, refresh };
}

function usePricingPlans() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        const response = await fetch("/webbrain-landing/pricing-plans.json", { cache: "no-store" });
        const result = await response.json();
        if (!cancelled && Array.isArray(result?.plans)) {
          setPlans(result.plans);
        }
      } catch {
        if (!cancelled) setPlans([]);
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  return plans;
}

const SCRAMBLE_LETTERS = "абвгдеёжзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLIDING_DIGITS = Array.from({ length: 10 }, (_, index) => String(index));

function getRandomScrambleLetter() {
  return SCRAMBLE_LETTERS[Math.floor(Math.random() * SCRAMBLE_LETTERS.length)] || "а";
}

function isScrambleLetter(char) {
  return /\p{L}/u.test(char);
}

function ScrambleText({ text = "", className = "" }) {
  const [displayText, setDisplayText] = useState(text);
  const previousText = useRef(text);

  useEffect(() => {
    if (previousText.current === text) return;

    previousText.current = text;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayText(text);
      return;
    }

    const target = text;
    const frames = 18;
    let frame = 0;

    const timer = window.setInterval(() => {
      frame += 1;
      const progress = frame / frames;
      const next = Array.from(target, (char, index) => {
        const revealAt = index / Math.max(target.length, 1);
        if (progress >= revealAt || !isScrambleLetter(char)) return char;
        return getRandomScrambleLetter();
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

function SlidingPrice({ value }) {
  return (
    <span className="pricing-slide-number" aria-label={value}>
      {Array.from(value).map((char, index) => (
        /\d/.test(char) ? (
          <span key={`digit-${index}`} className="pricing-slide-digit" aria-hidden="true">
            <span
              className="pricing-slide-reel"
              style={{
                transform: `translateY(calc(${Number(char) * -1} * 1em))`,
                transitionDelay: `${index * 18}ms`
              }}
            >
              {SLIDING_DIGITS.map((digit) => (
                <span key={digit} className="pricing-slide-reel-digit">{digit}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`separator-${index}`} className="pricing-slide-separator" aria-hidden="true">
            {char === " " ? "\u00a0" : char}
          </span>
        )
      ))}
    </span>
  );
}

function getPlanBilling(plan, period) {
  return plan?.billing?.[period] || plan?.billing?.monthly || {
    price: plan?.price || "",
    priceLabel: plan?.priceLabel || "",
    priceTitle: period === "yearly" ? "Годовой план" : "Месячный план",
    suffix: plan?.suffix || "",
    caption: "",
    features: plan?.features || []
  };
}

function PricingBillingToggle({ period, onChange }) {
  const yearly = period === "yearly";

  return (
    <div className="pricing-toggle" role="group" aria-label="Период оплаты">
      <button
        type="button"
        className={`pricing-toggle-label ${yearly ? "" : "is-active"}`}
        onClick={() => onChange("monthly")}
      >
        В месяц
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={yearly}
        aria-label="Переключить период оплаты"
        className={`pricing-toggle-switch ${yearly ? "is-yearly" : ""}`}
        onClick={() => onChange(yearly ? "monthly" : "yearly")}
      >
        <span className="pricing-toggle-knob" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`pricing-toggle-label ${yearly ? "is-active" : ""}`}
        onClick={() => onChange("yearly")}
      >
        В год
        <span className="pricing-toggle-discount">-20%</span>
      </button>
    </div>
  );
}

// ─── Mini editor mockup for the hero ────────────────────────────────────────
function HeroMockup({ accent }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero-mockup">
      {/* Window chrome */}
      <div className="mock-chrome">
        <div className="mock-dots">
          <span /><span /><span />
        </div>
        <div className="mock-url">
          <span className="mock-dot-live" />
          biznes.webbrain.ru/cafe-bloom
        </div>
        <div className="mock-pub">
          <Ic.spark width="11" height="11" /> AI
        </div>
      </div>

      <div className="mock-body">
        {/* Chat panel */}
        <aside className="mock-chat">
          <div className="mock-chat-hd">
            <span className="mock-chat-dot" />
            <span>Чат · WebBrain</span>
          </div>

          <div className="mock-bubble mock-bubble-user">
            Собери структуру сайта для&nbsp;кофейни: меню, атмосфера, контакты и&nbsp;первый экран.
          </div>
          <div className="mock-bubble mock-bubble-ai">
            <Ic.spark width="10" height="10" style={{ marginRight: 4, opacity: .9 }} />
            Готово. Создал проект и&nbsp;первый вариант страницы.
            <div className="mock-chips">
              <span>Структура</span>
              <span>Редактор</span>
              <span>Правки</span>
            </div>
          </div>

          <div className="mock-bubble mock-bubble-user mock-typing">
            <span /><span /><span />
          </div>

          <div className="mock-input">
            <Ic.spark width="11" height="11" style={{ opacity: .8 }} />
            <span>Замени фото на&nbsp;утренний свет…</span>
            <span className="mock-send"><Ic.send width="11" height="11" /></span>
          </div>
        </aside>

        {/* Site preview */}
        <div className="mock-site">
          <div className="mock-site-nav">
            <span className="mock-logo">Cafe Bloom</span>
            <div className="mock-site-nav-links">
              <span>Меню</span><span>О&nbsp;нас</span><span>Контакты</span>
              <span className="mock-site-cta">Забронировать</span>
            </div>
          </div>
          <div className="mock-site-hero">
            <div className="mock-site-hero-bg" />
            <div className="mock-site-hero-text">
              <div className="mock-site-eyebrow">Кофе и&nbsp;утро</div>
              <div className="mock-site-h1">
                Зерно сегодняшнего&nbsp;дня.
                <br />
                Завтрак до&nbsp;12:00.
              </div>
              <div className="mock-site-btns">
                <span className="mock-site-btn-primary">Забронировать</span>
                <span className="mock-site-btn-ghost">Меню →</span>
              </div>
            </div>
            <div className={`mock-cursor mock-cursor-${tick}`}>
              <svg viewBox="0 0 16 16" width="16" height="16">
                <path d="M2 2l5 12 2-5 5-2-12-5z" fill="white" stroke="black" strokeWidth=".7" />
              </svg>
              <span>Замена изображения…</span>
            </div>
            <div className="mock-site-section-stub mock-site-section-stub-1" />
            <div className="mock-site-section-stub mock-site-section-stub-2" />
          </div>
        </div>
      </div>

      {/* Live status footer */}
      <div className="mock-status">
        <span className="mock-status-pill">
          <Ic.bolt width="10" height="10" /> Проект создан
        </span>
        <span className="mock-status-meta">чат сохранён · редактор готов · обновления подключаются</span>
        <span className="mock-status-leads">
          правки через чат
          <Ic.dot width="6" height="6" style={{ color: accent.hex }} />
        </span>
      </div>
    </div>);

}

// ─── Registration form ──────────────────────────────────────────────────────
function BetaForm({ ctaLabel, accent, betaStats, onSubmit, compact = false, authenticated = false }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState(null);

  const valid = email.includes("@") && email.includes(".");

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || pending) return;

    const pos = betaStats?.nextPosition || 24;
    setPosition(pos);
    setPending(true);

    let redirectUrl = "/api/beta-request";

    try {
      const response = await fetch("/api/beta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: window.location.href,
          page: "landing-beta"
        })
      });
      const result = await response.json().catch(() => ({}));
      redirectUrl = result.redirectUrl || `/signup?email=${encodeURIComponent(email)}`;
      const confirmedPosition = result.position || pos;
      setPosition(confirmedPosition);
      onSubmit && onSubmit({ email, position: confirmedPosition, telegramSent: false });
    } catch (error) {
      redirectUrl = `/signup?email=${encodeURIComponent(email)}`;
    } finally {
      setSubmitted(true);
      window.setTimeout(() => {
        window.location.href = redirectUrl;
      }, 180);
    }
  };

  if (authenticated) {
    return (
      <div className={`beta-form beta-form-authenticated ${compact ? "is-compact" : ""}`}>
        <a
          href="/app"
          className="beta-submit"
          style={{ "--cta-accent": accent.hex, "--cta-accent-rgb": accent.rgb }}>

          <span>Открыть WebBrain</span>
          <Ic.arrow width="16" height="16" />
        </a>
        <div className="beta-finerprint">
          <Ic.shield width="11" height="11" /> Аккаунт уже активен, переходим сразу в рабочее пространство.
        </div>
      </div>);

  }

  if (submitted) {
    return (
      <div className={`beta-form beta-form-success ${compact ? "is-compact" : ""}`}>
        <div className="success-icon">
          <Ic.check width="22" height="22" />
        </div>
        <div className="success-title">Регистрация принята.</div>
        <div className="success-sub">
          Почта <b>{email}</b> сохранена. Сейчас откроем страницу регистрации, чтобы создать аккаунт.
        </div>
        <span className="success-tg">
          <Ic.arrow width="14" height="14" /> Переходим к&nbsp;регистрации
        </span>
      </div>);

  }

  return (
    <form onSubmit={submit} className={`beta-form ${compact ? "is-compact" : ""}`}>
      <div className="beta-field-row">
        <label className="beta-field beta-field-email">
          <span className="beta-label">Почта</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.ru"
            autoComplete="email" />

        </label>
      </div>

      <button
        type="submit"
        className="beta-submit"
        disabled={!valid || pending}
        style={{ "--cta-accent": accent.hex, "--cta-accent-rgb": accent.rgb }}>

        <span>{pending ? "Регистрируем..." : ctaLabel}</span>
        <Ic.arrow width="16" height="16" />
      </button>

      <div className="beta-finerprint">
        <Ic.shield width="11" height="11" /> Без передачи ваших данных.
      </div>
    </form>);

}

// ─── HERO ───────────────────────────────────────────────────────────────────
function Hero({ tweaks, accent, betaStats, onLeadSubmitted, authenticated }) {
  const variant = HERO_VARIANTS[tweaks.heroVariant] || HERO_VARIANTS.outcome;
  const ctaLabel = CTA_LABELS[tweaks.ctaText] || CTA_LABELS["early-access"];
  const claimedCount = betaStats.claimedCount;
  const registeredCount = useCountUp(claimedCount, 1600);

  const renderH1 = () =>
    variant.h1.map((chunk, i) => {
      if (typeof chunk === "string") {
        // Force line break on double-space sentinel
        if (chunk.startsWith("  ")) {
          return <React.Fragment key={i}><br />{chunk.slice(2)}</React.Fragment>;
        }
        return <React.Fragment key={i}>{chunk}</React.Fragment>;
      }
      return <span key={i} className="hero-accent">{chunk.accent}</span>;
    });

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-bg-radial" />
        <div className="hero-bg-grid" />
        <div className="hero-bg-vignette" />
      </div>

      <div className="hero-grid">
        {/* LEFT */}
        <div className="hero-left">
          <div className="hero-badge hero-anim hero-anim-1">
            <span className="hero-badge-dot">
              <span className="hero-badge-dot-inner" />
            </span>
            {variant.badge}
            <span className="hero-badge-meta">аккаунт за 30 сек</span>
          </div>

          <h1 className="hero-h1 hero-anim hero-anim-2">{renderH1()}</h1>

          <p className="hero-sub hero-anim hero-anim-3">{variant.sub}</p>

          <div className="hero-form-wrap hero-anim hero-anim-4">
            <BetaForm ctaLabel={ctaLabel} accent={accent} betaStats={betaStats} onSubmit={onLeadSubmitted} authenticated={authenticated} />
          </div>

          <div className="hero-trust hero-anim hero-anim-5">
            <span>
              <b>{registeredCount}</b> уже зарегистрировались
            </span>
            <span className="hero-trust-sep" />
            <span>Рабочее пространство для создания сайта</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="hero-right hero-anim hero-anim-mockup">
          <HeroMockup accent={accent} />
        </div>
      </div>
    </section>);

}

// ─── BENEFITS ───────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    Icon: Ic.msg,
    title: "ИИ помогает собрать первый сайт",
    body: "Опишите задачу обычным языком, WebBrain создаст сайт под ваш бизнес, страницы и формы для заявок. Можно вносить правки через ИИ.",
    stat: "chat"
  },
  {
    Icon: Ic.bolt,
    title: "Сайты в одном месте",
    body: "После регистрации у вас появляется рабочее место, где можно создавать сайты, возвращаться к чатам и продолжать доработку.",
    stat: "workspace"
  },
  {
    Icon: Ic.layers,
    title: "Визуальный редактор",
    body: "Правьте тексты, блоки и секции визуально. Если нужно изменить идею — вернитесь в чат и опишите новую задачу.",
    stat: "edit"
  },
  {
    Icon: Ic.vote,
    title: "Полноценная логика сайта",
    body: "Интеграции, заявки, публикация и другие внутренний логики сайта проще создать с помощью обычного текста.",
    stat: "logic"
  }];


function BenefitsSection({ accent }) {
  return (
    <section className="benefits" id="benefits">
      <div className="section-head reveal">
        <div className="section-eyebrow" style={{ color: accent.hex, borderColor: `rgba(${accent.rgb}, .3)` }}>
          <Ic.spark width="24" height="24" /> Преимущества
        </div>
        <h2 className="section-h2">
          Не конструктор дизайна или блоков.
          <br />
          <span style={{ color: accent.hex }}>А полноценная платформа для создания сайта.</span>
        </h2>
        <p className="section-sub">
          WebBrain помогает создать и вести сайт: от первого описания до визуальных правок. А также создавать и контролировать логику сайта.
        </p>
      </div>

      <div className="benefits-grid">
        {BENEFITS.map((b, i) =>
          <article key={b.stat} className="benefit-card reveal" style={{ "--reveal-delay": `${i * 90}ms` }}>
            <div className="benefit-icon" style={{ color: accent.hex, borderColor: `rgba(${accent.rgb}, .34)` }}>
              <b.Icon width="19" height="19" />
            </div>
            <div className="benefit-kicker" style={{ color: accent.hex }}>{b.stat}</div>
            <h3 className="benefit-title">{b.title}</h3>
            <p className="benefit-body">{b.body}</p>
          </article>
        )}
      </div>
    </section>);

}

// ─── HOW IT WORKS ───────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Опишите проект в чате",
    body: "Расскажите что нужно: ниша, структура, стиль, страницы и контент. AI помогает уточнить задачу и собрать первый вариант проекта.",
    bullet: "описание на 2–3 минуты"
  },
  {
    n: "02",
    title: "Проект сохраняется в WebBrain",
    body: "Вы видите проект и можете возвращаться к нему позже: продолжать чат, менять структуру и готовить сайт к публикации.",
    bullet: "чат + проект + редактор"
  },
  {
    n: "03",
    title: "Доработка и обновления",
    body: "Дорабатывайте через чат или визуальный редактор. Новые возможности платформы, заявки, управление версиями и интеграций с сервисами будут появляться по мере готовности.",
    bullet: "платформа развивается"
  }];


function StepMock({ n, accent }) {
  if (n === "01") {
    return (
      <div className="step-mock step-mock-1">
        <div className="step-mock-q">
          <div className="step-mock-label">Вопрос 3 из&nbsp;6</div>
          <div className="step-mock-text">Кто ваш клиент?</div>
          <div className="step-mock-pills">
            <span>Локальные жители</span>
            <span className="is-on" style={{ borderColor: accent.hex, color: accent.hex }}>Молодые семьи 25–40 лет</span>
            <span>Туристы</span>
          </div>
        </div>
        <div className="step-mock-progress">
          <span style={{ width: "50%", background: accent.hex }} />
        </div>
      </div>);

  }
  if (n === "02") {
    return (
      <div className="step-mock step-mock-2">
        <div className="step-mock-line" style={{ width: "78%" }} />
        <div className="step-mock-line step-mock-line-h" />
        <div className="step-mock-cards">
          <div /><div /><div />
        </div>
        <div className="step-mock-form">
          <div className="step-mock-form-input" />
          <div className="step-mock-form-input" />
          <div className="step-mock-form-cta" style={{ background: accent.hex }} />
        </div>
        <div className="step-mock-spark" style={{ color: accent.hex }}>
          <Ic.spark width="11" height="11" /> Сгенерировано
        </div>
      </div>);

  }
  return (
    <div className="step-mock step-mock-3">
      <div className="step-mock-url">
        <span className="step-mock-url-dot" style={{ background: accent.hex }} />
        Cafe Bloom · проект
      </div>
      <div className="step-mock-leads">
        <div className="step-mock-lead">
          <div className="step-mock-lead-avatar" />
          <div className="step-mock-lead-text">
            <div className="step-mock-lead-name">Главная</div>
            <div className="step-mock-lead-msg">Обновить первый экран и&nbsp;CTA…</div>
          </div>
          <div className="step-mock-lead-time">2&nbsp;мин</div>
        </div>
        <div className="step-mock-lead">
          <div className="step-mock-lead-avatar" />
          <div className="step-mock-lead-text">
            <div className="step-mock-lead-name">Меню</div>
            <div className="step-mock-lead-msg">Добавить блок завтраков…</div>
          </div>
          <div className="step-mock-lead-time">17&nbsp;мин</div>
        </div>
      </div>
      <div className="step-mock-leads-meta" style={{ color: accent.hex }}>
        <Ic.bolt width="10" height="10" /> правки сохранены
      </div>
    </div>);

}

function HowItWorks({ accent }) {
  return (
    <section className="how" id="how">
      <SectionWebglField accent={accent} variant="how" />
      <div className="section-head reveal">
        <div className="section-eyebrow">Как это работает</div>
        <h2 className="section-h2">
          Опишите проект в&nbsp;чате и&nbsp;получите&nbsp;
          <span style={{ color: accent.hex }}>готовый сайт</span>.
        </h2>
      </div>

      <div className="steps-grid">
        {STEPS.map((s, i) =>
          <article key={s.n} className="step-card reveal" style={{ "--reveal-delay": `${i * 110}ms` }}>
            <div className="step-mock-wrap">
              <StepMock n={s.n} accent={accent} />
            </div>
            <div className="step-text">
              <div className="step-num" style={{ color: accent.hex }}>{s.n}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
              <div className="step-bullet">{s.bullet}</div>
            </div>
          </article>
        )}
      </div>
    </section>);

}

// ─── REGISTRATION BENEFITS ──────────────────────────────────────────────────
const FOUNDING_BENEFITS = [
  {
    Icon: Ic.tag,
    title: "Ваши сайты в одном месте",
    body: "После регистрации вы сможете создавать сайты, возвращаться к проектам и управлять ими из WebBrain.",
    tag: "value"
  },
  {
    Icon: Ic.msg,
    title: "Чат для сборки и правок",
    body: "Описываете задачу обычным языком, а затем возвращаетесь к чату, чтобы уточнять структуру, тексты и визуальные правки.",
    tag: "access"
  },
  {
    Icon: Ic.vote,
    title: "Контроль через редактор",
    body: "Проект можно дорабатывать вручную: менять структуру, визуал, контент и ключевые блоки.",
    tag: "control"
  },
  {
    Icon: Ic.layers,
    title: "Функции приходят обновлениями",
    body: "Публикация, заявки, интеграции, аналитика и улучшения редактора будут добавляться по мере готовности платформы.",
    tag: "agency"
  }];


function FoundingSection({ accent }) {
  return (
    <section className="founding" id="founding">
      <div className="section-head reveal">
        <div className="section-eyebrow" style={{ color: accent.hex }}>
          <Ic.spark width="24" height="24" /> После регистрации
        </div>
        <h2 className="section-h2">
          Всё для запуска сайта
          <br />
          <span style={{ color: accent.hex }}>В ОДНОМ МЕСТЕ.</span>
        </h2>
        <p className="section-sub">
          Регистрация открывает доступ к платформе, проектам, рабочему чату, редактору и будущим обновлениям платформы.
        </p>
      </div>

      <div className="founding-grid">
        {FOUNDING_BENEFITS.map((b, i) =>
          <article key={i} className="founding-card reveal" data-tag={b.tag} style={{ "--reveal-delay": `${i * 90}ms` }}>
            <div className="founding-icon" style={{ color: accent.hex, borderColor: `rgba(${accent.rgb}, .35)` }}>
              <b.Icon width="18" height="18" />
            </div>
            <h3 className="founding-title">{b.title}</h3>
            <p className="founding-body">{b.body}</p>
            <div className="founding-stamp" style={{ color: accent.hex }}>WEBBRAIN</div>
          </article>
        )}
      </div>
    </section>);

}

// ─── COMPARISON ─────────────────────────────────────────────────────────────
const COMP_ROWS = [
  { label: "Сайты в одном месте", wb: true, ti: true },
  { label: "Публикация сайта", wb: true, ti: true },
  { label: "Рабочий чат внутри проекта", wb: true, ti: false },
  { label: "AI-генерация сайта через описание", wb: true, ti: false },
  { label: "Простой запуск", wb: true, ti: false },
  { label: "AI-помощь при сборке структуры", wb: true, ti: false },
  { label: "Commercial pricing", wb: "Private", ti: "External" },
  { label: "Время от старта до публикации", wb: "~30 мин", ti: "дни / недели" },
  { label: "Визуальный редактор", wb: true, ti: true },
  { label: "Создание логики сайта", wb: true, ti: false },
  // Future rows: вернуть, когда функции будут реально доступны в продукте.
  // { label: "Уведомления в Telegram из коробки", wb: true, ti: false },
  // { label: "Свой домен с авто-SSL", wb: true, ti: true },
  // { label: "Встроенная CRM заявок", wb: true, ti: false },
  // { label: "Тепловые карты кликов", wb: true, ti: false },
  // { label: "AmoCRM / Битрикс24", wb: "Q3 2026", ti: true },
  // { label: "ЮKassa", wb: true, ti: true }
];

function ComparisonSection({ tweaks, accent }) {
  if (!tweaks.showComparison) return null;
  return (
    <section className="comp" id="vs">
      <div className="section-head reveal">
        <div className="section-eyebrow">Сравнение</div>
        <h2 className="section-h2">
          WebBrain vs конструкторов,
          <br />
          которые
          <br />
          <span style={{ color: accent.hex }}>застряли в&nbsp;2018&nbsp;году</span>.
        </h2>
      </div>

      <div className="comp-table reveal">
        <div className="comp-row comp-row-head">
          <div className="comp-cell-label" />
          <div className="comp-cell comp-cell-wb" style={{ color: accent.hex }}>
            WebBrain
            <span className="comp-cell-sub" style={{ color: `rgba(${accent.rgb}, .55)` }}>
              <Ic.spark width="9" height="9" /> AI в основе
            </span>
          </div>
          <div className="comp-cell comp-cell-ti">
            Tilda
            <span className="comp-cell-sub">конструктор</span>
          </div>
        </div>

        {COMP_ROWS.map((row, index) => (
          <div className="comp-row" key={index}>
            <div className="comp-cell-label">{row.label}</div>
            <div className="comp-cell comp-cell-wb">
              {row.wb === true ? (
                <span className="comp-y" style={{ color: accent.hex }}><Ic.check width="16" height="16" /></span>
              ) : row.wb === false ? (
                <span className="comp-n"><Ic.x width="16" height="16" /></span>
              ) : (
                <span className="comp-val" style={{ color: accent.hex }}>{row.wb}</span>
              )}
            </div>
            <div className="comp-cell comp-cell-ti">
              {row.ti === true ? (
                <span className="comp-y"><Ic.check width="16" height="16" /></span>
              ) : row.ti === false ? (
                <span className="comp-n"><Ic.x width="16" height="16" /></span>
              ) : (
                <span className="comp-val">{row.ti}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="comp-foot">
        <span>Мы показываем только текущие возможности, а будущие функций добавим в таблицу после добавления на платформу.</span>
      </div>
    </section>);

}

// ─── PRICING ────────────────────────────────────────────────────────────────
function PricingSection({ accent, plans }) {
  const [period, setPeriod] = useState("monthly");
  const [selectedPlanKey, setSelectedPlanKey] = useState("start");
  const mobileFeaturesRef = useRef(null);
  const [mobileFeaturesHeight, setMobileFeaturesHeight] = useState(null);
  const selectedPlan = plans.find((plan) => plan.key === selectedPlanKey) || plans[0];
  const selectedBilling = selectedPlan ? getPlanBilling(selectedPlan, period) : null;
  const maxFeatureCount = plans.length
    ? Math.max(...plans.flatMap((plan) => [getPlanBilling(plan, "monthly").features.length, getPlanBilling(plan, "yearly").features.length]))
    : 0;
  const mobileFeaturesKey = selectedBilling?.features.join("|") || "";

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
    <section className="pricing" id="pricing">
      <SectionWebglField accent={accent} variant="pricing" />
      <div className="pricing-head-row">
        <div className="section-head reveal">
          <div className="section-eyebrow" style={{ color: accent.hex, borderColor: `rgba(${accent.rgb}, .3)` }}>
            <Ic.tag width="11" height="11" /> Тарифы
          </div>
          <h2 className="section-h2">
            Выберите тариф
            <br />
            <span style={{ color: accent.hex }}>под вашу задачу.</span>
          </h2>
          <p className="section-sub">
            OSS includes demo pricing metadata only. Configure your own commercial model in a private deployment.
          </p>
        </div>
      </div>

      <div className="pricing-plan-tabs">
        {plans.map((plan, index) => {
          const isSelected = selectedPlan?.key === plan.key;

          return (
            <button
              key={plan.key}
              type="button"
              className={`pricing-plan-tab reveal ${isSelected ? "is-active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedPlanKey(plan.key)}
              style={{ "--reveal-delay": `${index * 50}ms`, "--plan-accent": accent.hex, "--plan-accent-rgb": accent.rgb }}
            >
              <span className="pricing-plan-tab-top">
                <span>{plan.name}</span>
              </span>
              {plan.badge ? (
                <span className="pricing-plan-tab-badge">🔥 {plan.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedPlan && selectedBilling ? (
        <article
          className={`pricing-panel reveal pricing-panel-${selectedPlan.tone}`}
          style={{ "--plan-accent": accent.hex, "--plan-accent-rgb": accent.rgb }}
        >
          <div className="pricing-panel-layout">
            <div className="pricing-panel-side">
              <div className="pricing-badge-row">
                {selectedPlan.comingSoon ? (
                  <span className="pricing-badge" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.16)" }}>
                    Скоро
                  </span>
                ) : selectedPlan.badge ? (
                  <span className="pricing-badge" style={{ background: accent.hex, color: accent.text }}>
                    {selectedPlan.badge}
                  </span>
                ) : null}
              </div>

              <div className="pricing-panel-toggle">
                <PricingBillingToggle period={period} onChange={setPeriod} />
              </div>
              <p className="pricing-note pricing-note-selected">
                <ScrambleText text={selectedPlan.note} />
              </p>

              <div className="pricing-panel-main pricing-panel-main-mobile">
                <p className="pricing-feature-title">Условия тарифа</p>
                <div className="pricing-mobile-features-shell" style={{ height: mobileFeaturesHeight || undefined }}>
                  <ul className="pricing-features" ref={mobileFeaturesRef}>
                    {selectedBilling.features.map((feature, featureIndex) => (
                      <li key={`mobile-selected-feature-${featureIndex}`} style={{ transitionDelay: `${featureIndex % 4 * 24}ms` }}>
                        <span className="pricing-check" style={{ color: accent.hex }}>
                          <Ic.check width="14" height="14" />
                        </span>
                        <ScrambleText text={feature} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pricing-price">
                <span className="pricing-price-title">
                  <ScrambleText text={selectedBilling.priceTitle} />
                </span>
                <span className="pricing-amount">
                  <SlidingPrice value={selectedBilling.price} />
                </span>
                {selectedBilling.currencySymbol ? <span className="pricing-currency">{selectedBilling.currencySymbol}</span> : null}
                <span className="pricing-suffix">
                  <ScrambleText text={selectedBilling.suffix} />
                </span>
                <span className="pricing-caption">
                  <ScrambleText text={selectedBilling.caption} />
                </span>
              </div>

              {selectedPlan.comingSoon ? (
                <span className="pricing-cta" aria-disabled="true" style={{ cursor: "not-allowed", opacity: 0.7 }}>
                  <span>Скоро</span>
                </span>
              ) : (
                <a href={selectedPlan.href} className="pricing-cta">
                  <span>{selectedPlan.cta?.landing || "Выбрать"}</span>
                  <Ic.arrow width="14" height="14" />
                </a>
              )}
            </div>

            <div className="pricing-panel-main pricing-panel-main-desktop">
              <p className="pricing-feature-title">Условия тарифа</p>
              <ul className="pricing-features">
                {Array.from({ length: maxFeatureCount }).map((_, featureIndex) => {
                  const feature = selectedBilling.features[featureIndex] || "";

                  return (
                    <li
                      key={`selected-feature-${featureIndex}`}
                      className={feature ? "" : "is-empty"}
                      style={{ transitionDelay: `${featureIndex % 4 * 24}ms` }}
                    >
                      <span className="pricing-check" style={{ color: accent.hex }}>
                        <Ic.check width="14" height="14" />
                      </span>
                      <ScrambleText text={feature} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </article>
      ) : null}

      <div className="pricing-foot reveal">
        <a href="/pricing">Открыть страницу тарифов</a>
      </div>
    </section>);

}

// ─── FAQ ────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Что происходит после регистрации?",
    a: "Вы создаёте аккаунт, подтверждаете почту и переходите в рабочее пространство WebBrain, где можно вести сайты и публиковать их."
  },
  {
    q: "Сколько стоит WebBrain?",
    a: "Public OSS pricing is demo metadata only. Real WebBrain pricing and economics are intentionally private."
  },
  {
    q: "Можно ли использовать сайт коммерчески?",
    a: "Да, когда публикация будет подключена для вашего проекта, его можно будет использовать для бизнеса. Возможности заявок, интеграций и доменов будут расширяться отдельными обновлениями."
  },
  {
    q: "Какие функции доступны сразу?",
    a: "Аккаунт, проекты, рабочий чат, сохранение задач и визуальная доработка проекта. Публикация, заявки, аналитика и интеграции будут добавляться постепенно."
  },
  {
    q: "Что если AI соберёт сайт, который мне не нравится?",
    a: "Дорабатываете сайт в редакторе или возвращаетесь в чат и описываете, что нужно изменить. Мы развиваем ИИ систему постепенно, делая её все умнее и умнее, но без обещаний лишней магии."
  },
  {
    q: "Какие данные вы собираете при регистраций?",
    a: "Email и ваше имя при регистрации. Данные не передаются третьим лицам и используются только для WebBrain."
  }];


function FaqSection({ accent }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq" id="faq">
      <div className="section-head reveal">
        <div className="section-eyebrow">Частые вопросы</div>
        <h2 className="section-h2">
          Остались
          <br /><span style={{ color: accent.hex }}>вопросы?</span>
        </h2>
      </div>

      <div className="faq-list">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={`faq-item ${isOpen ? "is-open" : ""}`}>
              <button
                className="faq-q"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}>

                <span className="faq-q-num" style={{ color: isOpen ? accent.hex : undefined }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="faq-q-text">{item.q}</span>
                <Ic.chevron
                  width="18"
                  height="18"
                  className="faq-q-icon"
                  style={{ transform: isOpen ? "rotate(90deg)" : "none" }} />

              </button>
              <div className={`faq-a ${isOpen ? "is-open" : ""}`}>
                <div className="faq-a-inner">{item.a}</div>
              </div>
            </div>);

        })}
      </div>
    </section>);

}

// ─── FINAL CTA ──────────────────────────────────────────────────────────────
function FinalCTA({ tweaks, accent, betaStats, onLeadSubmitted, authenticated }) {
  const ctaLabel = CTA_LABELS[tweaks.ctaText] || CTA_LABELS["early-access"];
  return (
    <section className="final" id="registration-form">
      <div className="final-bg" aria-hidden="true">
        <div className="final-bg-radial" style={{ background: `radial-gradient(ellipse at 30% 40%, rgba(${accent.rgb}, .14), transparent 55%)` }} />
        <div className="final-bg-grid" />
      </div>

      <div className="final-grid">
        <div className="final-left reveal">
          <div className="final-eyebrow">
            <span className="final-eyebrow-dot" style={{ background: accent.hex }} />
            Регистрация открыта
          </div>
          <h2 className="final-h2">
            Создайте аккаунт
            <span style={{ color: accent.hex, display: "block" }}>И&nbsp;ПЕРВЫЙ САЙТ.</span>
          </h2>
          <p className="final-sub">
            Начните с&nbsp;описания сайта в&nbsp;чате, опубликуйте сайт и&nbsp;продолжайте доработку в&nbsp;WebBrain.
          </p>

          <div className="final-stats">
            <div className="final-stat">
              <div className="final-stat-num" style={{ color: accent.hex }}>1<span>аккаунт</span></div>
              <div className="final-stat-label">для&nbsp;старта</div>
            </div>
            <div className="final-stat">
              <div className="final-stat-num" style={{ color: accent.hex }}>0<span>кода</span></div>
              <div className="final-stat-label">для&nbsp;создания сайтов</div>
            </div>
            <div className="final-stat">
              <div className="final-stat-num" style={{ color: accent.hex }}>1<span>чат</span></div>
              <div className="final-stat-label">для&nbsp;проекта</div>
            </div>
          </div>
        </div>

        <div className="final-right reveal" style={{ "--reveal-delay": "120ms" }}>
          <div className="final-form-card">
            <div className="final-form-head">
              <span className="final-form-pill" style={{ background: `rgba(${accent.rgb}, .14)`, color: accent.hex }}>
                <Ic.bolt width="11" height="11" /> Регистрация
              </span>
              <span className="final-form-meta">Регистрация занимает 30&nbsp;секунд</span>
            </div>
            <BetaForm ctaLabel={ctaLabel} accent={accent} betaStats={betaStats} onSubmit={onLeadSubmitted} authenticated={authenticated} compact />
          </div>

          {/* Telegram diary: вернуть, когда будет активный публичный канал запуска.
          <a href="#telegram" className="final-tg" id="telegram">
            <Ic.tg width="16" height="16" />
            <span>
              <b>Дневник запуска в&nbsp;Telegram</b>
              <span className="final-tg-sub">— строим российский AI-конструктор публично</span>
            </span>
            <Ic.arrow width="14" height="14" />
          </a>
          */}
        </div>
      </div>
    </section>);

}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="foot">
      <div className="foot-grid">
        <div className="foot-brand">
          <div className="foot-logo">
            Web<span className="foot-logo-accent">Brain</span>
          </div>
          <div className="foot-tag">AI-платформа для создания сайтов · {new Date().getFullYear()}</div>
        </div>
        <div className="foot-links">
          <a href="#how">Как работает</a>
          <a href="#benefits">Преимущества</a>
          <a href="#vs">Сравнение</a>
          <a href="#pricing">Тарифы</a>
          <a href="#faq">Вопросы</a>
          {/* Telegram: вернуть, когда будет активный публичный канал запуска. */}
        </div>
        <div className="foot-legal">
          <a href="/offer">Договор оферты</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy">Политика конфиденциальности</a>
        </div>
      </div>
    </footer>);

}

// ─── TWEAKS PANEL ───────────────────────────────────────────────────────────
function Tweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Hero" />
      <TweakRadio
        label="Сценарий копи"
        value={tweaks.heroVariant}
        options={[
          { label: "Outcome", value: "outcome" },
          { label: "Aggressive", value: "aggressive" },
          { label: "Speed", value: "speed" }]
        }
        onChange={(v) => setTweak("heroVariant", v)} />

      <TweakRadio
        label="Текст CTA"
        value={tweaks.ctaText}
        options={[
          { label: "Регистрация", value: "early-access" },
          { label: "Создать аккаунт", value: "enter-beta" },
          { label: "Начать", value: "reserve" }]
        }
        onChange={(v) => setTweak("ctaText", v)} />


      <TweakSection label="Brand" />
      <TweakColor
        label="Акцент"
        value={tweaks.accent}
        options={[ACCENTS.lime.hex, ACCENTS.cyan.hex, ACCENTS.violet.hex]}
        onChange={(v) => {
          const key = Object.keys(ACCENTS).find((k) => ACCENTS[k].hex === v);
          setTweak("accent", key || "lime");
        }} />


      <TweakSection label="Конверсия" />
      <TweakToggle
        label="Счётчик регистраций"
        value={tweaks.showCounter}
        onChange={(v) => setTweak("showCounter", v)} />

      <TweakToggle
        label="Сравнение с Tilda"
        value={tweaks.showComparison}
        onChange={(v) => setTweak("showComparison", v)} />

      <TweakSlider
        label="Регистраций"
        value={tweaks.spotsLeft}
        min={5}
        max={100}
        unit=" / 100"
        onChange={(v) => setTweak("spotsLeft", v)} />

    </TweaksPanel>);

}

// ─── APP ────────────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  // Tweaks color picker stores a hex string; map back to ACCENTS key
  const accentKey = typeof tweaks.accent === "string" && ACCENTS[tweaks.accent] ?
    tweaks.accent :
    Object.keys(ACCENTS).find((k) => ACCENTS[k].hex === tweaks.accent) || "lime";
  const accent = ACCENTS[accentKey];
  const { stats: betaStats, refresh: refreshBetaStats } = useBetaStats();
  const pricingPlans = usePricingPlans();
  const authenticated = useLandingAuthState();

  useScrollReveal();
  useGsapLandingMotion(accent);

  useEffect(() => {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);

  // Update CSS vars for accent
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--accent", accent.hex);
    r.style.setProperty("--accent-rgb", accent.rgb);
    r.style.setProperty("--accent-text", accent.text);
    r.style.setProperty("--accent-soft", accent.soft);
  }, [accent]);

  return (
    <div className="page">
      <SiteHeader accent={accent} authenticated={authenticated} />
      <Hero tweaks={tweaks} accent={accent} betaStats={betaStats} onLeadSubmitted={refreshBetaStats} authenticated={authenticated} />
      <BenefitsSection accent={accent} />
      <HowItWorks accent={accent} />
      {/* RoadmapSection скрыт до следующей итерации лендинга. */}
      <ComparisonSection tweaks={tweaks} accent={accent} />
      {/* FoundingSection скрыт: возможно, секция "После регистрации" не понадобится. */}
      {/* <FoundingSection accent={accent} /> */}
      <PricingSection accent={accent} plans={pricingPlans} />
      <FinalCTA tweaks={tweaks} accent={accent} betaStats={betaStats} onLeadSubmitted={refreshBetaStats} authenticated={authenticated} />
      <FaqSection accent={accent} />
      <Footer />
      <Tweaks tweaks={tweaks} setTweak={setTweak} />
    </div>);

}

// ─── SITE HEADER ────────────────────────────────────────────────────────────
function HeaderLiquidGlassStatic() {
  const width = 800;
  const height = 200;
  const noiseStrength = 142;

  return (
    <span
      className="site-header-liquid-glass"
      style={{
        "--webbrain-glass-width": `${width}px`,
        "--webbrain-glass-height": `${height}px`,
        "--webbrain-glass-radius": "var(--webbrain-header-radius, 28px)",
        "--webbrain-glass-inner-shadow-color": "#000000",
        "--webbrain-glass-inner-shadow-blur": "21px",
        "--webbrain-glass-inner-shadow-spread": "-2px",
        "--webbrain-glass-tint-color": "rgba(255, 255, 255, 0)",
        "--webbrain-glass-tint-opacity": 0,
        "--webbrain-glass-frost-blur": "3px"
      }}
      aria-hidden="true">

      <svg
        className="site-header-liquid-glass__filters"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="presentation"
        focusable="false">

        <defs>
          <filter
            id="site-header-glass-distortion"
            x={-noiseStrength}
            y={-noiseStrength}
            width={width + noiseStrength * 2}
            height={height + noiseStrength * 2}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB">

            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008"
              numOctaves="4"
              seed="11"
              stitchTiles="stitch"
              result="noise" />

            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="monoNoise"
              scale={noiseStrength}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced" />

            <feGaussianBlur in="displaced" stdDeviation="3" result="frosted" />
            <feComposite in="frosted" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>
      <span className="site-header-liquid-glass__frost" />
      <span className="site-header-liquid-glass__refraction" />
      <span className="site-header-liquid-glass__inner-shadow" />
    </span>);

}

function SiteHeader({ accent, authenticated }) {
  const headerRef = useRef(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let frame = 0;
    let currentMetrics = null;
    let targetMetrics = null;

    const getTargetMetrics = () => {
      const viewportWidth = window.innerWidth;
      const scrollStart = 24;
      const scrollDistance = viewportWidth >= 1024 ? 1180 : 820;
      const progress = Math.min(1, Math.max(0, (window.scrollY - scrollStart) / scrollDistance));
      const easedProgress = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const topGap = viewportWidth >= 768 ? 20 : 12;
      const startSideGap = viewportWidth >= 1024 ? 48 : 12;
      const endWidth = Math.min(viewportWidth - 24, viewportWidth >= 1024 ? 980 : viewportWidth - 24);
      const startWidth = viewportWidth - startSideGap * 2;
      const baseHeight = viewportWidth >= 768 ? 86 : viewportWidth >= 420 ? 70 : 64;
      const heightDelta = viewportWidth >= 768 ? 8 : 5;

      return {
        width: Math.max(0, startWidth + (endWidth - startWidth) * easedProgress),
        height: baseHeight - heightDelta * easedProgress,
        radius: (viewportWidth >= 540 ? 28 : 24) + 18 * easedProgress,
        top: topGap,
        y: -2 * easedProgress
      };
    };

    const applyMetrics = (metrics) => {
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
        y: currentMetrics.y + (targetMetrics.y - currentMetrics.y) * smoothing
      };

      const isSettled =
        Math.abs(currentMetrics.width - targetMetrics.width) < 0.25 &&
        Math.abs(currentMetrics.height - targetMetrics.height) < 0.05 &&
        Math.abs(currentMetrics.radius - targetMetrics.radius) < 0.05;

      if (isSettled) currentMetrics = targetMetrics;

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
    <header ref={headerRef} className="site-header">
      <div className="site-header-inner">
        <HeaderLiquidGlassStatic />
        <a href="#top" className="site-logo">
          Web<span style={{ color: accent.hex }}>Brain</span>
        </a>
        <nav className="site-nav">
          <a href="#how">Как работает</a>
          <a href="#benefits">Преимущества</a>
          <a href="#vs">Сравнение</a>
          <a href="#pricing">Тарифы</a>
          <a href="#faq">Вопросы</a>
        </nav>
        <div className="site-actions">
          {!authenticated ? (
            <a href="/login" className="site-login">
              Вход
            </a>
          ) : null}
          <a
            href={authenticated ? "/app" : "/signup"}
            className="site-cta"
            style={{ "--cta-accent": accent.hex, "--cta-accent-rgb": accent.rgb }}>

            {authenticated ? "В приложение" : "Регистрация"} <Ic.arrow width="14" height="14" />
          </a>
        </div>
      </div>
    </header>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
