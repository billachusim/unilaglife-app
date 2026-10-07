"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { CAMPUS, JETTY, LAND, PROMENADE, ROADS, ROUNDABOUT } from "@/game/data";
import { lampMat, mat } from "./materials";
import { asphaltTexture, grassTexture, waterNormalTexture } from "./textures";

function landShape(points: [number, number][], scale = 1, cx = 0, cz = 0) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    const px = cx + (x - cx) * scale;
    const pz = cz + (z - cz) * scale;
    // Shape lives in XY; rotating -90° about X maps shape Y to world -Z.
    if (i === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  });
  return shape;
}

function Land() {
  const { grass, sand } = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(landShape(LAND), { depth: 1.2, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -1.2, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 200, pos.getZ(i) / 200);
    const s = new THREE.ExtrudeGeometry(landShape(LAND, 1.035, 60, 60), { depth: 1.2, bevelEnabled: false });
    s.rotateX(-Math.PI / 2);
    s.translate(0, -1.32, 0);
    return { grass: g, sand: s };
  }, []);

  const grassMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#ffffff", map: grassTexture(), roughness: 0.95 });
    return m;
  }, []);

  return (
    <>
      <mesh geometry={grass} material={grassMat} receiveShadow position={[0, 0, 0]} />
      <mesh geometry={sand} material={mat("#d9c497", 1)} receiveShadow />
    </>
  );
}

function Lagoon() {
  const material = useMemo(() => {
    const normal = waterNormalTexture();
    return new THREE.MeshStandardMaterial({
      color: "#2c6f86",
      roughness: 0.12,
      metalness: 0.15,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      transparent: true,
      opacity: 0.94,
    });
  }, []);
  useFrame((_, dt) => {
    const n = material.normalMap!;
    n.offset.x += dt * 0.012;
    n.offset.y += dt * 0.007;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.45, 0]} material={material} receiveShadow>
      <planeGeometry args={[1400, 1400]} />
    </mesh>
  );
}

/** Akoka town just outside the fence — duller ground so the campus reads as its own place. */
function TownGround() {
  const m = mat("#b9b08f", 1);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[CAMPUS.maxX + 82, 0.01, 82]} material={m} receiveShadow>
        <planeGeometry args={[164, 284]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-3, 0.01, CAMPUS.maxZ + 86]} material={m} receiveShadow>
        <planeGeometry args={[118, 172]} />
      </mesh>
    </>
  );
}

function Roads() {
  const asphalt = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.9, color: "#ffffff" });
    return m;
  }, []);
  const curb = mat("#cfc8b8", 0.9);
  const dash = mat("#f3efe2", 0.6);

  const dashes = useMemo(() => {
    const list: { x: number; z: number; horizontal: boolean }[] = [];
    for (const r of ROADS) {
      if (r.w < 3.4) continue;
      const horizontal = r.from[1] === r.to[1];
      const len = horizontal ? Math.abs(r.to[0] - r.from[0]) : Math.abs(r.to[1] - r.from[1]);
      for (let d = 1; d < len - 1; d += 3) {
        const x = horizontal ? Math.min(r.from[0], r.to[0]) + d : r.from[0];
        const z = horizontal ? r.from[1] : Math.min(r.from[1], r.to[1]) + d;
        if (Math.hypot(x - ROUNDABOUT.center[0], z - ROUNDABOUT.center[1]) < ROUNDABOUT.radius + 3) continue;
        list.push({ x, z, horizontal });
      }
    }
    return list;
  }, []);

  return (
    <group>
      {ROADS.map((r, i) => {
        const horizontal = r.from[1] === r.to[1];
        const len = horizontal ? Math.abs(r.to[0] - r.from[0]) : Math.abs(r.to[1] - r.from[1]);
        const cx = (r.from[0] + r.to[0]) / 2;
        const cz = (r.from[1] + r.to[1]) / 2;
        const sx = horizontal ? len + r.w : r.w;
        const sz = horizontal ? r.w : len + r.w;
        return (
          <group key={i}>
            <mesh position={[cx, 0.03, cz]} material={curb} receiveShadow>
              <boxGeometry args={[sx + 0.7, 0.06, sz + 0.7]} />
            </mesh>
            <mesh position={[cx, 0.07, cz]} material={asphalt} receiveShadow>
              <boxGeometry args={[sx, 0.04, sz]} />
            </mesh>
          </group>
        );
      })}
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0.095, d.z]} material={dash}>
          <boxGeometry args={d.horizontal ? [1.2, 0.01, 0.14] : [0.14, 0.01, 1.2]} />
        </mesh>
      ))}
      <Roundabout />
    </group>
  );
}

