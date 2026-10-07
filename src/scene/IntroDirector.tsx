"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { FRESHER_LOOK, GUARD_LOOK, guard, introAgent, useIntro } from "@/game/intro";
import { stepAgent } from "@/game/runtime";
import { useGame } from "@/game/store";
import { Avatar } from "./Avatar";
import { introCamera } from "./cameras";

const want = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

/** Camera framing per intro beat: over the shoulder on the walk, a two-shot at the gate, then follow inside. */
function frame(step: string) {
  const a = introAgent;
  if (step === "checkin" || step === "admission") {
    const mx = (a.x + guard.x) / 2;
    const mz = (a.z + guard.z) / 2;
    want.look.set(mx, 1.9, mz);
    want.pos.set(mx + 6.4, 3.1, mz + 7);
  } else if (step === "enter") {
    // Looking out through the gate opening, so the pillars frame the student walking in.
    want.look.set(a.x, 1.5, a.z);
    want.pos.set(a.x - 9, 3, a.z + 1.6);
  } else {
    want.look.set(a.x - 5.5, 1.7, a.z - 0.6);
    want.pos.set(a.x + 8.6, 3.9, a.z + 7.2);
  }
}

function IntroCamera() {
  const cam = useRef<THREE.PerspectiveCamera>(null);
  const look = useRef(new THREE.Vector3());
  const lastStep = useRef<string | null>(null);
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    const c = cam.current!;
    c.aspect = size.width / size.height;
    c.updateProjectionMatrix();
  }, [size]);

  useFrame((_, dt) => {
    const c = cam.current;
    if (!c) return;
    const step = useIntro.getState().step;
    frame(step);
    const cut = lastStep.current === null || (step === "enter" && lastStep.current !== "enter");
    lastStep.current = step;
    if (cut) {
      c.position.copy(want.pos);
      look.current.copy(want.look);
    } else {
      const k = 1 - Math.exp(-dt * 2.2);
      c.position.lerp(want.pos, k);
      look.current.lerp(want.look, k);
    }
    c.lookAt(look.current);
  });
  return (
    <perspectiveCamera
      ref={(c: THREE.PerspectiveCamera | null) => {
        cam.current = c;
        introCamera.current = c;
      }}
      fov={34}
      near={0.3}
      far={700}
    />
  );
}

export function IntroDirector() {
  const step = useIntro((s) => s.step);
  const look = useGame((s) => s.save?.look) ?? FRESHER_LOOK;
  useFrame((_, dt) => {
    const st = useIntro.getState().step;
    if (st === "walk" || st === "enter") stepAgent(introAgent, dt);
    if (st === "enter") stepAgent(guard, dt);
  });
  return (
    <>
      {step !== "done" && <Avatar look={look} agent={introAgent} />}
      <Avatar look={GUARD_LOOK} agent={guard} />
      {step !== "done" && <IntroCamera />}
    </>
  );
}
