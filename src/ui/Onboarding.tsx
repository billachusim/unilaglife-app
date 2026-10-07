"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import {
  DEPT_IDS,
  DEPTS,
  type DeptId,
  ECONOMY,
  HAIR_COLORS,
  HAIR_STYLES,
  type Look,
  OUTFIT_COLORS,
  SKIN_TONES,
} from "@/game/data";
import { makeAgent } from "@/game/runtime";
import { naira } from "@/game/state";
import { useGame } from "@/game/store";
import { Avatar } from "@/scene/Avatar";

function Spinner({ look }: { look: Look }) {
  const agent = useMemo(() => makeAgent([0, 0], 0), []);
  useFrame((_, dt) => {
    agent.heading += dt * 0.6;
  });
  return <Avatar look={look} agent={agent} scale={1} />;
}

function Preview({ look }: { look: Look }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 4.6], fov: 34 }} dpr={[1, 2]} gl={{ alpha: true }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <group position={[0, -1.15, 0]}>
        <Spinner look={look} />
      </group>
    </Canvas>
  );
}

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-full ring-offset-2 transition ${value === c ? "ring-2 ring-navy" : "ring-1 ring-black/10 hover:ring-navy/40"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

export function Onboarding({ defaultName = "", onAccept }: { defaultName?: string; onAccept?: () => void }) {
  const newGame = useGame((s) => s.newGame);
  const [name, setName] = useState(defaultName);
  const [dept, setDept] = useState<DeptId>("compsci");
  const [look, setLook] = useState<Look>({
    body: "f",
    skin: SKIN_TONES[2],
    hair: "braids",
    hairColor: HAIR_COLORS[0],
    top: OUTFIT_COLORS[1],
    bottom: "#1f2937",
    bag: "#c6882a",
  });
  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));
  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 18;

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-navy/55 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            newGame(trimmed, look, dept);
            onAccept?.();
          }}
          className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="border-b-4 border-amber bg-navy px-5 py-4 text-white sm:px-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">University of Lagos · Office of the Registrar</div>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">Offer of Provisional Admission</h1>
            <p className="mt-1 text-sm text-white/80">The gateman hands you an envelope. Fill your details, accept the offer, and walk in.</p>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr] sm:p-7">
            <div className="flex flex-col items-center gap-3">
              <div className="h-60 w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#bde0fe] to-[#e9f5d8] sm:h-72">
                <Preview look={look} />
              </div>
              <div className="w-full rounded-lg bg-paper px-3 py-2 text-center text-xs text-ink-soft">
                You start with <span className="num font-semibold text-ink">{naira(ECONOMY.startMoney)}</span> from home.
                <br />
                Acceptance fee: <span className="num font-semibold text-ink">{naira(ECONOMY.acceptanceFee)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={18}
                  placeholder="e.g. Tolu Adebayo"
                  autoFocus
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[15px] text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-navy focus:bg-white"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Body">
                  <div className="flex gap-1.5">
                    {(
                      [
                        ["f", "Female"],
                        ["m", "Male"],
                      ] as const
                    ).map(([id, l]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => set({ body: id, hair: id === "m" ? "lowcut" : "braids" })}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${look.body === id ? "bg-navy text-white" : "bg-paper text-ink hover:bg-line"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Hair">
                  <div className="flex flex-wrap gap-1.5">
                    {HAIR_STYLES.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => set({ hair: h.id })}
                        className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${look.hair === h.id ? "bg-navy text-white" : "bg-paper text-ink hover:bg-line"}`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Skin tone">
                  <Swatches label="Skin tone" colors={SKIN_TONES} value={look.skin} onChange={(skin) => set({ skin })} />
                </Field>
                <Field label="Hair colour">
                  <Swatches label="Hair colour" colors={HAIR_COLORS} value={look.hairColor} onChange={(hairColor) => set({ hairColor })} />
                </Field>
                <Field label="Top">
                  <Swatches label="Top colour" colors={OUTFIT_COLORS} value={look.top} onChange={(top) => set({ top })} />
                </Field>
                <Field label={look.body === "f" ? "Skirt / trousers" : "Trousers"}>
                  <Swatches
                    label="Bottom colour"
                    colors={["#1f2937", "#2f4a7a", "#3b2f2a", "#6b7280", "#b23a48", "#f4f4f2"]}
                    value={look.bottom}
                    onChange={(bottom) => set({ bottom })}
                  />
                </Field>
              </div>

              <Field label="Course of study">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {DEPT_IDS.map((id) => {
                    const d = DEPTS[id];
                    const on = dept === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDept(id)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left ring-1 transition ${on ? "bg-navy/5 ring-2 ring-navy" : "ring-line hover:ring-navy/40"}`}
                      >
                        <span className="text-lg">{d.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold leading-tight text-ink">{d.name}</span>
                          <span className="block text-[11px] text-ink-soft">
                            {d.faculty} · {d.years} yrs
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <button
                type="submit"
                disabled={!valid}
                className="mt-1 rounded-xl bg-navy px-5 py-3 text-[15px] font-semibold text-white transition enabled:hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                Accept admission &amp; enter campus
              </button>
              {!valid && name.length > 0 && <p className="-mt-3 text-xs text-alert">Name should be 2–18 characters.</p>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
