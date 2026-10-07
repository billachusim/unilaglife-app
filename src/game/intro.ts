import { create } from "zustand";
import { type Look, PLACES, type Vec2 } from "./data";
import { makeAgent, player } from "./runtime";
import { useGame } from "./store";

/**
 * boot      → deciding (auth / save lookup)
 * walk      → a fresher walks up University Road to the gate
 * checkin   → the guard stops you: sign up, sign in, or visit as guest
 * admission → the guard hands over the admission letter (character + course)
 * enter     → barrier lifts, you walk onto campus
 * done      → normal play
 */
export type IntroStep = "boot" | "walk" | "checkin" | "admission" | "enter" | "done";

export const INTRO_SPOTS = {
  start: [80, 7.6] as Vec2,
  stop: [55.9, 7.6] as Vec2,
  guard: [53.2, 7.6] as Vec2,
  guardPost: [51.9, 5.1] as Vec2,
  inside: PLACES.mainGate.door,
};

export const FRESHER_LOOK: Look = {
  body: "m",
  skin: "#7a4a2c",
  hair: "lowcut",
  hairColor: "#121010",
  top: "#f4f4f2",
  bottom: "#2f4a7a",
  bag: "#1f1f1f",
};

export const GUARD_LOOK: Look = {
  body: "m",
  skin: "#5a3825",
  hair: "lowcut",
  hairColor: "#121010",
  top: "#2b3a55",
  bottom: "#1f2937",
  hat: "#2b3a55",
};

export const introAgent = makeAgent(INTRO_SPOTS.start, 2.4);
export const guard = makeAgent(INTRO_SPOTS.guardPost, 0);
guard.heading = Math.PI / 2;

/** Barrier position: 0 = lowered across the road, 1 = raised. */
export const gate = { barrier: 1 };

const LINES = {
  checkin: "Good morning o! Before you enter, show me your ID card.",
  code: "I don send code to your school mail. Read am give me.",
  verified: "Ehen, you be correct Akokite. Hold on…",
  visitor: "Visitor? No wahala. Wear this tag and don't stay past 10 PM o.",
  admission: "Your admission letter dey here. Fill am, make I let you in.",
  welcomeNew: "Oya, enter! Welcome to UNILAG — great Akokite!",
};

interface IntroState {
  step: IntroStep;
  guardLine: string;
  fade: boolean;
  setGuardLine: (key: keyof typeof LINES) => void;
}

export const useIntro = create<IntroState>((set) => ({
  step: "boot",
  guardLine: LINES.checkin,
  fade: false,
  setGuardLine: (key) => set({ guardLine: LINES[key] }),
}));

function standAt(pos: Vec2, heading: number) {
  introAgent.x = pos[0];
  introAgent.z = pos[1];
  introAgent.path = [];
  introAgent.onArrive = null;
  introAgent.heading = heading;
  introAgent.pose = "stand";
  introAgent.hidden = false;
}

function guardOnDuty() {
  guard.x = INTRO_SPOTS.guard[0];
  guard.z = INTRO_SPOTS.guard[1];
  guard.heading = Math.PI / 2;
  guard.pose = "halt";
  gate.barrier = 0;
}

export function beginWalk() {
  standAt(INTRO_SPOTS.start, -Math.PI / 2);
  guardOnDuty();
  guard.pose = "stand";
  introAgent.path = [INTRO_SPOTS.stop];
  introAgent.onArrive = toCheckin;
  useIntro.setState({ step: "walk" });
}

export function toCheckin() {
  standAt(INTRO_SPOTS.stop, -Math.PI / 2);
  guardOnDuty();
  useIntro.setState({ step: "checkin", guardLine: LINES.checkin });
}

export function toAdmission() {
  standAt(INTRO_SPOTS.stop, -Math.PI / 2);
  guardOnDuty();
  guard.pose = "stand";
  useIntro.setState({ step: "admission", guardLine: LINES.admission });
}

export function toEnter() {
  standAt(INTRO_SPOTS.stop, -Math.PI / 2);
  guardOnDuty();
  const name = useGame.getState().save?.name;
  const returning = (useGame.getState().save?.uni.history.length ?? 0) > 0 || useGame.getState().save?.uni.status !== "applicant";
  useIntro.setState({
    step: "enter",
    guardLine: returning && name ? `Welcome back, ${name}! Oya, enter.` : LINES.welcomeNew,
  });
  gate.barrier = 1;
  guard.speed = 2.6;
  // Step to the far kerb, away from the lifting barrier arm.
  guard.path = [[53.7, 10.0]];
  guard.onArrive = () => {
    guard.heading = -Math.PI / 2;
    guard.pose = "wave";
  };
  window.setTimeout(() => {
    introAgent.path = [
      [53.4, 7.9],
      [INTRO_SPOTS.inside[0], INTRO_SPOTS.inside[1]],
    ];
    introAgent.onArrive = finishIntro;
  }, 1100);
}

export function finishIntro() {
  useIntro.setState({ fade: true });
  window.setTimeout(() => {
    const [x, z] = INTRO_SPOTS.inside;
    player.x = x;
    player.z = z;
    player.path = [];
    player.hidden = false;
    useGame.getState().setPos([x, z]);
    useGame.getState().setFollow(true);
    introAgent.hidden = true;
    guard.x = INTRO_SPOTS.guardPost[0];
    guard.z = INTRO_SPOTS.guardPost[1];
    guard.pose = "stand";
    useIntro.setState({ step: "done" });
    window.setTimeout(() => useIntro.setState({ fade: false }), 120);
  }, 600);
}

/** Straight into play — returning players with a remembered session skip the gate. */
export function skipIntro() {
  introAgent.hidden = true;
  guard.x = INTRO_SPOTS.guardPost[0];
  guard.z = INTRO_SPOTS.guardPost[1];
  guard.pose = "stand";
  gate.barrier = 1;
  useIntro.setState({ step: "done", fade: false });
}

/** After signing out: back outside the gate. */
export function restartIntro() {
  beginWalk();
}
