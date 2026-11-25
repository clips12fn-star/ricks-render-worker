import * as THREE from "three";
import { camFromKeys, beam, tex, M, clamp } from "./cinema";
import { buildSet, DECK, HY, HZ } from "./set";
import { makeActor, type Actor } from "./actors";
import { blinkAt } from "./cinema";
import type { Lens } from "./Stage";
import { makeGlove, makePlug, PLUG_R } from "./props";
import type { BuildWorld } from "./Stage";

/*
 * Hook shot (f0-f91) and the loop tail (f1741-f1755 rendered as f-15..f-1).
 * The plug is presented in a rigger's glove just inside the closing gap, 1.4 ft in front of the
 * hollow west rib mouth, then set down on a timber saddle while the camera eases back along the rib.
 * Both the hook and the loop tail call this one builder, so f1755 is one increment before f0
 * in angle, scale, light and screen position.
 */
export const PLUG_HOME = new THREE.Vector3(-4.6, HY + 0.1, HZ + 0.35);

export function trestle(top: number) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: tex(beam(31, [30, 42, 44]), 1, 2), roughness: 0.85 });
  const h = top - DECK;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, h + 0.3, 0.22), wood);
      leg.position.set(sx * 0.55, DECK + h / 2, sz * 0.32);
      leg.rotation.x = -sz * 0.12;
      leg.rotation.z = sx * 0.12;
      g.add(leg);
    }
  }
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.7), wood);
  block.position.y = top - 0.12;
  g.add(block);
  for (const sz of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.22), wood);
    v.position.set(0, top + 0.05, sz * 0.28);
    v.rotation.x = sz * 0.5;
    g.add(v);
  }
  g.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return g;
}

// Hook camera keys in absolute frames. f-15..f-1 orbit in from the payoff side.
const P = PLUG_HOME;
const at = (dx: number, dy: number, dz: number) => [P.x + dx, P.y + dy, P.z + dz];
export const HOOK_KEYS = [
  { f: -15, pos: at(2.6, 0.5, 1.2), look: at(-0.3, -0.1, 0), fov: 40, roll: -3 },
  { f: 0, pos: at(1.7, 1.2, 2.2), look: at(-0.3, -0.12, 0), fov: 46, ease: "easeOut" },
  { f: 20, pos: at(1.62, 1.32, 2.12), look: at(-0.28, -0.12, 0), fov: 45 },
  { f: 30, pos: at(1.55, 1.55, 1.95), look: at(-0.25, -0.16, 0), fov: 44 },
  { f: 91, pos: [13, HY + 3.2, HZ + 15], look: [-5, HY + 0.6, HZ - 3], fov: 42, path: [at(3.8, 1.8, 4.6), [8.5, HY + 2.6, HZ + 10.5]] },
];

/** The two crew members already on the staging; shared by the hook and Beat 2 so f91 -> f92 is continuous. */
export function makeCrew(scene: THREE.Scene, cardNd: Lens["cardNd"], tint: string) {
  const a = makeActor("worker", cardNd, tint);
  a.group.position.set(-2.6, DECK, HZ + 3.6);
  const b = makeActor("rigger", cardNd, tint);
  b.group.position.set(1.2, DECK, HZ + 3.1);
  scene.add(a.group, b.group);
  return [a, b] as [Actor, Actor];
}
export function poseCrew([a, b]: [Actor, Actor], f: number, alert: boolean, camPos: number[]) {
  a.setPose({ expression: alert ? "focus" : "calm", blink: blinkAt(f, 5), gaze: -9, armL: { sh: 30, el: 40 }, armR: { sh: 20, el: 10 }, mouth: "tight" });
  b.setPose({ expression: "calm", blink: blinkAt(f, 8), gaze: -8, armR: { sh: 60, el: 50 }, armL: { sh: 15, el: 5 } });
  a.faceCamera(camPos);
  b.faceCamera(camPos);
}

export const buildHook =
  (clockIndex = 0): BuildWorld =>
  ({ scene, cardNd }) => {
    const set = buildSet(scene, clockIndex);
    const crew = makeCrew(scene, cardNd, set.clock.tint);
    const plug = makePlug();
    scene.add(plug.group);
    const glove = makeGlove();
    glove.group.scale.setScalar(1.35);
    scene.add(glove.group);
    const saddle = trestle(P.y - PLUG_R - 0.55);
    saddle.position.set(P.x, 0, P.z);
    scene.add(saddle);
    // hanging hoist rope with its hook, swinging gently over the gap
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 20, 6), new THREE.MeshStandardMaterial({ color: "#c9a36b", roughness: 1 }));
    const hookIron = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.08, 8, 20, Math.PI * 1.4),
      new THREE.MeshStandardMaterial({ color: "#2b2930", metalness: 0.4 }),
    );
    const hang = new THREE.Group();
    rope.position.y = -10;
    hookIron.position.y = -20.2;
    hang.add(rope, hookIron);
    hang.position.set(0, DECK + 25, HZ);
    hang.traverse((o) => (o.castShadow = true));
    scene.add(hang);

    return {
      update: (f) => {
        const cam = camFromKeys(HOOK_KEYS, f, { creep: 0 });
        poseCrew(crew, f, false, cam.pos);
        // Rigger presents the plug, rolls it into the sun at f4, sets it down from f32 and withdraws.
        const roll = f < 0 ? -0.22 * (1 - M.smooth((f + 15) / 15)) : -0.25 * M.smooth((f - 4) / 12);
        plug.spin.rotation.x = roll;
        const set1 = M.smooth((f - 32) / 14);
        const plugY = P.y - 0.53 * set1;
        plug.group.position.set(P.x, plugY, P.z);
        const away = M.easeIn((f - 44) / 16);
        glove.group.position.set(P.x + 0.08, plugY - PLUG_R - 0.02 - away * 1.8, P.z + 0.16 + away * 1.2);
        glove.group.rotation.set(-0.25 - away * 0.3, -Math.PI / 2, 0.55);
        glove.setCurl(0.95 - set1 * 0.55);
        glove.group.visible = f < 62;
        // The nick flares as it rolls into the sunlight.
        const flare = f < 0 ? 0.9 : 0.9 + 2.2 * Math.sin(Math.PI * clamp((f - 6) / 18));
        (plug.nick.material as THREE.MeshStandardMaterial).emissiveIntensity = flare;
        hang.rotation.z = 0.02 * Math.sin(f * 0.05);
        set.focusShadow(P.x, P.y, P.z, f < 34 ? 4 : 18);
        const focus = new THREE.Vector3(...(cam.pos as [number, number, number])).distanceTo(P);
        const pull = clamp((f - 30) / 50);
        return { cam, focus, aperture: 11 * (1 - pull) + 1.5 * pull };
      },
    };
  };
