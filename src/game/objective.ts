import { myFacultyPlace, myHallPlace } from "./actions";
import { ACADEMICS, DEPTS, ECONOMY, FACULTIES, HALLS, type NeedKey, type PlaceId } from "./data";
import { durationLabel, examOpensIn, levelLabel, naira, type SaveState } from "./state";

export interface Objective {
  text: string;
  place: PlaceId | null;
  urgent?: boolean;
}

function needFix(k: NeedKey, s: SaveState): Objective {
  const hall = HALLS[s.hall].name;
  switch (k) {
    case "hunger":
      return { text: "You're starving — grab food at Mama B's Buka", place: "buka", urgent: true };
    case "energy":
      return { text: `You're exhausted — sleep at ${hall}`, place: myHallPlace(s), urgent: true };
    case "hygiene":
      return { text: `You need a bath — head to ${hall}`, place: myHallPlace(s), urgent: true };
    case "fun":
      return { text: "You need a break — unwind at the Lagoon Front", place: "lagoon", urgent: true };
    case "social":
      return { text: `You're lonely — gist with your roommates at ${hall}`, place: myHallPlace(s), urgent: true };
  }
}

export function objectiveFor(s: SaveState): Objective {
  const low = (Object.keys(s.needs) as NeedKey[]).filter((k) => s.needs[k] < 15).sort((a, b) => s.needs[a] - s.needs[b]);
  if (low.length) return needFix(low[0], s);

  const u = s.uni;
  if (u.status === "applicant") {
    return u.acceptancePaid
      ? { text: "Take the matriculation oath at the Senate Building", place: "senate" }
      : { text: `Pay your ${naira(ECONOMY.acceptanceFee)} acceptance fee at the Senate Building`, place: "senate" };
  }
  if (u.status === "graduate") {
    return s.job
      ? { text: "Work your shifts from the Main Gate (Mon – Fri, 7 – 10 AM) — a better degree class pays more", place: "mainGate" }
      : { text: "You're a UNILAG graduate! Find a job on the Careers board at the Senate Building", place: "senate" };
  }
  if (u.strikeUntil && s.time < u.strikeUntil) {
    return { text: "ASUU is on strike 🪧 — no classes for now. Hustle, gist, or attend an SUG rally", place: "sub" };
  }
  if (u.paidLevel < u.level) {
    if (s.money < ECONOMY.schoolFees) {
      return {
        text: `Raise ${naira(ECONOMY.schoolFees - s.money)} more for ${levelLabel(u.level)} fees — type assignments at the Library or wash plates at the Buka`,
        place: "library",
      };
    }
    return { text: `Pay your ${levelLabel(u.level)} school fees at the Senate Building`, place: "senate" };
  }
  if (u.readyToGraduate) return { text: "All exams done! Attend convocation at the Senate Building", place: "senate" };

  const dept = DEPTS[u.dept];
  const faculty = FACULTIES[dept.faculty];
  const sem = u.semester === 1 ? "first" : "second";
  if (u.classes < ACADEMICS.minClasses) {
    return {
      text: `Attend lectures at the ${faculty.name} for ${levelLabel(u.level)} ${sem} semester (${u.classes}/${ACADEMICS.minClasses}) — GST counts too`,
      place: myFacultyPlace(s),
    };
  }
  const wait = examOpensIn(s);
  if (wait > 0) {
    return { text: `Exams open in ${durationLabel(wait)} — prep at the Library (prep ${u.prep}/${ACADEMICS.maxPrep})`, place: "library" };
  }
  return { text: `Write your ${dept.code} ${u.level}0${u.semester} exam at the ${faculty.name}`, place: myFacultyPlace(s) };
}
