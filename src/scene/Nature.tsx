"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ACTIONS } from "@/game/actions";
import { BILLBOARDS, PLACES, PROMENADE, ROADS, type Vec2 } from "@/game/data";
import { isBlocked } from "@/game/nav";
import { mulberry } from "./textures";

interface TreeSpot {
  x: number;
  z: number;
  s: number;
  rot: number;
  tilt: number;
}

const KEEP_CLEAR: Vec2[] = [
  ...Object.values(PLACES).map((p) => p.door),
  ...ACTIONS.filter((a) => a.stage).map((a) => a.stage as Vec2),
  ...BILLBOARDS.map((b) => b.pos),
];

function onRoad(x: number, z: number, margin: number) {
  return ROADS.some((r) => {
    const x0 = Math.min(r.from[0], r.to[0]) - r.w / 2 - margin;
    const x1 = Math.max(r.from[0], r.to[0]) + r.w / 2 + margin;
    const z0 = Math.min(r.from[1], r.to[1]) - r.w / 2 - margin;
    const z1 = Math.max(r.from[1], r.to[1]) + r.w / 2 + margin;
    return x > x0 && x < x1 && z > z0 && z < z1;
  });
}

function onPromenade(x: number, z: number, margin: number) {
  const d = Math.SQRT1_2;
  const px = x - PROMENADE.center[0];
  const pz = z - PROMENADE.center[1];
  const along = px * d - pz * d;
  const across = px * d + pz * d;
  return Math.abs(along) < PROMENADE.length / 2 + margin && Math.abs(across) < PROMENADE.width / 2 + margin;
}

function spotOk(x: number, z: number, taken: TreeSpot[], spacing: number, roadMargin = 1.2) {
  if (isBlocked(x, z)) return false;
  if (onRoad(x, z, roadMargin)) return false;
  if (onPromenade(x, z, 0.6)) return false;
  if (x > 11.5 && x < 40.5 && z > 18 && z < 38) return false;
  if (x > 28 && x < 36 && z > -6 && z < 4) return false;
  if (KEEP_CLEAR.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < 3)) return false;
  return !taken.some((t) => Math.hypot(t.x - x, t.z - z) < spacing);
}

function useSpots() {
  return useMemo(() => {
    const rand = mulberry(42);
    const palms: TreeSpot[] = [];
    const round: TreeSpot[] = [];
    const bushes: TreeSpot[] = [];
    const palm = (x: number, z: number) => {
      if (spotOk(x, z, palms, 2.5, 0.2)) palms.push({ x, z, s: 0.85 + rand() * 0.35, rot: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.25 });
    };
    for (let x = -30; x <= 50; x += 6) {
      palm(x + 1.5, 3.2);
      palm(x + 4.5, 12.8);
    }
    for (let z = -28; z <= 44; z += 6.5) {
      palm(3.4, z);
      palm(12.6, z + 3);
    }
    for (let t = -11; t <= 11; t += 3.6) {
      const d = Math.SQRT1_2;
      palm(PROMENADE.center[0] + t * d + 3.9 * d, PROMENADE.center[1] - t * d + 3.9 * d);
    }
    const all = () => [...palms, ...round];
    for (let i = 0; i < 900 && round.length < 95; i++) {
      const x = -40 + rand() * 94;
      const z = -40 + rand() * 86;
      if (spotOk(x, z, all(), 3.2)) round.push({ x, z, s: 0.75 + rand() * 0.6, rot: rand() * Math.PI * 2, tilt: 0 });
    }
    for (let i = 0; i < 900 && bushes.length < 80; i++) {
      const x = -40 + rand() * 94;
      const z = -40 + rand() * 86;
      if (spotOk(x, z, [...all(), ...bushes], 1.6, 0.4)) bushes.push({ x, z, s: 0.5 + rand() * 0.45, rot: rand() * Math.PI * 2, tilt: 0 });
    }
    return { palms, round, bushes };
  }, []);
}

function Instanced({
  geometry,
  material,
  spots,
  place,
  colors,
  cast = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  spots: TreeSpot[];
  place: (s: TreeSpot, m: THREE.Matrix4) => void;
  colors?: string[];
  cast?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      place(s, m);
      ref.current!.setMatrixAt(i, m);
      if (colors) ref.current!.setColorAt(i, c.set(colors[i % colors.length]));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, [spots, place, colors]);
  return <instancedMesh ref={ref} args={[geometry, material, spots.length]} castShadow={cast} receiveShadow />;
}

const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();

export function Nature() {
  const { palms, round, bushes } = useSpots();

  const geo = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 1.8, 6);
    trunk.translate(0, 0.9, 0);
    const canopy = new THREE.IcosahedronGeometry(1.45, 1);
    canopy.translate(0, 2.9, 0);
    const palmTrunk = new THREE.CylinderGeometry(0.13, 0.22, 5.4, 6, 4);
    palmTrunk.translate(0, 2.7, 0);
    const leaves: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.ConeGeometry(0.42, 2.8, 3);
      leaf.scale(0.18, 1, 1);
      leaf.rotateZ(-Math.PI / 2);
      leaf.translate(1.35, 0, 0);
      leaf.rotateZ(-0.38);
      leaf.rotateY((i / 8) * Math.PI * 2 + (i % 2) * 0.2);
      leaves.push(leaf.index ? leaf.toNonIndexed() : leaf);
    }
    const crown = mergeGeometries(leaves)!;
    crown.translate(0, 5.35, 0);
    const bush = new THREE.IcosahedronGeometry(0.75, 0);
    bush.translate(0, 0.45, 0);
    return { trunk, canopy, palmTrunk, crown, bush };
  }, []);

  const mats = useMemo(
    () => ({
      bark: new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 1, flatShading: true }),
      palmBark: new THREE.MeshStandardMaterial({ color: "#8a6a48", roughness: 1, flatShading: true }),
      leaf: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }),
      frond: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, flatShading: true, side: THREE.DoubleSide }),
    }),
    [],
  );

  const placeUpright = useMemo(
    () => (s: TreeSpot, m: THREE.Matrix4) => m.compose(v.set(s.x, 0, s.z), q.setFromEuler(e.set(0, s.rot, 0)), sc.set(s.s, s.s, s.s)),
    [],
  );
  const placePalm = useMemo(
    () => (s: TreeSpot, m: THREE.Matrix4) => m.compose(v.set(s.x, 0, s.z), q.setFromEuler(e.set(s.tilt, s.rot, s.tilt * 0.6)), sc.set(s.s, s.s, s.s)),
    [],
  );

  return (
    <group>
      <Instanced geometry={geo.trunk} material={mats.bark} spots={round} place={placeUpright} />
      <Instanced geometry={geo.canopy} material={mats.leaf} spots={round} place={placeUpright} colors={["#4f8f3a", "#5c9e40", "#3f7f35", "#6aa84f", "#47883c"]} />
      <Instanced geometry={geo.palmTrunk} material={mats.palmBark} spots={palms} place={placePalm} />
      <Instanced geometry={geo.crown} material={mats.frond} spots={palms} place={placePalm} colors={["#4e9a3c", "#5aa845", "#43893a"]} />
      <Instanced geometry={geo.bush} material={mats.leaf} spots={bushes} place={placeUpright} colors={["#5a9a3e", "#4c8a36", "#6aa84f", "#7aa83f"]} cast={false} />
    </group>
  );
}
