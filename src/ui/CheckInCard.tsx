"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  isStudentEmail,
  MATRIC_PATTERN,
  sendStudentCode,
  signInAsVisitor,
  STUDENT_EMAIL_DOMAIN,
  studentEmailFromMatric,
  useAuth,
  verifyStudentCode,
  VISITOR_PASS,
} from "@/game/auth";
import { useIntro } from "@/game/intro";
import { clockLabel, WEEKDAYS, weekdayOf } from "@/game/state";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-navy";

const RESEND_SECONDS = 60;

/**
 * The Main Gate register. Students show their ID (matric number), get a 6-digit code
 * in their UNILAG student mailbox, and read it back to the gateman.
 */
export function CheckInCard() {
  const configured = useAuth((s) => s.configured);
  const time = 7.25 * 60;
  const setGuardLine = useIntro((s) => s.setGuardLine);
  const [view, setView] = useState<"id" | "code">("id");
  const [useEmail, setUseEmail] = useState(false);
  const [matric, setMatric] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const target = useEmail ? email.trim().toLowerCase() : MATRIC_PATTERN.test(matric) ? studentEmailFromMatric(matric) : "";
  const idValid = useEmail ? isStudentEmail(email) : MATRIC_PATTERN.test(matric);

  const send = async (to: string) => {
    setBusy(true);
    setError(null);
    try {
      await sendStudentCode(to);
      setSentTo(to);
      setView("code");
      setWait(RESEND_SECONDS);
      setGuardLine("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitId = (e: FormEvent) => {
    e.preventDefault();
    if (idValid) send(target);
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyStudentCode(sentTo, code);
      setGuardLine("verified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work. Try again.");
      setBusy(false);
    }
  };

  const visitor = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInAsVisitor();
      setGuardLine("visitor");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't issue a visitor pass.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-[#fbf8ef] shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3 bg-navy px-4 py-2.5 text-white">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">UNILAG Security · Main Gate</div>
          <div className="font-display text-[17px] font-semibold leading-tight">Students&apos; Register</div>
        </div>
        <div className="num shrink-0 text-right text-[11px] text-white/75">
          {WEEKDAYS[weekdayOf(time)]}
          <br />
          {clockLabel(time)}
        </div>
      </div>

      <div className="bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,#e7dfc9_31px,#e7dfc9_32px)] px-4 pb-4 pt-3">
        {!configured ? (
          <p className="py-2 text-[13px] leading-snug text-ink-soft">
            The register isn&apos;t connected yet — add the Supabase keys to <code className="num">.env.local</code>.
          </p>
        ) : view === "id" ? (
          <form onSubmit={submitId} className="flex flex-col gap-2.5">
            {useEmail ? (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Student email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder={`you@${STUDENT_EMAIL_DOMAIN}`}
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Matric number</span>
                <input
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  maxLength={9}
                  value={matric}
                  onChange={(e) => setMatric(e.target.value.replace(/\D/g, ""))}
                  className={`${inputCls} num tracking-[0.2em]`}
                  placeholder="190805001"
                />
              </label>
            )}
            <p className="text-[12px] leading-snug text-ink-soft">
              {target && idValid ? (
                <>
                  We&apos;ll send a 6-digit code to <strong className="text-ink">{target}</strong>
                </>
              ) : useEmail ? (
                `Must end in @${STUDENT_EMAIL_DOMAIN}`
              ) : (
                "9 digits, as on your student ID card"
              )}
            </p>
            {error && <p className="text-[12px] text-alert">{error}</p>}
            <button
              type="submit"
              disabled={busy || !idValid}
              className="rounded-xl bg-navy px-4 py-2.5 text-[14px] font-semibold text-white transition enabled:hover:bg-navy-deep disabled:opacity-45"
            >
              {busy ? "Sending code…" : "Show ID & get code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setUseEmail((v) => !v);
                setError(null);
              }}
              className="self-start text-[12px] font-medium text-navy hover:underline"
            >
              {useEmail ? "Use my matric number instead" : "My student email isn't my matric number"}
            </button>
            {VISITOR_PASS && (
              <button
                type="button"
                onClick={visitor}
                disabled={busy}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-amber/70 bg-amber/10 px-4 py-2 text-[13px] font-semibold text-[#8a5a12] transition enabled:hover:bg-amber/20 disabled:opacity-50"
              >
                🪪 Visitor pass <span className="font-normal opacity-75">· testing only</span>
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={submitCode} className="flex flex-col gap-2.5">
            <p className="text-[13px] leading-snug text-ink">
              Code sent to <strong>{sentTo}</strong>. Check your school mail (and the Junk folder).
            </p>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">6-digit code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputCls} num text-center text-[22px] tracking-[0.5em]`}
                placeholder="••••••"
                autoFocus
              />
            </label>
            {error && <p className="text-[12px] text-alert">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="rounded-xl bg-navy px-4 py-2.5 text-[14px] font-semibold text-white transition enabled:hover:bg-navy-deep disabled:opacity-45"
            >
              {busy ? "Checking…" : "Enter campus"}
            </button>
            <div className="flex justify-between text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setView("id");
                  setCode("");
                  setError(null);
                  setGuardLine("checkin");
                }}
                className="font-medium text-ink-soft hover:text-ink"
              >
                ← Change ID
              </button>
              <button type="button" disabled={wait > 0 || busy} onClick={() => send(sentTo)} className="font-medium text-navy enabled:hover:underline disabled:text-ink-soft">
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
