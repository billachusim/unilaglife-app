export type PlaceId =
  | "mainGate"
  | "senate"
  | "library"
  | "lectures"
  | "buka"
  | "hall"
  | "lagoon"
  | "sports";

export type NeedKey = "energy" | "hunger" | "fun" | "social" | "hygiene";
export type SkillKey = "academics" | "fitness" | "charisma" | "hustle";
export type DeptId =
  | "compsci"
  | "engineering"
  | "masscomm"
  | "law"
  | "accounting"
  | "creativeArts"
  | "nursing"
  | "education";

export type Vec2 = [number, number];
export type Rect = [number, number, number, number]; // x0, z0, x1, z1

/** Game minutes that pass per real second while idle. One game day ≈ 24 real minutes. */
export const TIME_SCALE = 1;
/** Day 1 is a Monday, 7:00 AM. */
export const START_TIME = 7 * 60;
export const DAY = 1440;
export const WEEK = DAY * 7;

export const ECONOMY = {
  startMoney: 25000,
  acceptanceFee: 15000,
  schoolFees: 15000,
  allowance: 4000,
};

export const ACADEMICS = {
  unitsPerSemester: 18,
  minClasses: 3,
  maxPrep: 40,
  examWindowAfter: DAY,
  examOpens: 8,
  examCloses: 20,
};

export const NEED_LABELS: Record<NeedKey, { label: string; emoji: string }> = {
  energy: { label: "Energy", emoji: "⚡" },
  hunger: { label: "Food", emoji: "🍛" },
  fun: { label: "Fun", emoji: "🎉" },
  social: { label: "Social", emoji: "💬" },
  hygiene: { label: "Hygiene", emoji: "🫧" },
};

/** Points lost per game hour. */
export const NEED_DECAY: Record<NeedKey, number> = {
  energy: 3.2,
  hunger: 4.5,
  fun: 3,
  social: 2.4,
  hygiene: 2.2,
};

export const SKILL_LABELS: Record<SkillKey, { label: string; emoji: string }> = {
  academics: { label: "Academics", emoji: "📚" },
  fitness: { label: "Fitness", emoji: "🏃🏾" },
  charisma: { label: "Charisma", emoji: "🗣️" },
  hustle: { label: "Hustle", emoji: "💼" },
};

export interface Dept {
  id: DeptId;
  name: string;
  faculty: string;
  emoji: string;
  skill: SkillKey;
  years: number;
  code: string;
}

export const DEPTS: Record<DeptId, Dept> = {
  compsci: { id: "compsci", name: "Computer Science", faculty: "Faculty of Science", emoji: "💻", skill: "academics", years: 4, code: "CSC" },
  engineering: { id: "engineering", name: "Systems Engineering", faculty: "Faculty of Engineering", emoji: "⚙️", skill: "academics", years: 5, code: "SSG" },
  masscomm: { id: "masscomm", name: "Mass Communication", faculty: "Faculty of Social Sciences", emoji: "🎙️", skill: "charisma", years: 4, code: "MAC" },
  law: { id: "law", name: "Law", faculty: "Faculty of Law", emoji: "⚖️", skill: "charisma", years: 5, code: "LAW" },
  accounting: { id: "accounting", name: "Accounting", faculty: "Faculty of Management Sciences", emoji: "📊", skill: "hustle", years: 4, code: "ACC" },
  creativeArts: { id: "creativeArts", name: "Creative Arts", faculty: "Faculty of Arts", emoji: "🎭", skill: "charisma", years: 4, code: "CVA" },
  nursing: { id: "nursing", name: "Nursing Science", faculty: "College of Medicine", emoji: "🩺", skill: "fitness", years: 5, code: "NSC" },
  education: { id: "education", name: "Education", faculty: "Faculty of Education", emoji: "📚", skill: "charisma", years: 4, code: "EDU" },
};

export const DEPT_IDS = Object.keys(DEPTS) as DeptId[];

export interface Place {
  id: PlaceId;
  name: string;
  emoji: string;
  blurb: string;
  /** Where the label floats. */
  pos: Vec2;
  labelHeight: number;
  /** Where the player stands to use the place. */
  door: Vec2;
  /** Walking obstacles. */
  footprints: Rect[];
  /** Open hours [from, to) in 24h clock. */
  open: [number, number];
}

