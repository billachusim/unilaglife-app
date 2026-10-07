import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { addMoodlet } from "./actions";
import { DEPTS, type HallId, HALL_IDS, type Look } from "./data";
import { campusPolicy, type PolicyId } from "./policy";
import { cgpaOf, type SaveState } from "./state";
import { actionListeners, useGame } from "./store";

export const TERM_SECONDS = 604800;
export const currentTerm = () => Math.floor(Date.now() / 1000 / TERM_SECONDS);
export const termEndsAt = (term: number) => (term + 1) * TERM_SECONDS * 1000;

export interface Candidate {
  id: string;
  term: number;
  user_id: string | null;
  name: string;
  hall: HallId;
  dept: string;
  manifesto: string;
  policy: PolicyId;
  look: Look | null;
  votes: number;
  byFaculty: Record<string, number>;
}

export interface Sponsor {
  id: string;
  placement: "billboard" | "buka";
  title: string;
  image_url: string | null;
  link: string | null;
  ends_at: string;
}

export interface DeanEntry {
  name: string;
  hall: HallId;
  dept: string;
  cgpa: number;
}

export type CampusPanel = "sug" | "hallCup" | "jobs" | "advertise";

interface CampusState {
  /** True when the 0003 migration hasn't been run on this Supabase project yet. */
  dbMissing: boolean;
  hallCup: Record<string, number>;
  deansList: DeanEntry[];
  term: number;
  candidates: Candidate[];
  myVote: string | null;
  president: Candidate | null;
  sponsors: Record<string, Sponsor>;
  panel: CampusPanel | null;
  sponsorOpen: Sponsor | null;
}

export const useCampus = create<CampusState>(() => ({
  dbMissing: false,
  hallCup: {},
  deansList: [],
  term: currentTerm(),
  candidates: [],
  myVote: null,
  president: null,
  sponsors: {},
  panel: null,
  sponsorOpen: null,
}));

export const openPanel = (panel: CampusPanel | null) => useCampus.setState({ panel });

function missing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST202" || /does not exist|schema cache/i.test(error.message ?? "")) {
    useCampus.setState({ dbMissing: true });
    return true;
  }
  return false;
}

let userId: string | null = null;
let visitor = false;

// ---------------------------------------------------------------- profile
let lastProfile = "";
async function syncProfile() {
  const save = useGame.getState().save;
  if (!supabase || !userId || !save) return;
  const row = {
    user_id: userId,
    name: save.name,
    hall: save.hall,
    dept: save.uni.dept,
    faculty: DEPTS[save.uni.dept].faculty,
    level: save.uni.level,
    cgpa: cgpaOf(save.uni),
    status: save.uni.status,
    look: save.look,
    is_visitor: visitor,
    updated_at: new Date().toISOString(),
  };
  const key = JSON.stringify({ ...row, updated_at: "" });
  if (key === lastProfile) return;
  const { error } = await supabase.from("profiles").upsert(row);
  if (!missing(error) && !error) lastProfile = key;
}

// ---------------------------------------------------------------- Hall Cup
export async function refreshHallCup() {
  if (!supabase) return;
  const [cup, deans] = await Promise.all([
    supabase.from("hall_points").select("hall, points"),
    supabase.from("profiles").select("name, hall, dept, cgpa").gt("cgpa", 0).order("cgpa", { ascending: false }).limit(10),
  ]);
  if (missing(cup.error)) return;
  const hallCup: Record<string, number> = Object.fromEntries(HALL_IDS.map((h) => [h, 0]));
  for (const r of cup.data ?? []) hallCup[r.hall] = Number(r.points);
  useCampus.setState({
    hallCup,
    deansList: (deans.data ?? []).map((d) => ({ ...d, cgpa: Number(d.cgpa) })) as DeanEntry[],
    dbMissing: false,
  });
}

async function awardHallPoints(points: number) {
  if (!supabase || !userId) return;
  await syncProfile();
  const { error } = await supabase.rpc("award_hall_points", { p_points: points });
  if (!error) refreshHallCup();
}

// ---------------------------------------------------------------- SUG
async function results(term: number) {
  const { data, error } = await supabase!.rpc("sug_results", { p_term: term });
  if (error) return new Map<string, { votes: number; byFaculty: Record<string, number> }>();
  return new Map(
    (data as { candidate_id: string; votes: number; by_faculty: Record<string, number> }[]).map((r) => [
      r.candidate_id,
      { votes: Number(r.votes), byFaculty: r.by_faculty ?? {} },
    ]),
  );
}

