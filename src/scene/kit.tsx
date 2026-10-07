"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mat, windowMat } from "./materials";
import { signTexture } from "./textures";

type V3 = [number, number, number];

export function B({
  p,
  s,
  c,
  r = 0.85,
  metal = 0,
  rot,
  cast = true,
  receive = true,
  material,
}: {
  p: V3;
  s: V3;
  c?: string;
  r?: number;
  metal?: number;
  rot?: V3;
  cast?: boolean;
  receive?: boolean;
  material?: THREE.Material;
}) {
  return (
    <mesh position={p} rotation={rot} material={material ?? mat(c ?? "#cccccc", r, metal)} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={s} />
    </mesh>
  );
}

export function Cyl({ p, r, h, c, seg = 16, rough = 0.8, cast = true }: { p: V3; r: number | [number, number]; h: number; c: string; seg?: number; rough?: number; cast?: boolean }) {
  const [rt, rb] = Array.isArray(r) ? r : [r, r];
  return (
    <mesh position={p} material={mat(c, rough)} castShadow={cast} receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
    </mesh>
  );
}

/** A sign plane. `face` is the direction it looks: +z (default) or +x / -x. */
export function Sign({
  p,
  w,
  h,
  text,
  bg,
  fg = "#ffffff",
  face = "z",
  rot,
}: {
  p: V3;
  w: number;
  h: number;
  text: string;
  bg: string;
  fg?: string;
  face?: "z" | "x" | "-x";
  rot?: number;
}) {
  const tex = signTexture(text, bg, fg, 1024, Math.round((1024 * h) / w));
  const rotY = rot ?? (face === "x" ? Math.PI / 2 : face === "-x" ? -Math.PI / 2 : 0);
  return (
    <mesh position={p} rotation-y={rotY}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  );
}

/**
 * Window grid on the two faces the isometric camera can see (+z and +x).
 * Shares one glowing material so every window lights up at dusk.
 */
export function Windows({
  x0,
  x1,
  z0,
  z1,
  y0,
  floors,
  floorH,
  colsZ,
  colsX,
  w = 0.7,
  h = 1.1,
  inset = 0.04,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  floors: number;
  floorH: number;
  colsZ: number;
  colsX: number;
  w?: number;
  h?: number;
  inset?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = floors * (colsZ + colsX);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    let i = 0;
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * floorH + floorH / 2;
      for (let c = 0; c < colsZ; c++) {
        const x = x0 + ((c + 0.5) * (x1 - x0)) / colsZ;
        m.compose(pos.set(x, y, z1 + inset), q, scl.set(w, h, 0.08));
        ref.current!.setMatrixAt(i++, m);
      }
      for (let c = 0; c < colsX; c++) {
        const z = z0 + ((c + 0.5) * (z1 - z0)) / colsX;
        m.compose(pos.set(x1 + inset, y, z), q, scl.set(0.08, h, w));
        ref.current!.setMatrixAt(i++, m);
      }
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [x0, x1, z0, z1, y0, floors, floorH, colsZ, colsX, w, h, inset]);
  return <instancedMesh ref={ref} args={[geo, windowMat, count]} />;
}

export function Car({ p, color, rotY = 0 }: { p: V3; color: string; rotY?: number }) {
  return (
    <group position={p} rotation-y={rotY}>
      <B p={[0, 0.45, 0]} s={[2.1, 0.55, 1.0]} c={color} r={0.35} metal={0.3} />
      <B p={[-0.1, 0.92, 0]} s={[1.15, 0.45, 0.9]} material={windowMat} />
      {[
        [0.7, 0.42],
        [-0.7, 0.42],
        [0.7, -0.42],
        [-0.7, -0.42],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]} rotation-x={Math.PI / 2} material={mat("#1b1b1b", 0.9)}>
          <cylinderGeometry args={[0.2, 0.2, 0.18, 12]} />
        </mesh>
      ))}
    </group>
  );
}

export function Umbrella({ p, color }: { p: V3; color: string }) {
  return (
    <group position={p}>
      <Cyl p={[0, 1.1, 0]} r={0.04} h={2.2} c="#ddd" seg={6} />
      <mesh position={[0, 2.25, 0]} material={mat(color, 0.7)} castShadow>
        <coneGeometry args={[1.25, 0.55, 8]} />
      </mesh>
    </group>
  );
}

export function Bench({ p, rotY = 0 }: { p: V3; rotY?: number }) {
  return (
    <group position={p} rotation-y={rotY}>
      <B p={[0, 0.42, 0]} s={[1.6, 0.08, 0.45]} c="#8a5a36" />
      <B p={[0, 0.72, -0.2]} s={[1.6, 0.4, 0.06]} c="#8a5a36" />
      <B p={[-0.65, 0.2, 0]} s={[0.08, 0.4, 0.4]} c="#3a3f45" />
      <B p={[0.65, 0.2, 0]} s={[0.08, 0.4, 0.4]} c="#3a3f45" />
    </group>
  );
}

export function PlasticTable({ p, color = "#f4f4f2" }: { p: V3; color?: string }) {
  return (
    <group position={p}>
      <Cyl p={[0, 0.72, 0]} r={0.55} h={0.06} c={color} seg={18} />
      <Cyl p={[0, 0.36, 0]} r={0.06} h={0.72} c={color} seg={6} />
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <group key={a} position={[Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85]} rotation-y={a}>
          <B p={[0, 0.42, 0]} s={[0.42, 0.06, 0.42]} c={a === 0 ? "#b23a48" : "#1d3a6e"} />
          <B p={[0, 0.68, 0.2]} s={[0.42, 0.5, 0.05]} c={a === 0 ? "#b23a48" : "#1d3a6e"} />
        </group>
      ))}
    </group>
  );
}
