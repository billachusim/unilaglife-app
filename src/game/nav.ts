import { CAMPUS, JETTY, LAND, PLACES, ROUNDABOUT, type Vec2 } from "./data";
import { ACTIONS } from "./actions";

const MIN_X = -50;
const MAX_X = 60;
const MIN_Z = -52;
const MAX_Z = 52;
const W = MAX_X - MIN_X;
const H = MAX_Z - MIN_Z;

export function isLand(x: number, z: number) {
  let inside = false;
  for (let i = 0, j = LAND.length - 1; i < LAND.length; j = i++) {
    const [xi, zi] = LAND[i];
    const [xj, zj] = LAND[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function onJetty(x: number, z: number) {
  const d = Math.SQRT1_2;
  const px = x - JETTY.from[0];
  const pz = z - JETTY.from[1];
  const along = -px * d - pz * d;
  const perp = px * d - pz * d;
  return along >= -1 && along <= JETTY.length && Math.abs(perp) <= JETTY.width / 2;
}

const blocked = new Uint8Array(W * H);
const idx = (i: number, j: number) => j * W + i;
const cellOf = (x: number, z: number): [number, number] => [
  Math.max(0, Math.min(W - 1, Math.floor(x - MIN_X))),
  Math.max(0, Math.min(H - 1, Math.floor(z - MIN_Z))),
];
const centerOf = (i: number, j: number): Vec2 => [MIN_X + i + 0.5, MIN_Z + j + 0.5];

function build() {
  const pad = 0.5;
  const rects = Object.values(PLACES).flatMap((p) => p.footprints);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const [x, z] = centerOf(i, j);
      let b = false;
      if (x > CAMPUS.maxX - 0.6 || z > CAMPUS.maxZ - 0.6) b = true;
      else if (!isLand(x, z) && !onJetty(x, z)) b = true;
      else if (Math.hypot(x - ROUNDABOUT.center[0], z - ROUNDABOUT.center[1]) < ROUNDABOUT.radius + 0.3) b = true;
      else {
        for (const [x0, z0, x1, z1] of rects) {
          if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) {
            b = true;
            break;
          }
        }
      }
      blocked[idx(i, j)] = b ? 1 : 0;
    }
  }
  const keep: Vec2[] = [
    ...Object.values(PLACES).map((p) => p.door),
    ...ACTIONS.filter((a) => a.stage).map((a) => a.stage as Vec2),
  ];
  for (const [x, z] of keep) {
    const [i, j] = cellOf(x, z);
    blocked[idx(i, j)] = 0;
  }
}
build();

export function isBlocked(x: number, z: number) {
  if (x < MIN_X || x >= MAX_X || z < MIN_Z || z >= MAX_Z) return true;
  const [i, j] = cellOf(x, z);
  return blocked[idx(i, j)] === 1;
}

function nearestOpen(i: number, j: number): [number, number] {
  if (!blocked[idx(i, j)]) return [i, j];
  for (let r = 1; r < 40; r++) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H || blocked[idx(ni, nj)]) continue;
        const d = di * di + dj * dj;
        if (d < bestD) {
          bestD = d;
          best = [ni, nj];
        }
      }
    }
    if (best) return best;
  }
  return [i, j];
}

function lineOfSight(a: Vec2, b: Vec2) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.25);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (isBlocked(a[0] + dx * t, a[1] + dz * t)) return false;
  }
  return true;
}

const gScore = new Float32Array(W * H);
const fScore = new Float32Array(W * H);
const came = new Int32Array(W * H);
const closed = new Uint8Array(W * H);

export function findPath(from: Vec2, to: Vec2): Vec2[] {
  const [si, sj] = nearestOpen(...cellOf(from[0], from[1]));
  const targetOpen = !isBlocked(to[0], to[1]);
  const [gi, gj] = nearestOpen(...cellOf(to[0], to[1]));
  const start = idx(si, sj);
  const goal = idx(gi, gj);
  const goalPoint: Vec2 = targetOpen ? to : centerOf(gi, gj);
  if (start === goal) return [goalPoint];

  gScore.fill(Infinity);
  closed.fill(0);
  came.fill(-1);
  const heap: number[] = [];
  const push = (n: number) => {
    heap.push(n);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[c]]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && fScore[heap[l]] < fScore[heap[m]]) m = l;
        if (r < heap.length && fScore[heap[r]] < fScore[heap[m]]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  const h = (i: number, j: number) => {
    const dx = Math.abs(i - gi);
    const dz = Math.abs(j - gj);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };

  gScore[start] = 0;
  fScore[start] = h(si, sj);
  push(start);
  let found = false;
  while (heap.length) {
    const cur = pop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % W;
    const cj = (cur / W) | 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = idx(ni, nj);
        if (blocked[n] || closed[n]) continue;
        if (di && dj && (blocked[idx(ci + di, cj)] || blocked[idx(ci, cj + dj)])) continue;
        const g = gScore[cur] + (di && dj ? Math.SQRT2 : 1);
        if (g < gScore[n]) {
          gScore[n] = g;
          fScore[n] = g + h(ni, nj);
          came[n] = cur;
          push(n);
        }
      }
    }
  }
  if (!found) return [];

  const cells: Vec2[] = [];
  for (let c = goal; c !== -1; c = came[c]) cells.push(centerOf(c % W, (c / W) | 0));
  cells.reverse();
  cells[0] = from;
  cells[cells.length - 1] = goalPoint;

  const smooth: Vec2[] = [];
  let anchor = cells[0];
  let k = 1;
  while (k < cells.length) {
    let far = k;
    while (far + 1 < cells.length && lineOfSight(anchor, cells[far + 1])) far++;
    smooth.push(cells[far]);
    anchor = cells[far];
    k = far + 1;
  }
  return smooth;
}

export function randomOpenPoint(rand: () => number = Math.random): Vec2 {
  for (let t = 0; t < 200; t++) {
    const x = -34 + rand() * 88;
    const z = -32 + rand() * 78;
    if (!isBlocked(x, z)) return [x, z];
  }
  return PLACES.library.door;
}