export async function refreshElection() {
  if (!supabase) return;
  const term = currentTerm();
  await Promise.all([supabase.rpc("sug_ensure_npcs", { p_term: term }), supabase.rpc("sug_ensure_npcs", { p_term: term - 1 })]);
  const { data, error } = await supabase.from("sug_candidates").select("*").in("term", [term, term - 1]).order("created_at");
  if (missing(error) || !data) return;
  const [now, prev] = await Promise.all([results(term), results(term - 1)]);
  const withVotes = (c: Omit<Candidate, "votes" | "byFaculty">, r: Map<string, { votes: number; byFaculty: Record<string, number> }>): Candidate => ({
    ...c,
    votes: r.get(c.id)?.votes ?? 0,
    byFaculty: r.get(c.id)?.byFaculty ?? {},
  });
  const rows = data as Omit<Candidate, "votes" | "byFaculty">[];
  const candidates = rows.filter((c) => c.term === term).map((c) => withVotes(c, now));
  const previous = rows.filter((c) => c.term === term - 1).map((c) => withVotes(c, prev));
  const president = previous.length ? previous.reduce((a, b) => (b.votes > a.votes ? b : a)) : null;
  campusPolicy.current = president?.policy ?? null;

  let myVote: string | null = null;
  if (userId) {
    const v = await supabase.from("sug_votes").select("candidate_id").eq("term", term).eq("voter_id", userId).maybeSingle();
    myVote = (v.data?.candidate_id as string | undefined) ?? null;
  }
  useCampus.setState({ term, candidates: candidates.sort((a, b) => b.votes - a.votes), president, myVote, dbMissing: false });
}

export async function castVote(candidateId: string) {
  const save = useGame.getState().save;
  if (!supabase || !userId || !save) throw new Error("Sign in to vote");
  const first = !useCampus.getState().myVote;
  const { error } = await supabase
    .from("sug_votes")
    .upsert({ term: currentTerm(), voter_id: userId, candidate_id: candidateId, faculty: DEPTS[save.uni.dept].faculty });
  if (error) throw new Error(error.message);
  if (first) {
    const s: SaveState = structuredClone(save);
    addMoodlet(s, "aluta");
    useGame.setState({ save: s });
  }
  useGame.getState().pushToast(first ? "✊🏾 Vote cast! Aluta continua!" : "Vote changed ✊🏾", "good");
  await refreshElection();
}

export async function declareCandidacy(manifesto: string, policy: PolicyId) {
  const save = useGame.getState().save;
  if (!supabase || !userId || !save) throw new Error("Sign in to run");
  const { error } = await supabase.from("sug_candidates").insert({
    term: currentTerm(),
    user_id: userId,
    name: save.name,
    hall: save.hall,
    dept: save.uni.dept,
    manifesto: manifesto.trim(),
    policy,
    look: save.look,
  });
  if (error) throw new Error(/duplicate/i.test(error.message) ? "You're already on this term's ballot" : error.message);
  useGame.getState().pushToast("📢 You're on the ballot! Go and campaign — rallies at the Student Union Building.", "good");
  await refreshElection();
}

// ---------------------------------------------------------------- sponsors
export async function refreshSponsors() {
  if (!supabase) return;
  const { data, error } = await supabase.from("sponsor_slots").select("*");
  if (missing(error)) return;
  useCampus.setState({ sponsors: Object.fromEntries(((data ?? []) as Sponsor[]).map((s) => [s.id, s])) });
}

// ---------------------------------------------------------------- lifecycle
/** Starts syncing shared campus state for a signed-in student. Returns a cleanup. */
export function startCampus(uid: string, isVisitor: boolean) {
  userId = uid;
  visitor = isVisitor;
  lastProfile = "";
  syncProfile();
  refreshHallCup();
  refreshElection();
  refreshSponsors();

  const onAction = (def: { hallPoints?: number }) => {
    if (def.hallPoints) awardHallPoints(def.hallPoints);
  };
  actionListeners.add(onAction);
  const timers = [
    window.setInterval(syncProfile, 30000),
    window.setInterval(refreshHallCup, 60000),
    window.setInterval(refreshElection, 60000),
    window.setInterval(refreshSponsors, 300000),
  ];
  return () => {
    actionListeners.delete(onAction);
    timers.forEach(window.clearInterval);
    userId = null;
  };
}
