import {
  ACADEMICS,
  DAY,
  DEPTS,
  type DeptId,
  type HallId,
  HALLS,
  type Look,
  type NeedKey,
  type PlaceId,
  PLACES,
  type SkillKey,
  type Vec2,
} from "./data";

export interface Moodlet {
  id: string;
  label: string;
  emoji: string;
  value: number;
  until: number;
  desc: string;
}

export interface ExamRecord {
  level: number;
  semester: 1 | 2;
  score: number;
  grade: string;
  gp: number;
}

export type DegreeClass = "first" | "upper" | "lower" | "third" | "pass";

export interface UniState {
  status: "applicant" | "student" | "graduate";
  dept: DeptId;
  acceptancePaid: boolean;
  level: number;
  semester: 1 | 2;
  paidLevel: number;
  classes: number;
  prep: number;
  semStart: number;
  points: number;
  units: number;
  history: ExamRecord[];
  readyToGraduate: boolean;
  grad: { cls: DegreeClass; cgpa: number; at: number } | null;
  /** ASUU strike: no lectures or exams until this game time. */
  strikeUntil?: number;
}

export interface SaveState {
  version: 2;
  name: string;
  look: Look;
  hall: HallId;
  job: { id: string; since: number } | null;
  owned: string[];
  money: number;
  time: number;
  needs: Record<NeedKey, number>;
  skills: Record<SkillKey, number>;
  moodlets: Moodlet[];
  uni: UniState;
  pos: Vec2;
  lastAllowanceWeek: number;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const hourOf = (time: number) => (time % DAY) / 60;
export const dayIndex = (time: number) => Math.floor(time / DAY);
export const weekdayOf = (time: number) => dayIndex(time) % 7;

export function clockLabel(time: number) {
  const m = Math.floor(time % DAY);
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
}

export function hourLabel(h: number) {
  if (h === 0 || h === 24) return "midnight";
  if (h === 12) return "noon";
  return `${h % 12} ${h < 12 ? "AM" : "PM"}`;
}

export function isOpen(place: PlaceId, time: number) {
  const [from, to] = PLACES[place].open;
  const h = hourOf(time);
  return h >= from && h < to;
}

export function closedReason(place: PlaceId, time: number): string | null {
  if (isOpen(place, time)) return null;
  const [from, to] = PLACES[place].open;
  return `${PLACES[place].name} is open ${hourLabel(from)} – ${hourLabel(to)}`;
}

export function moodOf(s: SaveState) {
  const vals = Object.values(s.needs);
  const base = vals.reduce((a, b) => a + b, 0) / vals.length;
  const bonus = s.moodlets.reduce((a, m) => a + m.value, 0);
  return Math.max(0, Math.min(100, base + bonus));
}

export function moodFace(mood: number) {
  if (mood >= 80) return "😄";
  if (mood >= 60) return "🙂";
  if (mood >= 40) return "😐";
  if (mood >= 20) return "😟";
  return "😩";
}

export const levelLabel = (level: number) => `${level}00L`;

export function cgpaOf(u: UniState) {
  return u.units ? Math.round((u.points / u.units) * 100) / 100 : 0;
}

export function gradeOf(score: number) {
  if (score >= 70) return { grade: "A", gp: 5 };
  if (score >= 60) return { grade: "B", gp: 4 };
  if (score >= 50) return { grade: "C", gp: 3 };
  if (score >= 45) return { grade: "D", gp: 2 };
  if (score >= 40) return { grade: "E", gp: 1 };
  return { grade: "F", gp: 0 };
}

export const DEGREE_CLASSES: Record<DegreeClass, { label: string; emoji: string }> = {
  first: { label: "First Class Honours", emoji: "🥇" },
  upper: { label: "Second Class Upper (2:1)", emoji: "🥈" },
  lower: { label: "Second Class Lower (2:2)", emoji: "🥉" },
  third: { label: "Third Class", emoji: "🎓" },
  pass: { label: "Pass", emoji: "📜" },
};

export function classOf(cgpa: number): DegreeClass {
  if (cgpa >= 4.5) return "first";
  if (cgpa >= 3.5) return "upper";
  if (cgpa >= 2.4) return "lower";
  if (cgpa >= 1.5) return "third";
  return "pass";
}

export function naira(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

export function deptOf(s: SaveState) {
  return DEPTS[s.uni.dept];
}

export function examOpensIn(s: SaveState) {
  return s.uni.semStart + ACADEMICS.examWindowAfter - s.time;
}

export function durationLabel(minutes: number) {
  if (minutes >= DAY) {
    const d = Math.ceil(minutes / DAY);
    return `${d} day${d === 1 ? "" : "s"}`;
  }
  if (minutes >= 60) {
    const h = Math.ceil(minutes / 60);
    return `${h}h`;
  }
  return `${Math.max(1, Math.ceil(minutes))} min`;
}

/** Upgrades saves from older versions (local or cloud) to the current shape. */
export function normalizeSave(raw: SaveState | (Omit<SaveState, "version" | "hall" | "job" | "owned"> & { version: number })): SaveState {
  const s = { ...raw } as SaveState;
  if (!s.hall || !HALLS[s.hall]) s.hall = s.look.body === "f" ? "moremi" : "jaja";
  if (s.job === undefined) s.job = null;
  if (!s.owned) s.owned = [];
  if (!DEPTS[s.uni.dept]) s.uni = { ...s.uni, dept: "compsci" };
  s.version = 2;
  return s;
}
