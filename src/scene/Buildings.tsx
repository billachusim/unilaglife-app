"use client";

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { type ReactNode, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlaceId } from "@/game/data";
import { goToPlace } from "@/game/interaction";
import { gate } from "@/game/intro";
import { B, Bench, Car, Cyl, PlasticTable, Sign, Umbrella, Windows } from "./kit";
import { lampMat, mat, windowMat } from "./materials";
import { flagTexture, pitchTexture, zincTexture } from "./textures";

const NAVY = "#1d3a6e";
const CREAM = "#efe7d6";

export function Pick({ id, children }: { id: PlaceId; children: ReactNode }) {
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        goToPlace(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function Senate() {
  const fins = useMemo(() => {
    const list: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (let k = 0; k <= 7; k++) list.push({ p: [16 + (k * 8) / 7, 17.4, 0.95], s: [0.22, 24, 0.45] });
    for (let k = 0; k <= 5; k++) list.push({ p: [24.2, 17.4, -4.75 + (k * 5.5) / 5], s: [0.45, 24, 0.22] });
    return list;
  }, []);
  const flag = flagTexture();
  return (
    <Pick id="senate">
      <B p={[20, 0.6, -1.5]} s={[14, 1.2, 7]} c="#d6c9ac" />
      <B p={[20, 0.2, 2.5]} s={[6, 0.4, 1]} c="#ddd2b8" />
      <B p={[20, 0.6, 2.25]} s={[6, 0.4, 0.5]} c="#ddd2b8" />
      <B p={[20, 3.2, -1.5]} s={[11.6, 4, 5.6]} material={windowMat} />
      {Array.from({ length: 9 }, (_, i) => (
        <B key={i} p={[14.6 + i * 1.35, 3.2, 1.45]} s={[0.35, 4, 0.35]} c={CREAM} />
      ))}
      <B p={[20, 5.35, -1.5]} s={[12.6, 0.3, 6.6]} c="#cbbd9f" />
      <B p={[20, 17.4, -2]} s={[8, 24, 5.5]} c="#e7dcc4" />
      <Windows x0={16} x1={24} z0={-4.75} z1={0.75} y0={5.8} floors={11} floorH={2.15} colsZ={7} colsX={5} w={0.72} h={1.35} />
      {fins.map((f, i) => (
        <B key={i} p={f.p} s={f.s} c="#cfc2a5" />
      ))}
      <B p={[20, 29.8, -2]} s={[8.7, 0.9, 6.2]} c={NAVY} r={0.6} />
      <B p={[20, 30.9, -2.6]} s={[3, 1.3, 2]} c="#d6c9ac" />
      <Sign p={[20, 6.05, 1.2]} w={7} h={0.9} text="SENATE BUILDING" bg={NAVY} />
      {[14.2, 15.6, 17].map((x, i) => (
        <group key={x}>
          <Cyl p={[x, 3, 3.7]} r={0.06} h={6} c="#d9d9d9" seg={6} />
          <mesh position={[x + 0.72, 5.45, 3.7]}>
            <planeGeometry args={[1.4, 0.7]} />
            <meshStandardMaterial
              map={i === 1 ? flag : null}
              color={i === 1 ? "#ffffff" : i === 0 ? NAVY : "#c6882a"}
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
      <B p={[32, 0.05, -1]} s={[6.5, 0.1, 8.5]} c="#5a5e64" cast={false} />
      <Car p={[30.6, 0.1, -3.6]} color="#c0392b" />
      <Car p={[30.6, 0.1, -0.6]} color="#f4f4f2" />
      <Car p={[33.6, 0.1, -2.1]} color="#1f2937" />
      <Car p={[33.6, 0.1, 1.8]} color="#2f8f8a" />
    </Pick>
  );
}

function Library() {
  const glass = mat("#3d566e", 0.3, 0.4);
  return (
    <Pick id="library">
      {[0, 1, 2].map((f) => (
        <group key={f}>
          <B p={[-6, f * 3 + 1.25, -1]} s={[13.2, 2.5, 7.2]} material={glass} />
          <B p={[-6, f * 3 + 2.75, -1]} s={[14, 0.5, 8]} c="#d2c8b4" />
        </group>
      ))}
      <Windows x0={-12.6} x1={0.6} z0={-4.6} z1={2.6} y0={0} floors={3} floorH={3} colsZ={11} colsX={6} w={0.9} h={1.6} inset={0.02} />
      <B p={[-6, 9.5, -1.6]} s={[5, 1, 3]} c="#d2c8b4" />
      <B p={[-6, 2.95, 3.7]} s={[5, 0.2, 1.6]} c={NAVY} />
      <B p={[-6, 0.15, 3.6]} s={[5, 0.3, 1.2]} c="#ddd2b8" />
      <Sign p={[-6, 8.75, 3.02]} w={7} h={0.45} text="UNIVERSITY LIBRARY" bg="#d2c8b4" fg={NAVY} />
    </Pick>
  );
}

function LectureTheatres() {
  return (
    <Pick id="lectures">
      <B p={[18, 4, -20]} s={[18, 8, 6]} c={CREAM} />
      <Windows x0={9} x1={27} z0={-23} z1={-17} y0={0.4} floors={3} floorH={2.5} colsZ={12} colsX={4} w={0.8} h={1.3} />
      <B p={[18, 8.2, -20]} s={[18.4, 0.4, 6.4]} c={NAVY} r={0.6} />
      <B p={[13.25, 2.6, -14.75]} s={[7.5, 5.2, 4.5]} c="#d9cfb9" />
      <B p={[13.25, 5.45, -14.75]} s={[7.9, 0.3, 5]} rot={[0.2, 0, 0]} c="#5b6b7a" />
      <Sign p={[13.25, 3.9, -12.47]} w={3.4} h={0.8} text="LT 1" bg={NAVY} />
      <B p={[22.75, 3, -14.2]} s={[8.5, 0.25, 3.6]} c="#e9e1cf" />
      {[
        [18.8, -12.6],
        [22.75, -12.6],
        [26.7, -12.6],
      ].map(([x, z]) => (
        <B key={x} p={[x, 1.5, z]} s={[0.3, 3, 0.3]} c="#cfc6b4" />
      ))}
      <Bench p={[21, 0, -15.6]} />
      <Bench p={[24.4, 0, -15.6]} />
      <Sign p={[22.75, 6.6, -16.97]} w={7.4} h={0.8} text="LECTURE THEATRES" bg={NAVY} />
    </Pick>
  );
}

function Buka() {
  const zinc = useMemo(() => new THREE.MeshStandardMaterial({ map: zincTexture(), roughness: 0.5, metalness: 0.5 }), []);
  return (
    <Pick id="buka">
      <B p={[-8.5, 1.35, 15]} s={[5, 2.7, 5]} c="#e9c46a" />
      <B p={[-8.5, 0.35, 15]} s={[5.06, 0.7, 5.06]} c="#b23a48" />
      <B p={[-8.2, 2.95, 15]} s={[6.2, 0.1, 5.8]} rot={[0, 0, -0.12]} material={zinc} />
      <B p={[-5.97, 1.55, 15]} s={[0.06, 1.1, 3.2]} c="#3a2a1e" />
      <B p={[-5.6, 1.0, 15]} s={[0.8, 0.12, 3.4]} c="#8a5a36" />
      {[
        ["#f5f1e6", 13.8],
        ["#c0392b", 14.6],
        ["#8a5a3c", 15.4],
        ["#e8892b", 16.2],
      ].map(([c, z]) => (
        <Cyl key={z} p={[-5.6, 1.15, z as number]} r={0.3} h={0.18} c={c as string} />
      ))}
      <Sign p={[-5.95, 2.4, 15]} w={4} h={0.55} text="MAMA B'S BUKA" bg="#b23a48" face="x" />
      <B p={[-5.5, 0.35, 17.3]} s={[0.9, 0.7, 0.6]} c="#2563eb" r={0.4} />
      <B p={[-5.5, 0.73, 17.3]} s={[0.92, 0.08, 0.62]} c="#f4f4f2" />
      <PlasticTable p={[-3.2, 0, 15.5]} />
      <PlasticTable p={[-1.2, 0, 13.1]} color="#f4f4f2" />
      <Umbrella p={[-0.4, 0, 16.6]} color="#2f8f8a" />
      <group position={[-12.4, 0, 13.6]}>
        {[0, 1, 2].map((i) => (
          <B key={i} p={[Math.cos(i * 2.1) * 0.5, 0.15, Math.sin(i * 2.1) * 0.5]} s={[0.35, 0.3, 0.35]} c="#6b6b6b" />
        ))}
        <Cyl p={[0, 0.65, 0]} r={[0.6, 0.45]} h={0.7} c="#1f1f1f" rough={0.4} />
      </group>
    </Pick>
  );
}

function SportsCentre() {
  const track = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 13, 9, 0, Math.PI * 2, false, 0);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 10.6, 6.6, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
    const g = new THREE.ShapeGeometry(shape, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const pitch = pitchTexture();
  return (
    <Pick id="sports">
      <mesh geometry={track} position={[26, 0.06, 28]} material={mat("#b5543a", 0.95)} receiveShadow />
      <mesh position={[26, 0.08, 28]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial map={pitch} roughness={0.95} />
      </mesh>
      {[16.3, 35.7].map((x) => (
        <group key={x}>
          <B p={[x, 0.65, 26.8]} s={[0.12, 1.3, 0.12]} c="#ffffff" />
          <B p={[x, 0.65, 29.2]} s={[0.12, 1.3, 0.12]} c="#ffffff" />
          <B p={[x, 1.3, 28]} s={[0.12, 0.12, 2.5]} c="#ffffff" />
        </group>
      ))}
      {[0, 1, 2, 3].map((k) => (
        <B key={k} p={[26, (k + 1) * 0.3, 18.35 - k * 0.9]} s={[20, (k + 1) * 0.6, 0.9]} c={k % 2 ? "#e9e3d6" : NAVY} r={0.7} />
      ))}
      <B p={[26, 1.6, 15.2]} s={[20, 3.2, 0.3]} c="#d8d2c4" />
      <B p={[26, 4.1, 16.9]} s={[21, 0.25, 4.6]} rot={[-0.08, 0, 0]} c="#d8d2c4" />
      {[16.4, 26, 35.6].map((x) => (
        <B key={x} p={[x, 2, 18.7]} s={[0.25, 4, 0.25]} c="#bfb8a8" />
      ))}
      <Sign p={[26, 3.75, 19.2]} w={8} h={0.55} text="UNILAG SPORTS CENTRE" bg={NAVY} />
      {[
        [12.4, 19.4],
        [39.6, 19.4],
        [12.4, 36.6],
        [39.6, 36.6],
      ].map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Cyl p={[x, 6, z]} r={[0.12, 0.2]} h={12} c="#8a9097" seg={8} />
          <group position={[x, 12.2, z]} rotation-y={Math.atan2(26 - x, 28 - z)}>
            <B p={[0, 0, 0]} s={[1.5, 0.9, 0.35]} c="#3a3f45" r={0.5} />
            <B p={[0, 0, 0.19]} s={[1.3, 0.7, 0.04]} material={lampMat} cast={false} />
          </group>
        </group>
      ))}
    </Pick>
  );
}

function Keke({ p, rotY = 0 }: { p: [number, number, number]; rotY?: number }) {
  return (
    <group position={p} rotation-y={rotY}>
      <B p={[0, 0.75, 0]} s={[1.7, 0.9, 1.0]} c="#f2c230" r={0.4} />
      <B p={[-0.15, 1.55, 0]} s={[1.3, 0.08, 1.05]} c="#1f1f1f" />
      <B p={[0.55, 1.2, 0]} s={[0.06, 0.7, 0.95]} material={windowMat} />
      {[
        [-0.5, 0.48],
        [-0.5, -0.48],
        [0.75, 0],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.25, z]} rotation-x={Math.PI / 2} material={mat("#1b1b1b", 0.9)}>
          <cylinderGeometry args={[0.25, 0.25, 0.14, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function Barrier() {
  const ref = useRef<THREE.Group>(null);
  const lift = useRef(gate.barrier);
  useFrame((_, dt) => {
    lift.current += (gate.barrier - lift.current) * Math.min(1, dt * 3);
    if (ref.current) ref.current.rotation.x = -1.1 * lift.current;
  });
  return (
    <group ref={ref} position={[52.4, 1.15, 5.7]}>
      {[0, 1, 2, 3].map((k) => (
        <B key={k} p={[0, 0, 0.42 + 0.84 * k]} s={[0.12, 0.12, 0.84]} c={k % 2 ? "#f4f4f2" : "#c0392b"} />
      ))}
    </group>
  );
}

function MainGate() {
  return (
    <Pick id="mainGate">
      {[4.6, 11.4].map((z) => (
        <group key={z}>
          <B p={[54, 2.6, z]} s={[2.4, 5.2, 2]} c={CREAM} />
          <B p={[54, 5.35, z]} s={[2.7, 0.3, 2.3]} c={NAVY} />
        </group>
      ))}
      <B p={[54, 6.2, 8]} s={[1.4, 1.5, 9.2]} c={CREAM} />
      <Sign p={[54.72, 6.2, 8]} w={8.4} h={1.1} text="UNIVERSITY OF LAGOS" bg={NAVY} face="x" />
      <Sign p={[53.28, 6.2, 8]} w={8.4} h={1.1} text="UNIVERSITY OF LAGOS" bg={NAVY} face="-x" />
      <B p={[54, 7.3, 8]} s={[1, 0.7, 4.6]} c="#c6882a" />
      <Sign p={[54.52, 7.3, 8]} w={4.4} h={0.5} text="IN DEED AND IN TRUTH" bg="#c6882a" fg="#10202b" face="x" />
      <B p={[50, 1.3, 3.1]} s={[3, 2.6, 3]} c="#f1e6cf" />
      <B p={[50, 2.75, 3.1]} s={[3.6, 0.3, 3.6]} c={NAVY} />
      <B p={[51.52, 1.6, 3.1]} s={[0.05, 0.9, 1.8]} material={windowMat} />
      <Sign p={[51.54, 2.3, 3.1]} w={2.4} h={0.35} text="SECURITY" bg="#b23a48" face="x" />
      <B p={[52.4, 0.6, 5.7]} s={[0.3, 1.2, 0.3]} c="#333333" />
      <Barrier />
      <B p={[48, 0.45, 12]} s={[1.2, 0.9, 0.7]} c="#f5c518" />
      <Umbrella p={[48.9, 0, 12.6]} color="#f5c518" />
      <Keke p={[59, 0, 4.4]} rotY={0.2} />
      <Keke p={[61.5, 0, 12]} rotY={Math.PI - 0.3} />
    </Pick>
  );
}

function LagoonFront() {
  const facing = (-3 * Math.PI) / 4;
  return (
    <Pick id="lagoon">
      <Bench p={[-25.6, 0.12, -19.6]} rotY={facing} />
      <Bench p={[-21.8, 0.12, -23.4]} rotY={facing} />
      <Bench p={[-29.4, 0.12, -15.8]} rotY={facing} />
      <Bench p={[-18.2, 0.12, -27]} rotY={facing} />
      <Umbrella p={[-27.4, 0.12, -18.2]} color="#c6882a" />
      <Umbrella p={[-20.2, 0.12, -24.8]} color="#2f8f8a" />
      <group position={[-17.4, 0, -19]}>
        <B p={[0, 0.9, 0]} s={[1.8, 1.8, 1.4]} c="#b23a48" />
        <B p={[0, 1.95, 0]} s={[2.2, 0.15, 1.8]} c="#2b2b2b" />
        <B p={[1.4, 0.45, 0]} s={[0.7, 0.9, 1.2]} c="#2b2b2b" />
        <B p={[1.4, 0.93, 0]} s={[0.6, 0.06, 1.0]} material={lampMat} />
        <Sign p={[0.91, 1.45, 0]} w={1.3} h={0.4} text="SUYA SPOT" bg="#c6882a" face="x" />
      </group>
      <group position={[-19.6, 0, -14.8]} rotation-y={Math.PI / 4}>
        <B p={[-1.6, 1, 0]} s={[0.15, 2, 0.15]} c="#3a3f45" />
        <B p={[1.6, 1, 0]} s={[0.15, 2, 0.15]} c="#3a3f45" />
        <Sign p={[0, 1.7, 0.09]} w={3.4} h={0.7} text="LAGOON FRONT" bg="#2f8f8a" />
      </group>
    </Pick>
  );
}

export function Buildings() {
  return (
    <group>
      <Senate />
      <Library />
      <LectureTheatres />
      <Buka />
      <SportsCentre />
      <MainGate />
      <LagoonFront />
    </group>
  );
}
