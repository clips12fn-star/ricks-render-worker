import React from "react";
import * as THREE from "three";
import { Sequence } from "remotion";
import { Stage, type BuildWorld } from "./Stage";
import { buildSet, EAST_SEAT, HY, HZ, LIP_ICED, R } from "./set";
import { makeGlove, makeMitt, makeRope, makeShowerInsert } from "./props";
import { makeAssembly, P_DELIVERED, P_IN } from "./joint";
import { CLOCK, col } from "./palette";
import { M, clamp } from "./cinema";
import { cut, dist, track } from "./shot";
import { wf } from "./words";

/*
 * Beat 6 · explanation · f1204-f1475 · pov · explanation · #E0D6B6 #648F99 #42494D
 * "Think of a tension shower rod: workers cranked a threaded wrought-iron screw-plug inward to clear
 *  the tight gap, then spun it outward to lock."
 * A  f1204-f1262 illustrative insert: hands twist a tension rod shorter, slip it between the tiles,
 *    twist it back until the rubber feet grip.
 * B  f1263 match-cut on the rod axis to a crewman's view over the spanner bars; track to a longitudinal
 *    cutaway. f1338 the chalk stripe winds past the fixed scratch as the plug retracts; f1364 the shortened
 *    assembly passes inside both rib faces with daylight; f1412 the turn reverses; f1424 exposed thread
 *    advances across the scratch; f1441 the last sliver of light closes on the east seat.
 */
const fRod = wf("rod:"); // 1232

export const buildShowerInsert: BuildWorld = ({ scene }) => {
  const k = CLOCK[5];
  scene.background = col("#7fc3cf");
  scene.add(new THREE.HemisphereLight(col("#d8f4ff"), col("#42494d"), 2.2));
  const key = new THREE.DirectionalLight(col(k.key), 3.2);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -6;
  key.shadow.camera.right = key.shadow.camera.top = 6;
  scene.add(key);
  const ins = makeShowerInsert();
  scene.add(ins.group);
  const hands = [makeMitt(), makeMitt()];
  hands.forEach((h) => scene.add(h));
  return {
    update: (f) => {
      // extension and twist of the rod sleeve
      const shorten = M.smooth((f - 1212) / 14);
      const slip = M.smooth((f - 1226) / 10);
      const lengthen = M.smooth((f - 1238) / 15);
      const ext = 5.25 - 0.5 * shorten + 0.27 * lengthen; // 5.25 -> 4.75 -> 5.02 (feet press the tiles)
      const twist = -shorten * 4.2 + lengthen * 3.0;
      ins.setRod(Math.min(ext, 5.02), twist);
      const grip = clamp((f - 1250) / 4);
      ins.rod.position.set(0, -0.1, 1.15 * (1 - slip));
      ins.rod.scale.set(1, 1 - grip * 0.04, 1 + grip * 0.04);
      hands.forEach((h, i) => {
        const side = i ? 1 : -1;
        h.position.set(side * 0.38, -0.1 + 0.05, 1.15 * (1 - slip) + 0.04);
        h.rotation.set(Math.PI / 2 + Math.sin(twist + i) * 0.35, 0, side * 0.2);
      });
      const { cam } = cut(f, [
        {
          from: 1204,
          keys: [
            { f: 1204, pos: [2.5, 0.95, 3.4], look: [-0.5, -0.1, 0.4], fov: 46 },
            { f: fRod, pos: [2.0, 0.75, 2.9], look: [-0.6, -0.12, 0.1], fov: 44 },
            { f: 1262, pos: [1.85, 0.7, 2.7], look: [-0.6, -0.12, 0.0], fov: 43 },
          ],
        },
      ]);
      return { cam, focus: dist(cam, [0, -0.1, 0.4]), aperture: 4 };
    },
  };
};

