import {
  ACADEMICS,
  DEPTS,
  ECONOMY,
  type NeedKey,
  type PlaceId,
  type SkillKey,
  type Vec2,
} from "./data";
import {
  classOf,
  cgpaOf,
  DEGREE_CLASSES,
  durationLabel,
  examOpensIn,
  gradeOf,
  hourOf,
  levelLabel,
  moodOf,
  naira,
  type SaveState,
  weekdayOf,
} from "./state";

export type Pose = "stand" | "sit" | "sleep" | "run" | "work" | "wave" | "halt";

export interface ActionDef {
  id: string;
  place: PlaceId;
  label: string | ((s: SaveState) => string);
  emoji: string;
  minutes: number;
  hint: string;
  cost?: number;
  earn?: (s: SaveState) => number;
  needs?: Partial<Record<NeedKey, number>>;
  skills?: Partial<Record<SkillKey, number>>;
  indoor?: boolean;
  pose?: Pose;
  stage?: Vec2;
  sleep?: boolean;
  lines?: string[];
  visible?: (s: SaveState) => boolean;
  check?: (s: SaveState) => string | null;
  apply?: (s: SaveState) => string | void;
}

const MOODLETS = {
  matriculated: { label: "Matriculated!", emoji: "🎓", value: 20, hours: 24, desc: "You swore the oath. You're officially an Akokite." },
  examDone: { label: "Papers Done", emoji: "📝", value: 14, hours: 8, desc: "Pens down. Free at last." },
  straightA: { label: "Straight A", emoji: "🌟", value: 18, hours: 12, desc: "An A! Your coursemates want your reading timetable." },
  carryOver: { label: "Carry-Over", emoji: "😩", value: -15, hours: 12, desc: "That course will see you again next session." },
  graduated: { label: "Graduated!", emoji: "👨🏾‍🎓", value: 40, hours: 72, desc: "Cap, gown, and Mummy crying with joy." },
  lagoonBreeze: { label: "Lagoon Breeze", emoji: "🌅", value: 12, hours: 4, desc: "Sunset over the lagoon, Third Mainland Bridge glowing." },
  mummyAlert: { label: "Mummy's Alert", emoji: "📲", value: 10, hours: 6, desc: "\"Your allowance has been sent. Read your books o!\"" },
} as const;

export type MoodletId = keyof typeof MOODLETS;

export function addMoodlet(s: SaveState, id: MoodletId) {
  const m = MOODLETS[id];
  s.moodlets = s.moodlets.filter((x) => x.id !== id);
  s.moodlets.push({ id, label: m.label, emoji: m.emoji, value: m.value, desc: m.desc, until: s.time + m.hours * 60 });
}

const isStudent = (s: SaveState) => s.uni.status === "student";

function studentGate(s: SaveState): string | null {
  const u = s.uni;
  if (u.status === "applicant") return "Matriculate at the Senate Building first";
  if (u.status === "graduate") return "You've graduated 🎓";
  if (u.paidLevel < u.level) return `Pay your ${levelLabel(u.level)} school fees at the Senate first`;
  if (u.readyToGraduate) return "All exams done — convocation awaits at the Senate";
  return null;
}

function classGate(s: SaveState): string | null {
  const gate = studentGate(s);
  if (gate) return gate;
  const day = weekdayOf(s.time);
  const h = hourOf(s.time);
  if (day >= 5 || h < 8 || h >= 18) return "Classes hold Mon – Fri, 8 AM – 6 PM";
  return null;
}

function examGate(s: SaveState): string | null {
  const gate = studentGate(s);
  if (gate) return gate;
  const h = hourOf(s.time);
  if (h < ACADEMICS.examOpens || h >= ACADEMICS.examCloses) return "Exams hold 8 AM – 8 PM";
  const need = ACADEMICS.minClasses - s.uni.classes;
  if (need > 0) return `Attend ${need} more class${need === 1 ? "" : "es"} first`;
  const wait = examOpensIn(s);
  if (wait > 0) return `Exams start in ${durationLabel(wait)}`;
  return null;
}

