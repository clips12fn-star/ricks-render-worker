import React from "react";
import { Composition, registerRoot } from "remotion";
import { Stage } from "./Stage";
import { buildSet, DECK, HZ } from "./set";
import { makeActor, type Pose, type Role } from "./actors";

// Detail test: every role x key expression, close-up on the real set and light.
const ROWS: [Role, Pose[]][] = [
  [
    "ironmaster",
    [
      { expression: "calm" },
      { expression: "stern", browUp: 1, mouth: "scoff", gaze: 6 },
      { expression: "focus", mouth: "smirk", gaze: 6 },
      { expression: "surprise", mouth: "oh" },
    ],
  ],
  ["flad", [{ expression: "calm" }, { expression: "focus", gaze: -6 }, { expression: "calm", mouth: "smile" }, { expression: "stern" }]],
  [
    "worker",
    [
      { expression: "calm", mouth: "smirk" },
      { expression: "focus", gaze: -6 },
      { expression: "surprise", mouth: "oh" },
      { expression: "calm", mouth: "talk" },
    ],
  ],
];
const Test: React.FC = () => (
  <Stage
    from={0}
    build={({ scene, cardNd }) => {
      const set = buildSet(scene, 1);
      const actors = ROWS.flatMap(([role, poses], r) =>
        poses.map((p, c) => {
          const a = makeActor(role, cardNd, set.clock.tint, 1, 2);
          a.group.position.set(-3.6 + c * 2.4, DECK + 1.8 - r * 4.6, HZ + 4);
          a.setPose(p);
          scene.add(a.group);
          return a;
        }),
      );
      return {
        update: () => {
          const cam = { pos: [0, DECK + 1.5, HZ + 32], look: [0, DECK + 1.5, HZ + 4], fov: 30 };

          actors.forEach((a) => a.faceCamera(cam.pos));
          return { cam, focus: 28, aperture: 0 };
        },
      };
    }}
  />
);
registerRoot(() => <Composition id="F" component={Test} durationInFrames={1} fps={30} width={1080} height={1920} />);
