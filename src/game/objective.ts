import { ACADEMICS, DEPTS, ECONOMY, type NeedKey, type PlaceId } from "./data";
import { durationLabel, examOpensIn, levelLabel, naira, type SaveState } from "./state";

export interface Objective {
  text: string;
  place: PlaceId | null;
  urgent?: boolean;
}

const NEED_FIX: Record<NeedKey, Objective> = {
  hunger: { text: "You're starving — grab food at Mama B's Buka", place: "buka", urgent: true },
  energy: { text: "You're exhausted — sleep at your hall", place: "hall", urgent: true },
  hygiene: { text: "You need a bath — head to your hall", place: "hall", urgent: true },
  fun: { text: "You need a break — unwind at the Lagoon Front", place: "lagoon", urgent: true },
  social: { text: "You're lonely — gist with your roommates at the hall", place: "hall", urgent: true },
};

export function objectiveFor(s: SaveState): Objective {
  const low = (Object.keys(s.needs) as NeedKey[]).filter((k) => s.needs[k] < 15).sort((a, b) => s.needs[a] - s.needs[b]);
  if (low.length) return NEED_FIX[low[0]];

  const u = s.uni;
  if (u.status === "applicant") {
    return u.acceptancePaid
      ? { text: "Take the matriculation oath at the Senate Building", place: "senate" }
      : { text: `Pay your ${naira(ECONOMY.acceptanceFee)} acceptance fee at the Senate Building`, place: "senate" };
  }
  if (u.status === "graduate") {
    return { text: "You're a UNILAG graduate! Yaba and the wider city open in a later update", place: null };
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
  const sem = u.semester === 1 ? "first" : "second";
  if (u.classes < ACADEMICS.minClasses) {
    return {
      text: `Attend lectures for ${levelLabel(u.level)} ${sem} semester (${u.classes}/${ACADEMICS.minClasses})`,
      place: "lectures",
    };
  }
  const wait = examOpensIn(s);
  if (wait > 0) {
    return { text: `Exams open in ${durationLabel(wait)} — prep at the Library (prep ${u.prep}/${ACADEMICS.maxPrep})`, place: "library" };
  }
  return { text: `Write your ${dept.code} ${u.level}0${u.semester} exam at the Lecture Theatres`, place: "lectures" };
}
