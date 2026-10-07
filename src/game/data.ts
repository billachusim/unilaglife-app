export type FacultyId =
  | "science"
  | "engineering"
  | "environmental"
  | "socialSciences"
  | "management"
  | "law"
  | "arts"
  | "education"
  | "pharmacy"
  | "basicMedical"
  | "clinical"
  | "dental";

export type HallId = "jaja" | "mariere" | "eniNjoku" | "elKanemi" | "moremi" | "kofoAdemola" | "madamTinubu" | "queenAmina";

export type CorePlaceId = "mainGate" | "senate" | "library" | "lectures" | "buka" | "lagoon" | "sports" | "sub";
export type PlaceId = CorePlaceId | `hall:${HallId}` | `fac:${FacultyId}`;

export type NeedKey = "energy" | "hunger" | "fun" | "social" | "hygiene";
export type SkillKey = "academics" | "fitness" | "charisma" | "hustle";
export type DeptId =
  | "compsci"
  | "microbiology"
  | "engineering"
  | "electrical"
  | "architecture"
  | "estate"
  | "masscomm"
  | "economics"
  | "polsci"
  | "accounting"
  | "busadmin"
  | "actuarial"
  | "law"
  | "creativeArts"
  | "english"
  | "education"
  | "humanKinetics"
  | "pharmacy"
  | "physiology"
  | "anatomy"
  | "medicine"
  | "nursing"
  | "dentistry";

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

export interface Faculty {
  id: FacultyId;
  name: string;
  short: string;
  emoji: string;
  accent: string;
  /** Grid slot in the Faculty Quad: [column 0–2, row 0–3]. */
  slot: [number, number];
}

export const FACULTIES: Record<FacultyId, Faculty> = {
  science: { id: "science", name: "Faculty of Science", short: "Science", emoji: "🔬", accent: "#2f6b9a", slot: [0, 0] },
  engineering: { id: "engineering", name: "Faculty of Engineering", short: "Engineering", emoji: "⚙️", accent: "#c6882a", slot: [1, 0] },
  environmental: { id: "environmental", name: "Faculty of Environmental Sciences", short: "Environmental", emoji: "📐", accent: "#5b7a2f", slot: [2, 0] },
  socialSciences: { id: "socialSciences", name: "Faculty of Social Sciences", short: "Social Sciences", emoji: "🗞️", accent: "#6d4aa8", slot: [0, 1] },
  management: { id: "management", name: "Faculty of Management Sciences", short: "Management", emoji: "📊", accent: "#1f5f8b", slot: [1, 1] },
  law: { id: "law", name: "Faculty of Law", short: "Law", emoji: "⚖️", accent: "#6d1f2b", slot: [2, 1] },
  arts: { id: "arts", name: "Faculty of Arts", short: "Arts", emoji: "🎭", accent: "#b23a48", slot: [0, 2] },
  education: { id: "education", name: "Faculty of Education", short: "Education", emoji: "🍎", accent: "#3f7d3a", slot: [1, 2] },
  pharmacy: { id: "pharmacy", name: "Faculty of Pharmacy", short: "Pharmacy", emoji: "💊", accent: "#2f8f8a", slot: [2, 2] },
  basicMedical: { id: "basicMedical", name: "Faculty of Basic Medical Sciences", short: "Basic Medical", emoji: "🧬", accent: "#9a3b6b", slot: [0, 3] },
  clinical: { id: "clinical", name: "Faculty of Clinical Sciences", short: "Clinical", emoji: "🩺", accent: "#b03030", slot: [1, 3] },
  dental: { id: "dental", name: "Faculty of Dental Sciences", short: "Dental", emoji: "🦷", accent: "#3b8fb0", slot: [2, 3] },
};

export const FACULTY_IDS = Object.keys(FACULTIES) as FacultyId[];

export interface Dept {
  id: DeptId;
  name: string;
  faculty: FacultyId;
  emoji: string;
  skill: SkillKey;
  years: number;
  code: string;
}

const dept = (id: DeptId, name: string, faculty: FacultyId, emoji: string, skill: SkillKey, years: number, code: string): Dept => ({
  id,
  name,
  faculty,
  emoji,
  skill,
  years,
  code,
});

