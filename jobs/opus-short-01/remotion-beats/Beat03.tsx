import React from "react";
import * as THREE from "three";
import { Stage, type BuildWorld } from "./Stage";
import { buildSet, DECK, HY, HZ, LIP_HOT, R } from "./set";
import { makeActor } from "./actors";
import { makeClosingTube, makeGlove, makeLedger, makeRope } from "./props";
import { blinkAt, M } from "./cinema";
import { cut, dist, track } from "./shot";
import { wf } from "./words";

/*
 * Beat 3 · friction · f372-f655 · top_down_overhead · pressure · #D59650 #773D31 #33444C
 * "Missing the September 19 deadline meant forfeiting a half-million-dollar London loan,
 *  yet thermal expansion pinched the 502-foot arch gap too narrow."
 * S0 f372 overhead on the plank desk: a gloved thumb pins SEP 19 (f388) and runs to LONDON · $500,000 (f451).
 * S1 f480 track along the ruled edge onto the hoist line, arriving over the west seat.
 * S2 f515 the full-length standard tube descends between the guides; f547 its pale rim overlaps the seat.
 * S3 f590 drop to joint height: the sling takes the weight, daylight under the jammed end by f616.
 */
const DESK = new THREE.Vector3(-17, DECK + 3.39, 16);
// Ledger canvas (1024x768 over 2.2 x 1.65 ft) to world.
const onPage = (u: number, v: number) => new THREE.Vector3(DESK.x + (u / 1024 - 0.5) * 2.2, DESK.y + 0.07, DESK.z + (v / 768 - 0.5) * 1.65);
const SEP19 = onPage(300, 236);
const LONDON = onPage(820, 330);

