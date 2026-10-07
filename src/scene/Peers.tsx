"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ACTION_BY_ID, type Pose } from "@/game/actions";
import type { Vec2 } from "@/game/data";
import { useIntro } from "@/game/intro";
import { broadcastMove, broadcastRest, peerAgents, useOnline } from "@/game/online";
import { player, stepAgent } from "@/game/runtime";
import { useGame } from "@/game/store";
import { Avatar } from "./Avatar";

const MAX_RENDERED = 40;

/** Draws other online students and tells the channel whenever our own player moves or changes what they're doing. */
export function Peers() {
  const peers = useOnline((s) => s.peers);
  const last = useRef<{ path: Vec2[] | null; moving: boolean; hidden: boolean; pose: Pose; emoji: string | null }>({
    path: null,
    moving: false,
    hidden: false,
    pose: "stand",
    emoji: null,
  });

  useFrame((_, dt) => {
    for (const a of peerAgents.values()) stepAgent(a, dt);
    if (useIntro.getState().step !== "done" || !useOnline.getState().connected) return;

    const l = last.current;
    if (player.path !== l.path && player.path.length) {
      l.path = player.path;
      broadcastMove(player.path.map(([x, z]) => [x, z] as Vec2));
    }
    const act = useGame.getState().activity;
    const emoji = act && !act.waiting ? ACTION_BY_ID[act.actionId].emoji : null;
    const changed = (l.moving && !player.moving) || player.hidden !== l.hidden || player.pose !== l.pose || emoji !== l.emoji;
    if (changed && !player.moving) broadcastRest();
    l.moving = player.moving;
    l.hidden = player.hidden;
    l.pose = player.pose;
    l.emoji = emoji;
  });

  return (
    <>
      {Object.values(peers)
        .slice(0, MAX_RENDERED)
        .map((p) => {
          const agent = peerAgents.get(p.id);
          return agent ? <Avatar key={p.id} look={p.look} agent={agent} /> : null;
        })}
    </>
  );
}