export const DEPTS: Record<DeptId, Dept> = {
  compsci: dept("compsci", "Computer Science", "science", "💻", "academics", 4, "CSC"),
  microbiology: dept("microbiology", "Microbiology", "science", "🦠", "academics", 4, "MCB"),
  engineering: dept("engineering", "Systems Engineering", "engineering", "⚙️", "academics", 5, "SSG"),
  electrical: dept("electrical", "Electrical & Electronics Engineering", "engineering", "🔌", "academics", 5, "EEG"),
  architecture: dept("architecture", "Architecture", "environmental", "🏛️", "hustle", 4, "ARC"),
  estate: dept("estate", "Estate Management", "environmental", "🏘️", "hustle", 4, "ESM"),
  masscomm: dept("masscomm", "Mass Communication", "socialSciences", "🎙️", "charisma", 4, "MAC"),
  economics: dept("economics", "Economics", "socialSciences", "📈", "academics", 4, "ECO"),
  polsci: dept("polsci", "Political Science", "socialSciences", "🗳️", "charisma", 4, "POL"),
  accounting: dept("accounting", "Accounting", "management", "🧮", "hustle", 4, "ACC"),
  busadmin: dept("busadmin", "Business Administration", "management", "💼", "hustle", 4, "BUS"),
  actuarial: dept("actuarial", "Actuarial Science & Insurance", "management", "📉", "academics", 4, "ACT"),
  law: dept("law", "Law", "law", "⚖️", "charisma", 5, "LAW"),
  creativeArts: dept("creativeArts", "Creative Arts", "arts", "🎭", "charisma", 4, "CVA"),
  english: dept("english", "English", "arts", "📜", "charisma", 4, "ENG"),
  education: dept("education", "Science & Technology Education", "education", "🧪", "charisma", 4, "STE"),
  humanKinetics: dept("humanKinetics", "Human Kinetics & Health Education", "education", "🏃🏾", "fitness", 4, "HKH"),
  pharmacy: dept("pharmacy", "Pharmacy", "pharmacy", "💊", "academics", 5, "PCY"),
  physiology: dept("physiology", "Physiology", "basicMedical", "🫀", "academics", 4, "PHS"),
  anatomy: dept("anatomy", "Anatomy", "basicMedical", "🦴", "academics", 4, "ANA"),
  medicine: dept("medicine", "Medicine & Surgery", "clinical", "🩻", "academics", 6, "MED"),
  nursing: dept("nursing", "Nursing Science", "clinical", "🩺", "fitness", 5, "NSC"),
  dentistry: dept("dentistry", "Dentistry", "dental", "🦷", "academics", 6, "DEN"),
};

export interface Hall {
  id: HallId;
  name: string;
  gender: "m" | "f";
  color: string;
  /** Centre of the building. Halls are 8 wide × 10 deep, doors on the south (+z) face. */
  pos: Vec2;
}

export const HALLS: Record<HallId, Hall> = {
  jaja: { id: "jaja", name: "Jaja Hall", gender: "m", color: "#7a1f2b", pos: [-44, 21] },
  mariere: { id: "mariere", name: "Mariere Hall", gender: "m", color: "#1f5f8b", pos: [-33, 21] },
  eniNjoku: { id: "eniNjoku", name: "Eni Njoku Hall", gender: "m", color: "#2f6b3a", pos: [-22, 21] },
  elKanemi: { id: "elKanemi", name: "El-Kanemi Hall", gender: "m", color: "#8a5a12", pos: [-44, 37] },
  moremi: { id: "moremi", name: "Moremi Hall", gender: "f", color: "#b04a7a", pos: [-33, 37] },
  kofoAdemola: { id: "kofoAdemola", name: "Kofo Ademola Hall", gender: "f", color: "#5b3f8f", pos: [-22, 37] },
  madamTinubu: { id: "madamTinubu", name: "Madam Tinubu Hall", gender: "f", color: "#c06a2b", pos: [-11, 37] },
  queenAmina: { id: "queenAmina", name: "Queen Amina Hall", gender: "f", color: "#2f8f8a", pos: [0, 37] },
};

export const HALL_IDS = Object.keys(HALLS) as HallId[];
export const HALL_SIZE = { w: 8, d: 10, floors: 4, floorH: 2.6 };

/** Faculty Quad: a 3 × 4 grid north-east of the Senate. */
export const FACULTY_GRID = { cols: [33, 42, 51], rows: [-15, -24, -33, -42], w: 7, d: 6, floors: 3, floorH: 2.6 };

export function facultyCentre(f: FacultyId): Vec2 {
  const [c, r] = FACULTIES[f].slot;
  return [FACULTY_GRID.cols[c], FACULTY_GRID.rows[r]];
}

export const DEPT_IDS = Object.keys(DEPTS) as DeptId[];

