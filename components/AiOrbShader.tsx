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

  mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
      1.0, 0.0, 0.0,
      0.0, c, -s,
      0.0, s, c
    );
  }

  mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
      c, 0.0, s,
      0.0, 1.0, 0.0,
      -s, 0.0, c
    );
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float softBand(float value, float width) {
    float line = 1.0 - abs(value);
    return smoothstep(1.0 - width, 1.0, line);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;
    p.y *= -1.0;

    float radius = dot(p, p);
    if (radius > 1.08) {
      discard;
    }

    float z = sqrt(max(0.0, 1.0 - radius));
    vec3 normal = normalize(vec3(p, z));

    float time = uTime;
    float mode = smoothstep(0.0, 1.0, uMode);
    float spin = mix(0.28, 1.28, mode);
    float pulse = sin(time * mix(1.1, 3.8, mode)) * mix(0.045, 0.09, mode);
    mat3 rotation = rotateY(time * spin + 0.22 * sin(time * 0.34)) * rotateX(0.62 * sin(time * 0.26) + time * spin * 0.42);
    vec3 q = rotation * normal;

    float liquidWarp =
      sin(q.x * 5.2 + q.z * 4.6 + time * mix(0.34, 1.1, mode)) * 0.18 +
      sin(q.x * 10.7 - q.z * 4.1 - time * mix(0.28, 0.86, mode)) * 0.07 +
      sin(q.z * 8.4 + time * mix(0.2, 0.72, mode)) * 0.05;

    float organicDrift =
      sin(q.x * 4.8 + q.y * 2.7 + q.z * 5.4 + time * mix(0.28, 1.24, mode)) * 0.28 +
      sin(q.x * -3.6 + q.y * 6.1 - q.z * 2.8 - time * mix(0.22, 0.94, mode)) * 0.18;
    float contourA = softBand(sin((q.x * 0.72 + q.z * 0.86 + organicDrift) * 14.0 + sin(q.y * 5.2 + time * 0.54) * 2.2), 0.12);
    float contourB = softBand(sin((q.y * 0.64 - q.z * 0.58 + organicDrift * 0.7) * 17.0 + cos(q.x * 4.4 - time * 0.4) * 1.8), 0.1);
    vec2 loopCenter = vec2(
      sin(q.z * 3.0 + time * mix(0.22, 0.78, mode)),
      cos(q.x * 2.7 - time * mix(0.2, 0.7, mode))
    ) * 0.18;
    float loopField = length(q.xy + loopCenter + organicDrift * 0.07);
    float neuralLoop = softBand(sin(loopField * 24.0 - time * mix(0.18, 1.36, mode)), 0.12);
    float ridge = clamp(contourA * 0.72 + contourB * 0.42 + neuralLoop * 0.28, 0.0, 1.0);

    float fiber =
      sin(q.x * 85.0 + q.y * 31.0 + q.z * 12.0 + time * mix(0.8, 2.7, mode)) * 0.5 + 0.5;
    ridge *= 0.88 + fiber * 0.12;

    vec2 grainCell = floor((q.xy + q.z * 0.37) * vec2(150.0, 170.0));
    float speck = step(0.986, hash21(grainCell));
    speck *= smoothstep(0.12, 0.82, z);

    vec3 lightDir = normalize(vec3(-0.38, 0.34, 0.86));
    float light = max(dot(normal, lightDir), 0.0);
    float fresnel = pow(1.0 - max(normal.z, 0.0), 2.05);
    float innerShade = smoothstep(0.96, 0.2, radius);

    vec3 deep = vec3(0.026, 0.024, 0.006);
    vec3 glass = vec3(0.12, 0.105, 0.018);
    vec3 amber = vec3(1.0, 0.64, 0.06);
    vec3 lime = vec3(0.78, 1.0, 0.22);
    vec3 white = vec3(1.0, 0.96, 0.58);

    vec3 color = mix(deep, glass, light * 0.72 + 0.18);
    color += mix(amber, lime, 0.55 + mode * 0.28) * ridge * (0.48 + light * 0.84);
    color += white * pow(ridge, 3.2) * mix(0.25, 0.55, mode);
    color += amber * speck * 0.46;
    color += mix(amber, lime, mode) * fresnel * 0.38;
    color *= 0.72 + innerShade * 0.42 + pulse;

    float edgeAlpha = smoothstep(1.08, 0.86, radius);
    edgeAlpha *= 0.78 + 0.22 * sin(time * 1.4 + radius * 12.0);
    gl_FragColor = vec4(color, edgeAlpha);
  }
`;

type AiOrbShaderProps = {
  className?: string;
  mode?: "idle" | "working";
  label?: string;
};

export function AiOrbShader({ className = "", mode = "idle", label = "Искусственный интеллект WebBrain" }: AiOrbShaderProps) {
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
      className={`relative overflow-hidden rounded-full bg-[#080700] shadow-[0_0_34px_rgba(245,255,72,0.18),inset_0_0_12px_rgba(255,214,68,0.16)] ${className}`}
      role="img"
      aria-label={label}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <span className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,210,0.34),transparent_14%),radial-gradient(circle_at_68%_72%,rgba(255,214,68,0.24),transparent_20%)] blur-[1px]" />
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-yellow-200/25" />
      <span className="pointer-events-none absolute inset-[-16%] rounded-full bg-[radial-gradient(circle,rgba(245,255,72,0.2),transparent_58%)]" />
    </div>
  );
}
