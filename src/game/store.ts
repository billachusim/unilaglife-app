import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEPTS,
  type DeptId,
  ECONOMY,
  type Look,
  NEED_DECAY,
  type NeedKey,
  type PlaceId,
  PLACES,
  type SkillKey,
  START_TIME,
  TIME_SCALE,
  type Vec2,
  WEEK,
} from "./data";
import { ACTION_BY_ID, actionBlocker, actionLabel, addMoodlet } from "./actions";
import { closedReason, hourOf, naira, type SaveState, weekdayOf } from "./state";
import { player, walkTo } from "./runtime";

export interface Activity {
  actionId: string;
  remaining: number;
  total: number;
  speed: number;
  waiting: boolean;
}

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "good" | "bad";
}

interface GameStore {
  save: SaveState | null;
  here: PlaceId | null;
  panel: PlaceId | null;
  activity: Activity | null;
  toasts: Toast[];
  follow: boolean;
  profileOpen: boolean;
  speed: number;
  setSpeed: (n: number) => void;
  newGame: (name: string, look: Look, dept: DeptId) => void;
  loadSave: (save: SaveState) => void;
  resetGame: () => void;
  tick: (dt: number) => void;
  arrive: (place: PlaceId | null) => void;
  setPanel: (place: PlaceId | null) => void;
  startAction: (id: string) => void;
  beginStaged: () => void;
  cancelWaiting: () => boolean;
  completeAction: () => void;
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  setFollow: (v: boolean) => void;
  setPos: (pos: Vec2) => void;
  setProfileOpen: (v: boolean) => void;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const NEED_WARNINGS: Record<NeedKey, string> = {
  hunger: "🍛 You're starving — eat at Mama B's Buka",
  energy: "😴 You're exhausted — sleep at your hall",
  hygiene: "🫧 You need a bath — head to your hall",
  fun: "🎉 You're bored stiff — try the lagoon front",
  social: "💬 You're lonely — gist with your roommates",
};

let toastId = 1;

function realDuration(minutes: number) {
  return Math.max(1.2, Math.min(4.5, minutes / 30));
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      save: null,
      here: null,
      panel: null,
      activity: null,
      toasts: [],
      follow: true,
      profileOpen: false,
      speed: 1,
      setSpeed: (n) => set({ speed: n }),

      newGame: (name, look, dept) => {
        const skills: Record<SkillKey, number> = { academics: 0.5, fitness: 0.5, charisma: 0.5, hustle: 0.5 };
        skills[DEPTS[dept].skill] = 1.5;
        const start = PLACES.mainGate.door;
        const save: SaveState = {
          version: 1,
          name,
          look,
          money: ECONOMY.startMoney,
          time: START_TIME,
          needs: { energy: 85, hunger: 70, fun: 75, social: 70, hygiene: 80 },
          skills,
          moodlets: [],
          uni: {
            status: "applicant",
            dept,
            acceptancePaid: false,
            level: 1,
            semester: 1,
            paidLevel: 1,
            classes: 0,
            prep: 0,
            semStart: START_TIME,
            points: 0,
            units: 0,
            history: [],
            readyToGraduate: false,
            grad: null,
          },
          pos: start,
          lastAllowanceWeek: 0,
        };
        player.x = start[0];
        player.z = start[1];
        player.path = [];
        player.hidden = false;
        set({ save, here: null, panel: null, activity: null, follow: true });
        get().pushToast(`🎉 Welcome to UNILAG, ${name}! Head to the Senate Building to secure your admission.`, "good");
      },

      loadSave: (save) => {
        player.x = save.pos[0];
        player.z = save.pos[1];
        player.path = [];
        player.hidden = false;
        set({ save, here: null, panel: null, activity: null, follow: true });
      },

      resetGame: () => set({ save: null, here: null, panel: null, activity: null, toasts: [], profileOpen: false }),

      tick: (dt) => {
        const { save, activity } = get();
        if (!save) return;
        let act = activity;
        let minutes: number;
        if (act && !act.waiting) {
          minutes = Math.min(act.remaining, act.speed * dt);
          act = { ...act, remaining: act.remaining - minutes };
        } else {
          minutes = TIME_SCALE * dt * get().speed;
        }
        const running = act && !act.waiting ? ACTION_BY_ID[act.actionId] : null;

        const s: SaveState = { ...save, needs: { ...save.needs } };
        s.time += minutes;
        const warnings: string[] = [];
        for (const k of Object.keys(s.needs) as NeedKey[]) {
          if (k === "energy" && running?.sleep) continue;
          const before = s.needs[k];
          s.needs[k] = clamp(before - (NEED_DECAY[k] * minutes) / 60);
          if (before >= 15 && s.needs[k] < 15) warnings.push(NEED_WARNINGS[k]);
        }
        if (s.moodlets.some((m) => m.until <= s.time)) s.moodlets = s.moodlets.filter((m) => m.until > s.time);

        const week = Math.floor(s.time / WEEK);
        let allowance = false;
        if (week > s.lastAllowanceWeek && (weekdayOf(s.time) > 0 || hourOf(s.time) >= 8)) {
          s.lastAllowanceWeek = week;
          s.money += ECONOMY.allowance;
          s.moodlets = [...s.moodlets];
          addMoodlet(s, "mummyAlert");
          allowance = true;
        }

        set({ save: s, activity: act });
        if (allowance) get().pushToast(`📲 Mummy's alert: ${naira(ECONOMY.allowance)} allowance landed. "Read your books o!"`, "good");
        for (const w of warnings) get().pushToast(w, "bad");
        if (act && !act.waiting && act.remaining <= 1e-6) get().completeAction();
      },

      arrive: (place) => {
        set({ here: place, panel: place });
        get().setPos([player.x, player.z]);
      },

      setPanel: (place) => set({ panel: place }),

      startAction: (id) => {
        const { save, activity } = get();
        if (!save) return;
        if (activity) {
          get().pushToast("Finish what you're doing first", "bad");
          return;
        }
        const def = ACTION_BY_ID[id];
        const blocker = closedReason(def.place, save.time) ?? actionBlocker(def, save);
        if (blocker) {
          get().pushToast(blocker, "bad");
          return;
        }
        const s = { ...save, money: save.money - (def.cost ?? 0) };
        const duration = realDuration(def.minutes);
        const next: Activity = {
          actionId: id,
          remaining: def.minutes,
          total: def.minutes,
          speed: def.minutes / duration,
          waiting: !!def.stage,
        };
        set({ save: s, activity: next, follow: true });
        if (def.stage) {
          walkTo(def.stage, () => get().beginStaged());
        } else {
          player.path = [];
          player.pose = def.pose ?? "stand";
          player.hidden = !!def.indoor;
        }
      },

      beginStaged: () => {
        const act = get().activity;
        if (!act) return;
        const def = ACTION_BY_ID[act.actionId];
        player.pose = def.pose ?? "stand";
        player.hidden = !!def.indoor;
        set({ activity: { ...act, waiting: false } });
      },

      cancelWaiting: () => {
        const { save, activity } = get();
        if (!save || !activity) return true;
        if (!activity.waiting) return false;
        const refund = ACTION_BY_ID[activity.actionId].cost ?? 0;
        set({ save: { ...save, money: save.money + refund }, activity: null });
        return true;
      },

      completeAction: () => {
        const { save, activity } = get();
        if (!save || !activity) return;
        const def = ACTION_BY_ID[activity.actionId];
        const s: SaveState = structuredClone(save);
        for (const [k, v] of Object.entries(def.needs ?? {}) as [NeedKey, number][]) s.needs[k] = clamp(s.needs[k] + v);
        for (const [k, v] of Object.entries(def.skills ?? {}) as [SkillKey, number][]) {
          s.skills[k] = Math.min(10, s.skills[k] + v / (1 + s.skills[k] * 0.12));
        }
        const earned = def.earn ? def.earn(s) : 0;
        s.money += earned;
        const custom = def.apply?.(s);
        const line =
          (typeof custom === "string" && custom) ||
          (def.lines?.length ? def.lines[Math.floor(Math.random() * def.lines.length)] : `${def.emoji} ${actionLabel(def, save)} — done`);
        player.hidden = false;
        player.pose = "stand";
        set({ save: s, activity: null });
        get().pushToast(earned ? `${line}  +${naira(earned)}` : line, "good");
      },

      pushToast: (text, tone = "info") => {
        const id = toastId++;
        set((st) => ({ toasts: [...st.toasts.slice(-3), { id, text, tone }] }));
        setTimeout(() => get().dismissToast(id), tone === "bad" ? 4500 : 5500);
      },

      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

      setFollow: (v) => set({ follow: v }),

      setPos: (pos) => {
        const save = get().save;
        if (save) set({ save: { ...save, pos } });
      },

      setProfileOpen: (v) => set({ profileOpen: v }),
    }),
    {
      name: "unilaglife-save-v1",
      partialize: (st) => ({ save: st.save }),
      onRehydrateStorage: () => (st) => {
        if (st?.save) {
          player.x = st.save.pos[0];
          player.z = st.save.pos[1];
        }
      },
    },
  ),
);
