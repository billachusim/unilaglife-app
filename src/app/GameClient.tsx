"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { initAuth, isVisitor, useAuth } from "@/game/auth";
import { fetchCloudSave, pushCloudSave, startAutosave } from "@/game/cloud";
import { startCampus } from "@/game/campus";
import { connectCampus } from "@/game/online";
import { beginWalk, skipIntro, toAdmission, toEnter, useIntro } from "@/game/intro";
import { useGame } from "@/game/store";
import { GateIntro } from "@/ui/GateIntro";
import { Hud } from "@/ui/Hud";
import { WorldLabels } from "@/ui/WorldLabels";

const Scene = dynamic(() => import("@/scene/Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[#8cc8f0] font-display text-xl font-bold text-navy">
      Loading Akoka…
    </div>
  ),
});

/** Decides where a player starts, and syncs their save whenever the signed-in account changes. */
function useStartAndSync() {
  const ready = useAuth((s) => s.ready);
  const userId = useAuth((s) => s.user?.id ?? null);
  const hasSave = useGame((s) => !!s.save);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const game = useGame.getState();

    if (!userId) {
      if (useIntro.getState().step === "boot") {
        // With accounts on, everyone shows their student ID at the gate; local saves upload after sign-in.
        if (game.save && !useAuth.getState().configured) skipIntro();
        else beginWalk();
      }
      return;
    }

    (async () => {
      let cloud = null;
      try {
        cloud = await fetchCloudSave(userId);
      } catch {
        game.pushToast("Couldn't reach your cloud save — playing on this device for now.", "bad");
      }
      if (cancelled) return;
      const local = useGame.getState().save;
      if (cloud) useGame.getState().loadSave(cloud);
      else if (local) await pushCloudSave(userId, local).catch(() => undefined);
      if (cancelled) return;

      const save = useGame.getState().save;
      const step = useIntro.getState().step;
      if (step === "boot") {
        if (save) {
          skipIntro();
          useGame.getState().pushToast(`👋 Welcome back, ${save.name}!`, "good");
        } else {
          toAdmission();
        }
      } else if (step === "walk" || step === "checkin") {
        if (save) toEnter();
        else toAdmission();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  useEffect(() => {
    if (!userId || !hasSave) return;
    return startAutosave(userId);
  }, [userId, hasSave]);

  const playing = useIntro((s) => s.step === "done") && hasSave;
  const name = useGame((s) => s.save?.name);
  useEffect(() => {
    if (!userId || !playing) return;
    return connectCampus(userId, isVisitor(useAuth.getState().user));
  }, [userId, playing, name]);

  useEffect(() => {
    if (!userId || !playing) return;
    return startCampus(userId, isVisitor(useAuth.getState().user));
  }, [userId, playing]);
}

export default function GameClient() {
  useStartAndSync();
  const step = useIntro((s) => s.step);
  const fade = useIntro((s) => s.fade);
  const hasSave = useGame((s) => !!s.save);
  const playing = step === "done" && hasSave;

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <Scene />
      </div>
      {playing && (
        <>
          <WorldLabels />
          <Hud />
        </>
      )}
      {step !== "done" && <GateIntro />}
      <div className={`pointer-events-none absolute inset-0 z-[60] bg-[#f4efe3] transition-opacity duration-500 ${fade ? "opacity-100" : "opacity-0"}`} />
    </main>
  );
}
