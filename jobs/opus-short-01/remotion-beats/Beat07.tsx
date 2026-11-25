import React from "react";
import * as THREE from "three";
import { Sequence } from "remotion";
import { Stage, type BuildWorld } from "./Stage";
import { archY, buildSet, DECK, EAST_SEAT, HY, HZ, LIP_ICED, R, SCRIBE_X } from "./set";
import { makeActor } from "./actors";
import { makeLedger, makeRope } from "./props";
import { makeAssembly } from "./joint";
import { buildHook } from "./hook";
import { blinkAt, M, clamp } from "./cinema";
import { cut, dist, track } from "./shot";
import { wf } from "./words";

/*
 * Beat 7 · payoff · f1476-f1755 · low_angle · payoff · #EBC789 #48697A #394650
 * "On September 17, 1873, the west arch locked tight two days early, saving the London loan while
 *  the stunned ironmaster saw how"
 * A f1476 ledger open at SEP 17, 1873 beside the struck SEP 19; rise over the page and look up the arch.
 *   f1585 the bearing faces meet (impact kick); follow the continuous rib out over the water.
 * B f1643-f1702 full-screen side macro, 60 frames: the hoist sling relaxes into a belly while the seated
 *   faces stay flush on the fixed scribe; river light through the sling. Pure physical proof.
 * C f1703-f1726 hard cut, 24 frames: the ironmaster alone — brow drops, eyes widen, silent o.
 * D f1727-f1740 cut on his downward glance to the thread nick.
 * E f1741-f1755 orbit into the hook's glove-and-plug match shot (hook world, f-15..f-1) -> loops to f0.
 */
const DESK = new THREE.Vector3(-17, DECK + 3.39, 16);
const fOn = 1476;
const fWest = wf("west"); // 1571
const fLocked = wf("locked"); // 1585
const fSaving = wf("saving"); // 1633

export const buildPayoff: BuildWorld = ({ scene, cardNd }) => {
  const set = buildSet(scene, 6);
  set.westEnd.position.x = LIP_ICED;
  const ledger = makeLedger();
  ledger.setPage("closed");
  ledger.group.position.copy(DESK);
  scene.add(ledger.group);
  const asm = makeAssembly(set.heroSteel, false);
  asm.plug.bars.visible = true;
  scene.add(asm.group);
  // hoist sling: main fall to a loop round the tube near the west joint
  const fall = makeRope("#c9a36b", 0.07);
  const loopA = makeRope("#c9a36b", 0.07);
  scene.add(fall.mesh, loopA.mesh);
  const crewA = makeActor("worker", cardNd, set.clock.tint);
  crewA.group.position.set(2.2, DECK, HZ + 1.7);
  const crewB = makeActor("rigger", cardNd, set.clock.tint);
  crewB.group.position.set(8.8, DECK, HZ + 1.9);
  scene.add(crewA.group, crewB.group);

  return {
    update: (f) => {
      // final quarter turn lands at f1585
      const p = track(f, [
        [fWest - 4, asm.pLock - 0.03],
        [fLocked, asm.pLock],
      ]);
      asm.set(LIP_ICED, HY, p);
      // sling: taut until the arch carries the member, then a belly forms (f1650-f1690)
      const slack = M.smooth((f - 1650) / 40);
      const anchor = new THREE.Vector3(-5.45, HY + R + 0.02, HZ + 0.1);
      const top = new THREE.Vector3(-5.45 + slack * 0.1, HY + 4.5 - slack * 1.2, HZ + 0.4);
      fall.set(new THREE.Vector3(-5.45, HY + 22, HZ + 0.4), top, 0);
      loopA.set(top, anchor, slack * 1.2);

      const { cam, index } = cut(f, [
        {
          from: fOn,
          keys: [
            { f: fOn, pos: [DESK.x + 0.55, DESK.y + 1.5, DESK.z + 1.25], look: [DESK.x + 0.45, DESK.y, DESK.z - 0.05], fov: 40 },
            { f: 1520, pos: [DESK.x + 0.45, DESK.y + 1.75, DESK.z + 1.1], look: [DESK.x + 0.4, DESK.y, DESK.z - 0.1], fov: 40 },
            {
              f: 1566,
              pos: [DESK.x + 1.6, DESK.y + 0.2, DESK.z - 0.4],
              look: [-6, HY + 9, HZ],
              fov: 44,
              ease: "smooth",
              path: [[DESK.x + 1.0, DESK.y + 2.6, DESK.z + 0.2]],
            },
          ],
        },
        {
          from: 1567,
          keys: [
            { f: 1567, pos: [2.6, DECK + 1.1, HZ + 5.6], look: [EAST_SEAT - 0.4, HY + 0.5, HZ], fov: 38 },
            { f: fLocked, pos: [3.3, DECK + 1.0, HZ + 4.8], look: [EAST_SEAT - 0.2, HY + 0.3, HZ], fov: 36, ease: "easeOut" },
            { f: 1642, pos: [6, DECK + 1.6, HZ + 13], look: [70, archY(70, HY) + 2, HZ], fov: 42, ease: "smooth" },
          ],
          kicks: [{ f: fLocked, a: 0.05 }],
        },
        {
          from: 1643,
          keys: [
            { f: 1643, pos: [SCRIBE_X + 0.45, HY + 0.7, HZ + 4.2], look: [SCRIBE_X + 0.15, HY - 0.15, HZ + 0.4], fov: 36 },
            { f: 1702, pos: [SCRIBE_X + 0.42, HY + 0.66, HZ + 4.0], look: [SCRIBE_X + 0.15, HY - 0.15, HZ + 0.4], fov: 35 },
          ],
        },
        {
          from: 1727,
          keys: [
            { f: 1727, pos: [EAST_SEAT - 0.05, HY + 0.95, HZ + 0.95], look: [EAST_SEAT - 0.2, HY + R * 0.5, HZ], fov: 36 },
            { f: 1740, pos: [EAST_SEAT - 0.1, HY + 0.85, HZ + 0.85], look: [EAST_SEAT - 0.2, HY + R * 0.5, HZ], fov: 35 },
          ],
        },
      ]);
      const push = clamp((f - 1560) / 30);
      crewA.setPose({
        expression: f > fLocked + 3 ? "calm" : "focus",
        mouth: f > fLocked + 3 ? "smile" : "tight",
        blink: blinkAt(f, 5),
        gaze: 6,
        armL: { sh: 120 - push * 30, el: 20 },
        armR: { sh: 110 - push * 25, el: 25 },
      });
      crewB.setPose({
        expression: f > fLocked + 3 ? "calm" : "focus",
        mouth: f > fLocked + 3 ? "grin" : "tight",
        blink: blinkAt(f, 9),
        gaze: -6,
        armL: { sh: 115 - push * 20, el: 30 },
        armR: { sh: 100, el: 30 },
      });
      crewA.faceCamera(cam.pos);
      crewB.faceCamera(cam.pos);

      if (index === 0) {
        set.focusShadow(DESK.x, DESK.y, DESK.z, 6);
        return { cam, focus: f < 1530 ? dist(cam, [DESK.x + 0.4, DESK.y, DESK.z]) : dist(cam, [-6, HY, HZ]), aperture: f < 1530 ? 5 : 1.5 };
      }
      if (index === 1) {
        set.focusShadow(EAST_SEAT, HY, HZ, 12);
        const age = f - fLocked;
        return {
          cam,
          focus: f < fSaving - 20 ? dist(cam, [EAST_SEAT, HY, HZ]) : 60,
          aperture: f < fSaving - 20 ? 3 : 1,
          flash: age >= 0 && age < 4 ? 0.22 * (1 - age / 4) : 0,
        };
      }
      if (index === 2) {
        set.focusShadow(SCRIBE_X, HY, HZ, 4);
        return { cam, focus: dist(cam, [SCRIBE_X, HY - 0.2, HZ + 0.6]), aperture: 5 };
      }
      set.focusShadow(EAST_SEAT, HY, HZ, 3);
      return { cam, focus: dist(cam, asm.nickWorld()), aperture: 9 };
    },
  };
};

