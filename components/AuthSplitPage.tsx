"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AiSignalWaveShader } from "@/components/AiSignalWaveShader";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";
type AuthStep = "form" | "verify";

type AuthSplitPageProps = {
  initialMode: AuthMode;
  initialEmail?: string;
};

function isExistingAccountError(message: string) {
  return /already|registered|exists|exist|email.*taken|user.*found/i.test(message);
}

const cinematicVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const backgroundFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 41.83);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float n = noise(p * 2.4 + vec2(uTime * 0.025, -uTime * 0.018));
    float glowA = smoothstep(1.8, 0.0, length(p - vec2(0.28, -0.1)));
    float glowB = smoothstep(1.35, 0.0, length(p - vec2(-0.68, 0.42)));
    float glowC = smoothstep(1.6, 0.0, length(p - vec2(0.68, 0.62)));

    vec3 color = vec3(0.006, 0.007, 0.014);
    color += vec3(0.018, 0.055, 0.18) * glowA;
    color += vec3(0.035, 0.02, 0.12) * glowB;
    color += vec3(0.11, 0.055, 0.02) * glowC * 0.24;
    color *= 0.9 + n * 0.12;
    color *= smoothstep(1.82, 0.28, length(p)) * 0.82 + 0.2;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const particleVertexShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPixelRatio;

  attribute float aSeed;
  attribute float aColorMix;
  attribute float aLayer;
  attribute float aSize;

  varying float vAlpha;
  varying float vColorMix;
  varying float vLight;

  void main() {
    vec3 p = position;
    float t = uTime * 0.42;
    float xNorm = p.x * 0.34;
    float zNorm = p.z * 1.22;

    float crest =
      sin(xNorm * 1.65 + t + aSeed * 1.7) * 0.48 +
      sin(xNorm * 2.9 - t * 1.24 + zNorm * 0.72) * 0.2 +
      sin(xNorm * 0.78 + t * 0.62 - zNorm * 1.35) * 0.28;

    float cloth = exp(-abs(p.z) * 0.62);
    float fold = sin(p.x * 0.48 - t * 0.7 + aSeed) * 0.34;
    p.y += crest * cloth + fold * aLayer;
    p.z += sin(p.x * 0.52 + t * 0.86 + aSeed * 2.0) * 0.34 * cloth;
    p.x += uPointer.x * 0.22 * cloth;
    p.y += uPointer.y * 0.16 * cloth;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float depth = clamp(1.0 + mvPosition.z * 0.085, 0.28, 1.24);
    float center = smoothstep(5.8, 0.0, abs(position.x)) * smoothstep(2.8, 0.0, abs(position.z));

    vLight = clamp((crest + 1.0) * 0.54 + center * 0.48, 0.0, 1.65);
    vAlpha = (0.18 + center * 0.5) * cloth * depth;
    vColorMix = aColorMix;

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (0.9 + aSize * 1.15 + vLight * 1.05) * uPixelRatio * (82.0 / -mvPosition.z);
  }
`;

const particleFragmentShader = `
  precision highp float;

  varying float vAlpha;
  varying float vColorMix;
  varying float vLight;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.25, 0.0, d);
    float glow = smoothstep(0.5, 0.0, d) * 0.34;
    if (core < 0.02) discard;

    vec3 violet = vec3(0.46, 0.13, 1.0);
    vec3 cobalt = vec3(0.05, 0.18, 0.9);
    vec3 lime = vec3(0.72, 1.0, 0.22);
    vec3 pearl = vec3(0.9, 0.82, 1.0);

    vec3 cold = mix(cobalt, violet, vColorMix);
    vec3 color = mix(cold, lime, smoothstep(0.54, 1.32, vLight) * 0.24);
    color = mix(color, pearl, smoothstep(1.24, 1.68, vLight) * 0.08);

    gl_FragColor = vec4(color * (0.96 + vLight * 0.86), (core * 0.78 + glow * 0.22) * vAlpha);
  }
