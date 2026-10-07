"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { DAY, HAIR_COLORS, HAIR_STYLES, type Look, OUTFIT_COLORS, PLACE_IDS, PLACES, SKIN_TONES } from "@/game/data";
import { randomOpenPoint } from "@/game/nav";
import { type Agent, makeAgent, player, setAgentPath, stepAgent } from "@/game/runtime";
import { useIntro } from "@/game/intro";
import { useGame } from "@/game/store";
import { Avatar } from "./Avatar";
import { mulberry } from "./textures";

/** Advances the game clock a few times a second instead of every frame. */
export function GameTicker() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    if (useIntro.getState().step !== "done") return;
    acc.current += Math.min(dt, 0.5);
    if (acc.current >= 0.25) {
      useGame.getState().tick(acc.current);
      acc.current = 0;
    }
  });
  return null;
}

export function Player() {
  const look = useGame((s) => s.save?.look);
  const playing = useIntro((s) => s.step === "done");
  useFrame((_, dt) => {
    const act = useGame.getState().activity;
    if (!act || act.waiting) stepAgent(player, dt);
  });
  return look && playing ? <Avatar look={look} agent={player} /> : null;
}

interface Npc {
  agent: Agent;
  look: Look;
  wait: number;
  home: boolean;
}

function randomLook(rand: () => number): Look {
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const body = rand() < 0.5 ? "f" : "m";
  return {
    body,
    skin: pick(SKIN_TONES),
    hair: body === "f" ? pick(HAIR_STYLES.map((h) => h.id)) : rand() < 0.75 ? "lowcut" : "afro",
    hairColor: pick(HAIR_COLORS.slice(0, 3)),
    top: pick(OUTFIT_COLORS),
    bottom: pick(["#1f2937", "#2f4a7a", "#3b2f2a", "#6b7280", "#1d3a6e", "#b23a48"]),
    bag: pick(["#1f1f1f", "#b23a48", "#2f8f8a", "#c6882a", "#6d4aa8"]),
  };
}

const NPC_COUNT = 14;

export function Npcs() {
  const npcs = useMemo<Npc[]>(() => {
    const rand = mulberry(2024);
    return Array.from({ length: NPC_COUNT }, () => ({
      agent: makeAgent(randomOpenPoint(rand), 2.4 + rand() * 1.1),
      look: randomLook(rand),
      wait: rand() * 4,
      home: false,
    }));
  }, []);

  useFrame((_, dt) => {
    const time = useGame.getState().save?.time ?? 12 * 60;
    const hour = (time % DAY) / 60;
    const night = hour >= 22.5 || hour < 6;
    for (const n of npcs) {
      const a = n.agent;
      if (a.moving) {
        stepAgent(a, dt);
        continue;
      }
      if (n.home) {
        if (!night) {
          n.home = false;
          a.hidden = false;
          n.wait = Math.random() * 6;
        }
        continue;
      }
      n.wait -= dt;
      if (n.wait > 0) continue;
      if (night) {
        setAgentPath(a, PLACES.hall.door, () => {
          a.hidden = true;
          n.home = true;
        });
        continue;
      }
      a.pose = "stand";
      const toPlace = Math.random() < 0.6;
      if (toPlace) {
        const p = PLACES[PLACE_IDS[Math.floor(Math.random() * PLACE_IDS.length)]];
        const target: [number, number] = [p.door[0] + (Math.random() - 0.5) * 3, p.door[1] + (Math.random() - 0.5) * 3];
        setAgentPath(a, target, () => {
          n.wait = 5 + Math.random() * 10;
        });
      } else {
        setAgentPath(a, randomOpenPoint(), () => {
          n.wait = 3 + Math.random() * 8;
        });
      }
      if (!a.path.length) n.wait = 2;
    }
  });

  return (
    <>
      {npcs.map((n, i) => (
        <Avatar key={i} look={n.look} agent={n.agent} scale={1.22} />
      ))}
    </>
  );
}

/** Ripple where the player tapped. */
export const clickMarker = { x: 0, z: 0, t: -1 };

export function ClickMarker() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false }), []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    if (clickMarker.t < 0) {
      m.visible = false;
      return;
    }
    clickMarker.t += dt;
    const k = clickMarker.t / 0.6;
    if (k >= 1) {
      clickMarker.t = -1;
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(clickMarker.x, 0.15, clickMarker.z);
    m.scale.setScalar(0.4 + k * 1.2);
    material.opacity = 0.9 * (1 - k);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={material} visible={false}>
      <ringGeometry args={[0.7, 0.9, 32]} />
    </mesh>
  );
}
