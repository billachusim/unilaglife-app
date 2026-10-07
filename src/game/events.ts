import { WEEK } from "./data";
import { hourOf, weekdayOf } from "./state";

export type CampusEventId = "facultyWeek" | "carnival" | "interHall";

export interface CampusEvent {
  id: CampusEventId;
  label: string;
  emoji: string;
  blurb: string;
}

const EVENTS: Record<CampusEventId, CampusEvent> = {
  facultyWeek: { id: "facultyWeek", label: "Faculty Week", emoji: "🎉", blurb: "Dinner nights and awards at every faculty, 6 – 10 PM." },
  carnival: { id: "carnival", label: "Akoka Carnival", emoji: "🎭", blurb: "Floats from the Main Gate to the lagoon front, all day Saturday." },
  interHall: { id: "interHall", label: "Inter-Hall Games", emoji: "🏆", blurb: "Represent your hall at the Sports Centre today." },
};

/** A rotating calendar keyed to the game week, so every player shares the same events. */
export function campusEventAt(time: number): CampusEvent | null {
  const week = Math.floor(time / WEEK);
  const day = weekdayOf(time);
  if (day === 6) return EVENTS.interHall;
  if (week % 3 === 2 && day === 5) return EVENTS.carnival;
  if (week % 3 === 1 && day <= 4 && hourOf(time) >= 12) return EVENTS.facultyWeek;
  return null;
}
