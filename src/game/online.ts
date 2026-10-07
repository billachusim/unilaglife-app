import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { ACTION_BY_ID, type Pose } from "./actions";
import type { DeptId, Look, Vec2 } from "./data";
import { type Agent, makeAgent, player } from "./runtime";
import { useGame } from "./store";

/** Everyone on campus shares one channel. Presence = who's here and where they rest; broadcast = motion and chat. */
export const CAMPUS_CHANNEL = "campus:akoka";
export const MAX_CHAT = 120;

export interface PeerMeta {
  id: string;
  name: string;
  look: Look;
  dept: DeptId;
  level: number;
  visitor?: boolean;
  bot?: boolean;
  x: number;
  z: number;
  hidden: boolean;
  pose: Pose;
  emoji: string | null;
}

export interface ChatMsg {
  key: number;
  id: string;
  name: string;
  text: string;
  at: number;
  mine?: boolean;
}

interface OnlineState {
  connected: boolean;
  peers: Record<string, PeerMeta>;
  chat: ChatMsg[];
  bubbles: Record<string, string>;
  chatOpen: boolean;
  unread: number;
}

export const useOnline = create<OnlineState>(() => ({ connected: false, peers: {}, chat: [], bubbles: {}, chatOpen: false, unread: 0 }));

export function setChatOpen(open: boolean) {
  useOnline.setState(open ? { chatOpen: true, unread: 0 } : { chatOpen: false });
}

/** Movement state for other players, stepped by the 3D loop. */
export const peerAgents = new Map<string, Agent>();
export const SELF_ID = "me";

let channel: RealtimeChannel | null = null;
let selfMeta: PeerMeta | null = null;
let chatKey = 1;
const bubbleTimers = new Map<string, number>();

function agentFor(meta: { id: string; x: number; z: number }) {
  let a = peerAgents.get(meta.id);
  if (!a) {
    a = makeAgent([meta.x, meta.z], 4.6);
    peerAgents.set(meta.id, a);
  }
  return a;
}

function showBubble(id: string, text: string) {
  useOnline.setState((s) => ({ bubbles: { ...s.bubbles, [id]: text } }));
  window.clearTimeout(bubbleTimers.get(id));
  bubbleTimers.set(
    id,
    window.setTimeout(() => {
      useOnline.setState((s) => {
        const next = { ...s.bubbles };
        delete next[id];
        return { bubbles: next };
      });
    }, 6500),
  );
}

function pushChat(msg: Omit<ChatMsg, "key">) {
  useOnline.setState((s) => ({
    chat: [...s.chat.slice(-39), { ...msg, key: chatKey++ }],
    unread: s.chatOpen || msg.mine ? s.unread : s.unread + 1,
  }));
}

function syncPresence() {
  if (!channel) return;
  const state = channel.presenceState<PeerMeta>();
  const peers: Record<string, PeerMeta> = {};
  for (const metas of Object.values(state)) {
    const meta = metas[metas.length - 1];
    if (!meta || meta.id === selfMeta?.id) continue;
    peers[meta.id] = meta;
    const a = agentFor(meta);
    if (!a.moving) {
      a.x = meta.x;
      a.z = meta.z;
      a.hidden = meta.hidden;
      a.pose = meta.pose;
    }
  }
  for (const id of peerAgents.keys()) if (!peers[id]) peerAgents.delete(id);
  useOnline.setState({ peers });
}

function currentRest(): Pick<PeerMeta, "x" | "z" | "hidden" | "pose" | "emoji"> {
  const act = useGame.getState().activity;
  const def = act && !act.waiting ? ACTION_BY_ID[act.actionId] : null;
  return { x: player.x, z: player.z, hidden: player.hidden, pose: player.pose, emoji: def?.emoji ?? null };
}

export function connectCampus(userId: string, visitor: boolean) {
  const save = useGame.getState().save;
  if (!supabase || !save || channel) return () => undefined;
  selfMeta = {
    id: userId,
    name: save.name,
    look: save.look,
    dept: save.uni.dept,
    level: save.uni.level,
    visitor,
    ...currentRest(),
  };
  const ch = supabase.channel(CAMPUS_CHANNEL, { config: { presence: { key: userId }, broadcast: { self: false } } });
  channel = ch;

  ch.on("presence", { event: "sync" }, syncPresence)
    .on("broadcast", { event: "move" }, ({ payload }) => {
      const p = payload as { id: string; x: number; z: number; path: Vec2[]; speed?: number };
      const a = agentFor(p);
      if (Math.hypot(a.x - p.x, a.z - p.z) > 2.5) {
        a.x = p.x;
        a.z = p.z;
      }
      a.path = p.path.map(([x, z]) => [x, z] as Vec2);
      a.speed = p.speed ?? 4.6;
      a.hidden = false;
      a.pose = "stand";
      const peer = useOnline.getState().peers[p.id];
      if (peer?.emoji) useOnline.setState((s) => ({ peers: { ...s.peers, [p.id]: { ...peer, emoji: null } } }));
    })
    .on("broadcast", { event: "state" }, ({ payload }) => {
      const p = payload as Pick<PeerMeta, "id" | "x" | "z" | "hidden" | "pose" | "emoji">;
      const a = agentFor(p);
      if (!a.moving) {
        a.x = p.x;
        a.z = p.z;
      }
      a.hidden = p.hidden;
      a.pose = p.pose;
      const peer = useOnline.getState().peers[p.id];
      if (peer) useOnline.setState((s) => ({ peers: { ...s.peers, [p.id]: { ...peer, emoji: p.emoji } } }));
    })
    .on("broadcast", { event: "say" }, ({ payload }) => {
      const p = payload as { id: string; name: string; text: string };
      const text = p.text.slice(0, MAX_CHAT);
      showBubble(p.id, text);
      pushChat({ id: p.id, name: p.name, text, at: Date.now() });
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        useOnline.setState({ connected: true });
        await ch.track(selfMeta!);
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        useOnline.setState({ connected: false });
      }
    });

  return () => {
    ch.untrack();
    supabase?.removeChannel(ch);
    channel = null;
    selfMeta = null;
    peerAgents.clear();
    useOnline.setState({ connected: false, peers: {}, bubbles: {} });
  };
}

export function broadcastMove(path: Vec2[]) {
  if (!channel || !selfMeta) return;
  channel.send({ type: "broadcast", event: "move", payload: { id: selfMeta.id, x: player.x, z: player.z, path, speed: player.speed } });
}

let lastTrack = 0;
/** Tell others where we are now resting and what we're doing. */
export function broadcastRest() {
  if (!channel || !selfMeta) return;
  const rest = currentRest();
  selfMeta = { ...selfMeta, ...rest };
  channel.send({ type: "broadcast", event: "state", payload: { id: selfMeta.id, ...rest } });
  const now = Date.now();
  if (now - lastTrack > 1500) {
    lastTrack = now;
    channel.track(selfMeta);
  }
}

let lastSay = 0;
export function sendChat(raw: string) {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, MAX_CHAT);
  if (!text || !selfMeta) return false;
  const now = Date.now();
  if (now - lastSay < 1500) return false;
  lastSay = now;
  channel?.send({ type: "broadcast", event: "say", payload: { id: selfMeta.id, name: selfMeta.name, text } });
  showBubble(SELF_ID, text);
  pushChat({ id: selfMeta.id, name: selfMeta.name, text, at: now, mine: true });
  return true;
}