function Roundabout() {
  const [x, z] = ROUNDABOUT.center;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.14, 0]} material={mat("#d8d2c4")} castShadow receiveShadow>
        <cylinderGeometry args={[ROUNDABOUT.radius, ROUNDABOUT.radius, 0.2, 40]} />
      </mesh>
      <mesh position={[0, 0.26, 0]} material={mat("#6aa84f", 1)} receiveShadow>
        <cylinderGeometry args={[ROUNDABOUT.radius - 0.35, ROUNDABOUT.radius - 0.35, 0.06, 40]} />
      </mesh>
      {/* Clock tower */}
      <mesh position={[0, 2.4, 0]} material={mat("#e9e1cf")} castShadow>
        <boxGeometry args={[1.1, 4.4, 1.1]} />
      </mesh>
      <mesh position={[0, 4.95, 0]} material={mat("#1d3a6e", 0.6)} castShadow>
        <coneGeometry args={[0.95, 1.2, 4]} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
        <group key={r} rotation-y={r}>
          <mesh position={[0, 3.9, 0.56]} material={mat("#fbfaf4", 0.4)}>
            <circleGeometry args={[0.38, 24]} />
          </mesh>
          <mesh position={[0.08, 3.98, 0.57]} rotation-z={-0.9} material={mat("#1f1f1f")}>
            <planeGeometry args={[0.04, 0.26]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Promenade() {
  const [cx, cz] = PROMENADE.center;
  const rail = mat("#e8e4da", 0.6);
  const posts = useMemo(() => {
    const list: [number, number][] = [];
    for (let d = -PROMENADE.length / 2; d <= PROMENADE.length / 2; d += 1.6) list.push([d, -PROMENADE.width / 2 + 0.15]);
    return list;
  }, []);
  return (
    <group position={[cx, 0, cz]} rotation-y={Math.PI / 4}>
      {/* rotation +45° maps local +X to world (+x, -z) direction, i.e. along the shoreline */}
      <mesh position={[0, 0.06, 0]} material={mat("#d4c6a8", 0.95)} receiveShadow>
        <boxGeometry args={[PROMENADE.length, 0.12, PROMENADE.width]} />
      </mesh>
      {/* Railing on the water side */}
      <mesh position={[0, 0.95, -PROMENADE.width / 2 + 0.15]} material={rail} castShadow>
        <boxGeometry args={[PROMENADE.length, 0.08, 0.08]} />
      </mesh>
      <mesh position={[0, 0.6, -PROMENADE.width / 2 + 0.15]} material={rail}>
        <boxGeometry args={[PROMENADE.length, 0.05, 0.05]} />
      </mesh>
      {posts.map(([d, w], i) => (
        <mesh key={i} position={[d, 0.5, w]} material={rail} castShadow>
          <boxGeometry args={[0.09, 0.9, 0.09]} />
        </mesh>
      ))}
    </group>
  );
}

function Jetty() {
  const [fx, fz] = JETTY.from;
  const d = Math.SQRT1_2;
  const cx = fx - d * (JETTY.length / 2);
  const cz = fz - d * (JETTY.length / 2);
  const wood = mat("#8a5a36", 0.9);
  const planks = useMemo(() => Array.from({ length: Math.floor(JETTY.length / 0.5) }, (_, i) => -JETTY.length / 2 + i * 0.5 + 0.25), []);
  return (
    <group position={[cx, 0, cz]} rotation-y={-Math.PI / 4}>
      {/* local +X is along the jetty, pointing out over the water */}
      {planks.map((p, i) => (
        <mesh key={i} position={[-p, 0.18, 0]} material={i % 3 === 0 ? mat("#7a4e2e", 0.9) : wood} castShadow receiveShadow>
          <boxGeometry args={[0.44, 0.12, JETTY.width]} />
        </mesh>
      ))}
      {[-JETTY.length / 2 + 0.4, 0, JETTY.length / 2 - 0.4].flatMap((p) =>
        [-1, 1].map((s) => (
          <mesh key={`${p}${s}`} position={[p, -0.3, s * (JETTY.width / 2 - 0.1)]} material={mat("#5e3c22")}>
            <cylinderGeometry args={[0.12, 0.12, 1.2, 8]} />
          </mesh>
        )),
      )}
      <Canoe position={[2, -0.32, 2.4]} />
    </group>
  );
}

function Canoe({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-y={0.3}>
      <mesh scale={[2.2, 0.35, 0.55]} material={mat("#a34a2a", 0.8)} castShadow>
        <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} scale={[2.0, 0.45, 1]} material={mat("#5b2b18")}>
        <circleGeometry args={[1, 20]} />
      </mesh>
    </group>
  );
}

/** Campus fence along the east and south boundary, open at the main gate. */
function Fence() {
  const m = mat("#e6dfcf", 0.9);
  const top = mat("#1d3a6e", 0.7);
  const segs: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [CAMPUS.maxX, 0.9, -28.2], size: [0.4, 1.8, 63.6] },
    { pos: [CAMPUS.maxX, 0.9, 30.2], size: [0.4, 1.8, 35.6] },
    { pos: [-3.5, 0.9, CAMPUS.maxZ], size: [119, 1.8, 0.4] },
  ];
  return (
    <group>
      {segs.map((s, i) => (
        <group key={i}>
          <mesh position={s.pos} material={m} castShadow receiveShadow>
            <boxGeometry args={s.size} />
          </mesh>
          <mesh position={[s.pos[0], 1.85, s.pos[2]]} material={top}>
            <boxGeometry args={[s.size[0] + 0.08, 0.12, s.size[2] + 0.08]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const LAMP_SPOTS: [number, number][] = (() => {
  const spots: [number, number][] = [];
  for (let x = -30; x <= 48; x += 9) if (Math.abs(x - 8) > 3) spots.push([x, x % 2 === 0 ? 5.2 : 10.8]);
  for (let z = -26; z <= 40; z += 9) if (Math.abs(z - 8) > 5) spots.push([5.2, z]);
  for (let x = -26; x <= 28; x += 10) spots.push([x, -10.4]);
  spots.push([-27.5, -16.2], [-22, -21.6], [-18.4, -25.4]);
  return spots;
})();

function StreetLamps() {
  const pole = mat("#3a3f45", 0.5, 0.4);
  return (
    <group>
      {LAMP_SPOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.9, 0]} material={pole} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 3.8, 6]} />
          </mesh>
          <mesh position={[0, 3.85, 0]} material={lampMat}>
            <sphereGeometry args={[0.2, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Terrain() {
  return (
    <group>
      <Lagoon />
      <Land />
      <TownGround />
      <Roads />
      <Promenade />
      <Jetty />
      <Fence />
      <StreetLamps />
    </group>
  );
}
