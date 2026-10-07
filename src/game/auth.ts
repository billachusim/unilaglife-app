import type { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";

/** UNILAG student mailboxes. Only these addresses can join; the database enforces the same rule. */
export const STUDENT_EMAIL_DOMAIN = "live.unilag.edu.ng";
export const MATRIC_PATTERN = /^\d{9}$/;
/** Testing-only gate pass (Supabase anonymous sign-in). Never set NEXT_PUBLIC_VISITOR_PASS in production. */
export const VISITOR_PASS = process.env.NEXT_PUBLIC_VISITOR_PASS === "true";

interface AuthState {
  configured: boolean;
  ready: boolean;
  user: User | null;
}

export const useAuth = create<AuthState>(() => ({ configured: !!supabase, ready: !supabase, user: null }));

let started = false;

export function initAuth() {
  if (!supabase || started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => useAuth.setState({ ready: true, user: data.session?.user ?? null }));
  supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    if (next?.id !== useAuth.getState().user?.id) useAuth.setState({ user: next, ready: true });
  });
}

export function isStudentEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`);
}

export function studentEmailFromMatric(matric: string) {
  return `${matric.trim()}@${STUDENT_EMAIL_DOMAIN}`;
}

/** The matric number, when the student email is matric-based. */
export function matricOf(user: User | null) {
  const local = user?.email?.split("@")[0] ?? "";
  return MATRIC_PATTERN.test(local) ? local : null;
}

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/database error saving new user/i.test(msg)) return `Only UNILAG student emails (@${STUDENT_EMAIL_DOMAIN}) can enter.`;
  if (/rate limit|only request this after|security purposes/i.test(msg)) return "A code was sent recently. Wait a minute, then try again.";
  if (/anonymous sign-ins are disabled/i.test(msg))
    return "Visitor passes are switched off — enable Supabase → Authentication → Sign In / Providers → Allow anonymous sign-ins.";
  if (/expired|invalid|token/i.test(msg)) return "That code is wrong or has expired. Check the latest email and try again.";
  return msg || "Something went wrong. Try again.";
}

export async function sendStudentCode(email: string) {
  if (!supabase) throw new Error("Accounts aren't connected yet");
  if (!isStudentEmail(email)) throw new Error(`Use your UNILAG student email (@${STUDENT_EMAIL_DOMAIN}).`);
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  if (error) throw new Error(friendly(error));
}

export async function verifyStudentCode(email: string, code: string) {
  if (!supabase) throw new Error("Accounts aren't connected yet");
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
  if (error) throw new Error(friendly(error));
}

export async function signInAsVisitor() {
  if (!supabase) throw new Error("Accounts aren't connected yet");
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(friendly(error));
}

export const isVisitor = (user: User | null) => !!user?.is_anonymous;

export async function signOut() {
  await supabase?.auth.signOut();
}