export interface Place {
  id: PlaceId;
  kind?: "hall" | "faculty";
  hall?: HallId;
  faculty?: FacultyId;
  /** Hide the label when zoomed further out than this (orthographic zoom). */
  minZoom?: number;
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

const CORE_PLACES: Record<CorePlaceId, Place> = {
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
    blurb: "The big shared theatres where every faculty sits GST — General Studies. Sit in front if you want the lecturer to know your face.",
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
  sub: {
    id: "sub",
    name: "Student Union Building",
    emoji: "🗳️",
    blurb: "SUG offices, campaign posters on every wall, and a merch stand selling hall jerseys. Aluta continua!",
    pos: [-23, -1],
    labelHeight: 9,
    door: [-23, 4.6],
    footprints: [[-28, -5, -18, 3]],
    open: [8, 22],
  },
};

function hallPlace(h: Hall): Place {
  const [x, z] = h.pos;
  return {
    id: `hall:${h.id}`,
    kind: "hall",
    hall: h.id,
    minZoom: 12,
    name: h.name,
    emoji: h.gender === "f" ? "🏠" : "🏢",
    blurb:
      h.gender === "f"
        ? `A female hall of residence. Rooms of four, a common room with one TV, and Sunday-evening gist on the balconies.`
        : `A male hall of residence. Four to a room, one socket, and chants that carry across the whole quarter on match days.`,
    pos: [x, z],
    labelHeight: 13.5,
    door: [x, z + HALL_SIZE.d / 2 + 1.4],
    footprints: [[x - HALL_SIZE.w / 2, z - HALL_SIZE.d / 2, x + HALL_SIZE.w / 2, z + HALL_SIZE.d / 2]],
    open: [0, 24],
  };
}

function facultyPlace(f: Faculty): Place {
  const [x, z] = facultyCentre(f.id);
  return {
    id: `fac:${f.id}`,
    kind: "faculty",
    faculty: f.id,
    minZoom: 12,
    name: f.name,
    emoji: f.emoji,
    blurb: `Departmental offices, lecture rooms and a noticeboard nobody reads until results are pasted.`,
    pos: [x, z],
    labelHeight: 10,
    door: [x, z + FACULTY_GRID.d / 2 + 0.9],
    footprints: [[x - FACULTY_GRID.w / 2, z - FACULTY_GRID.d / 2, x + FACULTY_GRID.w / 2, z + FACULTY_GRID.d / 2]],
    open: [7, 21],
  };
}

export const PLACES = {
  ...CORE_PLACES,
  ...Object.fromEntries(Object.values(HALLS).map((h) => [`hall:${h.id}`, hallPlace(h)])),
  ...Object.fromEntries(Object.values(FACULTIES).map((f) => [`fac:${f.id}`, facultyPlace(f)])),
} as Record<PlaceId, Place>;

export const PLACE_IDS = Object.keys(PLACES) as PlaceId[];
export const CORE_PLACE_IDS = Object.keys(CORE_PLACES) as CorePlaceId[];
export const hallPlaceId = (h: HallId) => `hall:${h}` as PlaceId;
export const facultyPlaceId = (f: FacultyId) => `fac:${f}` as PlaceId;

export interface Road {
  from: Vec2;
  to: Vec2;
  w: number;
}

export const ROADS: Road[] = [
  { from: [-34, 8], to: [60, 8], w: 4 },
  { from: [8, -30], to: [8, 46.5], w: 4 },
  { from: [-30, -8], to: [55, -8], w: 3.4 },
  { from: [-14, -8], to: [-14, -22], w: 3 },
  { from: [41.5, 10], to: [41.5, 24], w: 2.6 },
  // Halls quarter
  { from: [-14.5, 10], to: [-14.5, 29.5], w: 2.6 },
  { from: [-49, 29.5], to: [6, 29.5], w: 3 },
  { from: [-49, 45], to: [6, 45], w: 3 },
  // Faculty Quad walkways
  ...FACULTY_GRID.rows.map((z): Road => ({ from: [28.5, z + 4.8], to: [55.5, z + 4.8], w: 1.8 })),
  { from: [37.5, -46], to: [37.5, -8], w: 2 },
  { from: [46.5, -46], to: [46.5, -8], w: 2 },
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

/** Sponsor billboards around campus. Each id matches a row in the sponsor_slots table. */
export const BILLBOARDS: { id: string; pos: Vec2 }[] = [
  { id: "billboard-1", pos: [28, 12.8] },
  { id: "billboard-2", pos: [-30, 12.6] },
  { id: "billboard-3", pos: [44, 2.2] },
  { id: "billboard-4", pos: [-8, -11.6] },
  { id: "billboard-5", pos: [22, -28.5] },
  { id: "billboard-6", pos: [13, 43.5] },
];
