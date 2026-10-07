import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function cached<T extends THREE.Texture>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/** Text sign, e.g. "SENATE BUILDING". */
export function signTexture(text: string, bg: string, fg: string, w = 1024, h = 160) {
  return cached(`sign:${text}:${bg}:${fg}:${w}:${h}`, () => {
    const [c, g] = canvas(w, h);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    let size = h * 0.56;
    g.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
    while (g.measureText(text).width > w * 0.9 && size > 10) {
      size -= 2;
      g.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** Subtle mottled grass so the lawns don't read as flat plastic. */
export function grassTexture() {
  return cached("grass", () => {
    const [c, g] = canvas(256, 256);
    g.fillStyle = "#8fc266";
    g.fillRect(0, 0, 256, 256);
    const rand = mulberry(7);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const r = 1 + rand() * 3.5;
      const l = 44 + rand() * 14;
      g.fillStyle = `hsla(${88 + rand() * 18}, ${36 + rand() * 12}%, ${l}%, 0.3)`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(60, 60);
    return t;
  });
}

export function asphaltTexture() {
  return cached("asphalt", () => {
    const [c, g] = canvas(128, 128);
    g.fillStyle = "#4b4f55";
    g.fillRect(0, 0, 128, 128);
    const rand = mulberry(11);
    for (let i = 0; i < 1400; i++) {
      const v = 60 + rand() * 40;
      g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`;
      g.fillRect(rand() * 128, rand() * 128, 1.5, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/** Football pitch with stripes and line markings. Pitch is 20 × 12 world units. */
export function pitchTexture() {
  return cached("pitch", () => {
    const [c, g] = canvas(1000, 600);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? "#4f9a45" : "#58a64c";
      g.fillRect(i * 100, 0, 100, 600);
    }
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 6;
    g.strokeRect(30, 30, 940, 540);
    g.beginPath();
    g.moveTo(500, 30);
    g.lineTo(500, 570);
    g.stroke();
    g.beginPath();
    g.arc(500, 300, 80, 0, Math.PI * 2);
    g.stroke();
    g.strokeRect(30, 170, 120, 260);
    g.strokeRect(850, 170, 120, 260);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** Corrugated zinc roof stripes. */
export function zincTexture() {
  return cached("zinc", () => {
    const [c, g] = canvas(64, 64);
    for (let x = 0; x < 64; x += 8) {
      const grd = g.createLinearGradient(x, 0, x + 8, 0);
      grd.addColorStop(0, "#9aa1a6");
      grd.addColorStop(0.5, "#c9ced1");
      grd.addColorStop(1, "#8b9297");
      g.fillStyle = grd;
      g.fillRect(x, 0, 8, 64);
    }
    g.fillStyle = "rgba(150,90,50,0.18)";
    g.fillRect(0, 40, 64, 24);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    return t;
  });
}

/** Tileable normal map for the lagoon surface. */
export function waterNormalTexture() {
  return cached("waterNormal", () => {
    const N = 256;
    const height = new Float32Array(N * N);
    const TAU = Math.PI * 2;
    const waves = [
      [3, 1, 0.5, 0.3],
      [1, 4, 0.35, 1.7],
      [5, -3, 0.18, 2.4],
      [-2, 6, 0.14, 0.9],
      [7, 2, 0.08, 4.1],
      [-6, -5, 0.07, 5.3],
    ];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let h = 0;
        for (const [kx, ky, a, p] of waves) h += a * Math.sin(TAU * ((kx * x) / N + (ky * y) / N) + p);
        height[y * N + x] = h;
      }
    }
    const data = new Uint8Array(N * N * 4);
    const s = 2.2;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const l = height[y * N + ((x - 1 + N) % N)];
        const r = height[y * N + ((x + 1) % N)];
        const d = height[((y - 1 + N) % N) * N + x];
        const u = height[((y + 1) % N) * N + x];
        let nx = (l - r) * s;
        let ny = (d - u) * s;
        let nz = 1;
        const len = Math.hypot(nx, ny, nz);
        nx /= len;
        ny /= len;
        nz /= len;
        const i = (y * N + x) * 4;
        data[i] = (nx * 0.5 + 0.5) * 255;
        data[i + 1] = (ny * 0.5 + 0.5) * 255;
        data[i + 2] = (nz * 0.5 + 0.5) * 255;
        data[i + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(70, 70);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  });
}

/** Nigerian flag, green-white-green. */
export function flagTexture() {
  return cached("flag", () => {
    const [c, g] = canvas(96, 48);
    g.fillStyle = "#008751";
    g.fillRect(0, 0, 96, 48);
    g.fillStyle = "#ffffff";
    g.fillRect(32, 0, 32, 48);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

export function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
