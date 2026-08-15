"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface RippleSettings {
  ink1: string;
  ink2: string;
  inkTop: number;
  strength: number;
}

export default function WaterRippleBackground({ settings: s }: { settings: RippleSettings }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let renderer: any, scene: any, camera: any, clock: any;
    let waterBuffers: { current: Float32Array; previous: Float32Array };
    let waterTexture: any, backgroundMaterial: any;
    let autoDropsInterval: ReturnType<typeof setInterval> | null = null;
    let rafId = 0;
    let lastMousePosition = { x: 0, y: 0 };
    let mouseThrottleTime = 0;

    const settings = {
      damping: 0.98,
      tension: 0.02,
      resolution: 512,
      rippleStrength: s.strength,
      mouseIntensity: 0.3,
      clickIntensity: 2.0,
      rippleRadius: 20,
      autoDrops: true,
      autoDropInterval: 3000,
      autoDropIntensity: 1.0,
    };

    const gradientColors = {
      colorA1: [1.0, 1.0, 1.0],
      colorA2: [0.995, 0.994, 0.99],
      colorB1: hexToRgb(s.ink1),
      colorB2: hexToRgb(s.ink2),
    };

    function hexToRgb(hex: string): [number, number, number] {
      const h = hex.replace("#", "");
      const v = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
      return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    }

    function addRipple(x: number, y: number, strength = 1.0) {
      const { resolution, rippleRadius } = settings;
      const normalizedX = x / window.innerWidth;
      const normalizedY = 1.0 - y / window.innerHeight;
      const texX = Math.floor(normalizedX * resolution);
      const texY = Math.floor(normalizedY * resolution);
      const radius = rippleRadius;
      const radiusSquared = radius * radius;
      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const distanceSquared = i * i + j * j;
          if (distanceSquared <= radiusSquared) {
            const posX = texX + i;
            const posY = texY + j;
            if (posX >= 0 && posX < resolution && posY >= 0 && posY < resolution) {
              const index = posY * resolution + posX;
              const distance = Math.sqrt(distanceSquared);
              const rippleValue = Math.cos(((distance / radius) * Math.PI) / 2) * strength;
              waterBuffers.previous[index] += rippleValue;
            }
          }
        }
      }
    }

    function updateWaterSimulation() {
      const { current, previous } = waterBuffers;
      const { damping, tension, resolution } = settings;
      const safeTension = Math.min(tension, 0.05);
      for (let i = 1; i < resolution - 1; i++) {
        for (let j = 1; j < resolution - 1; j++) {
          const index = i * resolution + j;
          const top = previous[index - resolution];
          const bottom = previous[index + resolution];
          const left = previous[index - 1];
          const right = previous[index + 1];
          current[index] = (top + bottom + left + right) / 2 - current[index];
          current[index] = current[index] * damping + previous[index] * (1 - damping);
          current[index] += (0 - previous[index]) * safeTension;
          current[index] = Math.max(-1.0, Math.min(1.0, current[index]));
        }
      }
      [waterBuffers.current, waterBuffers.previous] = [waterBuffers.previous, waterBuffers.current];
      waterTexture.image.data = waterBuffers.current;
      waterTexture.needsUpdate = true;
    }

    function tick() {
      updateWaterSimulation();
      if (backgroundMaterial) {
        backgroundMaterial.uniforms.time.value += clock.getDelta();
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    const init = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(
        -width / 2, width / 2, height / 2, -height / 2, 0.1, 1000
      );
      camera.position.z = 10;
      clock = new THREE.Clock();

      waterBuffers = {
        current: new Float32Array(settings.resolution * settings.resolution),
        previous: new Float32Array(settings.resolution * settings.resolution),
      };
      waterTexture = new THREE.DataTexture(
        waterBuffers.current,
        settings.resolution,
        settings.resolution,
        THREE.RedFormat,
        THREE.FloatType
      );
      waterTexture.minFilter = THREE.LinearFilter;
      waterTexture.magFilter = THREE.LinearFilter;
      waterTexture.needsUpdate = true;

      const uniforms = {
        waterTexture: { value: waterTexture },
        rippleStrength: { value: settings.rippleStrength },
        resolution: { value: new THREE.Vector2(width, height) },
        time: { value: 0 },
        uInkTop: { value: s.inkTop },
        colorA1: { value: new THREE.Vector3(...gradientColors.colorA1) },
        colorA2: { value: new THREE.Vector3(...gradientColors.colorA2) },
        colorB1: { value: new THREE.Vector3(...gradientColors.colorB1) },
        colorB2: { value: new THREE.Vector3(...gradientColors.colorB2) },
      };

      backgroundMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D waterTexture;
          uniform float rippleStrength;
          uniform vec2 resolution;
          uniform float time;
          uniform float uInkTop;
          uniform vec3 colorA1;
          uniform vec3 colorA2;
          uniform vec3 colorB1;
          uniform vec3 colorB2;
          varying vec2 vUv;

          float S(float a, float b, float t) { return smoothstep(a, b, t); }
          mat2 Rot(float a) {
            float s = sin(a);
            float c = cos(a);
            return mat2(c, -s, s, c);
          }
          float noise(vec2 p) {
            vec2 ip = floor(p);
            vec2 fp = fract(p);
            float a = fract(sin(dot(ip, vec2(12.9898, 78.233))) * 43758.5453);
            float b = fract(sin(dot(ip + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
            float c = fract(sin(dot(ip + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
            float d = fract(sin(dot(ip + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
            fp = fp * fp * (3.0 - 2.0 * fp);
            return mix(mix(a, b, fp.x), mix(c, d, fp.x), fp.y);
          }
          void main() {
            float waterHeight = texture2D(waterTexture, vUv).r;
            float step = 1.0 / resolution.x;
            vec2 distortion = vec2(
              texture2D(waterTexture, vec2(vUv.x + step, vUv.y)).r - texture2D(waterTexture, vec2(vUv.x - step, vUv.y)).r,
              texture2D(waterTexture, vec2(vUv.x, vUv.y + step)).r - texture2D(waterTexture, vec2(vUv.x, vUv.y - step)).r
            ) * rippleStrength * 5.0;

            vec2 tuv = vUv + distortion;
            tuv -= 0.5;
            float ratio = resolution.x / resolution.y;
            tuv.y *= 1.0/ratio;

            vec3 layer1 = mix(colorA1, colorA2, S(-0.3, 0.2, (tuv*Rot(radians(-5.0))).x));
            vec3 layer2 = mix(colorB1, colorB2, S(-0.3, 0.2, (tuv*Rot(radians(-5.0))).x));
            float inkMask = S(uInkTop, -0.5, tuv.y);
            vec3 finalComp = mix(layer1, layer2, inkMask);

            float noiseValue = noise(tuv * 20.0 + time * 0.1) * 0.03;
            finalComp += vec3(noiseValue);

            float vignette = 1.0 - smoothstep(0.5, 1.5, length(tuv * 1.5));
            finalComp *= mix(0.95, 1.0, vignette);

            gl_FragColor = vec4(finalComp, 1.0);
          }
        `,
      });

      const geometry = new THREE.PlaneGeometry(width, height);
      scene.add(new THREE.Mesh(geometry, backgroundMaterial));

      const handleMouseMove = (ev: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        const now = performance.now();
        if (now - mouseThrottleTime < 16) return;
        mouseThrottleTime = now;
        const dx = x - lastMousePosition.x;
        const dy = y - lastMousePosition.y;
        if (dx * dx + dy * dy > 5) {
          addRipple(x, y, settings.mouseIntensity);
          lastMousePosition.x = x;
          lastMousePosition.y = y;
        }
      };
      const handleClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        addRipple(e.clientX - rect.left, e.clientY - rect.top, settings.clickIntensity);
      };
      const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.left = -w / 2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = -h / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (backgroundMaterial) backgroundMaterial.uniforms.resolution.value.set(w, h);
        if (scene.children[0] && scene.children[0].geometry) {
          scene.children[0].geometry.dispose();
          scene.children[0].geometry = new THREE.PlaneGeometry(w, h);
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("click", handleClick);
      window.addEventListener("resize", handleResize);

      if (settings.autoDrops) {
        autoDropsInterval = setInterval(() => {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          addRipple(x, y, settings.autoDropIntensity);
        }, settings.autoDropInterval);
      }

      rafId = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("click", handleClick);
        window.removeEventListener("resize", handleResize);
        if (autoDropsInterval) clearInterval(autoDropsInterval);
        cancelAnimationFrame(rafId);
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    };

    const cleanup = init();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }} />;
}
