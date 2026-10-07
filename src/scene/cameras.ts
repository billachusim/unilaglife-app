import type * as THREE from "three";

/** The isometric game camera and the intro's cinematic camera. <CameraDirector> picks which one renders. */
export const gameCamera: { current: THREE.OrthographicCamera | null } = { current: null };
export const introCamera: { current: THREE.PerspectiveCamera | null } = { current: null };