/** C · the ironmaster alone, high-resolution card, blurred bridge behind. */
export const buildStunned: BuildWorld = ({ scene, cardNd }) => {
  const set = buildSet(scene, 6);
  set.westEnd.position.x = LIP_ICED;
  const iron = makeActor("ironmaster", cardNd, set.clock.tint, 1, 3);
  iron.group.position.set(-8, DECK, HZ + 3);
  scene.add(iron.group);
  return {
    update: (f) => {
      const t = f - 1703;
      const cam = { pos: [-8, DECK + 4.55, HZ + 7.4 - t * 0.012], look: [-8, DECK + 4.15, HZ + 3], fov: 34 };
      const widen = M.easeOut((t - 5) / 5);
      iron.setPose({
        expression: t < 5 ? "focus" : "surprise",
        mouth: t < 5 ? "smirk" : "oh",
        browUp: t < 5 ? 0.7 * (1 - t / 5) : 0,
        accent: widen,
        gaze: t > 18 ? -2 : 0,
        blink: 0,
        crossArms: true,
        rule: "tucked",
        headTilt: t > 18 ? 3 : 0,
      });
      iron.faceCamera(cam.pos);
      set.focusShadow(-8, DECK + 4, HZ + 3, 8);
      return { cam, focus: dist(cam, [-8, DECK + 4.9, HZ + 3]), aperture: 9 };
    },
  };
};

export const Beat07: React.FC = () => (
  <>
    <Sequence durationInFrames={1703 - fOn}>
      <Stage from={fOn} build={buildPayoff} />
    </Sequence>
    <Sequence from={1703 - fOn} durationInFrames={24}>
      <Stage from={1703} build={buildStunned} />
    </Sequence>
    <Sequence from={1727 - fOn} durationInFrames={14}>
      <Stage from={1727} build={buildPayoff} />
    </Sequence>
    <Sequence from={1741 - fOn} durationInFrames={15}>
      {/* loop tail: the hook world rendered at f-15..f-1 so f1755 sits one increment before f0 */}
      <Stage from={-15} build={buildHook(0)} />
    </Sequence>
  </>
);
