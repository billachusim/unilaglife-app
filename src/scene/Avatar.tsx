"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef, useState } from "react";
import * as THREE from "three";
import type { Look } from "@/game/data";
import { onJetty } from "@/game/nav";
import type { Agent } from "@/game/runtime";
import { mat } from "./materials";

const EYE = "#1a1210";

function Hair({ look }: { look: Look }) {
  const m = mat(look.hairColor, 0.95);
  const cap = (
    <mesh position={[0, 1.88, -0.01]} material={m} castShadow>
      <sphereGeometry args={[0.255, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
    </mesh>
  );
  switch (look.hair) {
    case "afro":
      return (
        <mesh position={[0, 2.0, -0.04]} scale={[1, 0.88, 1]} material={m} castShadow>
          <icosahedronGeometry args={[0.36, 2]} />
        </mesh>
      );
    case "bun":
      return (
        <>
          {cap}
          <mesh position={[0, 2.16, -0.1]} material={m} castShadow>
            <sphereGeometry args={[0.14, 12, 10]} />
          </mesh>
        </>
      );
    case "braids":
      return (
        <>
          {cap}
          {[-0.17, -0.09, 0, 0.09, 0.17].map((x) => (
            <mesh key={x} position={[x, 1.62, -0.19]} rotation-x={0.18} material={m} castShadow>
              <cylinderGeometry args={[0.035, 0.03, 0.62, 5]} />
            </mesh>
          ))}
        </>
      );
    default:
      return cap;
  }
}

function Limb({ pivot, refObj, children }: { pivot: [number, number, number]; refObj: React.RefObject<THREE.Group | null>; children: ReactNode }) {
  return (
    <group position={pivot} ref={refObj}>
      {children}
    </group>
  );
}

/**
 * A stylised student: rounded torso, backpack, swinging limbs.
 * Reads the agent each frame so movement never re-renders React.
 */
export function Avatar({ look, agent, scale = 1.28 }: { look: Look; agent: Agent; scale?: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const [seed] = useState(() => Math.random());
  const phase = useRef(seed * 10);
  const heading = useRef(agent.heading);
  const runAngle = useRef(seed * Math.PI * 2);

  const skin = mat(look.skin, 0.7);
  const top = mat(look.top, 0.8);
  const bottom = mat(look.bottom, 0.85);
  const shoe = mat("#1f1f1f", 0.6);
  const female = look.body === "f";

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    g.visible = !agent.hidden;
    if (agent.hidden) return;

    let x = agent.x;
    let z = agent.z;
    let target = agent.heading;
    const running = !agent.moving && agent.pose === "run";
    if (running) {
      runAngle.current += dt * 1.6;
      x += Math.cos(runAngle.current) * 2.2;
      z += Math.sin(runAngle.current) * 2.2;
      target = Math.atan2(-Math.sin(runAngle.current), Math.cos(runAngle.current));
    }
    const baseY = onJetty(x, z) && Math.hypot(x + 27, z + 23) > 0.5 ? 0.24 : 0.09;
    g.position.set(x, baseY, z);

    let diff = target - heading.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    heading.current += diff * Math.min(1, dt * 10);
    g.rotation.y = heading.current;

    const walking = agent.moving || running;
    const speed = running ? 13 : agent.moving ? 9 : 0;
    phase.current += dt * speed;
    const amp = running ? 0.9 : 0.55;
    const s = Math.sin(phase.current);

    const sitting = !agent.moving && agent.pose === "sit";
    const working = !agent.moving && agent.pose === "work";
    if (body.current) body.current.position.y = sitting ? -0.42 : walking ? Math.abs(s) * 0.05 : 0;

    if (legL.current && legR.current) {
      if (sitting) {
        legL.current.rotation.x = -1.45;
        legR.current.rotation.x = -1.45;
      } else {
        legL.current.rotation.x = walking ? s * amp : 0;
        legR.current.rotation.x = walking ? -s * amp : 0;
      }
    }
    if (armL.current && armR.current) {
      if (!agent.moving && agent.pose === "wave") {
        armL.current.rotation.x = 0;
        armR.current.rotation.x = -2.75 + Math.sin(performance.now() / 110) * 0.3;
      } else if (!agent.moving && agent.pose === "halt") {
        armL.current.rotation.x = 0;
        armR.current.rotation.x = -1.5;
      } else if (working) {
        const w = Math.sin(performance.now() / 120);
        armL.current.rotation.x = -0.9 + w * 0.25;
        armR.current.rotation.x = -0.9 - w * 0.25;
      } else if (sitting) {
        armL.current.rotation.x = -0.5;
        armR.current.rotation.x = -0.5;
      } else {
        armL.current.rotation.x = walking ? -s * amp * 0.8 : 0;
        armR.current.rotation.x = walking ? s * amp * 0.8 : 0;
      }
    }
  });

  return (
    <group ref={root} scale={scale}>
      <group ref={body}>
        {[
          [legL, -0.12],
          [legR, 0.12],
        ].map(([r, x]) => (
          <Limb key={x as number} pivot={[x as number, 0.95, 0]} refObj={r as React.RefObject<THREE.Group | null>}>
            <mesh position={[0, -0.42, 0]} material={female ? skin : bottom} castShadow>
              <boxGeometry args={[0.18, 0.84, 0.2]} />
            </mesh>
            <mesh position={[0, -0.88, 0.05]} material={shoe} castShadow>
              <boxGeometry args={[0.21, 0.14, 0.34]} />
            </mesh>
          </Limb>
        ))}
        {female ? (
          <mesh position={[0, 0.78, 0]} material={bottom} castShadow>
            <cylinderGeometry args={[0.25, 0.36, 0.5, 14]} />
          </mesh>
        ) : (
          <mesh position={[0, 0.98, 0]} material={bottom} castShadow>
            <boxGeometry args={[0.46, 0.18, 0.24]} />
          </mesh>
        )}
        <RoundedBox args={[female ? 0.48 : 0.54, 0.62, 0.3]} radius={0.09} smoothness={3} position={[0, 1.31, 0]} material={top} castShadow />
        {look.bag && (
          <RoundedBox args={[0.4, 0.48, 0.18]} radius={0.06} smoothness={2} position={[0, 1.3, -0.24]} material={mat(look.bag, 0.7)} castShadow />
        )}
        {[
          [armL, -0.34],
          [armR, 0.34],
        ].map(([r, x]) => (
          <Limb key={x as number} pivot={[x as number, 1.56, 0]} refObj={r as React.RefObject<THREE.Group | null>}>
            <mesh position={[0, -0.14, 0]} material={top} castShadow>
              <boxGeometry args={[0.16, 0.3, 0.18]} />
            </mesh>
            <mesh position={[0, -0.43, 0]} material={skin} castShadow>
              <boxGeometry args={[0.12, 0.32, 0.13]} />
            </mesh>
            <mesh position={[0, -0.62, 0]} material={skin}>
              <sphereGeometry args={[0.075, 8, 6]} />
            </mesh>
          </Limb>
        ))}
        <mesh position={[0, 1.66, 0]} material={skin}>
          <cylinderGeometry args={[0.08, 0.09, 0.14, 8]} />
        </mesh>
        <mesh position={[0, 1.88, 0]} scale={[1, 1.08, 1]} material={skin} castShadow>
          <sphereGeometry args={[0.24, 18, 14]} />
        </mesh>
        {[-0.085, 0.085].map((x) => (
          <mesh key={x} position={[x, 1.91, 0.22]} material={mat(EYE, 0.3)}>
            <sphereGeometry args={[0.032, 8, 6]} />
          </mesh>
        ))}
        {look.hat ? (
          <group position={[0, 2.06, -0.02]} rotation-z={0.18}>
            <mesh scale={[1.12, 0.32, 1.12]} material={mat(look.hat, 0.85)} castShadow>
              <sphereGeometry args={[0.26, 16, 10]} />
            </mesh>
            <mesh position={[-0.12, 0.04, 0.19]} material={mat("#c6882a", 0.4, 0.6)}>
              <sphereGeometry args={[0.045, 8, 6]} />
            </mesh>
          </group>
        ) : (
          <Hair look={look} />
        )}
      </group>
    </group>
  );
}
