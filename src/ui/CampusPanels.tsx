"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/game/auth";
import {
  type Candidate,
  castVote,
  declareCandidacy,
  openPanel,
  refreshElection,
  refreshHallCup,
  termEndsAt,
  useCampus,
} from "@/game/campus";
import { DEPTS, FACULTIES, type FacultyId, HALL_IDS, HALLS } from "@/game/data";
import { DEGREE_BONUS, JOBS, jobBlocker, shiftPay } from "@/game/jobs";
import { POLICIES, POLICY_IDS, type PolicyId } from "@/game/policy";
import { DEGREE_CLASSES, naira } from "@/game/state";
import { useGame } from "@/game/store";

/** Change this to the inbox that handles advertising enquiries. */
export const ADVERTISE_CONTACT = "ads@unilaglife.app";

function Drawer({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-end bg-ink/30 sm:items-stretch" onClick={() => openPanel(null)}>
      <aside
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3 bg-navy px-5 pb-4 pt-5 text-white">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{eyebrow}</div>
            <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{title}</h2>
          </div>
          <button type="button" onClick={() => openPanel(null)} aria-label="Close" className="-mr-2 rounded-lg px-2 py-1 text-white/80 hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}

function SetupNotice() {
  const configured = useAuth((s) => s.configured);
  const dbMissing = useCampus((s) => s.dbMissing);
  if (!configured) return <p className="rounded-lg bg-paper p-3 text-sm text-ink-soft">Connect Supabase to turn on shared campus features.</p>;
  if (!dbMissing) return null;
  return (
    <p className="mb-4 rounded-lg bg-amber/15 p-3 text-sm leading-snug text-ink">
      This needs the campus tables. Run <code className="num text-[12px]">supabase/migrations/0003_campus.sql</code> in the Supabase SQL Editor, then reopen.
    </p>
  );
}

function HallChip({ hall }: { hall: string }) {
  const h = HALLS[hall as keyof typeof HALLS];
  if (!h) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft">
      <span className="h-2 w-2 rounded-full" style={{ background: h.color }} aria-hidden />
      {h.name}
    </span>
  );
}

function timeLeft(ms: number) {
  const h = Math.max(0, Math.floor(ms / 3600000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
}

function CandidateCard({ c, total, myVote, onVote, busy }: { c: Candidate; total: number; myVote: string | null; onVote: () => void; busy: boolean }) {
  const pct = total ? Math.round((c.votes / total) * 100) : 0;
  const policy = POLICIES[c.policy];
  const topFaculties = Object.entries(c.byFaculty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const mine = myVote === c.id;
  return (
    <li className={`rounded-xl p-3.5 ring-1 ${mine ? "bg-lagoon/5 ring-2 ring-lagoon" : "ring-line"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h4 className="text-[15px] font-semibold text-ink">{c.name}</h4>
            {!c.user_id && <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">seeded aspirant</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
            <HallChip hall={c.hall} />
            <span className="text-[11px] text-ink-soft">{DEPTS[c.dept as keyof typeof DEPTS]?.name ?? c.dept}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onVote}
          disabled={busy || mine}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${mine ? "bg-lagoon text-white" : "bg-navy text-white enabled:hover:bg-navy-deep"} disabled:cursor-default`}
        >
          {mine ? "✓ Your vote" : myVote ? "Switch vote" : "Vote"}
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-ink">“{c.manifesto}”</p>
      <p className="mt-1.5 text-[12px] text-ink-soft">
        {policy.emoji} <span className="font-semibold text-ink">{policy.label}</span> — {policy.effect}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-navy" style={{ width: `${pct}%` }} />
        </div>
        <span className="num w-20 text-right text-[12px] text-ink">
          {c.votes} · {pct}%
        </span>
      </div>
      {topFaculties.length > 0 && (
        <p className="mt-1.5 text-[11px] text-ink-soft">
          Strongest in {topFaculties.map(([f, n]) => `${FACULTIES[f as FacultyId]?.short ?? f} (${n})`).join(", ")}
        </p>
      )}
    </li>
  );
}

function SugPanel() {
  const { candidates, myVote, president, term } = useCampus();
  const save = useGame((s) => s.save)!;
  const user = useAuth((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifesto, setManifesto] = useState("");
  const [policy, setPolicy] = useState<PolicyId>("steadyLight");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    refreshElection();
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, []);
  const total = candidates.reduce((a, c) => a + c.votes, 0);
  const onBallot = candidates.some((c) => c.user_id && c.user_id === user?.id);
  const canRun = save.uni.status !== "applicant";

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer eyebrow={`Students' Union Government · Term ${term}`} title="SUG Elections">
      <SetupNotice />
      <section className="rounded-xl bg-paper p-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Sitting President</div>
        {president ? (
          <>
            <p className="mt-1 text-[15px] font-semibold text-ink">
              {president.name} <HallChip hall={president.hall} />
            </p>
            <p className="mt-0.5 text-[13px] text-ink">
              {POLICIES[president.policy].emoji} {POLICIES[president.policy].label} — <span className="text-lagoon">{POLICIES[president.policy].effect}</span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-ink-soft">No sitting President yet — this term&apos;s winner takes office next week.</p>
        )}
      </section>

      <div className="mt-5 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">This week&apos;s ballot</h3>
        <span className="num text-[11px] text-ink-soft">Polls close in {timeLeft(termEndsAt(term) - now)}</span>
      </div>
      {error && <p className="mt-2 text-[12px] text-alert">{error}</p>}
      <ul className="mt-2 flex flex-col gap-2.5">
        {candidates.map((c) => (
          <CandidateCard key={c.id} c={c} total={total} myVote={myVote} busy={busy} onVote={() => act(() => castVote(c.id))} />
        ))}
      </ul>

      <section className="mt-6 border-t border-line pt-5">
        <h3 className="font-display text-lg font-semibold text-ink">Run for President</h3>
        {onBallot ? (
          <p className="mt-1 text-[13px] text-lagoon">You&apos;re on this week&apos;s ballot. Campaign at the Student Union Building!</p>
        ) : !canRun ? (
          <p className="mt-1 text-[13px] text-ink-soft">Matriculate first — only students can run.</p>
        ) : (
          <form
            className="mt-2 flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => declareCandidacy(manifesto, policy));
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Your manifesto</span>
              <textarea
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                minLength={10}
                maxLength={280}
                required
                rows={3}
                placeholder="What will you do for Akokites?"
                className="rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-navy"
              />
              <span className="num self-end text-[10px] text-ink-soft">{manifesto.length}/280</span>
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Your promise (applies campus-wide if you win)</legend>
              {POLICY_IDS.map((id) => (
                <label key={id} className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 ring-1 ${policy === id ? "bg-navy/5 ring-navy" : "ring-line"}`}>
                  <input type="radio" name="policy" checked={policy === id} onChange={() => setPolicy(id)} className="mt-1 accent-[#1d3a6e]" />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">
                      {POLICIES[id].emoji} {POLICIES[id].label}
                    </span>
                    <span className="block text-[11px] text-ink-soft">{POLICIES[id].effect}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button type="submit" disabled={busy || manifesto.trim().length < 10} className="rounded-xl bg-navy px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40">
              Declare candidacy
            </button>
          </form>
        )}
      </section>
    </Drawer>
  );
}

function HallCupPanel() {
  const { hallCup, deansList } = useCampus();
  const save = useGame((s) => s.save)!;
  useEffect(() => {
    refreshHallCup();
  }, []);
  const ranked = [...HALL_IDS].sort((a, b) => (hallCup[b] ?? 0) - (hallCup[a] ?? 0));
  const max = Math.max(1, ...ranked.map((h) => hallCup[h] ?? 0));
  return (
    <Drawer eyebrow="Inter-hall rivalry" title="Hall Cup">
      <SetupNotice />
      <ol className="flex flex-col gap-2">
        {ranked.map((h, i) => {
          const pts = hallCup[h] ?? 0;
          const mine = h === save.hall;
          return (
            <li key={h} className={`grid grid-cols-[1.5rem_1fr_auto] items-center gap-2.5 rounded-lg px-2 py-1.5 ${mine ? "bg-lagoon/10" : ""}`}>
              <span className="num text-center text-[13px] font-semibold text-ink-soft">{i + 1}</span>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-ink">
                    {HALLS[h].name}
                    {mine && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-lagoon">your hall</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full" style={{ width: `${(pts / max) * 100}%`, background: HALLS[h].color }} />
                </div>
              </div>
              <span className="num w-12 text-right text-[13px] text-ink">{pts}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12px] leading-snug text-ink-soft">
        Earn points for your hall: exams (+2), football (+1), Faculty Week dinners (+1), the Akoka Carnival (+2) and Sunday Inter-Hall Games (+5).
      </p>

      <h3 className="mt-6 font-display text-lg font-semibold text-ink">Dean&apos;s List</h3>
      {deansList.length === 0 ? (
        <p className="mt-1 text-[13px] text-ink-soft">No CGPAs yet — write your first exam to get on the list.</p>
      ) : (
        <table className="mt-2 w-full text-[13px]">
          <tbody>
            {deansList.map((d, i) => (
              <tr key={`${d.name}-${i}`} className="border-t border-line">
                <td className="num w-6 py-1.5 text-ink-soft">{i + 1}</td>
                <td className="py-1.5">
                  <span className="font-semibold text-ink">{d.name}</span>
                  <br />
                  <span className="text-[11px] text-ink-soft">
                    {DEPTS[d.dept as keyof typeof DEPTS]?.name ?? d.dept} · {HALLS[d.hall]?.name}
                  </span>
                </td>
                <td className="num py-1.5 text-right font-semibold text-navy">{d.cgpa.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Drawer>
  );
}

function JobsPanel() {
  const save = useGame((s) => s.save)!;
  const applyJob = useGame((s) => s.applyJob);
  const quitJob = useGame((s) => s.quitJob);
  const current = save.job ? JOBS.find((j) => j.id === save.job!.id) : null;
  const grad = save.uni.grad;
  return (
    <Drawer eyebrow="UNILAG Career Services" title="Careers Board">
      <p className="text-[13px] leading-snug text-ink-soft">
        {grad ? (
          <>
            You graduated with <strong className="text-ink">{DEGREE_CLASSES[grad.cls].label}</strong> — every shift pays{" "}
            <strong className="text-lagoon">+{Math.round(DEGREE_BONUS[grad.cls] * 100)}%</strong>.
          </>
        ) : (
          "Students can take SIWES and campus roles; graduate roles open after convocation. A better degree class pays more on every shift."
        )}
      </p>
      {current && (
        <div className="mt-4 rounded-xl bg-lagoon/10 p-3.5 ring-1 ring-lagoon/30">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-lagoon">Your job</div>
          <p className="mt-1 text-[15px] font-semibold text-ink">
            {current.emoji} {current.title}
          </p>
          <p className="text-[12px] text-ink-soft">
            {current.employer} · <span className="num">{naira(shiftPay(current, save))}</span> per shift · start Mon – Fri, 7 – 10 AM from the Main Gate
          </p>
          <button type="button" onClick={quitJob} className="mt-2 text-[12px] font-medium text-alert hover:underline">
            Resign
          </button>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {JOBS.map((j) => {
          const blocked = jobBlocker(j, save);
          const isCurrent = current?.id === j.id;
          return (
            <li key={j.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-line">
              <span className={`text-xl ${blocked ? "opacity-40" : ""}`}>{j.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-semibold ${blocked ? "text-ink-soft" : "text-ink"}`}>{j.title}</span>
                <span className="block text-[11px] text-ink-soft">{j.employer}</span>
                <span className="block text-[11px]">{blocked ? <span className="text-alert">{blocked}</span> : <span className="text-lagoon">You qualify</span>}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="num text-[12px] text-ink">{naira(shiftPay(j, save))}</span>
                <button
                  type="button"
                  disabled={!!blocked || isCurrent}
                  onClick={() => applyJob(j.id)}
                  className="rounded-lg bg-navy px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-35"
                >
                  {isCurrent ? "Hired" : "Apply"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </Drawer>
  );
}

function AdvertisePanel() {
  return (
    <Drawer eyebrow="For brands" title="Advertise on UnilagLife">
      <p className="text-[14px] leading-snug text-ink">Put your brand in front of every UNILAG student, inside the campus they walk through every day.</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {[
          ["🪧", "Campus billboard", "6 spots along University Road, the halls and the Faculty Quad", "₦50,000 / 7 days"],
          ["🍛", "Buka menu sponsor", "Your brand on Mama B's menu, seen at every meal", "₦25,000 / 7 days"],
          ["🗳️", "SUG week partner", "Branding on the election board and campaign rallies", "Ask us"],
        ].map(([emoji, name, desc, price]) => (
          <li key={name} className="flex gap-3 rounded-xl p-3 ring-1 ring-line">
            <span className="text-xl">{emoji}</span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-ink">{name}</span>
              <span className="block text-[12px] text-ink-soft">{desc}</span>
            </span>
            <span className="num shrink-0 text-[12px] font-semibold text-navy">{price}</span>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${ADVERTISE_CONTACT}?subject=Advertising%20on%20UnilagLife`}
        className="mt-5 block rounded-xl bg-navy px-4 py-3 text-center text-[14px] font-semibold text-white hover:bg-navy-deep"
      >
        Email {ADVERTISE_CONTACT}
      </a>
    </Drawer>
  );
}

function SponsorModal() {
  const sponsor = useCampus((s) => s.sponsorOpen);
  if (!sponsor) return null;
  const close = () => useCampus.setState({ sponsorOpen: null });
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" onClick={close}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {sponsor.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.image_url} alt={sponsor.title} className="aspect-[15/8] w-full object-cover" />
        )}
        <div className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Sponsored</div>
          <h3 className="mt-1 text-[17px] font-semibold text-ink">{sponsor.title}</h3>
          <div className="mt-3 flex gap-2">
            {sponsor.link && (
              <a href={sponsor.link} target="_blank" rel="noopener noreferrer sponsored" className="flex-1 rounded-lg bg-navy px-3 py-2 text-center text-[13px] font-semibold text-white">
                Visit
              </a>
            )}
            <button type="button" onClick={close} className="flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink ring-1 ring-line">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CampusPanels() {
  const panel = useCampus((s) => s.panel);
  return (
    <>
      {panel === "sug" && <SugPanel />}
      {panel === "hallCup" && <HallCupPanel />}
      {panel === "jobs" && <JobsPanel />}
      {panel === "advertise" && <AdvertisePanel />}
      <SponsorModal />
    </>
  );
}