`;

function createParticleWaveGeometry(THREE: typeof import("three")) {
  const columns = 148;
  const rows = 46;
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const colorMixes = new Float32Array(count);
  const layers = new Float32Array(count);
  const sizes = new Float32Array(count);

  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    const v = row / (rows - 1);
    const z = (v - 0.5) * 3.15;
    const rowFalloff = 1 - Math.abs(v - 0.5) * 1.55;

    for (let column = 0; column < columns; column += 1) {
      const u = column / (columns - 1);
      const x = (u - 0.5) * 11.8;
      const jitterX = (Math.random() - 0.5) * 0.018;
      const jitterZ = (Math.random() - 0.5) * 0.028;

      positions[index * 3] = x + jitterX;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 0.018;
      positions[index * 3 + 2] = z + jitterZ;
      seeds[index] = Math.random() * Math.PI * 2;
      colorMixes[index] = Math.min(1, Math.max(0, 0.18 + v * 0.78 + Math.random() * 0.12));
      layers[index] = rowFalloff * (0.28 + Math.random() * 0.72);
      sizes[index] = Math.random();
      index += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));
  geometry.setAttribute("aLayer", new THREE.BufferAttribute(layers, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  return geometry;
}

// Kept as a fallback experiment while the registration page uses AiSignalWaveShader.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AuthWebglBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let teardown = () => {};

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;
      renderer.setClearColor(0x06070f, 1);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x06070f, 0.045);

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
      camera.position.set(0.35, 0.06, 7.4);

      const backgroundUniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
      };
      const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
      const backgroundMaterial = new THREE.ShaderMaterial({
        vertexShader: cinematicVertexShader,
        fragmentShader: backgroundFragmentShader,
        uniforms: backgroundUniforms,
        depthTest: false,
        depthWrite: false,
      });
      const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
      background.renderOrder = -10;
      scene.add(background);

      const stage = new THREE.Group();
      stage.rotation.set(-0.18, -0.08, 0.02);
      scene.add(stage);

      const particleUniforms = {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: 1 },
      };
      const particleGeometry = createParticleWaveGeometry(THREE);
      const particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: particleUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particleWave = new THREE.Points(particleGeometry, particleMaterial);
      particleWave.position.set(0.08, -0.04, -0.35);
      particleWave.rotation.set(-0.08, -0.18, 0.02);
      stage.add(particleWave);

      const pointer = { x: 0, y: 0 };
      const handlePointerMove = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      canvas.addEventListener("pointermove", handlePointerMove);

      const resize = () => {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        backgroundUniforms.uResolution.value.set(width, height);
        particleUniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      };

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      let frameId = 0;
      const startedAt = performance.now();
      const render = (now: number) => {
        const elapsed = (now - startedAt) * 0.001;
        backgroundUniforms.uTime.value = elapsed;
        particleUniforms.uTime.value = elapsed;
        particleUniforms.uPointer.value.set(pointer.x, pointer.y);

        stage.rotation.y = -0.08 + pointer.x * 0.045 + Math.sin(elapsed * 0.13) * 0.018;
        stage.rotation.x = -0.18 + pointer.y * -0.035 + Math.sin(elapsed * 0.11) * 0.014;
        particleWave.rotation.z = Math.sin(elapsed * 0.09) * 0.018;

        renderer.render(scene, camera);
        if (!reduceMotion) frameId = requestAnimationFrame(render);
      };
      render(startedAt);

      teardown = () => {
        cancelAnimationFrame(frameId);
        canvas.removeEventListener("pointermove", handlePointerMove);
        resizeObserver.disconnect();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((item) => item.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function AuthSplitPage({ initialMode, initialEmail = "" }: AuthSplitPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isSignup = mode === "signup";

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setAuthStep("form");
    setAuthError(null);
    setAuthNotice(null);
    setOtpDigits(["", "", "", "", "", ""]);
  }

  function redirectToApp() {
    window.location.assign("/app");
  }

  function switchToLoginForExistingAccount(targetEmail: string) {
    setEmail(targetEmail);
    setMode("login");
    setAuthStep("form");
    setPendingEmail("");
    setOtpDigits(["", "", "", "", "", ""]);
    setAuthError(null);
    setAuthNotice("Похоже, аккаунт с этой почтой уже есть. Введите пароль, почту мы оставили.");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authStep === "verify") {
      await verifyCode();
      return;
    }

    setAuthError(null);
    setAuthNotice(null);
    setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const supabase = getSupabaseBrowserClient();

      if (isSignup) {
        if (!acceptedTerms) {
          throw new Error("Нужно согласиться с условиями");
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });

        if (error) throw error;

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          switchToLoginForExistingAccount(normalizedEmail);
          return;
        }

        setPendingEmail(normalizedEmail);

        if (data.session) {
          redirectToApp();
          return;
        }

        setAuthStep("verify");
        setAuthNotice("Мы отправили код подтверждения на почту.");
        window.setTimeout(() => otpInputRefs.current[0]?.focus(), 80);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      if (!rememberMe) {
        await supabase.auth.refreshSession();
      }

      redirectToApp();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось выполнить вход";

      if (isSignup && isExistingAccountError(message)) {
        switchToLoginForExistingAccount(normalizedEmail);
        return;
      }

      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode(nextDigits = otpDigits) {
    const token = nextDigits.join("");
    const targetEmail = pendingEmail || email.trim().toLowerCase();

    if (token.length !== 6 || isSubmitting) return;

    setAuthError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token,
        type: "email",
      });

      if (error) throw error;

      redirectToApp();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Неверный код подтверждения");
      setOtpDigits(["", "", "", "", "", ""]);
      window.setTimeout(() => otpInputRefs.current[0]?.focus(), 80);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    const targetEmail = pendingEmail || email.trim().toLowerCase();

    if (!targetEmail || isSubmitting) return;

    setAuthError(null);
    setAuthNotice(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;

      setAuthNotice("Отправили новый код на почту.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Не удалось отправить код повторно");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateOtpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);

    if (digit && index < nextDigits.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (nextDigits.every(Boolean)) {
      void verifyCode(nextDigits);
    }
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");

    if (!pastedDigits.length) return;

    event.preventDefault();
    const nextDigits = Array.from({ length: 6 }, (_, index) => pastedDigits[index] ?? "");
    setOtpDigits(nextDigits);

    const nextIndex = Math.min(pastedDigits.length, 5);
    otpInputRefs.current[nextIndex]?.focus();

    if (nextDigits.every(Boolean)) {
      void verifyCode(nextDigits);
    }
  }

  return (
    <main className="h-[100svh] max-h-[100svh] overflow-hidden bg-[#050707] text-white">
      <section className="grid h-[100svh] max-h-[100svh] overflow-hidden lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
        <div className="flex h-[100svh] min-h-0 flex-col overflow-hidden px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
          <header className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
            <Link href="/" className="text-lg font-bold tracking-normal">
              Web<span className="text-lime">Brain</span>
            </Link>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center py-5 sm:py-6 lg:py-8">
            <div className="w-full max-w-[440px]">
              <div className="mb-5 inline-flex rounded-[14px] border border-white/[0.08] bg-white/[0.035] p-1 text-sm font-semibold text-white/56 sm:mb-6">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={`relative h-10 rounded-[10px] px-4 transition ${!isSignup ? "text-black" : "hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {!isSignup ? (
                    <motion.span
                      layoutId="auth-mode-indicator"
                      className="absolute inset-0 rounded-[10px] bg-lime"
                      transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
                    />
                  ) : null}
                  <span className="relative z-10">Вход</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className={`relative h-10 rounded-[10px] px-4 transition ${isSignup ? "text-black" : "hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {isSignup ? (
                    <motion.span
                      layoutId="auth-mode-indicator"
                      className="absolute inset-0 rounded-[10px] bg-lime"
                      transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
                    />
                  ) : null}
                  <span className="relative z-10">Регистрация</span>
                </button>
              </div>

              <form onSubmit={submitAuth} data-lpignore="true" data-1p-ignore="true" suppressHydrationWarning>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${mode}-${authStep}`}
                    initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-2.5"
                  >
                    {authStep === "verify" ? (
                      <>
                        <motion.div
                          layout
                          className="rounded-[16px] border border-lime/18 bg-lime/[0.055] px-4 py-3 text-sm leading-6 text-white/70"
                        >
                          Введите 6 цифр из письма, которое мы отправили на{" "}
                          <span className="font-semibold text-white">{pendingEmail || email}</span>.
                        </motion.div>
                        <motion.div layout className="grid grid-cols-6 gap-2">
                          {otpDigits.map((digit, index) => (
                            <input
                              key={index}
                              ref={(element) => {
                                otpInputRefs.current[index] = element;
                              }}
                              value={digit}
                              onChange={(event) => updateOtpDigit(index, event.target.value)}
                              onKeyDown={(event) => handleOtpKeyDown(index, event)}
                              onPaste={handleOtpPaste}
                              inputMode="numeric"
                              autoComplete={index === 0 ? "one-time-code" : "off"}
                              aria-label={`Цифра ${index + 1}`}
                              disabled={isSubmitting}
                              className="h-12 rounded-[14px] border border-white/[0.08] bg-white/[0.035] text-center text-xl font-bold text-white outline-none transition placeholder:text-white/20 focus:border-lime/70 focus:bg-white/[0.055] disabled:opacity-55"
                              maxLength={1}
                            />
                          ))}
                        </motion.div>
                        <motion.div layout className="flex items-center justify-between gap-4 pt-1 text-sm text-white/42">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthStep("form");
                              setOtpDigits(["", "", "", "", "", ""]);
                              setAuthError(null);
                            }}
                            className="font-semibold text-white/56 transition hover:text-white"
                          >
                            Изменить почту
                          </button>
                          <button
                            type="button"
                            onClick={() => void resendCode()}
                            disabled={isSubmitting}
                            className="font-semibold text-white/56 transition hover:text-lime disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Отправить ещё раз
                          </button>
                        </motion.div>
                        <motion.button
                          layout
                          type="submit"
                          disabled={isSubmitting || otpDigits.join("").length !== 6}
                          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-3 rounded-[16px] bg-lime px-6 text-base font-extrabold text-black shadow-[0_18px_52px_rgba(200,255,94,0.18)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 sm:h-[52px]"
                        >
                          {isSubmitting ? "Проверяем..." : "Подтвердить"}
                          <ArrowRight className="h-5 w-5" />
                        </motion.button>
                      </>
                    ) : (
                      <>
                        {isSignup ? (
                          <motion.div
                            layout
                            className="group block rounded-[14px] border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 transition focus-within:border-lime/70 focus-within:bg-white/[0.055]"
                          >
                            <label htmlFor="signup-name" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
                              <UserRound className="h-3.5 w-3.5" />
                              Имя
                            </label>
                            <input
                              id="signup-name"
                              required
                              type="text"
                              autoComplete="name"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              placeholder="Алексей"
                              className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/24"
                            />
                          </motion.div>
                        ) : null}

                        <motion.div
                          layout
                          className="group block rounded-[14px] border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 transition focus-within:border-lime/70 focus-within:bg-white/[0.055]"
                        >
                          <label htmlFor="auth-email" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
                            <Mail className="h-3.5 w-3.5" />
                            Почта
                          </label>
                          <input
                            id="auth-email"
                            required
                            type="email"
                            autoComplete="email"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@company.ru"
                            className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/24"
                          />
                        </motion.div>

                        <motion.div
                          layout
                          className="group block rounded-[14px] border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 transition focus-within:border-lime/70 focus-within:bg-white/[0.055]"
                        >
                          <label htmlFor="auth-password" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/38">
                            <Lock className="h-3.5 w-3.5" />
                            Пароль
                          </label>
                          <span className="flex items-center gap-3">
                            <input
                              id="auth-password"
                              required
                              minLength={8}
                              type={showPassword ? "text" : "password"}
                              autoComplete={isSignup ? "new-password" : "current-password"}
                              data-lpignore="true"
                              data-1p-ignore="true"
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              placeholder="Минимум 8 символов"
                              className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/24"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/38 transition hover:bg-white/[0.07] hover:text-white"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </span>
                        </motion.div>

                        <motion.div layout className="flex items-center justify-between gap-4 pt-1 text-sm text-white/42">
                          {isSignup ? (
                            <div className="flex items-start gap-3">
                              <input
                                id="auth-terms"
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(event) => setAcceptedTerms(event.target.checked)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-lime"
                              />
                              <label htmlFor="auth-terms" className="leading-6">
                                Согласен с{" "}
                                <Link
                                  href="/offer"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-white/72 underline decoration-white/20 underline-offset-4 transition hover:text-lime hover:decoration-lime/70"
                                >
                                  условиями оферты
                                </Link>{" "}
                                и{" "}
                                <Link
                                  href="/privacy"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-white/72 underline decoration-white/20 underline-offset-4 transition hover:text-lime hover:decoration-lime/70"
                                >
                                  политикой конфиденциальности
                                </Link>
                              </label>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(event) => setRememberMe(event.target.checked)}
                                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-lime"
                              />
                              Запомнить меня
                            </label>
                          )}
                          {!isSignup ? (
                            <motion.button
                              type="button"
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 8 }}
                              className="font-semibold text-white/52 transition hover:text-lime"
                            >
                              Забыли пароль?
                            </motion.button>
                          ) : null}
                        </motion.div>

                        <motion.button
                          layout
                          type="submit"
                          disabled={isSubmitting}
                          className="mt-2 inline-flex h-12 w-full items-center justify-center gap-3 rounded-[16px] bg-lime px-6 text-base font-extrabold text-black shadow-[0_18px_52px_rgba(200,255,94,0.18)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 sm:h-[52px]"
                        >
                          {isSubmitting ? "Подождите..." : isSignup ? "Зарегистрироваться" : "Войти"}
                          <ArrowRight className="h-5 w-5" />
                        </motion.button>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </form>

              {authError ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-[14px] border border-red-400/20 bg-red-400/[0.07] px-4 py-2.5 text-sm leading-6 text-red-100/82"
                >
                  {authError}
                </motion.div>
              ) : null}

              {authNotice ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-[14px] border border-lime/20 bg-lime/[0.075] px-4 py-2.5 text-sm leading-6 text-lime"
                >
                  {authNotice}
                </motion.div>
              ) : null}

              {authStep === "form" ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={`switch-copy-${mode}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-5 text-sm leading-6 text-white/38"
                  >
                    {isSignup ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
                    <button
                      type="button"
                      onClick={() => changeMode(isSignup ? "login" : "signup")}
                      className="font-semibold text-white/70 transition hover:text-lime"
                    >
                      {isSignup ? "Войти" : "Зарегистрироваться"}
                    </button>
                  </motion.p>
                </AnimatePresence>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="relative hidden h-[100svh] overflow-hidden border-l border-white/[0.05] bg-[#020207] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_84%_6%,rgba(255,250,190,0.22)_0%,rgba(210,255,58,0.12)_13%,rgba(74,94,24,0.065)_30%,transparent_58%),radial-gradient(circle_at_50%_44%,rgba(195,255,62,0.09),transparent_30%),radial-gradient(circle_at_52%_52%,rgba(255,235,59,0.06),transparent_23%),linear-gradient(180deg,#070806_0%,#020403_100%)]" />
          <div className="absolute -right-[18%] -top-[22%] h-[72vh] w-[70vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,225,0.18)_0%,rgba(220,255,80,0.105)_18%,rgba(166,255,60,0.035)_38%,transparent_68%)] blur-3xl" />
          <div className="absolute -right-[8%] top-[-12%] h-[58vh] w-[58vw] rotate-[20deg] bg-[linear-gradient(118deg,rgba(255,255,218,0.18)_0%,rgba(215,255,65,0.07)_28%,rgba(215,255,65,0.018)_48%,transparent_72%)] blur-2xl" />
          <AiSignalWaveShader
            mode="idle"
            className="absolute left-1/2 top-1/2 h-[34vh] w-[min(86vw,980px)] -translate-x-1/2 -translate-y-1/2"
            label="Живой сигнал WebBrain"
          />
          <div className="absolute right-[4%] top-[4%] h-px w-[46%] rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,235,0.32),rgba(213,255,58,0.12),transparent)] blur-[1px]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,4,3,0.28),rgba(2,4,3,0)_38%,rgba(2,4,3,0.08)),radial-gradient(circle_at_83%_8%,transparent_0%,rgba(2,4,3,0.08)_28%,rgba(2,4,3,0.34)_58%,rgba(2,4,3,0.82)_100%),radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,4,3,0.25)_70%,rgba(2,4,3,0.78)_100%)]" />
        </aside>
      </section>
    </main>
  );
}
