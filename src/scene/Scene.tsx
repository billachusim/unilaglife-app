"use client";

import { MapControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { walkToPoint } from "@/game/interaction";
import { player } from "@/game/runtime";
import { useIntro } from "@/game/intro";
import { useGame } from "@/game/store";
import { ClickMarker, clickMarker, GameTicker, Npcs, Player } from "./Agents";
import { Buildings } from "./Buildings";
import { DayNight } from "./DayNight";
import { Distant } from "./Distant";
import { IntroDirector } from "./IntroDirector";
import { anchors } from "./anchors";
import { gameCamera, introCamera } from "./cameras";
import { Nature } from "./Nature";
import { Peers } from "./Peers";
import { Quarters } from "./Quarters";
import { Shuttles } from "./Shuttle";
import { Terrain } from "./Terrain";

const OFFSET = new THREE.Vector3(70, 70, 70);

function CameraRig() {
  const controls = useRef<MapControlsImpl>(null);
  const { camera, gl } = useThree();

  const playing = useIntro((s) => s.step === "done");

  useEffect(() => {
    const c = controls.current;
    if (!c || !(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    c.target.set(player.x, 0, player.z);
    camera.position.set(player.x + OFFSET.x, OFFSET.y, player.z + OFFSET.z);
    c.update();
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 && useGame.getState().follow) {
        useGame.getState().setFollow(false);
      }
    };
    const onUp = () => {
      down = null;
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c || useIntro.getState().step !== "done") return;
    let dx = 0;
    let dz = 0;
    if (useGame.getState().follow) {
      const k = 1 - Math.exp(-dt * 3.5);
      dx = (player.x - c.target.x) * k;
      dz = (player.z - c.target.z) * k;
    }
    const nx = THREE.MathUtils.clamp(c.target.x + dx, -70, 75);
    const nz = THREE.MathUtils.clamp(c.target.z + dz, -70, 60);
    dx = nx - c.target.x;
    dz = nz - c.target.z;
    if (dx || dz) {
      c.target.x += dx;
      c.target.z += dz;
      camera.position.x += dx;
      camera.position.z += dz;
      c.update();
    }
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      enabled={playing}
      enableRotate={false}
      enableDamping
      dampingFactor={0.12}
      minZoom={5}
      maxZoom={48}
      screenSpacePanning={false}
      zoomToCursor
    />
  );
}

/** Renders through the intro camera until the intro ends, then the isometric game camera. */
function CameraDirector() {
  useFrame((state) => {
    const want = useIntro.getState().step === "done" ? gameCamera.current : (introCamera.current ?? gameCamera.current);
    if (want && state.camera !== want) state.set({ camera: want });
  });
  return null;
}

function AnchorProjector() {
  const v = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    for (const a of anchors.values()) {
      if (!a.el) continue;
      a.get(v.current);
      v.current.project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      const minZoom = Number(a.el.dataset.minzoom ?? 0);
      const tooFar = minZoom > 0 && (camera as THREE.OrthographicCamera).isOrthographicCamera && camera.zoom < minZoom;
      const off = tooFar || x < -200 || y < -100 || x > size.width + 200 || y > size.height + 100;
      a.el.style.visibility = off ? "hidden" : "visible";
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}

function GroundPicker() {
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.05, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6 || useIntro.getState().step !== "done") return;
        e.stopPropagation();
        clickMarker.x = e.point.x;
        clickMarker.z = e.point.z;
        clickMarker.t = 0;
        walkToPoint([e.point.x, e.point.z]);
      }}
    >
      <planeGeometry args={[240, 240]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function Scene() {
  const initialZoom = typeof window !== "undefined" && window.innerWidth < 640 ? 11 : 16;
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} className="touch-none">
      <OrthographicCamera
        ref={(c: THREE.OrthographicCamera | null) => {
          gameCamera.current = c;
        }}
        position={[70, 70, 70]}
        zoom={initialZoom}
        near={1}
        far={900}
      />
      <CameraRig />
      <DayNight />
      <GameTicker />
      <Terrain />
      <Buildings />
      <Quarters />
      <Nature />
      <Distant />
      <Shuttles />
      <Npcs />
      <Player />
      <Peers />
      <IntroDirector />
      <ClickMarker />
      <GroundPicker />
      <AnchorProjector />
      <CameraDirector />
    </Canvas>
  );
}
