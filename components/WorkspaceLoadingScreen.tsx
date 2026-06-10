"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const pointVertexShader = `
  precision highp float;

  attribute float aSeed;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vGlow;
  varying float vWave;
  varying float vSeed;

  void main() {
    vec3 p = position;
    vec3 n = normalize(p);
    float wave =
      sin(n.x * 6.2 + n.y * 3.8 + uTime * 1.24 + aSeed * 6.2831) * 0.105 +
      sin(n.y * 9.4 - n.z * 4.6 + uTime * 0.92 + aSeed * 9.1) * 0.064 +
      sin(n.z * 10.8 + n.x * 4.8 - uTime * 0.78 + aSeed * 4.4) * 0.043;

    float movingBand =
      abs(sin((n.x * 1.72 + n.y * 0.84 - n.z * 1.28) * 8.6 + uTime * 0.94)) +
      abs(sin((n.y * 1.86 + n.z * 0.94) * 7.2 - uTime * 0.72));
    movingBand = smoothstep(1.58, 1.98, movingBand);

    p = n * (1.02 + wave + movingBand * 0.045);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    float rim = smoothstep(0.08, 1.0, abs(normalize(p).x) + abs(normalize(p).y) * 0.38);

    vGlow = rim;
    vWave = movingBand;
    vSeed = aSeed;
    gl_PointSize = (1.75 + rim * 1.8 + movingBand * 2.65 + sin(uTime * 1.8 + aSeed * 18.0) * 0.38) * uPixelRatio * (1.85 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const pointFragmentShader = `
  precision highp float;

  uniform float uTime;

  varying float vGlow;
  varying float vWave;
  varying float vSeed;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float circle = 1.0 - smoothstep(0.14, 0.5, length(p));
    float core = 1.0 - smoothstep(0.0, 0.16, length(p));
    float pulse = 0.78 + sin(uTime * 2.0 + vSeed * 25.0) * 0.22;

    vec3 deepLime = vec3(0.12, 0.28, 0.04);
    vec3 cyan = vec3(0.18, 0.92, 0.82);
    vec3 lime = vec3(0.74, 1.0, 0.20);
    vec3 whiteHot = vec3(0.98, 1.0, 0.72);
    vec3 color = mix(deepLime, cyan, vGlow * 0.72);
    color = mix(color, lime, vWave * 0.72);
    color = mix(color, whiteHot, core * (0.48 + vWave * 0.44));
    color *= pulse;

    gl_FragColor = vec4(color, circle * (0.34 + vGlow * 0.35 + vWave * 0.54));
  }
`;

function createSpherePoints(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * index;
    const wobble = 1 + Math.sin(index * 12.9898) * 0.018;

    positions[index * 3] = Math.cos(theta) * radius * wobble;
    positions[index * 3 + 1] = y * wobble;
    positions[index * 3 + 2] = Math.sin(theta) * radius * wobble;
    seeds[index] = Math.abs((Math.sin(index * 78.233) * 43758.5453) % 1);
  }

  return { positions, seeds };
}

type WorkspaceLoadingScreenProps = {
  label?: string;
};

function WorkspaceLoadingSphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 5.1);

    const pointUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 }
    };
    const { positions, seeds } = createSpherePoints(16000);
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const pointMaterial = new THREE.ShaderMaterial({
      vertexShader: pointVertexShader,
      fragmentShader: pointFragmentShader,
      uniforms: pointUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(pointCloud);

    const waveLines = Array.from({ length: 8 }, (_, index) => {
      const sampleCount = 240;
      const linePositions = new Float32Array(sampleCount * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

      const material = new THREE.LineBasicMaterial({
        color: index % 3 === 0 ? 0xeaff9f : index % 3 === 1 ? 0xb9ff34 : 0x47ffe7,
        transparent: true,
        opacity: index % 3 === 2 ? 0.2 : 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.LineLoop(geometry, material);
      const tilt = new THREE.Euler(
        -0.92 + index * 0.24,
        0.42 + index * 0.37,
        -0.38 + index * 0.31
      );

      scene.add(line);

      return {
        geometry,
        line,
        material,
        positions: linePositions,
        phase: index * 0.82,
        latitude: -0.46 + index * 0.13,
        speed: 0.48 + index * 0.055,
        tilt
      };
    });

    function updateWaveLines(time: number) {
      const reusablePoint = new THREE.Vector3();

      for (const config of waveLines) {
        const { positions: linePositions, latitude, phase, speed, tilt } = config;
        const count = linePositions.length / 3;

        for (let index = 0; index < count; index += 1) {
          const t = (index / count) * Math.PI * 2;
          const lat =
            latitude +
            Math.sin(t * 3.0 + phase + time * speed) * 0.11 +
            Math.sin(t * 7.0 - phase * 0.6 - time * speed * 0.72) * 0.045;
          const radius =
            1.04 +
            Math.sin(t * 5.0 + phase + time * speed * 1.15) * 0.085 +
            Math.sin(t * 11.0 - time * speed * 0.62) * 0.026;
          const ringRadius = Math.cos(lat) * radius;

          reusablePoint.set(
            Math.cos(t) * ringRadius,
            Math.sin(lat) * radius,
            Math.sin(t) * ringRadius
          );
          reusablePoint.applyEuler(tilt);

          linePositions[index * 3] = reusablePoint.x;
          linePositions[index * 3 + 1] = reusablePoint.y;
          linePositions[index * 3 + 2] = reusablePoint.z;
        }

        config.geometry.attributes.position.needsUpdate = true;
      }
    }

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xb9ff34,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 64), glowMaterial);
    scene.add(glow);

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      pointUniforms.uPixelRatio.value = pixelRatio;
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let frameId = 0;
    const startedAt = performance.now();

    const render = (now: number) => {
      const time = (now - startedAt) * 0.001;

      pointUniforms.uTime.value = time;
      pointCloud.rotation.y = time * 0.11;
      pointCloud.rotation.x = Math.sin(time * 0.18) * 0.12;
      glow.rotation.y = -time * 0.06;
      updateWaveLines(time);

      renderer.render(scene, camera);

      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    render(startedAt);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      pointGeometry.dispose();
      pointMaterial.dispose();
      glow.geometry.dispose();
      glowMaterial.dispose();
      for (const config of waveLines) {
        config.geometry.dispose();
        config.material.dispose();
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-[min(48vw,360px)] w-[min(48vw,360px)] min-h-[230px] min-w-[230px]" aria-hidden="true">
      <span className="absolute inset-[6%] rounded-full bg-lime/[0.13] blur-[58px]" />
      <span className="absolute inset-[18%] rounded-full bg-yellow-100/[0.08] blur-2xl" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full drop-shadow-[0_0_38px_rgba(190,255,55,0.28)]" />
    </div>
  );
}

export function WorkspaceLoadingScreen({ label = "Загружаем рабочее пространство" }: WorkspaceLoadingScreenProps) {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#050707] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(184,255,42,0.22),transparent_26%),radial-gradient(circle_at_52%_48%,rgba(184,255,42,0.09),transparent_36%),linear-gradient(180deg,#07100d_0%,#050707_46%,#020303_100%)]" />
      <div className="absolute right-[-10%] top-[-18%] h-[44rem] w-[44rem] rounded-full bg-lime/[0.10] blur-[130px]" />
      <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/[0.06] blur-[120px]" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-14 text-center">
        <WorkspaceLoadingSphere />
        <p className="mt-7 text-[clamp(1rem,1.55vw,1.28rem)] font-semibold tracking-normal text-white/86">
          {label}
        </p>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime shadow-[0_0_18px_rgba(190,255,55,0.75)]" />
          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-white/[0.08]">
            <span className="block h-full w-1/2 animate-[workspace-loader-bar_1.35s_ease-in-out_infinite] rounded-full bg-lime" />
          </span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime/70 [animation-delay:220ms]" />
        </div>
      </section>
    </main>
  );
}
