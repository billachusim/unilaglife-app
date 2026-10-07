"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CAMPUS } from "@/game/data";
import { lampMat, mat, windowMat } from "./materials";
import { mulberry } from "./textures";

const D = Math.SQRT1_2;
/** Third Mainland Bridge runs along the far side of the lagoon, parallel to the shore. */
const BRIDGE = { center: [-58, -58] as [number, number], length: 300, y: 2.6 };

function InstancedBoxes({
  items,
  material,
  cast = false,
}: {
  items: { p: [number, number, number]; s: [number, number, number]; c?: string; ry?: number }[];
  material: THREE.Material;
  cast?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      m.compose(new THREE.Vector3(...it.p), q.setFromEuler(e.set(0, it.ry ?? 0, 0)), new THREE.Vector3(...it.s));
      ref.current!.setMatrixAt(i, m);
      if (it.c) ref.current!.setColorAt(i, c.set(it.c));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, material, items.length]} castShadow={cast} receiveShadow />;
}

function Bridge() {
  const [cx, cz] = BRIDGE.center;
  const pillars = useMemo(() => {
    const list: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let t = -BRIDGE.length / 2; t <= BRIDGE.length / 2; t += 9) {
      list.push({ p: [cx + t * D, BRIDGE.y / 2 - 0.4, cz - t * D], s: [0.9, BRIDGE.y + 0.4, 0.9] });
    }
    return list;
  }, [cx, cz]);
  const lamps = useMemo(() => {
    const list: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let t = -BRIDGE.length / 2; t <= BRIDGE.length / 2; t += 12) {
      list.push({ p: [cx + t * D + 1.3 * D, BRIDGE.y + 1.6, cz - t * D + 1.3 * D], s: [0.25, 0.25, 0.25] });
    }
    return list;
  }, [cx, cz]);

  const cars = useRef<THREE.InstancedMesh>(null);
  const carGeo = useMemo(() => new THREE.BoxGeometry(1.6, 0.7, 0.8), []);
  const carData = useMemo(() => {
    const rand = mulberry(5);
    return Array.from({ length: 22 }, (_, i) => ({ t: rand() * BRIDGE.length, lane: i % 2 ? 0.75 : -0.75, speed: (i % 2 ? 1 : -1) * (6 + rand() * 5) }));
  }, []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), v: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) }), []);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const palette = ["#f2c230", "#c0392b", "#f4f4f2", "#2563eb", "#1f2937", "#f2c230"];
    carData.forEach((_, i) => cars.current!.setColorAt(i, c.set(palette[i % palette.length])));
    cars.current!.instanceColor!.needsUpdate = true;
  }, [carData]);
  useFrame((_, dt) => {
    carData.forEach((car, i) => {
      car.t = (((car.t + car.speed * dt) % BRIDGE.length) + BRIDGE.length) % BRIDGE.length;
      const t = car.t - BRIDGE.length / 2;
      tmp.v.set(cx + t * D + car.lane * D, BRIDGE.y + 0.75, cz - t * D + car.lane * D);
      tmp.m.compose(tmp.v, tmp.q, tmp.s);
      cars.current!.setMatrixAt(i, tmp.m);
    });
    cars.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[cx, BRIDGE.y, cz]} rotation-y={Math.PI / 4} material={mat("#c9c3b6")} receiveShadow castShadow>
        <boxGeometry args={[BRIDGE.length, 0.7, 4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx + s * 1.9 * D, BRIDGE.y + 0.6, cz + s * 1.9 * D]} rotation-y={Math.PI / 4} material={mat("#e8e2d5")}>
          <boxGeometry args={[BRIDGE.length, 0.5, 0.2]} />
        </mesh>
      ))}
      <InstancedBoxes items={pillars} material={mat("#b3ad9f")} />
      <InstancedBoxes items={lamps} material={lampMat} />
      <instancedMesh ref={cars} args={[carGeo, mat("#ffffff", 0.4, 0.2), carData.length]} />
    </group>
  );
}

/** Mainland skyline beyond the bridge — Ebute Metta, Oworonshoki, Lagos Island haze. */
function Skyline() {
  const { towers, glows } = useMemo(() => {
    const rand = mulberry(99);
    const palette = ["#9aa7b4", "#b9b2a5", "#a6b1a0", "#c2b8aa", "#8d99a8", "#b0a89a"];
    const towers: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    const glows: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let i = 0; i < 70; i++) {
      const t = -130 + rand() * 260;
      const back = 24 + rand() * 40;
      const x = -58 - back * D + t * D;
      const z = -58 - back * D - t * D;
      const w = 3 + rand() * 5;
      const tall = rand() < 0.18;
      const h = tall ? 18 + rand() * 26 : 4 + rand() * 9;
      towers.push({ p: [x, h / 2, z], s: [w, h, w * (0.7 + rand() * 0.6)], c: palette[i % palette.length] });
      if (tall || rand() < 0.5) glows.push({ p: [x + w / 2 + 0.05, h * 0.5, z], s: [0.1, h * 0.8, w * 0.6] });
    }
    return { towers, glows };
  }, []);
  return (
    <group>
      <InstancedBoxes items={towers} material={mat("#ffffff", 0.9)} />
      <InstancedBoxes items={glows} material={windowMat} />
    </group>
  );
}

/** Low houses of Akoka town outside the campus fence. */
function Town() {
  const { walls, roofs } = useMemo(() => {
    const rand = mulberry(17);
    const wallColors = ["#f3ead6", "#ede0c4", "#e6dccb", "#f4e4c8", "#dbe8e0", "#f0dcd2", "#f4ecc2"];
    const walls: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    const roofs: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    const add = (x: number, z: number) => {
      if (z > 4 && z < 12 && x > CAMPUS.maxX) return;
      const w = 2.6 + rand() * 2.4;
      const d = 2.6 + rand() * 2.4;
      const h = 1.8 + (rand() < 0.2 ? 2.2 : 0);
      walls.push({ p: [x, h / 2, z], s: [w, h, d], c: wallColors[Math.floor(rand() * wallColors.length)] });
      roofs.push({ p: [x, h + 0.15, z], s: [w + 0.5, 0.3, d + 0.5], c: rand() < 0.75 ? "#a9b0b4" : "#b8775c" });
    };
    for (let x = CAMPUS.maxX + 7; x < 140; x += 8.5) for (let z = -55; z < 120; z += 8.5) add(x + (rand() - 0.5) * 2, z + (rand() - 0.5) * 2);
    for (let x = -55; x <= CAMPUS.maxX; x += 8.5) for (let z = CAMPUS.maxZ + 7; z < 130; z += 8.5) add(x + (rand() - 0.5) * 2, z + (rand() - 0.5) * 2);
    return { walls, roofs };
  }, []);
  return (
    <group>
      <InstancedBoxes items={walls} material={mat("#ffffff", 0.95)} cast />
      <InstancedBoxes items={roofs} material={mat("#ffffff", 0.6, 0.3)} />
      <mesh position={[100, 0.06, 8]} material={mat("#55595f", 0.9)} receiveShadow>
        <boxGeometry args={[88, 0.06, 4]} />
      </mesh>
    </group>
  );
}

export function Distant() {
  return (
    <group>
      <Bridge />
      <Skyline />
      <Town />
    </group>
  );
}
