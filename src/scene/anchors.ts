import * as THREE from "three";

/** DOM elements that follow points in the 3D world. Projected once per frame by <AnchorProjector />. */
export interface Anchor {
  get: (out: THREE.Vector3) => void;
  el: HTMLElement | null;
}

export const anchors = new Map<string, Anchor>();

export function registerAnchor(id: string, get: Anchor["get"]) {
  return (el: HTMLElement | null) => {
    if (el) anchors.set(id, { get, el });
    else anchors.delete(id);
  };
}
