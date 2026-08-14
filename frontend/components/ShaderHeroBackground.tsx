"use client";

import { useEffect, useRef } from "react";

export interface ShaderColors {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  base: string;
}

function hexToVec3(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return [0.192, 0.412, 0.267];
  return [
    parseInt(m[1], 16) / 255,
    parseInt(m[2], 16) / 255,
    parseInt(m[3], 16) / 255,
  ];
}

const DEFAULT_COLORS: ShaderColors = {
  color1: "#e8442f",
  color2: "#141414",
  color3: "#f5c9c0",
  color4: "#262626",
  color5: "#ff9c8a",
  color6: "#1c1c1c",
  base: "#141414",
};

export default function ShaderHeroBackground({ colors }: { colors?: Partial<ShaderColors> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<any>(null);
  const colorsRef = useRef<ShaderColors>({ ...DEFAULT_COLORS, ...colors });
  colorsRef.current = { ...DEFAULT_COLORS, ...colors };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let renderer: any = null;
    let raf = 0;
    let touchTexture: any = null;
    let clock: any = null;
    let scene: any = null;
    let camera: any = null;
    let material: any = null;
    let lastTouch: { x: number; y: number } | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const FRAG = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform vec3 uColor4;
      uniform vec3 uColor5;
      uniform vec3 uColor6;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform sampler2D uTouchTexture;
      uniform float uGrainIntensity;
      uniform vec3 uBase;
      uniform float uGradientSize;
      uniform float uGradientCount;
      uniform float uColor1Weight;
      uniform float uColor2Weight;

      varying vec2 vUv;

      float grain(vec2 uv, float time) {
        vec2 grainUv = uv * uResolution * 0.5;
        float g = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
        return g * 2.0 - 1.0;
      }

      vec3 getGradientColor(vec2 uv, float time) {
        float gradientRadius = uGradientSize;

        vec2 center1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
        vec2 center2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
        vec2 center3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
        vec2 center4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
        vec2 center5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
        vec2 center6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);
        vec2 center7 = vec2(0.5 + sin(time * uSpeed * 0.55) * 0.38, 0.5 + cos(time * uSpeed * 0.48) * 0.42);
        vec2 center8 = vec2(0.5 + cos(time * uSpeed * 0.65) * 0.36, 0.5 + sin(time * uSpeed * 0.52) * 0.44);
        vec2 center9 = vec2(0.5 + sin(time * uSpeed * 0.42) * 0.41, 0.5 + cos(time * uSpeed * 0.58) * 0.39);
        vec2 center10 = vec2(0.5 + cos(time * uSpeed * 0.48) * 0.37, 0.5 + sin(time * uSpeed * 0.62) * 0.43);
        vec2 center11 = vec2(0.5 + sin(time * uSpeed * 0.68) * 0.33, 0.5 + cos(time * uSpeed * 0.44) * 0.46);
        vec2 center12 = vec2(0.5 + cos(time * uSpeed * 0.38) * 0.39, 0.5 + sin(time * uSpeed * 0.56) * 0.41);

        float dist1 = length(uv - center1);
        float dist2 = length(uv - center2);
        float dist3 = length(uv - center3);
        float dist4 = length(uv - center4);
        float dist5 = length(uv - center5);
        float dist6 = length(uv - center6);
        float dist7 = length(uv - center7);
        float dist8 = length(uv - center8);
        float dist9 = length(uv - center9);
        float dist10 = length(uv - center10);
        float dist11 = length(uv - center11);
        float dist12 = length(uv - center12);

        float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
        float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
        float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
        float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
        float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
        float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
        float influence7 = 1.0 - smoothstep(0.0, gradientRadius, dist7);
        float influence8 = 1.0 - smoothstep(0.0, gradientRadius, dist8);
        float influence9 = 1.0 - smoothstep(0.0, gradientRadius, dist9);
        float influence10 = 1.0 - smoothstep(0.0, gradientRadius, dist10);
        float influence11 = 1.0 - smoothstep(0.0, gradientRadius, dist11);
        float influence12 = 1.0 - smoothstep(0.0, gradientRadius, dist12);

        vec2 rotatedUv1 = uv - 0.5;
        float angle1 = time * uSpeed * 0.15;
        rotatedUv1 = vec2(
          rotatedUv1.x * cos(angle1) - rotatedUv1.y * sin(angle1),
          rotatedUv1.x * sin(angle1) + rotatedUv1.y * cos(angle1)
        );
        rotatedUv1 += 0.5;

        vec2 rotatedUv2 = uv - 0.5;
        float angle2 = -time * uSpeed * 0.12;
        rotatedUv2 = vec2(
          rotatedUv2.x * cos(angle2) - rotatedUv2.y * sin(angle2),
          rotatedUv2.x * sin(angle2) + rotatedUv2.y * cos(angle2)
        );
        rotatedUv2 += 0.5;

        float radialGradient1 = length(rotatedUv1 - 0.5);
        float radialGradient2 = length(rotatedUv2 - 0.5);
        float radialInfluence1 = 1.0 - smoothstep(0.0, 0.8, radialGradient1);
        float radialInfluence2 = 1.0 - smoothstep(0.0, 0.8, radialGradient2);

        vec3 color = vec3(0.0);
        color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
        color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
        color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
        color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
        color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
        color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;

        if (uGradientCount > 6.0) {
          color += uColor1 * influence7 * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uColor1Weight;
          color += uColor2 * influence8 * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uColor2Weight;
          color += uColor3 * influence9 * (0.55 + 0.45 * sin(time * uSpeed * 1.6)) * uColor1Weight;
          color += uColor4 * influence10 * (0.55 + 0.45 * cos(time * uSpeed * 1.7)) * uColor2Weight;
        }
        if (uGradientCount > 10.0) {
          color += uColor5 * influence11 * (0.55 + 0.45 * sin(time * uSpeed * 1.8)) * uColor1Weight;
          color += uColor6 * influence12 * (0.55 + 0.45 * cos(time * uSpeed * 1.9)) * uColor2Weight;
        }

        color += mix(uColor1, uColor3, radialInfluence1) * 0.35 * uColor1Weight;
        color += mix(uColor2, uColor4, radialInfluence2) * 0.32 * uColor2Weight;

        color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;

        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(luminance), color, 1.25);

        color = pow(color, vec3(0.94));

        float brightness1 = length(color);
        float mixFactor1 = max(brightness1 * 1.2, 0.12);
        color = mix(uBase, color, mixFactor1);

        float maxBrightness = 1.0;
        float brightness = length(color);
        if (brightness > maxBrightness) {
          color = color * (maxBrightness / brightness);
        }

        return color;
      }

      void main() {
        vec2 uv = vUv;
        vec4 touchTex = texture2D(uTouchTexture, uv);
        float vx = -(touchTex.r * 2.0 - 1.0);
        float vy = -(touchTex.g * 2.0 - 1.0);
        float intensity = touchTex.b;
        uv.x += vx * 0.8 * intensity;
        uv.y += vy * 0.8 * intensity;

        vec2 center = vec2(0.5);
        float dist = length(uv - center);
        float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
        float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
        uv += vec2(ripple + wave);

        vec3 color = getGradientColor(uv, uTime);
        color += grain(uv, uTime) * uGrainIntensity;

        float timeShift = uTime * 0.5;
        color.r += sin(timeShift) * 0.02;
        color.g += cos(timeShift * 1.4) * 0.02;
        color.b += sin(timeShift * 1.2) * 0.02;

        float brightness2 = length(color);
        float mixFactor2 = max(brightness2 * 1.2, 0.12);
        color = mix(uBase, color, mixFactor2);

        color = clamp(color, vec3(0.0), vec3(1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    import("three").then((THREE) => {
      if (disposed || !container) return;

      const THREE_LIB = (THREE as any).default ?? THREE;

      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;

      renderer = new THREE_LIB.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      camera = new THREE_LIB.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      scene = new THREE_LIB.Scene();

      // touch texture (mouse/touch ripple trail)
      const TEX_SIZE = 64;
      const touchCanvas = document.createElement("canvas");
      touchCanvas.width = touchCanvas.height = TEX_SIZE;
      const tctx = touchCanvas.getContext("2d")!;
      tctx.fillStyle = "black";
      tctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
      const texture = new THREE_LIB.Texture(touchCanvas);
      const trail: Array<{ x: number; y: number; age: number; force: number; vx: number; vy: number }> = [];
      const MAX_AGE = 64;

      const drawPoint = (p: any) => {
        const pos = { x: p.x * TEX_SIZE, y: (1 - p.y) * TEX_SIZE };
        let intensity = 1;
        if (p.age < MAX_AGE * 0.3) {
          intensity = Math.sin((p.age / (MAX_AGE * 0.3)) * (Math.PI / 2));
        } else {
          const t = 1 - (p.age - MAX_AGE * 0.3) / (MAX_AGE * 0.7);
          intensity = -t * (t - 2);
        }
        intensity *= p.force;
        const radius = 0.25 * TEX_SIZE;
        const color = `${(((p.vx + 1) / 2) * 255) | 0}, ${(((p.vy + 1) / 2) * 255) | 0}, ${Math.min(255, (intensity * 255) | 0)}`;
        const offset = TEX_SIZE * 5;
        tctx.shadowOffsetX = offset;
        tctx.shadowOffsetY = offset;
        tctx.shadowBlur = radius;
        tctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
        tctx.beginPath();
        tctx.fillStyle = "rgba(255,0,0,1)";
        tctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
        tctx.fill();
      };

      const updateTrail = () => {
        tctx.fillStyle = "black";
        tctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
        for (let i = trail.length - 1; i >= 0; i--) {
          const p = trail[i];
          const speed = 1 / MAX_AGE;
          const f = p.force * speed * (1 - p.age / MAX_AGE);
          p.x += p.vx * f;
          p.y += p.vy * f;
          p.age++;
          if (p.age > MAX_AGE) trail.splice(i, 1);
          else drawPoint(p);
        }
        texture.needsUpdate = true;
      };

      material = new THREE_LIB.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE_LIB.Vector2(width, height) },
          uColor1: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color1)) },
          uColor2: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color2)) },
          uColor3: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color3)) },
          uColor4: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color4)) },
          uColor5: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color5)) },
          uColor6: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.color6)) },
          uSpeed: { value: 1.1 },
          uIntensity: { value: 1.3 },
          uTouchTexture: { value: texture },
          uGrainIntensity: { value: 0.05 },
          uBase: { value: new THREE_LIB.Vector3(...hexToVec3(colorsRef.current.base)) },
          uGradientSize: { value: 0.85 },
          uGradientCount: { value: 12.0 },
          uColor1Weight: { value: 1.0 },
          uColor2Weight: { value: 1.3 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
          }
        `,
        fragmentShader: FRAG,
      });
      materialRef.current = material;

      const mesh = new THREE_LIB.Mesh(new THREE_LIB.PlaneGeometry(2, 2), material);
      scene.add(mesh);

      clock = new THREE_LIB.Clock();

      const tick = () => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.1);
        material.uniforms.uTime.value += delta;
        updateTrail();
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      const onMove = (clientX: number, clientY: number) => {
        const rect = container.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width;
        const y = 1 - (clientY - rect.top) / rect.height;
        let vx = 0, vy = 0, force = 0;
        if (lastTouch) {
          const dx = x - lastTouch.x;
          const dy = y - lastTouch.y;
          if (dx !== 0 || dy !== 0) {
            const d = Math.hypot(dx, dy);
            vx = dx / d;
            vy = dy / d;
            force = Math.min((dx * dx + dy * dy) * 20000, 2.0);
          }
        }
        lastTouch = { x, y };
        if (force > 0) trail.push({ x, y, age: 0, force, vx, vy });
      };

      const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
      const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (t) onMove(t.clientX, t.clientY);
      };
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("touchmove", onTouchMove, { passive: true });

      resizeObserver = new ResizeObserver(() => {
        if (!renderer || !material) return;
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h);
        material.uniforms.uResolution.value.set(w, h);
      });
      resizeObserver.observe(container);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      if (container) {
        // listeners removed implicitly with container; but remove renderer canvas
      }
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  useEffect(() => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uColor1.value.set(...hexToVec3(colorsRef.current.color1));
    mat.uniforms.uColor2.value.set(...hexToVec3(colorsRef.current.color2));
    mat.uniforms.uColor3.value.set(...hexToVec3(colorsRef.current.color3));
    mat.uniforms.uColor4.value.set(...hexToVec3(colorsRef.current.color4));
    mat.uniforms.uColor5.value.set(...hexToVec3(colorsRef.current.color5));
    mat.uniforms.uColor6.value.set(...hexToVec3(colorsRef.current.color6));
    mat.uniforms.uBase.value.set(...hexToVec3(colorsRef.current.base));
  }, [colors]);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden="true" />;
}
