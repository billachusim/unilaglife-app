import { type DegreeClass, type SaveState } from "./state";
import type { DeptId } from "./data";

export interface Job {
  id: string;
  title: string;
  employer: string;
  emoji: string;
  /** Naira per 8-hour shift before the degree bonus. */
  pay: number;
  /** Departments that qualify; empty means any degree. */
  depts: DeptId[];
  minClass?: DegreeClass;
  /** Students can take it from this level (SIWES/internships); omit for graduate-only roles. */
  studentFromLevel?: number;
}

export const JOBS: Job[] = [
  { id: "siwes", title: "SIWES Industrial Trainee", employer: "A Lagos engineering firm", emoji: "🦺", pay: 3000, depts: ["engineering", "electrical", "compsci", "microbiology", "architecture", "estate", "pharmacy"], studentFromLevel: 3 },
  { id: "campusRep", title: "Campus Brand Ambassador", employer: "A telco", emoji: "📣", pay: 2500, depts: [], studentFromLevel: 2 },
  { id: "bankTrainee", title: "Graduate Trainee", employer: "A tier-one bank on Marina", emoji: "🏦", pay: 12000, depts: ["accounting", "busadmin", "actuarial", "economics"], minClass: "lower" },
  { id: "softwareEng", title: "Software Engineer", employer: "A Yaba fintech startup", emoji: "💻", pay: 15000, depts: ["compsci", "engineering", "electrical"], minClass: "lower" },
  { id: "houseOfficer", title: "House Officer", employer: "LUTH, Idi-Araba", emoji: "🩻", pay: 14000, depts: ["medicine"] },
  { id: "dentalOfficer", title: "Dental House Officer", employer: "LUTH Dental Centre", emoji: "🦷", pay: 13000, depts: ["dentistry"] },
  { id: "pharmIntern", title: "Intern Pharmacist", employer: "A community pharmacy in Surulere", emoji: "💊", pay: 11000, depts: ["pharmacy"] },
  { id: "nurse", title: "Staff Nurse", employer: "A private hospital in Ikeja", emoji: "🩺", pay: 10000, depts: ["nursing"] },
  { id: "pupilLawyer", title: "Pupil Lawyer", employer: "Chambers on Broad Street", emoji: "⚖️", pay: 9000, depts: ["law"], minClass: "lower" },
  { id: "architect", title: "Graduate Architect", employer: "A Lekki design studio", emoji: "📐", pay: 10000, depts: ["architecture", "estate"] },
  { id: "labScientist", title: "Lab Scientist", employer: "A diagnostics lab in Yaba", emoji: "🔬", pay: 8000, depts: ["microbiology", "physiology", "anatomy"] },
  { id: "analyst", title: "Policy Analyst", employer: "A think tank in Ikoyi", emoji: "📈", pay: 9000, depts: ["economics", "polsci"], minClass: "upper" },
  { id: "producer", title: "Content Producer", employer: "A Lagos media house", emoji: "🎬", pay: 8000, depts: ["masscomm", "creativeArts", "english"] },
  { id: "teacher", title: "Secondary School Teacher", employer: "A college in Akoka", emoji: "🍎", pay: 6000, depts: ["education", "humanKinetics", "english"] },
  { id: "customerService", title: "Customer Experience Associate", employer: "A telco call centre", emoji: "🎧", pay: 5000, depts: [] },
];

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<string, Job>;

const CLASS_RANK: Record<DegreeClass, number> = { pass: 0, third: 1, lower: 2, upper: 3, first: 4 };

/** Degree class pays: a First earns 20% more on every shift. */
export const DEGREE_BONUS: Record<DegreeClass, number> = { first: 0.2, upper: 0.12, lower: 0.06, third: 0.03, pass: 0 };

export function jobBlocker(job: Job, s: SaveState): string | null {
  const u = s.uni;
  if (job.depts.length && !job.depts.includes(u.dept)) return "Your course doesn't qualify";
  if (u.status === "graduate") {
    if (job.studentFromLevel) return "For current students";
    if (job.minClass && CLASS_RANK[u.grad!.cls] < CLASS_RANK[job.minClass]) return `Needs at least a ${job.minClass === "upper" ? "2:1" : "2:2"}`;
    return null;
  }
  if (job.studentFromLevel && u.status === "student" && u.level >= job.studentFromLevel) return null;
  if (job.studentFromLevel) return `Open to students from ${job.studentFromLevel}00L`;
  return "For graduates";
}

export function shiftPay(job: Job, s: SaveState) {
  const bonus = s.uni.grad ? DEGREE_BONUS[s.uni.grad.cls] : 0;
  return Math.round(job.pay * (1 + bonus));
}
