import React from "react";
import * as THREE from "three";
import { Stage, type BuildWorld } from "./Stage";
import { buildSet, DECK, HY, HZ, LIP_COOL, LIP_HOT, SCRIBE_X } from "./set";
import { makeActor } from "./actors";
import { makePlug, PLUG_R } from "./props";
import { makeCrew, PLUG_HOME, poseCrew, trestle } from "./hook";
import { blinkAt, idle, M } from "./cinema";
import { cut, dist, track } from "./shot";
import { lipSync, wf } from "./words";

/*
 * Beat 2 · context · f92-f371 · wide · anomaly · #EAC084 #B25B38 #48576A
 * "In September 1873, blistering heat expanded the Eads Bridge arch.
 *  The senior ironmaster scoffed, 'That steel won't close.'"
 * S0 f92  pull back from the waiting plug to both half arches over the Mississippi.
 * S1 f150 cut on the staging to a locked side elevation: the sunlit lip creeps across the fixed
 *         scribe, main excursion f173-f185 centred on f179 ("expanded").
 * S2 f248 tilt up to the ironmaster: rule taps the rib, f277 rule tucked under crossed arms, brow up.
 */
export const buildContext: BuildWorld = ({ scene, cardNd }) => {
  const set = buildSet(scene, 1);
  const plug = makePlug();
  plug.group.position.set(PLUG_HOME.x, PLUG_HOME.y - 0.53, PLUG_HOME.z);
  plug.spin.rotation.x = -0.25;
  const saddle = trestle(PLUG_HOME.y - PLUG_R - 0.55);
  saddle.position.set(PLUG_HOME.x, 0, PLUG_HOME.z);
  scene.add(plug.group, saddle);

  const iron = makeActor("ironmaster", cardNd, set.clock.tint);
  iron.group.position.set(-8.6, DECK, HZ + 2.3);
  scene.add(iron.group);
  const crew = makeCrew(scene, cardNd, set.clock.tint);

  const fExpanded = wf("expanded"); // 179
  const fIron = wf("ironmaster"); // 258
  const fScoff = wf("scoffed,"); // 277
  const fQuote = wf("'That"); // 311
  const joint = new THREE.Vector3(SCRIBE_X, HY - 0.6, HZ + 0.9);

  return {
    update: (f) => {
      // Heat creep of the west lip, centred on the scribe at f179.
      const lip = track(f, [
        [150, LIP_COOL],
        [fExpanded - 6, -5.96],
        [fExpanded + 6, -5.84],
        [247, LIP_HOT],
      ]);
      set.westEnd.position.x = lip;

      const { cam, index } = cut(f, [
        {
          from: 92,
          keys: [
            { f: 92, pos: [13, HY + 3.2, HZ + 15], look: [-5, HY + 0.6, HZ - 3], fov: 42 },
            { f: 149, pos: [44, -22, 196], look: [0, -28, 0], fov: 38, path: [[24, HY + 5, 62]] },
          ],
        },
        {
          from: 150,
          keys: [
            { f: 150, pos: [SCRIBE_X + 0.32, HY - 0.5, HZ + 4.1], look: [SCRIBE_X + 0.05, HY - 0.95, HZ + 0.9], fov: 27 },
            { f: 247, pos: [SCRIBE_X + 0.31, HY - 0.49, HZ + 4.05], look: [SCRIBE_X + 0.05, HY - 0.95, HZ + 0.9], fov: 27 },
          ],
        },
        {
          from: 248,
          keys: [
            { f: 248, pos: [SCRIBE_X + 0.31, HY - 0.49, HZ + 4.05], look: [SCRIBE_X + 0.05, HY - 0.95, HZ + 0.9], fov: 27 },
            { f: 266, pos: [-8.2, DECK + 4.6, HZ + 15.5], look: [-7.9, DECK + 3.2, HZ + 2.3], fov: 38, ease: "smooth", path: [[-6.8, HY + 0.4, HZ + 7.5]] },
            { f: 371, pos: [-8.4, DECK + 4.8, HZ + 14.2], look: [-8.1, DECK + 3.5, HZ + 2.3], fov: 37 },
          ],
        },
      ]);

      // Ironmaster: rule taps the rib, then arms cross with the rule tucked and one brow raised at the crew.
      const b = blinkAt(f, 3);
      const id = idle(f, 2);
      if (f < fScoff) {
        const tapping = f >= fIron - 6;
        const tap = tapping ? Math.abs(Math.sin(((f - fIron + 6) / 6) * Math.PI)) : 0;
        iron.setPose({
          expression: "stern",
          blink: b,
          gaze: 8,
          headTilt: id.headTilt,
          armR: tapping ? { sh: 105 + tap * 12, el: -15 } : { sh: 25, el: 30 },
          rule: tapping ? "tap" : "hand",
          ruleAngle: tapping ? -55 - tap * 15 : -80,
          armL: { sh: 18, el: 10 },
          mouth: "tight",
          bob: id.bob * 900,
        });
      } else {
        iron.setPose({
          expression: "stern",
          blink: b,
          gaze: 10,
          headTilt: id.headTilt - 4,
          crossArms: true,
          rule: "tucked",
          browUp: M.easeOut((f - fScoff) / 6),
          chinUp: 14 * M.easeOut((f - fScoff) / 8),
          mouth: lipSync(f, fQuote, 372, "scoff"),
          bob: id.bob * 900,
        });
      }
      poseCrew(crew, f, f > fQuote, cam.pos);
      iron.faceCamera(cam.pos);

      if (index === 0) {
        set.focusShadow(0, HY, HZ, M.smooth((f - 92) / 40) * 100 + 18);
        return { cam, focus: f < 110 ? dist(cam, PLUG_HOME) : dist(cam, [0, HY, HZ]), aperture: 2.5 * (1 - M.smooth((f - 92) / 25)) };
      }
      if (index === 1) {
        set.focusShadow(joint.x, joint.y, joint.z, 4);
        return { cam, focus: dist(cam, joint), aperture: 7 };
      }
      set.focusShadow(-6, DECK + 3, HZ + 2, 16);
      return { cam, focus: f < 262 ? dist(cam, joint) : dist(cam, [-8.6, DECK + 5, HZ + 2.3]), aperture: 4 };
    },
  };
};

export const Beat02: React.FC = () => <Stage from={92} build={buildContext} />;
