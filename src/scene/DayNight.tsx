"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DAY } from "@/game/data";
import { useIntro } from "@/game/intro";
import { useGame } from "@/game/store";
import { lampMat, windowMat } from "./materials";

interface Key {
  h: number;
  sky: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  lamps: number;
}

const NIGHT = { sky: "#14244a", sun: "#9db4ff", sunI: 0.75, hemiSky: "#5a6f9f", hemiGround: "#1c2436", hemiI: 0.95, lamps: 1 };

const KEYS: Key[] = [
  { h: 0, ...NIGHT },
  { h: 5, ...NIGHT, sky: "#1b2d57" },
  { h: 6.3, sky: "#f0a878", sun: "#ffb07a", sunI: 1.3, hemiSky: "#f6c6a0", hemiGround: "#4a5a3a", hemiI: 0.95, lamps: 0.5 },
  { h: 7.6, sky: "#a8d4f2", sun: "#ffe3bd", sunI: 2.4, hemiSky: "#cfe6f7", hemiGround: "#6d8a4c", hemiI: 1.05, lamps: 0 },
  { h: 12, sky: "#8cc8f0", sun: "#fff7e8", sunI: 3.0, hemiSky: "#d8ecfa", hemiGround: "#7a9554", hemiI: 1.1, lamps: 0 },
  { h: 17, sky: "#9acbeb", sun: "#ffeac8", sunI: 2.7, hemiSky: "#d2e6f5", hemiGround: "#748f50", hemiI: 1.05, lamps: 0 },
  { h: 18.5, sky: "#f29a6c", sun: "#ff9558", sunI: 2.0, hemiSky: "#f5b993", hemiGround: "#6a6040", hemiI: 1.0, lamps: 0.4 },
  { h: 19.5, sky: "#5b4a7c", sun: "#ff7a59", sunI: 0.9, hemiSky: "#8a7aaa", hemiGround: "#2a2636", hemiI: 0.9, lamps: 1 },
  { h: 20.6, ...NIGHT, sky: "#18284f" },
  { h: 24, ...NIGHT },
];

const ca = new THREE.Color();
const cb = new THREE.Color();
function lerpColor(a: string, b: string, t: number, out: THREE.Color) {
  ca.set(a);
  cb.set(b);
  return out.copy(ca).lerp(cb, t);
}

export function sample(hour: number) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
  return { a, b, t };
}

/** Sun arcs east → west; between dusk and dawn the "sun" light becomes moonlight from the south-west. */
function lightDirection(hour: number, out: THREE.Vector3) {
  if (hour >= 6.2 && hour <= 19.2) {
    const p = (hour - 6.2) / 13;
    const elev = Math.sin(p * Math.PI) * 1.15 + 0.12;
    const az = Math.PI * p;
    out.set(Math.cos(az) * 0.9, Math.sin(elev), 0.45 + Math.sin(az) * 0.25);
  } else {
    out.set(-0.4, 0.9, 0.5);
  }
  return out.normalize();
}

export function DayNight() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const tmp = useMemo(
    () => ({ sky: new THREE.Color(), sun: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color(), dir: new THREE.Vector3() }),
    [],
  );

  useEffect(() => {
    scene.background = new THREE.Color("#8cc8f0");
    scene.fog = new THREE.Fog("#8cc8f0", 150, 330);
    const target = sun.current?.target;
    if (target) scene.add(target);
    return () => {
      if (target) scene.remove(target);
    };
  }, [scene]);

  useFrame(() => {
    const time = useIntro.getState().step === "done" ? (useGame.getState().save?.time ?? 7.3 * 60) : 7.3 * 60;
    const hour = (time % DAY) / 60;
    const { a, b, t } = sample(hour);
    lerpColor(a.sky, b.sky, t, tmp.sky);
    (scene.background as THREE.Color).copy(tmp.sky);
    (scene.fog as THREE.Fog).color.copy(tmp.sky);

    if (sun.current) {
      lerpColor(a.sun, b.sun, t, tmp.sun);
      sun.current.color.copy(tmp.sun);
      sun.current.intensity = a.sunI + (b.sunI - a.sunI) * t;
      lightDirection(hour, tmp.dir);
      sun.current.position.set(tmp.dir.x * 120, tmp.dir.y * 120, tmp.dir.z * 120);
    }
    if (hemi.current) {
      lerpColor(a.hemiSky, b.hemiSky, t, tmp.hs);
      lerpColor(a.hemiGround, b.hemiGround, t, tmp.hg);
      hemi.current.color.copy(tmp.hs);
      hemi.current.groundColor.copy(tmp.hg);
      hemi.current.intensity = a.hemiI + (b.hemiI - a.hemiI) * t;
    }
    const lamps = a.lamps + (b.lamps - a.lamps) * t;
    lampMat.emissiveIntensity = lamps * 1.3;
    windowMat.emissiveIntensity = lamps * 0.85;
  });

  return (
    <>
      <hemisphereLight ref={hemi} intensity={1} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={3}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={85}
        shadow-camera-bottom={-85}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
    </>
  );
}
