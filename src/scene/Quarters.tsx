"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { BILLBOARDS, FACULTIES, FACULTY_GRID, type Faculty, facultyCentre, HALL_SIZE, type Hall, HALLS } from "@/game/data";
import { type Sponsor, useCampus } from "@/game/campus";
import { B, Cyl, Sign, Windows } from "./kit";
import { mat } from "./materials";
import { Pick } from "./Buildings";

const NAVY = "#1d3a6e";
const CREAM = "#efe7d6";
const LAUNDRY = ["#b23a48", "#f4f4f2", "#2f8f8a", "#c6882a", "#6d4aa8", "#1d3a6e", "#e8892b"];

function HallBuilding({ hall }: { hall: Hall }) {
  const [x, z] = hall.pos;
  const { w, d, floors, floorH } = HALL_SIZE;
  const top = floors * floorH;
  const front = z + d / 2;
  const laundry = useMemo(() => {
    const list: { p: [number, number, number]; c: string }[] = [];
    let k = hall.id.length;
    for (let f = 1; f < floors; f++) {
      for (let lx = x - w / 2 + 0.6; lx < x + w / 2 - 0.4; lx += 1.3 + (k % 3) * 0.25) {
        if (k % 3 !== 0) list.push({ p: [lx, f * floorH + 0.25, front + 1.05], c: LAUNDRY[k % LAUNDRY.length] });
        k++;
      }
    }
    return list;
  }, [hall.id, x, w, floors, floorH, front]);

  return (
    <Pick id={`hall:${hall.id}`}>
      <B p={[x, floorH / 2, z]} s={[w, floorH, d]} c="#d9c9a8" />
      <B p={[x, floorH + (top - floorH) / 2, z]} s={[w, top - floorH, d]} c="#f1e6cf" />
      <Windows x0={x - w / 2} x1={x + w / 2} z0={z - d / 2} z1={front} y0={0} floors={floors} floorH={floorH} colsZ={4} colsX={5} w={0.8} h={1.2} />
      {Array.from({ length: floors - 1 }, (_, i) => i + 1).map((f) => (
        <group key={f}>
          <B p={[x, f * floorH, front + 0.5]} s={[w, 0.18, 1]} c="#e3d6bb" />
          <B p={[x, f * floorH + 0.5, front + 0.95]} s={[w, 0.85, 0.1]} c={hall.color} r={0.6} />
        </group>
      ))}
      {laundry.map((l, i) => (
        <B key={i} p={l.p} s={[0.6, 0.75, 0.05]} c={l.c} cast={false} />
      ))}
      <B p={[x + w / 2 + 0.02, top / 2, z]} s={[0.06, top, 1.4]} c={hall.color} />
      <B p={[x, top + 0.15, z]} s={[w + 0.3, 0.3, d + 0.3]} c="#d8ccb2" />
      <Cyl p={[x - 2, top + 1.2, z - 3]} r={0.8} h={1.8} c="#1c1c1c" rough={0.5} />
      <Cyl p={[x + 0.4, top + 1.2, z - 3]} r={0.8} h={1.8} c="#1c1c1c" rough={0.5} />
      <B p={[x, 1.2, front + 0.02]} s={[1.8, 2.2, 0.06]} c="#3a2a1e" />
      <B p={[x, 2.45, front + 0.7]} s={[3, 0.2, 1.4]} c={hall.color} />
      <Sign p={[x, top - 0.75, front + 0.03]} w={w - 1.2} h={0.75} text={hall.name.toUpperCase()} bg={hall.color} />
    </Pick>
  );
}

function FacultyBuilding({ faculty }: { faculty: Faculty }) {
  const [x, z] = facultyCentre(faculty.id);
  const { w, d, floors, floorH } = FACULTY_GRID;
  const top = floors * floorH;
  const front = z + d / 2;
  return (
    <Pick id={`fac:${faculty.id}`}>
      <B p={[x, 0.25, z]} s={[w + 0.4, 0.5, d + 0.4]} c="#d6c9ac" />
      <B p={[x, top / 2 + 0.3, z]} s={[w, top, d]} c={CREAM} />
      <Windows x0={x - w / 2} x1={x + w / 2} z0={z - d / 2} z1={front} y0={0.4} floors={floors} floorH={floorH} colsZ={5} colsX={4} w={0.75} h={1.25} />
      <B p={[x, top + 0.5, z]} s={[w + 0.3, 0.45, d + 0.3]} c={faculty.accent} r={0.6} />
      <B p={[x - w / 2 + 0.15, top / 2 + 0.3, front + 0.06]} s={[0.3, top, 0.12]} c={faculty.accent} />
      <B p={[x + w / 2 - 0.15, top / 2 + 0.3, front + 0.06]} s={[0.3, top, 0.12]} c={faculty.accent} />
      <B p={[x, 2.75, front + 0.7]} s={[3, 0.2, 1.4]} c={faculty.accent} />
      {[-1.3, 1.3].map((dx) => (
        <B key={dx} p={[x + dx, 1.45, front + 1.25]} s={[0.22, 2.6, 0.22]} c={CREAM} />
      ))}
      <B p={[x, 1.3, front + 0.02]} s={[1.6, 2.1, 0.06]} c="#3a2a1e" />
      <Sign p={[x, top - 0.55, front + 0.03]} w={w - 0.6} h={0.55} text={faculty.name.toUpperCase()} bg={faculty.accent} />
    </Pick>
  );
}