function bumpPrep(s: SaveState, n: number) {
  s.uni.prep = Math.min(ACADEMICS.maxPrep, s.uni.prep + n);
}

function courseCode(s: SaveState) {
  const d = DEPTS[s.uni.dept];
  return `${d.code} ${s.uni.level}0${s.uni.semester}`;
}

function runExam(s: SaveState): string {
  const u = s.uni;
  const dept = DEPTS[u.dept];
  const code = courseCode(s);
  const mood = moodOf(s);
  const raw =
    28 +
    Math.min(u.prep, ACADEMICS.maxPrep) * 0.85 +
    Math.min(u.classes, 5) * 3 +
    s.skills.academics * 2 +
    s.skills[dept.skill] * 0.8 +
    (mood - 50) * 0.12 +
    (Math.random() * 12 - 6);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const { grade, gp } = gradeOf(score);
  u.history.push({ level: u.level, semester: u.semester, score, grade, gp });
  u.points += gp * ACADEMICS.unitsPerSemester;
  u.units += ACADEMICS.unitsPerSemester;
  addMoodlet(s, grade === "A" ? "straightA" : grade === "F" ? "carryOver" : "examDone");

  if (u.semester === 1) {
    u.semester = 2;
  } else if (u.level < dept.years) {
    u.level += 1;
    u.semester = 1;
  } else {
    u.readyToGraduate = true;
  }
  u.classes = 0;
  u.prep = 0;
  u.semStart = s.time;

  const verdict = grade === "A" ? "🌟" : grade === "F" ? "😩 Carry-over." : "✅";
  return `${code}: you scored ${score} — ${grade} ${verdict} CGPA now ${cgpaOf(u).toFixed(2)}`;
}

function graduate(s: SaveState): string {
  const cgpa = cgpaOf(s.uni);
  const cls = classOf(cgpa);
  s.uni.status = "graduate";
  s.uni.readyToGraduate = false;
  s.uni.grad = { cls, cgpa, at: s.time };
  addMoodlet(s, "graduated");
  return `${DEGREE_CLASSES[cls].emoji} You graduated with ${DEGREE_CLASSES[cls].label}! CGPA ${cgpa.toFixed(2)}`;
}

const LAGOON_BENCH: Vec2 = [-25.6, -19.6];
const LAGOON_BENCH_2: Vec2 = [-21.8, -23.4];
const JETTY_END: Vec2 = [-33.4, -29.4];
const BUKA_SEAT: Vec2 = [-3.2, 14.65];

