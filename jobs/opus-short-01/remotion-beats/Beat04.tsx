import React from "react";
import * as THREE from "three";
import { Stage, type BuildWorld } from "./Stage";
import { archY, buildSet, DECK, HALF_SPAN, HY, HZ, LIP_HOT, RISE } from "./set";
import { makeActor } from "./actors";
import { makeBasket, makeIcePile, makeTroughHalf } from "./props";
import { blinkAt, idle, M, clamp } from "./cinema";
import { cut, dist } from "./shot";
import { lipSync, wf } from "./words";

/*
 * Beat 4 · escalation1 · f656-f939 · lateral_tracking · pressure · #AC694E #86CFD8 #503B34
 * "Assistant engineer Henry Flad wrapped wooden troughs around the steel ribs and packed 30 tons of
 *  ice inside. The ironmaster smirked, 'Ice can't beat summer.'"
 * S0 f656 track beside Flad; f692 he hugs a trough half to the rib, a crewman straps the mating half.
 * S1 f772 a tipped basket pours; the blocks bank against the steel by f802, then pull along the bays.
 * S2 f838 follow a trickle to the ironmaster's boot; he catches a drop on his rule, smirks at f859.
 */
const TROUGH_X = -12;
const TROUGH_L = 9;

function troughAt(scene: THREE.Scene, x: number, filled: boolean, seed: number) {
  const g = new THREE.Group();
  const a = makeTroughHalf(TROUGH_L * 0.8, 1);
  const b = makeTroughHalf(TROUGH_L * 0.8, -1);
  g.add(a, b);
  if (filled) g.add(makeIcePile(26, TROUGH_L * 0.75, seed));
  g.position.set(x, archY(x, HY), HZ);
  g.rotation.z = Math.atan((-2 * RISE * x) / HALF_SPAN ** 2);
  scene.add(g);
  return g;
}

