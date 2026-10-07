"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIONS, actionBlocker, actionLabel } from "@/game/actions";
import { ACADEMICS, DEPTS, NEED_LABELS, type NeedKey, PLACE_IDS, PLACES, SKILL_LABELS, type SkillKey } from "@/game/data";
import { goToPlace } from "@/game/interaction";
import { objectiveFor } from "@/game/objective";
import {
  cgpaOf,
  classOf,
  clockLabel,
  closedReason,
  dayIndex,
  DEGREE_CLASSES,
  hourLabel,
  hourOf,
  levelLabel,
  moodFace,
  moodOf,
  naira,
  WEEKDAYS,
  weekdayOf,
} from "@/game/state";
import { isVisitor, matricOf, signOut, useAuth } from "@/game/auth";
import { pushCloudSave } from "@/game/cloud";
import { MAX_CHAT, sendChat, setChatOpen, useOnline } from "@/game/online";
import { beginWalk, toAdmission } from "@/game/intro";
import { useGame } from "@/game/store";

function Wordmark() {
  return (
    <div className="flex shrink-0 items-baseline font-display text-[19px] font-bold leading-none tracking-tight text-navy">
      <span className="sm:hidden">U</span>
      <span className="hidden sm:inline">Unilag</span>
      <span className="text-lagoon">
        <span className="sm:hidden">L</span>
        <span className="hidden sm:inline">Life</span>
      </span>
    </div>
  );
}