/** Campaign posters on the SUB noticeboard, redrawn whenever the ballot changes. */
function PosterBoard() {
  const candidates = useCampus((s) => s.candidates);
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c9a26a";
    g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#1d3a6e";
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = "#fff";
    g.font = "700 34px 'Helvetica Neue', Arial, sans-serif";
    g.textAlign = "center";
    g.fillText("SUG ELECTIONS · VOTE!", 256, 44);
    const list = candidates.length ? candidates.slice(0, 3) : [{ name: "Your name here", policy: "steadyLight" }];
    const colors = ["#b23a48", "#2f8f8a", "#c6882a"];
    list.forEach((cand, i) => {
      const x = 14 + i * 166;
      g.fillStyle = "#f8f4ea";
      g.fillRect(x, 82, 150, 220);
      g.fillStyle = colors[i % colors.length];
      g.fillRect(x, 82, 150, 36);
      g.fillStyle = "#fff";
      g.font = "700 18px 'Helvetica Neue', Arial, sans-serif";
      g.fillText("VOTE", x + 75, 108);
      g.fillStyle = "#10202b";
      g.font = "700 20px 'Helvetica Neue', Arial, sans-serif";
      const words = cand.name.split(" ");
      words.slice(0, 3).forEach((wd, k) => g.fillText(wd, x + 75, 170 + k * 26));
      g.font = "500 15px 'Helvetica Neue', Arial, sans-serif";
      g.fillText("for President", x + 75, 280);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [candidates]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[-27, 0, 5.6]} rotation-y={Math.PI / 6}>
      <B p={[-1.5, 1, 0]} s={[0.12, 2, 0.12]} c="#5e3c22" />
      <B p={[1.5, 1, 0]} s={[0.12, 2, 0.12]} c="#5e3c22" />
      <mesh position={[0, 1.55, 0.08]}>
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}

function StudentUnion() {
  return (
    <Pick id="sub">
      <B p={[-23, 3, -1]} s={[10, 6, 8]} c="#e8dcc4" />
      <Windows x0={-28} x1={-18} z0={-5} z1={3} y0={0.3} floors={2} floorH={2.8} colsZ={6} colsX={5} w={0.9} h={1.4} />
      <B p={[-23, 6.2, -1]} s={[10.3, 0.4, 8.3]} c="#b23a48" r={0.6} />
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} p={[-27.5 + i * 1.8, 2.4, 3.55]} s={[0.35, 4.8, 0.35]} c={CREAM} />
      ))}
      <B p={[-23, 4.95, 3.3]} s={[10.6, 0.3, 1.4]} c={NAVY} />
      <Sign p={[-23, 5.6, 3.04]} w={7} h={0.8} text="STUDENTS' UNION BUILDING" bg="#b23a48" />
      <PosterBoard />
      <group position={[-19.6, 0, 5.2]}>
        <B p={[0, 0.45, 0]} s={[1.8, 0.9, 0.8]} c="#8a5a36" />
        {["#7a1f2b", "#1f5f8b", "#2f6b3a", "#b04a7a", "#1d3a6e"].map((c, i) => (
          <B key={c} p={[-0.7 + i * 0.35, 1.05, 0]} s={[0.3, 0.3, 0.05]} c={c} cast={false} />
        ))}
      </group>
    </Pick>
  );
}

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

function useSponsorTexture(sponsor: Sponsor | undefined) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const placeholder = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 320;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 600, 320);
    grd.addColorStop(0, "#1d3a6e");
    grd.addColorStop(1, "#2f8f8a");
    g.fillStyle = grd;
    g.fillRect(0, 0, 600, 320);
    g.fillStyle = "#c6882a";
    g.fillRect(0, 250, 600, 70);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = "800 64px 'Helvetica Neue', Arial, sans-serif";
    g.fillText("YOUR BRAND", 300, 120);
    g.fillText("HERE", 300, 190);
    g.fillStyle = "#10202b";
    g.font = "700 30px 'Helvetica Neue', Arial, sans-serif";
    g.fillText("Reach every Akokite · tap for rates", 300, 296);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const url = sponsor?.image_url ?? null;
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loader.load(url, (t) => {
      if (cancelled) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return url && tex ? tex : placeholder;
}

function Billboard({ id, pos }: { id: string; pos: [number, number] }) {
  const sponsor = useCampus((s) => s.sponsors[id]);
  const map = useSponsorTexture(sponsor);
  return (
    <group
      position={[pos[0], 0, pos[1]]}
      rotation-y={Math.PI / 4}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        useCampus.setState(sponsor ? { sponsorOpen: sponsor } : { panel: "advertise" });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <B p={[-2.2, 1.6, -0.1]} s={[0.22, 3.2, 0.22]} c="#3a3f45" />
      <B p={[2.2, 1.6, -0.1]} s={[0.22, 3.2, 0.22]} c="#3a3f45" />
      <B p={[0, 4.7, -0.12]} s={[6.3, 3.4, 0.18]} c="#22272d" />
      <mesh position={[0, 4.7, 0]}>
        <planeGeometry args={[6, 3.2]} />
        <meshStandardMaterial map={map} roughness={0.6} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 3.02, 0.02]} material={mat("#c6882a", 0.6)}>
        <planeGeometry args={[1.3, 0.22]} />
      </mesh>
    </group>
  );
}

export function Quarters() {
  return (
    <group>
      {Object.values(HALLS).map((h) => (
        <HallBuilding key={h.id} hall={h} />
      ))}
      {Object.values(FACULTIES).map((f) => (
        <FacultyBuilding key={f.id} faculty={f} />
      ))}
      <StudentUnion />
      {BILLBOARDS.map((b) => (
        <Billboard key={b.id} id={b.id} pos={b.pos} />
      ))}
    </group>
  );
}