export const PLACES: Record<PlaceId, Place> = {
  mainGate: {
    id: "mainGate",
    name: "Main Gate",
    emoji: "🚧",
    blurb: "The way in from Akoka. Keke and danfo drivers shout 'Yaba! Yaba!' just outside.",
    pos: [54, 8],
    labelHeight: 8.5,
    door: [50, 8],
    footprints: [
      [52.8, 3.6, 55.2, 5.6],
      [52.8, 10.4, 55.2, 12.4],
      [48.5, 1.6, 51.5, 4.6],
    ],
    open: [0, 24],
  },
  senate: {
    id: "senate",
    name: "Senate Building",
    emoji: "🏛️",
    blurb: "Admissions, fees, results and convocation. Every Akokite climbs these steps sooner or later.",
    pos: [20, -1],
    labelHeight: 30,
    door: [20, 4.6],
    footprints: [[13, -5, 27, 3]],
    open: [8, 17],
  },
  library: {
    id: "library",
    name: "Main Library",
    emoji: "📚",
    blurb: "Quiet floors, cold AC and a seat you have to fight for during exams.",
    pos: [-6, -1],
    labelHeight: 11,
    door: [-6, 4.6],
    footprints: [[-13, -5, 1, 3]],
    open: [8, 22],
  },
  lectures: {
    id: "lectures",
    name: "Lecture Theatres",
    emoji: "📝",
    blurb: "Big halls, bigger classes. Sit in front if you want the lecturer to know your face.",
    pos: [18, -17.5],
    labelHeight: 12,
    door: [18, -10.8],
    footprints: [[9, -23, 27, -12]],
    open: [7, 21],
  },
  buka: {
    id: "buka",
    name: "Mama B's Buka",
    emoji: "🍛",
    blurb: "Rice, beans, dodo and the hottest gist on campus. Cash or transfer, no credit.",
    pos: [-6, 15],
    labelHeight: 6.5,
    door: [-4.4, 11.8],
    footprints: [[-11.2, 12.4, -5.8, 17.6]],
    open: [7, 21],
  },
  hall: {
    id: "hall",
    name: "Hall of Residence",
    emoji: "🛏️",
    blurb: "Four to a room, one socket, and the gist never stops. Home for the session.",
    pos: [-26, 23],
    labelHeight: 14,
    door: [-20.6, 22],
    footprints: [[-30, 14, -22, 32]],
    open: [0, 24],
  },
  lagoon: {
    id: "lagoon",
    name: "Lagoon Front",
    emoji: "🌅",
    blurb: "Breeze off the lagoon, Third Mainland Bridge on the horizon. Where Akoka comes to unwind.",
    pos: [-25, -21],
    labelHeight: 5,
    door: [-21, -16.5],
    footprints: [],
    open: [6, 22],
  },
  sports: {
    id: "sports",
    name: "Sports Centre",
    emoji: "⚽",
    blurb: "Faculty football, inter-hall games, and the track where you swear you'll start jogging.",
    pos: [26, 28],
    labelHeight: 9,
    door: [40.6, 24],
    footprints: [[16, 15, 36, 18.8]],
    open: [6, 20],
  },
};

export const PLACE_IDS = Object.keys(PLACES) as PlaceId[];

export interface Road {
  from: Vec2;
  to: Vec2;
  w: number;
}

export const ROADS: Road[] = [
  { from: [-34, 8], to: [60, 8], w: 4 },
  { from: [8, -30], to: [8, 44], w: 4 },
  { from: [-30, -8], to: [30, -8], w: 3.4 },
  { from: [-14, -8], to: [-14, -22], w: 3 },
  { from: [-19, 10], to: [-19, 23], w: 2.6 },
  { from: [41.5, 10], to: [41.5, 24], w: 2.6 },
];

export const ROUNDABOUT = { center: [8, 8] as Vec2, radius: 2.6 };

/** Promenade along the shore, rotated 45°. */
export const PROMENADE = { center: [-24, -20] as Vec2, length: 24, width: 5 };
export const JETTY = { from: [-27.2, -23.2] as Vec2, length: 11, width: 2.2 };

/** Land outline (x, z). Everything outside is the Lagos Lagoon. */
export const LAND: Vec2[] = [
  [-62, 30],
  [-72, 220],
  [220, 220],
  [220, -72],
  [30, -62],
  [8, -48],
  [-4, -40],
  [-18, -34],
  [-28, -24],
  [-38, -12],
  [-48, 8],
];

/** The campus fence: x ≤ CAMPUS.maxX and z ≤ CAMPUS.maxZ. Beyond it is Akoka town. */
export const CAMPUS = { maxX: 56, maxZ: 48 };

export const SKIN_TONES = ["#3b2219", "#5a3825", "#7a4a2c", "#8d5a3b", "#a86f4c", "#c68a62"];
export const HAIR_COLORS = ["#121010", "#2b1a12", "#5a3a22", "#8a1f2d", "#c9a24a"];
export const OUTFIT_COLORS = ["#1d3a6e", "#2f8f8a", "#c6882a", "#b23a48", "#f4f4f2", "#6d4aa8", "#1f1f1f", "#3f7d3a"];
export type HairStyle = "lowcut" | "afro" | "braids" | "bun";
export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "lowcut", label: "Low cut" },
  { id: "afro", label: "Afro" },
  { id: "braids", label: "Braids" },
  { id: "bun", label: "Bun" },
];

export interface Look {
  body: "m" | "f";
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: string;
  bottom: string;
  bag?: string;
  hat?: string;
}
