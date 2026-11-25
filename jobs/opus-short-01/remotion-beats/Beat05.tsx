import React from "react";
import * as THREE from "three";
import { Stage, type BuildWorld } from "./Stage";
import { buildSet, DECK, HY, HZ, LIP_HOT, LIP_ICED, R, SCRIBE_X } from "./set";
import { makeClosingTube, makeCrate, makeGlove, makePlug, makeRope, makeRule, makeTroughHalf } from "./props";
import { beam, M, tex } from "./cinema";
import { cut, dist, track } from "./shot";
import { wf } from "./words";

/*
 * Beat 5 · escalation2 · f940-f1203 · top_down_overhead · pressure -> reappearance · #7DAEB8 #423D39 #DBA96B
 * "He was right: the ribs barely shrank. So crews used the backup built by James Eads:
 *  closing tubes cut five inches short with internal threads."
 * S0 f940  straight down on the wet lip and fixed scribe; the cooling lip retreats across f982-f994
 *          but the presented standard tube still overhangs the seat at f988.
 * S1 f1015 track the crewman's hands to the J. B. EADS crate; the lid slides off at f1040.
 * S2 f1100 backup beside standard against one end stop; f1127 the rule's exposed five inches bridge the difference.
 * S3 f1160 tip into the backup bore; f1171 raking light finds the female helix and the nicked plug beside it.
 */
const STOP_X = -20;
const STD_Z = HZ + 4.0;
const BAK_Z = HZ + 5.7;
const CRATE = new THREE.Vector3(-14, DECK, HZ + 8.6);

