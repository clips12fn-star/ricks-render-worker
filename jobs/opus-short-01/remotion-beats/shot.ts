import * as THREE from "three";
import { camFromKeys } from "./cinema";
import type { Cam } from "./Stage";

export type Key = { f: number; pos: number[]; look: number[]; fov: number; roll?: number; ease?: string; path?: number[][] };

/** Pick the active shot by absolute frame: each entry starts at `from` and owns its camera keys. */
export function cut(f: number, shots: { from: number; keys: Key[]; kicks?: { f: number; a: number }[] }[]): { cam: Cam; index: number } {
  let i = 0;
  for (let k = 0; k < shots.length; k++) if (f >= shots[k].from) i = k;
  const s = shots[i];
  return { cam: camFromKeys(s.keys, f, { creep: 0.0008, kicks: s.kicks ?? [] }), index: i };
}

export const dist = (cam: Cam, p: THREE.Vector3 | number[]) => {
  const v = Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p;
  return new THREE.Vector3(cam.pos[0], cam.pos[1], cam.pos[2]).distanceTo(v);
};

/** Piecewise-linear value through (frame, value) pairs with smoothstep easing between pairs. */
export function track(f: number, pts: [number, number][]) {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [f1, v1] = pts[i];
    const [f0, v0] = pts[i - 1];
    if (f <= f1) {
      const t = (f - f0) / Math.max(1e-6, f1 - f0);
      const e = t * t * (3 - 2 * t);
      return v0 + (v1 - v0) * e;
    }
  }
  return pts[pts.length - 1][1];
}