export const buildScrewCutaway: BuildWorld = ({ scene }) => {
  const set = buildSet(scene, 5);
  set.westEnd.position.x = LIP_ICED;
  const asm = makeAssembly(set.heroSteel, true);
  scene.add(asm.group);
  asm.plug.bars.visible = true;
  const sling = [makeRope(), makeRope()];
  sling.forEach((r) => scene.add(r.mesh));
  const gloves = [makeGlove(), makeGlove()];
  gloves.forEach((g) => {
    g.group.scale.setScalar(1.3);
    scene.add(g.group);
  });
  // A warm local light on the joint against the blue depth.
  const spot = new THREE.SpotLight("#fff1cf", 40, 30, 0.45, 0.5, 1.2);
  spot.position.set(9, HY + 6, HZ + 6);
  spot.target.position.set(EAST_SEAT, HY, HZ);
  scene.add(spot, spot.target);

  const fWorkers = wf("workers"); // 1263
  const fInward = wf("inward"); // 1338
  const fClear = wf("clear"); // 1364
  const fGap = wf("gap,"); // 1382
  const fSpun = wf("spun"); // 1412
  const fOutward = wf("outward"); // 1424
  const fLock = wf("lock."); // 1441

  return {
    update: (f) => {
      // stand-off: delivered -> cranked in by f1345 -> held -> spun out from f1412 to the seat at f1441
      const p =
        f < fSpun
          ? track(f, [
              [fWorkers + 6, P_DELIVERED],
              [fInward + 8, P_IN],
            ])
          : track(f, [
              [fSpun + 2, P_IN],
              [fLock, asm.pLock],
            ]);
      const y = HY + 1.6 * (1 - M.smooth((f - fInward - 10) / (fClear - fInward - 10)));
      // centred with daylight at both ends while lowering, then slid west against the iced lip
      const centred = (LIP_ICED + EAST_SEAT - asm.length - P_IN) / 2;
      const west = track(f, [
        [fClear + 4, centred],
        [fGap + 14, LIP_ICED],
      ]);
      asm.set(west, y, p);
      const top = y + R;
      sling.forEach((r, i) => r.set(new THREE.Vector3(0, HY + 13, HZ), new THREE.Vector3(i ? 2.5 : -2.5, top, HZ), 0.0));
      // gloves ride the spanner bars during the POV crank
      const ang = asm.plug.spin.rotation.x;
      gloves.forEach((g, i) => {
        const a = ang + i * Math.PI;
        const cx = asm.plug.group.position.x + 0.475 + 0.06;
        g.group.position.set(cx, y + Math.cos(a) * 1.35, HZ + Math.sin(a) * 1.35);
        g.group.rotation.set(-a, 0, Math.PI / 2);
        g.setCurl(1.3);
        g.group.visible = f < fWorkers + 40;
      });

      const end = west + asm.length;
      const { cam, index } = cut(f, [
        {
          from: 1263,
          keys: [
            { f: 1263, pos: [end + 2.2, y + 2.4, HZ + 0.9], look: [end - 0.6, y - 0.1, HZ], fov: 44 },
            { f: fWorkers + 30, pos: [end + 1.9, y + 2.0, HZ + 1.3], look: [end - 0.5, y, HZ], fov: 42 },
            { f: fInward - 8, pos: [end + 0.2, y + 0.25, HZ + 3.3], look: [end + 0.15, y, HZ], fov: 34, ease: "smooth" },
            { f: fInward + 10, pos: [end + 0.15, y + 0.2, HZ + 3.2], look: [end + 0.1, y, HZ], fov: 34 },
          ],
        },
        {
          from: fInward + 11,
          keys: [
            { f: fInward + 11, pos: [end + 0.15, y + 0.2, HZ + 3.2], look: [end + 0.1, y, HZ], fov: 34 },
            { f: fClear, pos: [8.6, HY + 0.4, HZ + 4.4], look: [0, HY - 0.9, HZ], fov: 44, ease: "smooth" },
            { f: fGap + 14, pos: [8.4, HY + 0.35, HZ + 4.2], look: [0, HY - 0.9, HZ], fov: 44 },
          ],
        },
        {
          from: fGap + 15,
          keys: [
            { f: fGap + 15, pos: [8.4, HY + 0.35, HZ + 4.2], look: [0, HY - 0.9, HZ], fov: 44 },
            { f: fSpun - 2, pos: [EAST_SEAT - 0.25, HY + 0.18, HZ + 3.0], look: [EAST_SEAT - 0.2, HY, HZ], fov: 32, ease: "smooth" },
            { f: 1475, pos: [EAST_SEAT - 0.25, HY + 0.15, HZ + 2.75], look: [EAST_SEAT - 0.2, HY, HZ], fov: 31 },
          ],
        },
      ]);
      // impact shake when the last sliver closes
      const age = f - fLock;
      if (age >= 0 && age < 7) {
        const s = (age % 2 ? -1 : 1) * 0.012 * (1 - age / 7);
        cam.look[1] += s;
        cam.roll = (cam.roll ?? 0) + s * 60;
      }
      set.focusShadow(index === 1 ? 0 : end, HY, HZ, index === 1 ? 14 : 5);
      const focusPt = index === 1 ? [0, HY, HZ] : [end + p * 0.5, y, HZ];
      return { cam, focus: dist(cam, focusPt), aperture: index === 1 ? 2.5 : 6, flash: age >= 0 && age < 4 ? 0.18 * (1 - age / 4) : 0 };
    },
  };
};

export const Beat06: React.FC = () => (
  <>
    <Sequence durationInFrames={59}>
      <Stage from={1204} build={buildShowerInsert} />
    </Sequence>
    <Sequence from={59} durationInFrames={213}>
      <Stage from={1263} build={buildScrewCutaway} />
    </Sequence>
  </>
);