export const buildEscalation1: BuildWorld = ({ scene, cardNd }) => {
  const set = buildSet(scene, 3);
  set.westEnd.position.x = LIP_HOT;
  // Bays already iced further down the arch: the load is distributed along the rib.
  [-26, -38, -50, -62].forEach((x, i) => troughAt(scene, x, true, 40 + i));

  const front = makeTroughHalf(TROUGH_L, 1);
  const back = makeTroughHalf(TROUGH_L, -1);
  const pile = makeIcePile(34, TROUGH_L * 0.85, 7);
  const hero = new THREE.Group();
  hero.add(front, back, pile);
  hero.position.set(TROUGH_X, HY, HZ);
  scene.add(hero);
  const blocks = pile.children.map((c) => ({ m: c as THREE.Mesh, y: c.position.y }));
  const basket = makeBasket();
  basket.group.position.set(TROUGH_X - 0.4, HY + 2.2, HZ + 0.3);
  scene.add(basket.group);

  const flad = makeActor("flad", cardNd, set.clock.tint);
  const strapper = makeActor("worker", cardNd, set.clock.tint);
  strapper.group.position.set(-9.7, DECK, HZ + 1.9);
  const pourer = makeActor("rigger", cardNd, set.clock.tint);
  pourer.group.position.set(TROUGH_X - 2.4, DECK, HZ + 1.75);
  const iron = makeActor("ironmaster", cardNd, set.clock.tint);
  iron.group.position.set(-6.6, DECK, HZ + 2.4);
  scene.add(flad.group, strapper.group, pourer.group, iron.group);

  // Meltwater: a drip line from the trough lip to a puddle by the ironmaster's boot.
  const dropMat = new THREE.MeshStandardMaterial({ color: "#9fe4ff", emissive: "#4fc4ff", emissiveIntensity: 0.5, roughness: 0.1 });
  const drops = Array.from({ length: 5 }, () => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dropMat);
    d.scale.y = 1.5;
    scene.add(d);
    return d;
  });
  const puddleMat = new THREE.MeshStandardMaterial({ color: "#5fb6e6", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75 });
  const puddles = [
    [-7.4, HZ + 1.6, 0.9],
    [-11.6, HZ + 1.3, 1.3],
    [-14.6, HZ + 1.5, 0.8],
  ].map(([x, z, r]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 28), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, DECK + 0.02, z);
    p.userData.ndSkip = true;
    scene.add(p);
    return p;
  });

  const fHenry = wf("Henry"); // 672
  const fWrapped = wf("wrapped"); // 692
  const fWooden = wf("wooden"); // 703
  const fPacked = wf("packed"); // 772
  const fIce = wf("ice"); // 802
  const fThe = wf("The", 830); // 838
  const fSmirk = wf("smirked,"); // 859
  const fQuote = wf("'Ice"); // 876

  return {
    update: (f) => {
      // Flad walks in and presses the front half home at f692; the crewman seats the back half by f725.
      const walk = M.smooth((f - 656) / (fWrapped - 8 - 656));
      const leave = M.smooth((f - 742) / 26);
      const fx = -17.2 + (TROUGH_X - 0.2 + 17.2) * walk - leave * 4.5;
      flad.group.position.set(fx, DECK, HZ + 1.95);
      front.position.z = 0.9 * (1 - M.back((f - fWrapped + 10) / 12, 1.2));
      back.position.z = -1.4 * (1 - M.smooth((f - fWooden) / 22));
      back.visible = f >= fWooden - 2;
      // Pour: basket tips from f772, each block drops in sequence and banks against the steel by f802.
      const tip = M.smooth((f - fPacked + 4) / 14);
      basket.group.rotation.set(tip * 1.9, 0, 0.15);
      basket.group.visible = f >= fPacked - 30 && f < fIce - 8;
      basket.ice.visible = tip < 0.55;
      blocks.forEach((b, i) => {
        const t0 = fPacked + 6 + i * 0.7;
        const t = clamp((f - t0) / 6);
        b.m.visible = f >= t0;
        b.m.position.y = b.y + (1 - t * t) * 1.6;
      });
      // Drips run from f838 to the boot puddle, one lands on the rule at f848.
      drops.forEach((d, i) => {
        const age = ((f - fThe + i * 9) % 45) / 45;
        d.visible = f >= fThe - 20;
        const x = -7.25,
          z = HZ + 1.55;
        d.position.set(x, HY - 1.0 - age * (HY - 1.0 - DECK), z);
      });
      puddles.forEach((p, i) => p.scale.setScalar(0.6 + 0.4 * clamp((f - 656 - i * 60) / 260)));

      const { cam, index } = cut(f, [
        {
          from: 656,
          keys: [
            { f: 656, pos: [-18.4, DECK + 4.6, HZ + 10.5], look: [-17.6, DECK + 3.3, HZ + 1.5], fov: 40 },
            { f: fWrapped, pos: [-12.9, DECK + 4.8, HZ + 10.2], look: [-12.2, DECK + 3.5, HZ + 1.4], fov: 40 },
            { f: 771, pos: [-11.6, DECK + 5.0, HZ + 9.8], look: [-11.2, DECK + 3.6, HZ + 1.2], fov: 39 },
          ],
        },
        {
          from: fPacked,
          keys: [
            { f: fPacked, pos: [-10.6, HY + 5.0, HZ + 4.6], look: [-12.2, HY + 1.2, HZ], fov: 38 },
            { f: fIce, pos: [-11.0, HY + 4.3, HZ + 3.7], look: [-12.0, HY + 0.3, HZ], fov: 37, ease: "smooth" },
            { f: 837, pos: [-19, HY + 2.5, HZ + 12], look: [-38, archY(-38, HY) + 0.4, HZ], fov: 40, ease: "smooth", path: [[-13, HY + 3.4, HZ + 7]] },
          ],
        },
        {
          from: fThe,
          keys: [
            { f: fThe, pos: [-5.6, DECK + 1.1, HZ + 6.2], look: [-7.1, DECK + 0.5, HZ + 1.8], fov: 36 },
            { f: fSmirk - 6, pos: [-6.3, DECK + 4.7, HZ + 12.8], look: [-6.8, DECK + 3.6, HZ + 2.3], fov: 38, ease: "smooth" },
            { f: 939, pos: [-6.4, DECK + 4.8, HZ + 11.6], look: [-6.8, DECK + 3.8, HZ + 2.3], fov: 37 },
          ],
        },
      ]);

      const id = idle(f, 4);
      const step = f < fWrapped - 8 || (f > 742 && f < 768) ? Math.sin((f - 656) * 0.42) : 0;
      flad.setPose({
        expression: "focus",
        blink: blinkAt(f, 2),
        gaze: f < fHenry ? 6 : 4,
        step,
        armL: f >= fWrapped - 12 ? { sh: 62, el: 72 } : { sh: 20, el: 10 },
        armR: f >= fWrapped - 12 ? { sh: 64, el: 70 } : { sh: 25, el: 10 },
        mouth: f > fWrapped + 4 && f < fWrapped + 40 ? "smile" : null,
        bob: step ? Math.abs(step) * -8 : id.bob * 900,
      });
      strapper.setPose({ expression: "focus", blink: blinkAt(f, 6), gaze: -6, armL: { sh: 70 + 10 * Math.sin(f * 0.3), el: 40 }, armR: { sh: 60, el: 50 } });
      pourer.setPose({
        expression: tip > 0.2 ? "focus" : "calm",
        blink: blinkAt(f, 7),
        gaze: 4,
        armL: { sh: 165, el: 5 },
        armR: { sh: 160, el: 8 },
        mouth: "tight",
      });
      const caught = f >= fThe + 8;
      const smirk = f >= fSmirk;
      iron.setPose({
        expression: smirk ? "focus" : "calm",
        blink: blinkAt(f, 3),
        headTilt: id.headTilt,
        gaze: smirk ? 9 : caught && f < fSmirk ? -6 : 3,
        armR: { sh: 62, el: 40 },
        rule: "hand",
        ruleAngle: caught ? -8 + 10 * clamp((f - fThe - 12) / 10) : -60,
        armL: { sh: 18, el: 8 },
        mouth: smirk ? lipSync(f, fQuote, 940, "smirk") : "tight",
        browUp: smirk ? 0.7 : 0,
      });
      [flad, strapper, pourer, iron].forEach((a) => a.faceCamera(cam.pos));

      if (index === 0) {
        set.focusShadow(fx, DECK + 3, HZ + 1, 12);
        return { cam, focus: dist(cam, [fx, DECK + 4.5, HZ + 1.95]), aperture: 4 };
      }
      if (index === 1) {
        set.focusShadow(TROUGH_X, HY, HZ, 14);
        return { cam, focus: f < fIce + 4 ? dist(cam, [TROUGH_X, HY + 0.5, HZ]) : dist(cam, [-30, HY - 3, HZ]), aperture: f < fIce + 4 ? 5 : 2 };
      }
      set.focusShadow(-7, DECK + 2, HZ + 2, 9);
      return { cam, focus: f < fSmirk - 10 ? dist(cam, [-7.25, DECK + 0.4, HZ + 1.6]) : dist(cam, [-6.6, DECK + 5, HZ + 2.4]), aperture: 5 };
    },
  };
};

export const Beat04: React.FC = () => <Stage from={656} build={buildEscalation1} />;
