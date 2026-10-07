/**
 * Seeds the campus with simulated students over Supabase Realtime, for testing multiplayer alone.
 *   npm run bots          → 8 students
 *   npm run bots -- 20    → 20 students
 * Ctrl+C sends them home.
 */
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { DEPT_IDS, HAIR_COLORS, HAIR_STYLES, type Look, OUTFIT_COLORS, PLACE_IDS, PLACES, SKIN_TONES, type Vec2 } from "../src/game/data";
import { findPath, randomOpenPoint } from "../src/game/nav";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");

const COUNT = Math.min(40, Number(process.argv[2] ?? 8));
const NAMES = [
  "Tobi A.", "Chiamaka", "Seun", "Ifeoma", "Kunle", "Zainab", "Emeka", "Bisola", "Tunde", "Ngozi",
  "Femi", "Aisha", "Dayo", "Chidinma", "Yusuf", "Funmi", "Obinna", "Halima", "Segun", "Adaeze",
];
const GIST = [
  "Who get CSC 201 past questions? 🙏🏾",
  "Mama B's jollof today na premium 🔥",
  "Light don go for Moremi again 😩",
  "Shuttle no dey come, I don trek reach Senate",
  "Lagoon front by 6? Sunset go mad today 🌅",
  "Lecturer said it will come out in exam. I'm reading it twice",
  "Inter-hall finals this weekend. Who's coming? ⚽",
  "Abeg who sabi where Faculty of Science noticeboard dey?",
  "Library AC is too cold, I'm leaving 🥶",
  "Aluta continua! SUG debate is tomorrow ✊🏾",
  "Who wan buy data? I get ₦500 bundle",
  "First class or nothing this semester 📚",
];
const REPLIES = ["How far! 👋🏾", "Welcome to Akoka o!", "Fresher? You go enjoy here 😄", "Wetin dey happen?", "Hello! Which department?"];
const ACTIVITIES = [
  { emoji: "📖", pose: "sit" },
  { emoji: "🍛", pose: "sit" },
  { emoji: "📸", pose: "stand" },
  { emoji: "🗣️", pose: "stand" },
] as const;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pathLength = (from: Vec2, path: Vec2[]) => {
  let len = 0;
  let prev = from;
  for (const p of path) {
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return len;
};

function randomLook(): Look {
  const body = Math.random() < 0.5 ? "f" : "m";
  return {
    body,
    skin: pick(SKIN_TONES),
    hair: body === "f" ? pick(HAIR_STYLES).id : Math.random() < 0.75 ? "lowcut" : "afro",
    hairColor: pick(HAIR_COLORS.slice(0, 3)),
    top: pick(OUTFIT_COLORS),
    bottom: pick(["#1f2937", "#2f4a7a", "#3b2f2a", "#6b7280", "#1d3a6e", "#b23a48"]),
    bag: pick(["#1f1f1f", "#b23a48", "#2f8f8a", "#c6882a", "#6d4aa8"]),
  };
}

const channels: RealtimeChannel[] = [];
let running = true;
let lastReply = 0;

async function runBot(i: number) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const id = `bot-${i}-${Math.random().toString(36).slice(2, 7)}`;
  const start = randomOpenPoint();
  const meta = {
    id,
    name: NAMES[i % NAMES.length],
    look: randomLook(),
    dept: pick(DEPT_IDS),
    level: 1 + Math.floor(Math.random() * 4),
    bot: true,
    x: start[0],
    z: start[1],
    hidden: false,
    pose: "stand",
    emoji: null as string | null,
  };
  const ch = client.channel("campus:akoka", { config: { presence: { key: id }, broadcast: { self: false } } });
  channels.push(ch);

  const say = (text: string) => ch.send({ type: "broadcast", event: "say", payload: { id, name: meta.name, text } });

  ch.on("broadcast", { event: "say" }, ({ payload }) => {
    const p = payload as { id: string; text: string };
    if (p.id.startsWith("bot-")) return;
    const greeting = /\b(hi|hello|hey|how far|good (morning|afternoon|evening))\b/i.test(p.text);
    if (greeting && Date.now() - lastReply > 4000 && Math.random() < 0.5) {
      lastReply = Date.now();
      setTimeout(() => say(pick(REPLIES)), 1200 + Math.random() * 2500);
    }
  });

  await new Promise<void>((resolve) => {
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track(meta);
        resolve();
      }
    });
  });
  console.log(`  ${meta.name} is on campus`);

  while (running) {
    await sleep(3000 + Math.random() * 7000);
    if (!running) break;
    const r = Math.random();
    if (r < 0.12) {
      await say(pick(GIST));
    } else if (r < 0.3) {
      const act = pick(ACTIVITIES);
      await ch.send({ type: "broadcast", event: "state", payload: { id, x: meta.x, z: meta.z, hidden: false, pose: act.pose, emoji: act.emoji } });
      await sleep(8000 + Math.random() * 12000);
      await ch.send({ type: "broadcast", event: "state", payload: { id, x: meta.x, z: meta.z, hidden: false, pose: "stand", emoji: null } });
    } else {
      const target: Vec2 =
        Math.random() < 0.6
          ? (() => {
              const door = PLACES[pick(PLACE_IDS)].door;
              return [door[0] + (Math.random() - 0.5) * 4, door[1] + (Math.random() - 0.5) * 4];
            })()
          : randomOpenPoint();
      const path = findPath([meta.x, meta.z], target);
      if (!path.length) continue;
      const speed = 3 + Math.random() * 1.2;
      await ch.send({ type: "broadcast", event: "move", payload: { id, x: meta.x, z: meta.z, path, speed } });
      await sleep((pathLength([meta.x, meta.z], path) / speed) * 1000);
      [meta.x, meta.z] = path[path.length - 1];
      await ch.track(meta);
    }
  }
}

process.on("SIGINT", async () => {
  running = false;
  console.log("\nSending everyone home…");
  await Promise.all(channels.map((c) => c.untrack().then(() => c.unsubscribe())));
  process.exit(0);
});

console.log(`Seeding ${COUNT} students onto campus (Ctrl+C to stop)…`);
for (let i = 0; i < COUNT; i++) {
  runBot(i).catch((e) => console.error(`bot ${i} failed:`, e));
}
