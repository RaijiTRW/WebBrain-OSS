"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uMode;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
      value += sin(p.x) * cos(p.y) * amplitude;
      p = mat2(1.62, -1.18, 1.18, 1.62) * p + 0.37;
      amplitude *= 0.5;
    }

    return value;
  }

  float ribbonLine(vec2 p, float offset, float phase, float width, float weight, float speed) {
    float edgeFade = 1.0 - smoothstep(0.72, 1.88, abs(p.x));
    float drift = fbm(vec2(p.x * 2.1 + phase + uTime * speed * 0.52, p.x * 0.9 - phase));
    float wave =
      sin(p.x * 4.15 + phase + uTime * speed) * 0.115 +
      sin(p.x * 7.7 - phase * 0.6 - uTime * speed * 0.56) * 0.055 +
      drift * 0.044;
    wave = (wave + offset) * edgeFade;

    float distanceToWave = abs(p.y - wave);
    float soft = 1.0 - smoothstep(0.0, width, distanceToWave);
    float core = 1.0 - smoothstep(0.0, width * 0.18, distanceToWave);
    return (soft * 0.34 + core * 0.92) * edgeFade * weight;
  }

  float particleRibbon(vec2 p, float phase, float speed) {
    float edgeFade = 1.0 - smoothstep(0.56, 1.78, abs(p.x));
    float wave =
      sin(p.x * 4.0 + phase + uTime * speed * 0.86) * 0.13 +
      sin(p.x * 8.6 - phase - uTime * speed * 0.42) * 0.055 +
      fbm(vec2(p.x * 2.8 + phase, uTime * speed * 0.22)) * 0.06;
    wave *= edgeFade;

    float ribbonMask = 1.0 - smoothstep(0.0, 0.4, abs(p.y - wave));
    vec2 grid = vec2(p.x * 96.0 + uTime * speed * 11.0, (p.y - wave) * 54.0);
    vec2 cell = fract(grid) - 0.5;
    float dotShape = 1.0 - smoothstep(0.0, 0.24, length(cell));
    float sparkle = smoothstep(0.52, 1.0, hash21(floor(grid) + phase));
    return dotShape * sparkle * ribbonMask * edgeFade;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / max(uResolution.y, 1.0) * 0.52;
    p.y *= -1.0;

    float mode = smoothstep(0.0, 1.0, uMode);
    float speed = mix(0.28, 1.02, mode);
    float verticalFade = 1.0 - smoothstep(0.56, 1.04, abs(p.y));
    float horizontalFade = 1.0 - smoothstep(1.28, 1.96, abs(p.x));

    float waveA = ribbonLine(p, -0.13, 0.0, 0.13, 1.18, speed);
    float waveB = ribbonLine(p, 0.02, 1.74, 0.108, 0.9, speed * 1.16);
    float waveC = ribbonLine(p, 0.17, 3.36, 0.14, 0.7, speed * 0.82);
    float waveD = ribbonLine(p, -0.01, 5.2, 0.22, 0.42, speed * 0.54);
    float ribbons = clamp(waveA + waveB + waveC + waveD, 0.0, 1.0);

    float particles =
      particleRibbon(p, 0.7, speed * 1.15) +
      particleRibbon(p + vec2(0.0, 0.045), 2.9, speed * 0.88) * 0.64 +
      particleRibbon(p - vec2(0.0, 0.065), 5.4, speed * 0.72) * 0.46;

    float mist = exp(-dot(p * vec2(0.82, 2.65), p * vec2(0.82, 2.65)) * 1.18) * horizontalFade;
    float activePulse = 0.8 + sin(uTime * mix(0.92, 2.6, mode)) * mix(0.035, 0.105, mode);
    float energy = clamp(ribbons * 1.08 + particles * 0.34 + mist * 0.28, 0.0, 1.0);

    vec3 deep = vec3(0.09, 0.082, 0.012);
    vec3 amber = vec3(1.0, 0.68, 0.04);
    vec3 lime = vec3(0.73, 1.0, 0.20);
    vec3 whiteHot = vec3(1.0, 0.97, 0.56);
    vec3 color = deep * mist * 0.32;
    color += mix(amber, lime, 0.58 + mode * 0.16) * ribbons * 2.12;
    color += whiteHot * pow(ribbons, 2.2) * 1.05;
    color += lime * particles * 1.55;
    color += amber * mist * 0.32;
    color *= activePulse;

    float alpha = clamp(energy * verticalFade * 1.46 + ribbons * 1.1 + particles * 0.58, 0.0, 1.0);
    alpha *= horizontalFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

type AiSignalWaveShaderProps = {
  className?: string;
  mode?: "idle" | "working";
  label?: string;
};

export function AiSignalWaveShader({
  className = "",
  mode = "idle",
  label = "Живой сигнал WebBrain"
}: AiSignalWaveShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shaderCanvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas: shaderCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uTime: { value: 0 },
      uMode: { value: modeRef.current === "working" ? 1 : 0 },
      uResolution: { value: new THREE.Vector2(1, 1) }
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function resize() {
      const width = Math.max(1, shaderCanvas.clientWidth);
      const height = Math.max(1, shaderCanvas.clientHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shaderCanvas);
    resize();

    let frameId = 0;
    const startedAt = performance.now();

    function render(now: number) {
      uniforms.uTime.value = (now - startedAt) * 0.001;
      const targetMode = modeRef.current === "working" ? 1 : 0;
      uniforms.uMode.value += (targetMode - uniforms.uMode.value) * 0.055;
      renderer.render(scene, camera);

      if (!reduceMotion) {
        frameId = requestAnimationFrame(render);
      }
    }

    render(startedAt);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`pointer-events-none relative overflow-visible ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="pointer-events-none absolute inset-x-[10%] top-1/2 z-0 h-20 -translate-y-1/2 rounded-full bg-lime/[0.075] blur-3xl" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-28 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200/[0.07] blur-2xl" />
      <canvas ref={canvasRef} className="absolute inset-0 z-10 h-full w-full drop-shadow-[0_0_22px_rgba(211,255,56,0.28)]" />
    </div>
  );
}
