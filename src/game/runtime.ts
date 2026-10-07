import type { Vec2 } from "./data";
import { findPath } from "./nav";
import type { Pose } from "./actions";

/** Per-frame movement state. Lives outside React so the 3D loop never triggers re-renders. */
export interface Agent {
  x: number;
  z: number;
  heading: number;
  path: Vec2[];
  speed: number;
  moving: boolean;
  pose: Pose;
  hidden: boolean;
  onArrive: (() => void) | null;
}

export function makeAgent(pos: Vec2, speed: number): Agent {
  return { x: pos[0], z: pos[1], heading: 0, path: [], speed, moving: false, pose: "stand", hidden: false, onArrive: null };
}

export const player: Agent = makeAgent([40, 8], 4.6);

export function setAgentPath(agent: Agent, target: Vec2, onArrive?: () => void) {
  agent.path = findPath([agent.x, agent.z], target);
  agent.onArrive = onArrive ?? null;
  agent.hidden = false;
  agent.pose = "stand";
  if (!agent.path.length) agent.onArrive = null;
}

export function walkTo(target: Vec2, onArrive?: () => void) {
  setAgentPath(player, target, onArrive);
}

export function stepAgent(agent: Agent, dt: number) {
  if (!agent.path.length) {
    agent.moving = false;
    return;
  }
  let budget = agent.speed * dt;
  while (budget > 0 && agent.path.length) {
    const [tx, tz] = agent.path[0];
    const dx = tx - agent.x;
    const dz = tz - agent.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-4) agent.heading = Math.atan2(dx, dz);
    if (dist <= budget) {
      agent.x = tx;
      agent.z = tz;
      budget -= dist;
      agent.path.shift();
    } else {
      agent.x += (dx / dist) * budget;
      agent.z += (dz / dist) * budget;
      budget = 0;
    }
  }
  agent.moving = agent.path.length > 0;
  if (!agent.moving && agent.onArrive) {
    const cb = agent.onArrive;
    agent.onArrive = null;
    cb();
  }
}