export const ACTIONS: ActionDef[] = [
  // ---------- Senate ----------
  {
    id: "payAcceptance",
    place: "senate",
    label: "Pay Acceptance Fee",
    emoji: "💳",
    minutes: 30,
    cost: ECONOMY.acceptanceFee,
    indoor: true,
    hint: "Secure your admission into UNILAG",
    visible: (s) => s.uni.status === "applicant" && !s.uni.acceptancePaid,
    apply: (s) => {
      s.uni.acceptancePaid = true;
      return "💳 Acceptance fee paid. Your admission is secured!";
    },
  },
  {
    id: "matriculate",
    place: "senate",
    label: "Take the Matriculation Oath",
    emoji: "🎓",
    minutes: 90,
    indoor: true,
    hint: "Become an official UNILAG student",
    needs: { social: 15, fun: 10 },
    visible: (s) => s.uni.status === "applicant" && s.uni.acceptancePaid,
    apply: (s) => {
      s.uni.status = "student";
      s.uni.semStart = s.time;
      s.uni.classes = 0;
      s.uni.prep = 0;
      addMoodlet(s, "matriculated");
      return "🎓 You took the oath. Welcome to UNILAG, great Akokite!";
    },
  },
  {
    id: "payFees",
    place: "senate",
    label: (s) => `Pay ${levelLabel(s.uni.level)} School Fees`,
    emoji: "🧾",
    minutes: 30,
    cost: ECONOMY.schoolFees,
    indoor: true,
    hint: "No fees, no lectures, no exams",
    visible: (s) => isStudent(s) && s.uni.paidLevel < s.uni.level,
    apply: (s) => {
      s.uni.paidLevel = s.uni.level;
      return `🧾 ${levelLabel(s.uni.level)} school fees paid. Back to class!`;
    },
  },
  {
    id: "checkResults",
    place: "senate",
    label: "Check Results on the Portal",
    emoji: "🖥️",
    minutes: 10,
    indoor: true,
    hint: "See your latest grade and CGPA",
    visible: (s) => s.uni.history.length > 0,
    apply: (s) => {
      const last = s.uni.history[s.uni.history.length - 1];
      return `🖥️ Last paper: ${last.score} (${last.grade}). CGPA ${cgpaOf(s.uni).toFixed(2)} over ${s.uni.history.length} semester${s.uni.history.length === 1 ? "" : "s"}`;
    },
  },
  {
    id: "convocation",
    place: "senate",
    label: "Attend Convocation",
    emoji: "👨🏾‍🎓",
    minutes: 240,
    indoor: true,
    hint: "Cap, gown, and your degree class",
    needs: { social: 30, fun: 30 },
    visible: (s) => s.uni.readyToGraduate,
    apply: graduate,
  },

  // ---------- Lecture theatres ----------
  {
    id: "lecture",
    place: "lectures",
    label: "Attend a Lecture",
    emoji: "📝",
    minutes: 60,
    indoor: true,
    hint: "Counts toward exam eligibility",
    needs: { energy: -5, fun: -4, social: 5 },
    skills: { academics: 0.25 },
    check: classGate,
    lines: [
      "The lecturer said \"this will come out in the exam\" twice. Noted 📝",
      "You sat in front. The lecturer now knows your face.",
      "Two-hour lecture, one working fan. You survived.",
    ],
    apply: (s) => {
      s.uni.classes += 1;
      bumpPrep(s, 2);
    },
  },
  {
    id: "tutorial",
    place: "lectures",
    label: "Attend a Tutorial",
    emoji: "👥",
    minutes: 90,
    indoor: true,
    hint: "Smaller class, better prep",
    needs: { energy: -6, social: 8 },
    skills: { academics: 0.3, charisma: 0.1 },
    check: classGate,
    lines: [
      "The tutor explained it slower. It finally made sense 💡",
      "Your group answered every question. The course rep was impressed.",
    ],
    apply: (s) => {
      s.uni.classes += 1;
      bumpPrep(s, 4);
    },
  },
  {
    id: "exam",
    place: "lectures",
    label: (s) => `Write ${courseCode(s)} Exam`,
    emoji: "✍🏾",
    minutes: 180,
    indoor: true,
    hint: "Prep, attendance and mood decide your grade",
    needs: { energy: -15, fun: -8 },
    visible: (s) => isStudent(s) && !s.uni.readyToGraduate,
    check: examGate,
    apply: runExam,
  },

  // ---------- Library ----------
  {
    id: "read",
    place: "library",
    label: "Read for 2 Hours",
    emoji: "📖",
    minutes: 120,
    indoor: true,
    hint: "Exam prep + academics",
    needs: { energy: -8, fun: -6 },
    skills: { academics: 0.5 },
    lines: [
      "Two hours, three chapters, zero group-chat distractions 📖",
      "You found a seat by the window. Cold AC, quiet floor. Bliss.",
    ],
    apply: (s) => {
      if (isStudent(s)) bumpPrep(s, 6);
    },
  },
  {
    id: "pastQuestions",
    place: "library",
    label: "Solve Past Questions",
    emoji: "🗂️",
    minutes: 90,
    cost: 300,
    indoor: true,
    hint: "Photocopies included — the best exam prep",
    needs: { energy: -6, fun: -4 },
    skills: { academics: 0.35 },
    check: (s) => (isStudent(s) ? null : "For current students"),
    lines: ["Same questions as 2019, slightly reworded. You see the pattern now 🗂️"],
    apply: (s) => bumpPrep(s, 8),
  },
  {
    id: "groupStudy",
    place: "library",
    label: "Group Study",
    emoji: "🤝",
    minutes: 120,
    indoor: true,
    hint: "Prep with coursemates",
    needs: { social: 18, energy: -6 },
    skills: { academics: 0.25, charisma: 0.2 },
    check: (s) => (isStudent(s) ? null : "For current students"),
    lines: ["Somebody explained it with a jollof analogy. Everybody got it 🤝"],
    apply: (s) => bumpPrep(s, 5),
  },
  {
    id: "typeAssignments",
    place: "library",
    label: "Type Assignments for Coursemates",
    emoji: "⌨️",
    minutes: 120,
    indoor: true,
    hint: "Campus side hustle",
    earn: (s) => 1500 + Math.floor(s.skills.hustle) * 150,
    needs: { energy: -8, fun: -5 },
    skills: { hustle: 0.4 },
    lines: ["Five assignments typed, five happy customers ⌨️", "Tired fingers, sweet transfer alerts."],
  },

  // ---------- Buka ----------
  {
    id: "riceBeans",
    place: "buka",
    label: "Rice, Beans & Dodo",
    emoji: "🍛",
    minutes: 30,
    cost: 700,
    pose: "sit",
    stage: BUKA_SEAT,
    hint: "The full campus meal",
    needs: { hunger: 45, fun: 4 },
    lines: ["Rice, beans, dodo and extra stew. Mama B no dey disappoint 🍛"],
  },
  {
    id: "spaghetti",
    place: "buka",
    label: "Jollof Spaghetti & Egg",
    emoji: "🍝",
    minutes: 25,
    cost: 550,
    pose: "sit",
    stage: BUKA_SEAT,
    hint: "Fast and filling",
    needs: { hunger: 35 },
    lines: ["Spaghetti with plenty pepper. You're sweating, but you're happy 🍝"],
  },
  {
    id: "akara",
    place: "buka",
    label: "Akara & Bread",
    emoji: "🥖",
    minutes: 15,
    cost: 300,
    pose: "sit",
    stage: BUKA_SEAT,
    hint: "Cheap and quick",
    needs: { hunger: 22 },
    lines: ["Hot akara straight from the oil. Worth the burnt tongue 🥖"],
  },
  {
    id: "pureWater",
    place: "buka",
    label: "Pure Water",
    emoji: "💧",
    minutes: 2,
    cost: 50,
    hint: "Cold sachet, hot afternoon",
    needs: { hunger: 3, energy: 2 },
    lines: ["Cold pure water on a hot afternoon. ₦50 well spent 💧"],
  },
  {
    id: "helpBuka",
    place: "buka",
    label: "Wash Plates for Mama B",
    emoji: "🧽",
    minutes: 120,
    pose: "work",
    hint: "Earn cash — she feeds you too",
    earn: (s) => 1200 + Math.floor(s.skills.hustle) * 120,
    needs: { energy: -10, hygiene: -10, social: 6, hunger: 10 },
    skills: { hustle: 0.35 },
    lines: ["Mama B paid you and packed extra dodo. Hustle pays 🧽"],
  },

  // ---------- Hall ----------
  {
    id: "sleep",
    place: "hall",
    label: "Sleep (8 hours)",
    emoji: "😴",
    minutes: 480,
    indoor: true,
    sleep: true,
    hint: "Restores energy",
    needs: { energy: 85 },
    lines: ["You slept like light was steady all night 😴", "Eight solid hours. Your roommate's snoring didn't win this time."],
  },
  {
    id: "nap",
    place: "hall",
    label: "Take a Nap",
    emoji: "💤",
    minutes: 60,
    indoor: true,
    sleep: true,
    hint: "A quick recharge",
    needs: { energy: 16 },
    lines: ["A short nap, fan blowing. Recharged 💤"],
  },
  {
    id: "bath",
    place: "hall",
    label: "Bucket Bath",
    emoji: "🚿",
    minutes: 20,
    indoor: true,
    hint: "Beat the morning queue",
    needs: { hygiene: 65, energy: 3 },
    lines: ["Bucket bath before the queue got long. Fresh! 🫧"],
  },
  {
    id: "hallGist",
    place: "hall",
    label: "Gist with Roommates",
    emoji: "🗣️",
    minutes: 60,
    indoor: true,
    hint: "Social + fun",
    needs: { social: 28, fun: 12, energy: -3 },
    skills: { charisma: 0.3 },
    lines: [
      "Somebody fried indomie at 3 AM and the gist hasn't stopped 😂",
      "You rated every lecturer in the department. Honestly.",
    ],
  },

  // ---------- Lagoon front ----------
  {
    id: "chill",
    place: "lagoon",
    label: "Chill by the Lagoon",
    emoji: "🌊",
    minutes: 60,
    pose: "sit",
    stage: LAGOON_BENCH,
    hint: "Best at sunset (5 – 7 PM)",
    needs: { fun: 22, social: 4, energy: 4 },
    lines: ["The lagoon breeze hit different today 🌊"],
    apply: (s) => {
      const h = hourOf(s.time);
      if (h >= 17 && h < 19.5) {
        addMoodlet(s, "lagoonBreeze");
        return "🌅 Sunset over the lagoon, Third Mainland Bridge glowing. Peace.";
      }
    },
  },
  {
    id: "photos",
    place: "lagoon",
    label: "Take Pictures on the Jetty",
    emoji: "📸",
    minutes: 30,
    stage: JETTY_END,
    hint: "Fun + social",
    needs: { fun: 12, social: 10 },
    skills: { charisma: 0.15 },
    lines: ["The jetty shot came out clean. Profile picture sorted 📸"],
  },
  {
    id: "linkUp",
    place: "lagoon",
    label: "Suya & Gist with Friends",
    emoji: "🍢",
    minutes: 90,
    cost: 600,
    pose: "sit",
    stage: LAGOON_BENCH_2,
    hint: "Big social boost",
    needs: { social: 32, fun: 18, hunger: 12 },
    skills: { charisma: 0.35 },
    lines: ["Suya, Chapman and gist by the water. Good evening 🍢"],
  },

  // ---------- Sports ----------
  {
    id: "football",
    place: "sports",
    label: "Play Football",
    emoji: "⚽",
    minutes: 90,
    pose: "run",
    stage: [26, 28],
    hint: "Fun, social, fitness — and sweat",
    needs: { fun: 28, social: 14, energy: -22, hygiene: -25, hunger: -8 },
    skills: { fitness: 0.45, charisma: 0.1 },
    lines: ["You scored and the whole hall will hear about it ⚽", "The match ended 3–3. Everyone is claiming victory."],
  },
  {
    id: "jog",
    place: "sports",
    label: "Jog Round the Track",
    emoji: "🏃🏾",
    minutes: 45,
    pose: "run",
    stage: [14.6, 28],
    hint: "Fitness",
    needs: { energy: -14, hygiene: -15, fun: 8 },
    skills: { fitness: 0.5 },
    lines: ["Four laps. Your legs are asking questions 🏃🏾"],
  },

  // ---------- Main gate ----------
  {
    id: "recharge",
    place: "mainGate",
    label: "Buy Airtime & Data",
    emoji: "📶",
    minutes: 10,
    cost: 500,
    hint: "Data na blood",
    needs: { social: 10, fun: 6 },
    lines: ["Data loaded. Back online 📶"],
  },
  {
    id: "yaba",
    place: "mainGate",
    label: "Take a Keke to Yaba",
    emoji: "🛺",
    minutes: 0,
    hint: "Leave campus",
    check: () => "Yaba and the rest of Lagos open in a later update 🚧",
  },
];

export const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a])) as Record<string, ActionDef>;

export const actionLabel = (a: ActionDef, s: SaveState) => (typeof a.label === "function" ? a.label(s) : a.label);

export function actionBlocker(a: ActionDef, s: SaveState): string | null {
  if (a.cost && s.money < a.cost) return `You need ${naira(a.cost)} — you have ${naira(s.money)}`;
  return a.check ? a.check(s) : null;
}
