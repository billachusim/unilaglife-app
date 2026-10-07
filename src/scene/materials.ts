import * as THREE from "three";

/** Shared materials whose glow is driven by the time of day. */
export const windowMat = new THREE.MeshStandardMaterial({
  color: "#5d7fa3",
  roughness: 0.25,
  metalness: 0.35,
  emissive: new THREE.Color("#ffcf87"),
  emissiveIntensity: 0,
});

export const lampMat = new THREE.MeshStandardMaterial({
  color: "#fff4d6",
  emissive: new THREE.Color("#ffd27a"),
  emissiveIntensity: 0,
});

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** One material per colour/finish, reused across every mesh that asks for it. */
export function mat(color: string, roughness = 0.85, metalness = 0) {
  const key = `${color}:${roughness}:${metalness}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    mats.set(key, m);
  }
  return m;
}
