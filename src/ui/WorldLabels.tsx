"use client";

import { useMemo } from "react";
import { ACTION_BY_ID } from "@/game/actions";
import { PLACE_IDS, PLACES } from "@/game/data";
import { goToPlace } from "@/game/interaction";
import { objectiveFor } from "@/game/objective";
import { player } from "@/game/runtime";
import { isOpen } from "@/game/state";
import { useGame } from "@/game/store";
import { type PeerMeta, peerAgents, SELF_ID, useOnline } from "@/game/online";
import { registerAnchor } from "@/scene/anchors";

const anchorStyle = { position: "absolute", left: 0, top: 0, visibility: "hidden", willChange: "transform" } as const;

function PlaceLabels() {
  const openMask = useGame((s) => PLACE_IDS.map((id) => (isOpen(id, s.save?.time ?? 720) ? "1" : "0")).join(""));
  const goal = useGame((s) => (s.save ? objectiveFor(s.save).place : null));
  const here = useGame((s) => s.here);
  const refs = useMemo(
    () =>
      Object.fromEntries(
        PLACE_IDS.map((id) => {
          const p = PLACES[id];
          return [id, registerAnchor(`place:${id}`, (v) => v.set(p.pos[0], p.labelHeight, p.pos[1]))];
        }),
      ),
    [],
  );

  return (
    <>
      {PLACE_IDS.map((id, i) => {
        const p = PLACES[id];
        const open = openMask[i] === "1";
        const isGoal = goal === id;
        return (
          <div key={id} ref={refs[id]} style={anchorStyle} data-minzoom={isGoal || here === id ? 0 : (p.minZoom ?? 0)}>
            <button
              type="button"
              onClick={() => goToPlace(id)}
              className={[
                "pointer-events-auto relative flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1.5 pr-3 text-[12px] font-semibold shadow-md ring-1 transition",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber",
                here === id ? "bg-navy text-white ring-navy" : "bg-white/95 text-ink ring-black/5 hover:bg-white",
                open ? "" : "opacity-60",
              ].join(" ")}
            >
              {isGoal && <span className="absolute -inset-1 animate-ping rounded-full bg-amber/40" aria-hidden />}
              <span className="relative grid h-6 w-6 place-items-center rounded-full bg-paper text-sm">{p.emoji}</span>
              <span className="relative">{p.name}</span>
              {!open && <span className="relative text-[10px] font-medium uppercase tracking-wide opacity-70">Closed</span>}
              {isGoal && <span className="relative h-2 w-2 rounded-full bg-amber" aria-label="Your next step" />}
            </button>
          </div>
        );
      })}
    </>
  );
}

const playerRef = registerAnchor("player", (v) => v.set(player.x, player.hidden ? 4.6 : 3.2, player.z));

function SpeechBubble({ text }: { text: string }) {
  return (
    <div key={text} className="relative mb-1 max-w-[220px] animate-[fadeUp_0.25s_ease-out] rounded-2xl bg-white px-3 py-1.5 text-center text-[12px] leading-snug text-ink shadow-lg ring-1 ring-black/5">
      {text}
      <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
    </div>
  );
}

function PlayerTag() {
  const name = useGame((s) => s.save?.name);
  const activity = useGame((s) => s.activity);
  const bubble = useOnline((s) => s.bubbles[SELF_ID]);
  if (!name) return null;
  const def = activity && !activity.waiting ? ACTION_BY_ID[activity.actionId] : null;
  const progress = activity && !activity.waiting ? 1 - activity.remaining / activity.total : 0;
  return (
    <div ref={playerRef} style={anchorStyle}>
      <div className="flex flex-col items-center gap-1">
        {bubble && <SpeechBubble text={bubble} />}
        {def && (
          <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-ink shadow-md ring-1 ring-black/5">
            <span className="text-base leading-none">{def.emoji}</span>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-navy/15">
              <span className="block h-full rounded-full bg-lagoon" style={{ width: `${Math.round(progress * 100)}%` }} />
            </span>
          </div>
        )}
        <div className="whitespace-nowrap rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white shadow">{name}</div>
      </div>
    </div>
  );
}

function PeerTag({ peer }: { peer: PeerMeta }) {
  const bubble = useOnline((s) => s.bubbles[peer.id]);
  const ref = useMemo(
    () =>
      registerAnchor(`peer:${peer.id}`, (v) => {
        const a = peerAgents.get(peer.id);
        if (a) v.set(a.x, a.hidden ? 4.6 : 3.2, a.z);
      }),
    [peer.id],
  );
  return (
    <div ref={ref} style={anchorStyle}>
      <div className="flex flex-col items-center gap-1">
        {bubble && <SpeechBubble text={bubble} />}
        {peer.emoji && <div className="rounded-full bg-white/95 px-2 py-0.5 text-sm shadow ring-1 ring-black/5">{peer.emoji}</div>}
        <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-lagoon shadow ring-1 ring-black/5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" aria-hidden />
          {peer.name}
          {peer.visitor && <span className="text-[9px] font-medium uppercase tracking-wide text-ink-soft">visitor</span>}
        </div>
      </div>
    </div>
  );
}

function PeerTags() {
  const peers = useOnline((s) => s.peers);
  return (
    <>
      {Object.values(peers)
        .slice(0, 40)
        .map((p) => (
          <PeerTag key={p.id} peer={p} />
        ))}
    </>
  );
}

export function WorldLabels() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <PlaceLabels />
      <PeerTags />
      <PlayerTag />
    </div>
  );
}
