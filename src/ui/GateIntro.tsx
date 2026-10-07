"use client";

import { useEffect, useState } from "react";
import { guard, toCheckin, toEnter, useIntro } from "@/game/intro";
import { registerAnchor } from "@/scene/anchors";
import { CheckInCard } from "./CheckInCard";
import { Onboarding } from "./Onboarding";

const CAPTIONS = [
  { at: 0, text: "Akoka, Lagos · Monday, 7:15 AM" },
  { at: 3600, text: "Your first day at the University of First Choice." },
  { at: 7200, text: "The Main Gate is just ahead…" },
];

function Captions() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timers = CAPTIONS.slice(1).map((c, k) => window.setTimeout(() => setI(k + 1), c.at));
    return () => timers.forEach(window.clearTimeout);
  }, []);
  return (
    <div className="absolute inset-x-0 bottom-[12vh] flex justify-center px-6">
      <p key={i} className="animate-[fadeUp_0.8s_ease-out] text-center font-display text-xl font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-2xl">
        {CAPTIONS[i].text}
      </p>
    </div>
  );
}

const guardRef = registerAnchor("guard", (v) => v.set(guard.x, 3.15, guard.z));

function GuardBubble() {
  const line = useIntro((s) => s.guardLine);
  return (
    <div ref={guardRef} style={{ position: "absolute", left: 0, top: 0, visibility: "hidden" }}>
      <div className="relative -translate-y-1/2 pb-3">
        <div key={line} className="w-[min(78vw,280px)] animate-[fadeUp_0.35s_ease-out] rounded-2xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-black/5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy">Gateman</div>
          <p className="text-[14px] leading-snug text-ink">{line}</p>
        </div>
        <span className="absolute bottom-[3px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" aria-hidden />
      </div>
    </div>
  );
}

export function GateIntro() {
  const step = useIntro((s) => s.step);
  const cinematic = step !== "admission";

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div className={`absolute inset-x-0 top-0 bg-black transition-[height] duration-700 ${cinematic ? "h-[7vh]" : "h-0"}`} />
      <div className={`absolute inset-x-0 bottom-0 bg-black transition-[height] duration-700 ${cinematic ? "h-[7vh]" : "h-0"}`} />

      {(step === "boot" || step === "walk") && (
        <>
          <div className="absolute inset-x-0 top-[12vh] flex flex-col items-center gap-1">
            <div className="animate-[fadeUp_1.2s_ease-out] font-display text-5xl font-bold tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)] sm:text-6xl">
              Unilag<span className="text-[#7fd6cf]">Life</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 drop-shadow">Live your Akoka story</div>
          </div>
          {step === "walk" && <Captions />}
        </>
      )}

      {step === "walk" && (
        <button
          type="button"
          onClick={toCheckin}
          className="pointer-events-auto absolute right-4 top-[calc(7vh+12px)] rounded-full bg-black/40 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur transition hover:bg-black/60"
        >
          Skip intro →
        </button>
      )}

      {(step === "checkin" || step === "enter") && <GuardBubble />}

      {step === "checkin" && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(7vh+12px)] flex justify-center px-3 lg:justify-end lg:pr-10">
          <div className="w-full max-w-sm animate-[fadeUp_0.5s_ease-out]">
            <CheckInCard />
          </div>
        </div>
      )}

      {step === "admission" && (
        <div className="pointer-events-auto absolute inset-0">
          <Onboarding onAccept={toEnter} />
        </div>
      )}
    </div>
  );
}
