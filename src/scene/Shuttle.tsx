"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { B, Sign } from "./kit";
import { lampMat, mat, windowMat } from "./materials";

/** Closed loop along University Road, swinging round the roundabout. Nigeria drives on the right. */
const ROUTE: [number, number][] = [
  [-32, 9.1],
  [3.6, 9.1],
  [5.8, 11.8],
  [10.2, 11.8],
  [12.4, 9.1],
  [44, 9.1],
  [45.6, 8],
  [44, 6.9],
  [12.4, 6.9],
  [10.2, 4.2],
  [5.8, 4.2],
  [3.6, 6.9],
  [-32, 6.9],
  [-33.5, 8],
];

function useRoute() {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      ROUTE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      true,
      "centripetal",
    );
    return { curve, length: curve.getLength() };
  }, []);
}

function Bus({ offset }: { offset: number }) {
  const ref = useRef<THREE.Group>(null);
  const { curve, length } = useRoute();
  const d = useRef(offset * length);
  const p = useMemo(() => new THREE.Vector3(), []);
  const t = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    d.current = (d.current + dt * 5.5) % length;
    const u = d.current / length;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    ref.current?.position.set(p.x, 0.1, p.z);
    if (ref.current) ref.current.rotation.y = Math.atan2(t.x, t.z) - Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <B p={[0, 1.05, 0]} s={[4.6, 1.5, 1.7]} c="#f2c230" r={0.45} />
      <B p={[0, 0.5, 0]} s={[4.62, 0.12, 1.72]} c="#1f1f1f" />
      <B p={[0, 1.42, 0]} s={[4.0, 0.55, 1.74]} material={windowMat} />
      <B p={[2.31, 1.4, 0]} s={[0.04, 0.6, 1.4]} material={windowMat} />
      <B p={[2.32, 0.75, 0.55]} s={[0.04, 0.2, 0.3]} material={lampMat} />
      <B p={[2.32, 0.75, -0.55]} s={[0.04, 0.2, 0.3]} material={lampMat} />
      <Sign p={[0, 0.8, 0.86]} w={3.4} h={0.32} text="UNILAG SHUTTLE" bg="#1f1f1f" fg="#f2c230" />
      {[-1.5, 1.5].flatMap((x) =>
        [-0.82, 0.82].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation-x={Math.PI / 2} material={mat("#1b1b1b", 0.9)}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 14]} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function Shuttles() {
  return (
    <>
      <Bus offset={0} />
      <Bus offset={0.5} />
    </>
  );
}