function Chip({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="flex shrink-0 flex-col whitespace-nowrap leading-tight" title={title}>
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">{label}</span>
      <span className="num text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

function TopBar() {
  const save = useGame((s) => s.save)!;
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const setProfileOpen = useGame((s) => s.setProfileOpen);
  const h = hourOf(save.time);
  const night = h < 6.3 || h >= 19;
  const u = save.uni;
  const mood = moodOf(save);
  const status =
    u.status === "applicant" ? "Fresher (admitted)" : u.status === "graduate" ? "Graduate" : `${levelLabel(u.level)} · Sem ${u.semester}`;

  return (
    <header className="glass pointer-events-auto flex items-center gap-2.5 rounded-2xl px-3 py-2 sm:gap-5 sm:px-4">
      <Wordmark />
      <div className="hidden h-7 w-px bg-line sm:block" />
      <div className="flex flex-1 items-center gap-3 overflow-x-auto sm:gap-5 [scrollbar-width:none]">
        <Chip label={`${night ? "🌙" : "☀️"} ${WEEKDAYS[weekdayOf(save.time)]} · D${dayIndex(save.time) + 1}`} value={clockLabel(save.time)} />
        <OnlineChip />
        <Chip label="Wallet" value={naira(save.money)} />
        <Chip label={DEPTS[u.dept].code} value={status} />
        {u.units > 0 && <Chip label="CGPA" value={cgpaOf(u).toFixed(2)} />}
      </div>
      <button
        type="button"
        onClick={() => setSpeed(speed === 4 ? 1 : speed * 2)}
        aria-label={`Game speed ${speed}×, tap to change`}
        className="num shrink-0 rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-navy ring-1 ring-line sm:hidden"
      >
        {speed}×
      </button>
      <div className="hidden items-center gap-1 rounded-full bg-paper p-0.5 sm:flex" role="group" aria-label="Game speed">
        {[1, 2, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSpeed(n)}
            className={`num rounded-full px-2 py-0.5 text-[11px] font-medium transition ${speed === n ? "bg-navy text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {n}×
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full bg-paper p-1 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-navy/40 sm:pr-3"
        title={`Mood ${Math.round(mood)}/100`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-base">{moodFace(mood)}</span>
        <span className="hidden max-w-24 truncate sm:inline">{save.name}</span>
      </button>
    </header>
  );
}

function ObjectiveCard() {
  const save = useGame((s) => s.save)!;
  const obj = objectiveFor(save);
  const closed = obj.place && !obj.urgent ? closedReason(obj.place, save.time) : null;
  return (
    <div className={`glass pointer-events-auto flex max-w-md items-center gap-3 self-start rounded-xl py-2.5 pl-3.5 pr-2.5 ${obj.urgent ? "ring-2 ring-alert/50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${obj.urgent ? "text-alert" : "text-amber"}`}>
          {obj.urgent ? "Urgent" : "Next step"}
        </div>
        <p className="text-[13px] leading-snug text-ink">{obj.text}</p>
        {closed && obj.place && (
          <p className="text-[11px] text-ink-soft">
            Opens at {hourLabel(PLACES[obj.place].open[0])}
            {hourOf(save.time) >= 19 || hourOf(save.time) < 5 ? " — get some sleep at your hall meanwhile" : " — grab breakfast or explore meanwhile"}
          </p>
        )}
      </div>
      {obj.place && (
        <button
          type="button"
          onClick={() => goToPlace(obj.place!)}
          className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-deep"
        >
          Go
        </button>
      )}
    </div>
  );
}

function barColor(v: number) {
  if (v >= 50) return "bg-lagoon";
  if (v >= 25) return "bg-amber";
  return "bg-alert";
}

function NeedsCard() {
  const needs = useGame((s) => s.save!.needs);
  return (
    <div className="glass pointer-events-auto w-44 rounded-xl px-3 py-2.5">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Needs</div>
      <div className="flex flex-col gap-1.5">
        {(Object.keys(NEED_LABELS) as NeedKey[]).map((k) => (
          <div key={k} className="grid grid-cols-[18px_1fr] items-center gap-1.5" title={`${NEED_LABELS[k].label} ${Math.round(needs[k])}`}>
            <span className="text-[13px] leading-none">{NEED_LABELS[k].emoji}</span>
            <div>
              <div className="flex justify-between text-[11px] leading-none text-ink-soft">
                <span>{NEED_LABELS[k].label}</span>
                <span className="num">{Math.round(needs[k])}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className={`h-full rounded-full transition-[width] duration-500 ${barColor(needs[k])}`} style={{ width: `${needs[k]}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dock() {
  const connected = useOnline((s) => s.connected);
  const chatOpen = useOnline((s) => s.chatOpen);
  const unread = useOnline((s) => s.unread);
  const follow = useGame((s) => s.follow);
  const setFollow = useGame((s) => s.setFollow);
  const here = useGame((s) => s.here);
  return (
    <nav className="glass pointer-events-auto flex items-center gap-0.5 overflow-x-auto rounded-2xl p-1 [scrollbar-width:none]" aria-label="Campus places">
      {PLACE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          title={PLACES[id].name}
          aria-label={`Walk to ${PLACES[id].name}`}
          onClick={() => goToPlace(id)}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition ${here === id ? "bg-navy" : "hover:bg-paper"}`}
        >
          {PLACES[id].emoji}
        </button>
      ))}
      <div className="mx-1 h-6 w-px shrink-0 bg-line" />
      {connected && (
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Campus chat"
          title="Campus chat"
          className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition ${chatOpen ? "bg-navy" : "hover:bg-paper"}`}
        >
          💬
          {unread > 0 && (
            <span className="num absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-alert px-1 text-[9px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => setFollow(true)}
        aria-label="Centre camera on me"
        title="Centre on me"
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg transition ${follow ? "text-lagoon" : "bg-amber/15 text-amber hover:bg-amber/25"}`}
      >
        ◎
      </button>
    </nav>
  );
}

function OnlineChip() {
  const configured = useAuth((s) => s.configured);
  const connected = useOnline((s) => s.connected);
  const count = useOnline((s) => Object.keys(s.peers).length);
  if (!configured) return null;
  return (
    <div className="flex shrink-0 flex-col whitespace-nowrap leading-tight" title="Students on campus right now">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">On campus</span>
      <span className="num flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-[#22c55e]" : "bg-ink-soft/40"}`} aria-hidden />
        {connected ? count + 1 : "…"}
      </span>
    </div>
  );
}

function ChatPanel() {
  const open = useOnline((s) => s.chatOpen);
  const chat = useOnline((s) => s.chat);
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat.length, open]);
  if (!open) return null;
  return (
    <section className="glass pointer-events-auto flex h-72 w-full flex-col overflow-hidden rounded-2xl sm:w-80" aria-label="Campus chat">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Campus gist</div>
          <div className="text-[12px] text-ink-soft">Everyone on campus can see this</div>
        </div>
        <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat" className="rounded-lg px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink">
          ✕
        </button>
      </div>
      <div ref={list} className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3.5 py-2.5">
        {chat.length === 0 && <p className="m-auto text-center text-[12px] text-ink-soft">No gist yet. Say hello to campus 👋🏾</p>}
        {chat.map((m) => (
          <p key={m.key} className="text-[13px] leading-snug text-ink">
            <span className={`font-semibold ${m.mine ? "text-navy" : "text-lagoon"}`}>{m.name}</span> {m.text}
          </p>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (sendChat(text)) setText("");
        }}
        className="flex gap-2 border-t border-line p-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHAT}
          placeholder="Say something…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[14px] outline-none focus:border-navy"
        />
        <button type="submit" disabled={!text.trim()} className="rounded-lg bg-navy px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </section>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none flex flex-col-reverse items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`glass pointer-events-auto max-w-md rounded-xl px-4 py-2 text-left text-[13px] leading-snug text-ink ${
            t.tone === "bad" ? "ring-1 ring-alert/40" : t.tone === "good" ? "ring-1 ring-lagoon/40" : ""
          }`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}

function PlacePanel() {
  const panel = useGame((s) => s.panel);
  const save = useGame((s) => s.save)!;
  const activity = useGame((s) => s.activity);
  const setPanel = useGame((s) => s.setPanel);
  const startAction = useGame((s) => s.startAction);
  if (!panel) return null;
  const place = PLACES[panel];
  const closed = closedReason(panel, save.time);
  const actions = ACTIONS.filter((a) => a.place === panel && (!a.visible || a.visible(save)));
  const allDay = place.open[0] === 0 && place.open[1] === 24;

  return (
    <section
      className="glass pointer-events-auto flex max-h-[min(70vh,560px)] w-full flex-col overflow-hidden rounded-t-2xl sm:w-[360px] sm:rounded-2xl"
      aria-label={place.name}
    >
      <div className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-xl">{place.emoji}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold leading-tight text-ink">{place.name}</h2>
          <p className={`text-[11px] font-medium ${closed ? "text-alert" : "text-lagoon"}`}>
            {closed ? `Closed · opens ${hourLabel(place.open[0])}` : allDay ? "Open 24 hours" : `Open · till ${hourLabel(place.open[1])}`}
          </p>
        </div>
        <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="rounded-lg px-2 py-1 text-ink-soft transition hover:bg-paper hover:text-ink">
          ✕
        </button>
      </div>
      <p className="px-4 pt-3 text-[13px] leading-relaxed text-ink-soft">{place.blurb}</p>
      {actions.length === 0 && <p className="px-4 pb-4 pt-2 text-[13px] text-ink-soft">Nothing to do here right now — check your next step.</p>}
      <ul className="flex flex-col gap-1.5 overflow-y-auto p-3">
        {actions.map((a) => {
          const running = activity?.actionId === a.id;
          const blocker = running ? null : (closed ?? actionBlocker(a, save));
          const busy = !!activity;
          const earn = a.earn?.(save);
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={!!blocker || busy}
                onClick={() => startAction(a.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-line transition enabled:hover:bg-paper enabled:hover:ring-navy/30 disabled:cursor-not-allowed"
              >
                <span className={`text-xl ${blocker ? "opacity-40" : ""}`}>{a.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold leading-tight ${blocker ? "text-ink-soft" : "text-ink"}`}>{actionLabel(a, save)}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
                    {running ? <span className="text-lagoon">{activity?.waiting ? "Heading there…" : "In progress…"}</span> : blocker ? <span className="text-alert">{blocker}</span> : a.hint}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  {a.minutes > 0 && <span className="num text-[11px] text-ink-soft">{a.minutes >= 60 ? `${+(a.minutes / 60).toFixed(1)}h` : `${a.minutes}m`}</span>}
                  {a.cost ? <span className="num text-[11px] font-medium text-alert">−{naira(a.cost)}</span> : null}
                  {earn ? <span className="num text-[11px] font-medium text-lagoon">+{naira(earn)}</span> : null}
                  {running && <span className="text-[10px] font-semibold uppercase tracking-wide text-lagoon">Now</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProfilePanel() {
  const open = useGame((s) => s.profileOpen);
  const save = useGame((s) => s.save)!;
  const setOpen = useGame((s) => s.setProfileOpen);
  const reset = useGame((s) => s.resetGame);
  const configured = useAuth((s) => s.configured);
  const user = useAuth((s) => s.user);
  const [confirm, setConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  if (!open) return null;

  const startOver = () => {
    reset();
    if (user) toAdmission();
    else beginWalk();
  };

  const leave = async () => {
    setLeaving(true);
    const current = useGame.getState().save;
    if (user && current) await pushCloudSave(user.id, current).catch(() => undefined);
    await signOut();
    reset();
    setLeaving(false);
    beginWalk();
  };
  const u = save.uni;
  const dept = DEPTS[u.dept];
  const cgpa = cgpaOf(u);
  const projected = u.units ? DEGREE_CLASSES[classOf(cgpa)] : null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={() => setOpen(false)}>
      <aside
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label="Student profile"
      >
        <div className="bg-navy px-5 pb-5 pt-6 text-white">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">University of Lagos · Student record</div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="-mr-2 -mt-1 rounded-lg px-2 py-1 text-white/80 hover:bg-white/10">
              ✕
            </button>
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold">{save.name}</h2>
          <p className="text-sm text-white/80">
            {dept.emoji} {dept.name} · {dept.faculty}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Level", u.status === "graduate" ? "Alumni" : levelLabel(u.level)],
              ["CGPA", u.units ? cgpa.toFixed(2) : "—"],
              ["Mood", `${Math.round(moodOf(save))}`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-white/10 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-white/60">{l}</div>
                <div className="num text-base">{v}</div>
              </div>
            ))}
          </div>
          {u.grad ? (
            <p className="mt-3 text-sm">
              {DEGREE_CLASSES[u.grad.cls].emoji} Graduated with <strong>{DEGREE_CLASSES[u.grad.cls].label}</strong>
            </p>
          ) : projected ? (
            <p className="mt-3 text-sm text-white/85">
              On track for {projected.emoji} {projected.label}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {u.status === "student" && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">This semester</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-paper px-3 py-2">
                  Classes <span className="num float-right">{u.classes}/{ACADEMICS.minClasses}</span>
                </div>
                <div className="rounded-lg bg-paper px-3 py-2">
                  Exam prep <span className="num float-right">{u.prep}/{ACADEMICS.maxPrep}</span>
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Skills</h3>
            <div className="mt-2 flex flex-col gap-2">
              {(Object.keys(SKILL_LABELS) as SkillKey[]).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                  <span>
                    {SKILL_LABELS[k].emoji} {SKILL_LABELS[k].label}
                    {dept.skill === k && <span className="ml-1.5 rounded bg-amber/15 px-1 text-[10px] font-semibold text-amber">CORE</span>}
                  </span>
                  <span className="num text-xs text-ink-soft">{save.skills[k].toFixed(1)} / 10</span>
                  <div className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${save.skills[k] * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Transcript</h3>
            {u.history.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No exams written yet.</p>
            ) : (
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                    <th className="pb-1 font-medium">Course</th>
                    <th className="pb-1 text-right font-medium">Score</th>
                    <th className="pb-1 text-right font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {u.history.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="num py-1.5">
                        {dept.code} {r.level}0{r.semester}
                      </td>
                      <td className="num py-1.5 text-right">{r.score}</td>
                      <td className={`num py-1.5 text-right font-semibold ${r.grade === "F" ? "text-alert" : r.grade === "A" ? "text-lagoon" : ""}`}>{r.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {save.moodlets.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Feelings</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {save.moodlets.map((m) => (
                  <li key={m.id} className="flex gap-2 text-sm">
                    <span>{m.emoji}</span>
                    <span className="flex-1">
                      <span className="font-semibold">{m.label}</span>{" "}
                      <span className={`num text-xs ${m.value >= 0 ? "text-lagoon" : "text-alert"}`}>
                        {m.value > 0 ? "+" : ""}
                        {m.value}
                      </span>
                      <span className="block text-xs text-ink-soft">{m.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {configured && user && (
            <section className="rounded-xl bg-paper px-3.5 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{isVisitor(user) ? "Visitor pass (testing)" : "Verified student"}</h3>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="min-w-0 flex-1 text-sm text-ink">
                  {matricOf(user) && <span className="num block">Matric {matricOf(user)}</span>}
                  <span className="block truncate text-xs text-ink-soft">{user.email ?? `Visitor ${user.id.slice(0, 6)}`}</span>
                </p>
                <button
                  type="button"
                  onClick={leave}
                  disabled={leaving}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-line hover:bg-white disabled:opacity-50"
                >
                  {leaving ? "Saving…" : "Sign out"}
                </button>
              </div>
            </section>
          )}

          <section className="border-t border-line pt-4">
            {confirm ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-ink-soft">Delete this save and start over?</span>
                <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-1.5 font-medium hover:bg-paper">
                  Keep
                </button>
                <button type="button" onClick={startOver} className="rounded-lg bg-alert px-3 py-1.5 font-semibold text-white">
                  Start over
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="text-sm font-medium text-ink-soft underline-offset-2 hover:text-alert hover:underline">
                Start a new student
              </button>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

export function Hud() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
      <div className="flex flex-col gap-2 p-2 sm:p-3">
        <TopBar />
        <ObjectiveCard />
      </div>
      <div className="flex-1" />
      <div className="flex items-end justify-between gap-2 p-2 sm:p-3">
        <div className="hidden sm:block">
          <NeedsCard />
        </div>
        <div className="absolute bottom-2 left-1/2 max-w-[calc(100%-1rem)] -translate-x-1/2 sm:bottom-3">
          <Dock />
        </div>
        <div className="absolute inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-3 sm:right-3">
          <PlacePanel />
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-28 sm:bottom-20">
        <Toasts />
      </div>
      <div className="absolute inset-x-2 bottom-16 sm:inset-x-auto sm:bottom-[13.5rem] sm:left-3">
        <ChatPanel />
      </div>
      <MobileNeeds />
      <ProfilePanel />
    </div>
  );
}

function MobileNeeds() {
  const needs = useGame((s) => s.save!.needs);
  return (
    <div className="glass pointer-events-auto absolute bottom-16 left-2 flex gap-2 rounded-xl px-2.5 py-1.5 sm:hidden">
      {(Object.keys(NEED_LABELS) as NeedKey[]).map((k) => (
        <div key={k} className="flex flex-col items-center gap-0.5" title={NEED_LABELS[k].label}>
          <span className="text-xs leading-none">{NEED_LABELS[k].emoji}</span>
          <div className="h-1 w-6 overflow-hidden rounded-full bg-ink/10">
            <div className={`h-full ${barColor(needs[k])}`} style={{ width: `${needs[k]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
