"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type ThreeButtonVariant = "lime" | "dark" | "prompt";

type ThreeButtonSurfaceProps = {
  variant: ThreeButtonVariant;
  radius?: number;
  depth?: number;
};

const VARIANTS: Record<
  ThreeButtonVariant,
  {
    face: number;
    side: number;
    emissive: number;
    glow: number;
    baseRotation: { x: number; y: number };
    roughness: number;
    clearcoat: number;
  }
> = {
  lime: {
    face: 0xc8ff5e,
    side: 0x7faa27,
    emissive: 0x243600,
    glow: 0xbfff3e,
    baseRotation: { x: -0.055, y: -0.075 },
    roughness: 0.46,
    clearcoat: 0.34
  },
  dark: {
    face: 0x222425,
    side: 0x121414,
    emissive: 0x050606,
    glow: 0x060808,
    baseRotation: { x: -0.05, y: -0.065 },
    roughness: 0.58,
    clearcoat: 0.2
  },
  prompt: {
    face: 0x141a1d,
    side: 0x29351b,
    emissive: 0x030404,
    glow: 0x8ac030,
    baseRotation: { x: -0.045, y: -0.055 },
    roughness: 0.5,
    clearcoat: 0.24
  }
};

export function ThreeButtonSurface({ variant, radius = 10, depth = 18 }: ThreeButtonSurfaceProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const button = host?.parentElement;

    if (!host || !canvas || !button) return;

    const config = VARIANTS[variant];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 5000);
    const group = new THREE.Group();
    scene.add(group);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: config.face,
      emissive: config.emissive,
      emissiveIntensity: variant === "lime" ? 0.08 : 0.02,
      roughness: config.roughness,
      metalness: 0.02,
      clearcoat: config.clearcoat,
      clearcoatRoughness: 0.5
    });

    const sideMaterial = new THREE.MeshPhysicalMaterial({
      color: config.side,
      roughness: 0.72,
      metalness: 0.02,
      clearcoat: 0.08
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.glow,
      transparent: true,
      opacity: variant === "prompt" ? 0.16 : variant === "lime" ? 0.18 : 0.1,
      depthWrite: false
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bodyMaterial);
    const side = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sideMaterial);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glowMaterial);
    group.add(glow, side, body);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    const key = new THREE.DirectionalLight(0xffffff, 1.65);
    key.position.set(-90, 130, 260);
    const rim = new THREE.DirectionalLight(variant === "lime" ? 0xd7ff8c : 0x9fb5c0, 0.86);
    rim.position.set(180, -90, 180);
    scene.add(ambient, key, rim);

    const state = {
      x: config.baseRotation.x,
      y: config.baseRotation.y,
      z: 0,
      targetX: config.baseRotation.x,
      targetY: config.baseRotation.y,
      targetZ: 0
    };

    let animationFrame = 0;
    let disposed = false;

    const disposeGeometry = (mesh: THREE.Mesh) => {
      mesh.geometry.dispose();
    };

    const makeGeometry = (width: number, height: number, geometryDepth: number, geometryRadius: number) => {
      return new RoundedBoxGeometry(width, height, geometryDepth, 8, geometryRadius);
    };

    const resize = () => {
      const canvasRect = host.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const width = Math.max(1, Math.round(canvasRect.width));
      const height = Math.max(1, Math.round(canvasRect.height));
      const faceWidth = Math.max(1, buttonRect.width);
      const faceHeight = Math.max(1, buttonRect.height);
      const safeRadius = Math.min(radius, faceHeight / 2 - 1, faceWidth / 2 - 1);

      renderer.setSize(width, height, false);

      disposeGeometry(body);
      disposeGeometry(side);
      disposeGeometry(glow);

      body.geometry = makeGeometry(faceWidth, faceHeight, depth, safeRadius);
      side.geometry = makeGeometry(faceWidth, faceHeight, depth * 0.86, safeRadius);
      glow.geometry = makeGeometry(faceWidth * 0.98, faceHeight * 0.92, 2, safeRadius);

      body.position.set(0, 0, depth * 0.18);
      side.position.set(depth * 0.5, -depth * 0.48, -depth * 0.54);
      glow.position.set(depth * 0.55, -depth * 0.82, -depth * 1.12);

      const hostCenterX = canvasRect.left + canvasRect.width / 2;
      const hostCenterY = canvasRect.top + canvasRect.height / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;
      group.position.set(buttonCenterX - hostCenterX, hostCenterY - buttonCenterY, 0);

      camera.aspect = width / height;
      const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      state.targetY = config.baseRotation.y + x * 0.055;
      state.targetX = config.baseRotation.x - y * 0.04;
      state.targetZ = 7;
    };

    const handlePointerEnter = () => {
      if (reducedMotion) return;
      state.targetZ = 7;
    };

    const handlePointerLeave = () => {
      state.targetX = config.baseRotation.x;
      state.targetY = config.baseRotation.y;
      state.targetZ = 0;
    };

    const render = () => {
      if (disposed) return;

      state.x += (state.targetX - state.x) * 0.07;
      state.y += (state.targetY - state.y) * 0.07;
      state.z += (state.targetZ - state.z) * 0.07;

      group.rotation.x = state.x;
      group.rotation.y = state.y;
      body.position.z = depth * 0.18 + state.z;
      glow.scale.setScalar(1 + state.z * 0.004);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    observer.observe(button);
    button.addEventListener("pointerenter", handlePointerEnter);
    button.addEventListener("pointermove", handlePointerMove);
    button.addEventListener("pointerleave", handlePointerLeave);

    resize();
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      button.removeEventListener("pointerenter", handlePointerEnter);
      button.removeEventListener("pointermove", handlePointerMove);
      button.removeEventListener("pointerleave", handlePointerLeave);
      disposeGeometry(body);
      disposeGeometry(side);
      disposeGeometry(glow);
      bodyMaterial.dispose();
      sideMaterial.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };
  }, [depth, radius, variant]);

  return (
    <span ref={hostRef} aria-hidden="true" className="three-button-surface pointer-events-none absolute -inset-x-8 -inset-y-7 z-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </span>
  );
}