export const buildEscalation2: BuildWorld = ({ scene }) => {
  const set = buildSet(scene, 4);
  // Opened, draining troughs stay on the rib; wet beads sit on the steel.
  const tA = makeTroughHalf(9, 1);
  const tB = makeTroughHalf(9, -1);
  const tr = new THREE.Group();
  tr.add(tA, tB);
  tr.position.set(-12, HY, HZ);
  tA.position.z = 0.5;
  tA.rotation.x = 0.5;
  scene.add(tr);
  const wet = new THREE.MeshStandardMaterial({ color: "#bfefff", emissive: "#6fd0ff", emissiveIntensity: 0.35, roughness: 0.05 });
  for (let i = 0; i < 16; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (i % 3) * 0.012, 8, 6), wet);
    d.scale.y = 0.45;
    const x = -7.4 + ((i * 37) % 140) / 100;
    const a = (((i * 53) % 100) / 100 - 0.5) * 2;
    d.position.set(x, HY + Math.cos(a) * R, HZ + Math.sin(a) * R);
    set.westEnd.attach(d);
  }

  // The same standard tube, presented again from the far side.
  const std = makeClosingTube("standard", set.heroSteel);
  scene.add(std.group);
  const hang = makeRope();
  scene.add(hang.mesh);

  const crate = makeCrate();
  crate.group.position.copy(CRATE);
  scene.add(crate.group);
  const gloveL = makeGlove("#a8744a");
  const gloveR = makeGlove("#a8744a");
  scene.add(gloveL.group, gloveR.group);

  // Comparison on the deck: end stop, standard and backup side by side, the rule and the plug.
  const stop = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.8, 3.6),
    new THREE.MeshStandardMaterial({ map: tex(beam(41, [28, 44, 40]), 1, 1), roughness: 0.85 }),
  );
  stop.position.set(STOP_X - 0.3, DECK + 0.9, (STD_Z + BAK_Z) / 2);
  stop.castShadow = stop.receiveShadow = true;
  scene.add(stop);
  const stdLay = makeClosingTube("standard", set.heroSteel);
  stdLay.group.position.set(STOP_X + 6, DECK + R, STD_Z);
  const bak = makeClosingTube("backup", set.heroSteel);
  bak.group.position.set(STOP_X + bak.length / 2, DECK + R, BAK_Z);
  scene.add(stdLay.group, bak.group);
  const bakEnd = STOP_X + bak.length; // -8.417
  const rule = makeRule(12, [0, 5]);
  scene.add(rule);
  const plug = makePlug();
  plug.group.position.set(bakEnd + 0.9, DECK + 0.62, BAK_Z + 1.25);
  plug.group.rotation.y = Math.PI;
  plug.spin.rotation.x = 0.2;
  scene.add(plug.group);
  const rake = new THREE.SpotLight("#fff2d0", 0, 14, 0.5, 0.6, 1.2);
  rake.position.set(bakEnd + 3, DECK + R + 0.6, BAK_Z - 1.6);
  rake.target.position.set(bakEnd - 0.5, DECK + R, BAK_Z);
  scene.add(rake, rake.target);

  const fBarely = wf("barely"); // 975
  const fShrank = wf("shrank."); // 988
  const fSo = wf("So"); // 1015
  const fBackup = wf("backup"); // 1040
  const fClosing = wf("closing"); // 1101
  const fFive = wf("five", 1100); // 1127
  const fInternal = wf("internal"); // 1162
  const fThreads = wf("threads."); // 1171

  return {
    update: (f) => {
      set.westEnd.position.x = track(f, [
        [fBarely + 7, LIP_HOT],
        [fShrank - 6, -5.85],
        [fShrank + 6, LIP_ICED + 0.004],
        [1014, LIP_ICED],
      ]);
      // standard tube held level behind the joint, its end at the cool position: it overhangs the seat.
      std.group.position.set(0, HY + 0.25, HZ - 1.75);
      hang.set(new THREE.Vector3(-3, HY + 14, HZ - 1.75), new THREE.Vector3(-3, HY + 0.25 + R, HZ - 1.75), 0.0);
      std.group.visible = hang.mesh.visible = f < fSo + 20;

      // Lid slides off at f1040 under two gloves.
      const slide = M.smooth((f - fBackup + 6) / 16);
      crate.lid.position.x = slide * 9;
      crate.lid.position.y = 2.32 + slide * 0.04;
      for (const [gv, dx] of [
        [gloveL, -4.8],
        [gloveR, 4.8],
      ] as const) {
        gv.group.position.set(CRATE.x + dx + slide * 9, CRATE.y + 2.6, CRATE.z + 0.4);
        gv.group.rotation.set(0.2, Math.PI / 2 - dx * 0.04, -0.3);
        gv.setCurl(1.1);
        gv.group.visible = f >= fSo && f < fClosing;
      }
      // Rule drops onto the backup end and lies across to the standard's end.
      const lay = M.easeOut((f - fFive + 10) / 10);
      rule.position.set(bakEnd + 0.5, DECK + 2 * R + 0.02 + (1 - lay) * 0.6, BAK_Z - 0.42);
      rule.visible = f >= fFive - 10;
      rake.intensity = 30 * M.smooth((f - fThreads + 6) / 8);

      const { cam, index } = cut(f, [
        {
          from: 940,
          keys: [
            { f: 940, pos: [SCRIBE_X + 1.5, HY + 2.8, HZ + 2.7], look: [SCRIBE_X - 0.05, HY - 0.25, HZ + 0.2], fov: 38 },
            { f: 1014, pos: [SCRIBE_X + 1.4, HY + 2.6, HZ + 2.55], look: [SCRIBE_X - 0.05, HY - 0.25, HZ + 0.2], fov: 37 },
          ],
        },
        {
          from: fSo,
          keys: [
            { f: fSo, pos: [SCRIBE_X + 1.4, HY + 2.6, HZ + 2.55], look: [SCRIBE_X - 0.05, HY - 0.25, HZ + 0.2], fov: 37 },
            {
              f: fBackup - 8,
              pos: [CRATE.x - 0.5, CRATE.y + 7.5, CRATE.z + 8.5],
              look: [CRATE.x + 1, CRATE.y + 1.6, CRATE.z],
              fov: 44,
              ease: "smooth",
              path: [[-9, HY + 6, HZ + 6]],
            },
            { f: 1099, pos: [CRATE.x + 0.6, CRATE.y + 7, CRATE.z + 8], look: [CRATE.x + 2.2, CRATE.y + 1.6, CRATE.z], fov: 44 },
          ],
        },
        {
          from: fClosing - 1,
          keys: [
            { f: fClosing - 1, pos: [bakEnd - 3, DECK + 9, (STD_Z + BAK_Z) / 2 + 2.5], look: [bakEnd - 3, DECK + R, (STD_Z + BAK_Z) / 2], fov: 42 },
            {
              f: fFive - 2,
              pos: [bakEnd + 0.2, DECK + 5.1, (STD_Z + BAK_Z) / 2 + 0.4],
              look: [bakEnd + 0.2, DECK + 1.5, (STD_Z + BAK_Z) / 2 + 0.39],
              fov: 40,
              ease: "smooth",
            },
            { f: 1159, pos: [bakEnd + 0.2, DECK + 4.8, (STD_Z + BAK_Z) / 2 + 0.4], look: [bakEnd + 0.2, DECK + 1.5, (STD_Z + BAK_Z) / 2 + 0.39], fov: 40 },
          ],
        },
        {
          from: 1160,
          keys: [
            { f: 1160, pos: [bakEnd + 0.2, DECK + 4.8, (STD_Z + BAK_Z) / 2 + 0.4], look: [bakEnd + 0.2, DECK + 1.5, (STD_Z + BAK_Z) / 2 + 0.39], fov: 40 },
            { f: fInternal + 4, pos: [bakEnd + 1.9, DECK + R + 0.55, BAK_Z + 0.75], look: [bakEnd - 0.3, DECK + R - 0.02, BAK_Z], fov: 40, ease: "smooth" },
            { f: 1203, pos: [bakEnd + 1.7, DECK + R + 0.5, BAK_Z + 0.7], look: [bakEnd - 0.3, DECK + R - 0.02, BAK_Z], fov: 39 },
          ],
        },
      ]);
      if (index === 0) {
        set.focusShadow(SCRIBE_X, HY, HZ, 5);
        return { cam, focus: dist(cam, [SCRIBE_X, HY - 0.25, HZ + 0.4]), aperture: 4 };
      }
      if (index === 1) {
        set.focusShadow(CRATE.x, CRATE.y, CRATE.z, 12);
        return { cam, focus: f < fBackup - 8 ? dist(cam, [SCRIBE_X, HY, HZ]) : dist(cam, CRATE), aperture: 2 };
      }
      if (index === 2) {
        set.focusShadow(bakEnd, DECK, BAK_Z, 10);
        return { cam, focus: cam.pos[1] - DECK - 2 * R, aperture: 3 };
      }
      set.focusShadow(bakEnd, DECK, BAK_Z, 5);
      return { cam, focus: dist(cam, [bakEnd - 0.2, DECK + R, BAK_Z]), aperture: 6 };
    },
  };
};

export const Beat05: React.FC = () => <Stage from={940} build={buildEscalation2} />;