export const buildFriction: BuildWorld = ({ scene, cardNd }) => {
  const set = buildSet(scene, 2);
  set.westEnd.position.x = LIP_HOT;
  const ledger = makeLedger();
  ledger.group.position.copy(DESK);
  scene.add(ledger.group);
  const glove = makeGlove("#a8744a");
  glove.group.scale.setScalar(1.0);
  glove.setCurl(1.5, 0.05);
  scene.add(glove.group);

  const tube = makeClosingTube("standard", set.heroSteel);
  scene.add(tube.group);
  const sheave = new THREE.Vector3(0, DECK + 25, HZ);
  const main = makeRope();
  const legA = makeRope();
  const legB = makeRope();
  scene.add(main.mesh, legA.mesh, legB.mesh);

  const crewA = makeActor("worker", cardNd, set.clock.tint);
  crewA.group.position.set(0.6, DECK, HZ + 2.6);
  const crewB = makeActor("rigger", cardNd, set.clock.tint);
  crewB.group.position.set(3.8, DECK, HZ + 2.2);
  scene.add(crewA.group, crewB.group);

  const fSep = wf("19"); // 388
  const fHalf = wf("half-million-dollar"); // 451
  const fYet = wf("yet"); // 515
  const fPinched = wf("pinched"); // 547
  const fNarrow = wf("narrow."); // 616

  return {
    update: (f) => {
      // Thumb pins the due date, then runs to the lender and the sum.
      const enter = M.smooth((f - 372) / (fSep - 372));
      const run = M.smooth((f - (fHalf - 20)) / 20);
      const tip = new THREE.Vector3().lerpVectors(SEP19, LONDON, run);
      // index fingertip sits just under the entry so the words stay readable
      glove.group.position.set(tip.x + 0.05, tip.y + 0.1 + (1 - enter) * 0.25, tip.z + 0.86 + (1 - enter) * 1.6);
      glove.group.rotation.set(0, Math.PI / 2 + 0.12, -0.12);
      glove.group.visible = f < 500;

      // Standard tube: level descent, jams on the hot west lip at f547, east end drops into its seat.
      const down = M.smooth((f - fYet + 10) / (fPinched - fYet + 10));
      const restWest = HY + 2 * R; // tube rides on top of the west mouth
      const westY = restWest + (1 - down) * 6;
      const tilt = M.smooth((f - fPinched) / 26);
      const eastY = westY - tilt * (restWest - HY);
      const regrab = M.smooth((f - 590) / 20) * 0.08; // sling takes weight again
      const wy = westY + regrab,
        ey = eastY + regrab * 0.2;
      tube.group.position.set(0, (wy + ey) / 2, HZ);
      tube.group.rotation.set(0, 0, Math.atan2(ey - wy, 12));
      tube.group.visible = f >= 480;
      const ring = new THREE.Vector3(0, (wy + ey) / 2 + 3.2, HZ);
      main.set(sheave, ring, 0.05);
      legA.set(ring, new THREE.Vector3(-3, wy + (ey - wy) * 0.25 + R, HZ), 0.02);
      legB.set(ring, new THREE.Vector3(3, wy + (ey - wy) * 0.75 + R, HZ), 0.02);
      [main, legA, legB].forEach((r) => (r.mesh.visible = f >= 480));

      const { cam, index } = cut(f, [
        {
          from: 372,
          keys: [
            { f: 372, pos: [SEP19.x + 0.1, DESK.y + 3.6, SEP19.z + 0.42], look: [SEP19.x + 0.1, DESK.y, SEP19.z + 0.41], fov: 40 },
            { f: fSep, pos: [SEP19.x + 0.05, DESK.y + 3.3, SEP19.z + 0.39], look: [SEP19.x + 0.05, DESK.y, SEP19.z + 0.38], fov: 40 },
            { f: fHalf, pos: [LONDON.x - 0.1, DESK.y + 3.3, LONDON.z + 0.39], look: [LONDON.x - 0.1, DESK.y, LONDON.z + 0.38], fov: 40, ease: "smooth" },
            { f: 479, pos: [LONDON.x - 0.05, DESK.y + 3.6, LONDON.z + 0.39], look: [LONDON.x - 0.05, DESK.y, LONDON.z + 0.38], fov: 40 },
          ],
        },
        {
          from: 480,
          keys: [
            { f: 480, pos: [LONDON.x - 0.05, DESK.y + 3.6, LONDON.z + 0.39], look: [LONDON.x - 0.05, DESK.y, LONDON.z + 0.38], fov: 40 },
            { f: fYet, pos: [-5.7, HY + 9.5, HZ + 0.6], look: [-5.7, HY, HZ + 0.59], fov: 44, ease: "smooth", path: [[-12, DECK + 9, 13]] },
          ],
        },
        {
          from: fYet,
          keys: [
            { f: fYet, pos: [-5.7, HY + 9.5, HZ + 0.6], look: [-5.7, HY, HZ + 0.59], fov: 44 },
            { f: fPinched, pos: [-7.7, HY + 5.2, HZ + 2.4], look: [-5.85, HY + 0.6, HZ], fov: 38, ease: "smooth" },
            { f: 589, pos: [-7.6, HY + 4.9, HZ + 2.3], look: [-5.85, HY + 0.6, HZ], fov: 37 },
          ],
        },
        {
          from: 590,
          keys: [
            { f: 590, pos: [-7.6, HY + 4.9, HZ + 2.3], look: [-5.85, HY + 0.6, HZ], fov: 37 },
            { f: fNarrow - 4, pos: [-3.3, HY - 0.15, HZ + 6.4], look: [-5.8, HY + 0.95, HZ], fov: 34, ease: "smooth", path: [[-4.2, HY + 2.4, HZ + 4.2]] },
            { f: 655, pos: [-3.5, HY - 0.2, HZ + 6.0], look: [-5.85, HY + 0.95, HZ], fov: 33 },
          ],
        },
      ]);

      crewA.setPose({
        expression: f > fPinched + 10 ? "surprise" : "focus",
        blink: blinkAt(f, 4),
        gaze: -6,
        armL: { sh: 150, el: 10 },
        armR: { sh: 140, el: 15 },
        mouth: f > fPinched + 10 ? "tight" : null,
      });
      crewB.setPose({
        expression: f > fPinched + 10 ? "stern" : "focus",
        blink: blinkAt(f, 9),
        gaze: -10,
        armL: { sh: 120, el: 30 },
        armR: { sh: 30, el: 10 },
        sweat: f > fNarrow - 20 ? 1 : 0,
      });
      crewA.faceCamera(cam.pos);
      crewB.faceCamera(cam.pos);

      if (index === 0) {
        set.focusShadow(DESK.x, DESK.y, DESK.z, 4);
        return { cam, focus: cam.pos[1] - DESK.y, aperture: 3 };
      }
      if (index === 1) {
        set.focusShadow(-10, HY, HZ, 16);
        return {
          cam,
          focus: track(f, [
            [480, 3.6],
            [fYet, 9.5],
          ]),
          aperture: 2,
        };
      }
      if (index === 2) {
        set.focusShadow(-5.85, HY, HZ, 6);
        return { cam, focus: dist(cam, [-5.85, HY + R, HZ]), aperture: 3 };
      }
      set.focusShadow(-5.85, HY, HZ, 6);
      return { cam, focus: dist(cam, [-5.9, HY + 0.9, HZ]), aperture: 5 };
    },
  };
};

export const Beat03: React.FC = () => <Stage from={372} build={buildFriction} />;
