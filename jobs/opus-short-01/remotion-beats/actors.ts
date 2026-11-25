/* global Path2D */
import * as THREE from "three";
import { HEAD, paintRcFace, type FaceState, type Line } from "./face";
import { contactShadow } from "./set";
import { canvas } from "./textures";
import { FACE, INK } from "./palette";
import type { Lens } from "./Stage";

/*
 * Ink actor cards. Each actor is a 600x1100 Canvas2D drawing on a yaw-only plane standing on the
 * 3D deck. The face is painted by the 06a bean-face grammar (white #FFFEFE, plum-black #151124 ink);
 * costume, hats, arms and the folding rule are drawn here per role. Only the canvas is redrawn when
 * the pose changes, so the 3D world, shadows and lens stay deterministic.
 */

export type Role = "ironmaster" | "flad" | "worker" | "rigger";
export type Mouth = "smirk" | "scoff" | "oh" | "grin" | "tight" | "talk" | "smile" | "frown" | null;
export type Arm = { sh: number; el: number }; // shoulder / elbow angles in degrees; 0 = hanging down, + = raised outward

export type Pose = {
  expression: "calm" | "surprise" | "focus" | "stern";
  mouth?: Mouth;
  browUp?: number; // one raised brow (screen-right), 0..1
  gaze?: number;
  blink?: number;
  accent?: number;
  headTilt?: number; // degrees
  chinUp?: number; // px the head lifts and tilts back
  lean?: number; // degrees, body lean
  bob?: number; // px
  armL?: Arm;
  armR?: Arm;
  crossArms?: boolean;
  rule?: "hand" | "tucked" | "tap" | null; // folding rule in the right hand
  ruleAngle?: number; // degrees for "hand"/"tap"
  stance?: number; // leg spread px
  step?: number; // -1..1 walking phase
  sweat?: number;
};

const W = 600,
  H = 1100,
  FOOT = 1078;
const HEIGHT_FT = 6.2;
export const PX = HEIGHT_FT / H;

/** Pose -> Ricks Clips face: solid ink eyes, tapered brows, single-line mouth. */
function faceFor(p: Pose): FaceState {
  const base: Record<Pose["expression"], FaceState> = {
    calm: { eyes: "dot", mouth: "flat", browL: 0, browR: 0 },
    focus: { eyes: "lidded", mouth: "flat", browL: 8, browR: 8 },
    stern: { eyes: "lidded", mouth: "frown", browL: 16, browR: 16 },
    surprise: { eyes: "wide", mouth: "o", browL: -12, browR: -12, liftL: 3, liftR: 3 },
  };
  const f: FaceState = { ...base[p.expression], gaze: p.gaze ?? 0, blink: p.blink ?? 0 };
  const map: Record<NonNullable<Mouth>, Line> = {
    smirk: "smirk",
    scoff: "smirk",
    oh: "o",
    grin: "grin",
    tight: "flat",
    talk: "talk",
    smile: "smile",
    frown: "frown",
  };
  if (p.mouth) f.mouth = map[p.mouth];
  if (p.mouth === "talk") f.mouthTalk = 0.7;
  if (p.browUp) {
    f.liftR = (f.liftR ?? 0) + 16 * p.browUp;
    f.browR = (f.browR ?? 0) * (1 - p.browUp) - 12 * p.browUp;
    if (p.expression === "stern" || p.expression === "focus") f.eyes = "lidded";
  }
  if (p.accent) {
    f.liftL = (f.liftL ?? 0) + 3 * p.accent;
    f.liftR = (f.liftR ?? 0) + 3 * p.accent;
  }
  return f;
}

type Costume = {
  shirt: string;
  coat: string;
  trim: string;
  hat: "peaked" | "bowler" | "striped" | "flat";
  hatColor: string;
  hair: string;
  beard?: boolean;
  mustache?: boolean;
  sideburns?: boolean;
  apron?: string;
  vest?: string;
  overalls?: string;
  scarf?: string;
  spectacles?: boolean;
};

const COSTUME: Record<Role, Costume> = {
  // Senior ironmaster: russet peaked cap, grey walrus mustache, leather apron over a teal shirt.
  ironmaster: {
    shirt: "#2f9a8e",
    coat: "#2f9a8e",
    trim: "#1c6d64",
    hat: "peaked",
    hatColor: "#b24f2e",
    hair: "#9aa0a6",
    mustache: true,
    sideburns: true,
    apron: "#7b4a2b",
  },
  // Assistant engineer Henry Flad: bowler, full beard, navy frock coat over a gold waistcoat, spectacles.
  flad: {
    shirt: "#f4efe4",
    coat: "#2c3f7e",
    trim: "#1c2958",
    hat: "bowler",
    hatColor: "#1f1d24",
    hair: "#5a3a26",
    beard: true,
    vest: "#e2b23a",
    spectacles: true,
  },
  // Crew: striped cap, red neckerchief, denim overalls.
  worker: { shirt: "#f1e7d2", coat: "#3d6fb8", trim: "#274c86", hat: "striped", hatColor: "#3b5ea8", hair: "#6b4127", overalls: "#3d6fb8", scarf: "#e0313f" },
  rigger: { shirt: "#3a8f5a", coat: "#3a8f5a", trim: "#24673d", hat: "flat", hatColor: "#c79a55", hair: "#2d241f", overalls: "#8a5a3a", scarf: "#f0b43a" },
};

const fillStroke = (g: CanvasRenderingContext2D, fill: string, width = 9) => {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = width;
  g.stroke();
};

const rad = (d: number) => (d * Math.PI) / 180;

function limb(g: CanvasRenderingContext2D, pts: [number, number][], color: string, w: number) {
  g.lineCap = g.lineJoin = "round";
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.strokeStyle = INK;
  g.lineWidth = w + 14;
  g.stroke();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.stroke();
}

function mitt(g: CanvasRenderingContext2D, x: number, y: number, r = 25) {
  g.beginPath();
  g.ellipse(x, y, r, r * 0.9, 0, 0, 7);
  fillStroke(g, FACE, 8);
}

function ruleBar(g: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rad(ang));
  g.beginPath();
  g.rect(-6, -11, len, 22);
  fillStroke(g, "#e9c46a", 6);
  g.fillStyle = INK;
  for (let i = 10; i < len - 10; i += 14) g.fillRect(i, -11, 3, i % 42 === 10 ? 12 : 7);
  g.fillRect(len * 0.5, -11, 4, 22);
  g.restore();
}

/** Arm from shoulder with angles; returns the hand point. Side -1 = screen-left. */
function armPoints(side: -1 | 1, a: Arm, sx: number, sy: number): [number, number][] {
  const up = 120,
    fore = 112;
  const a1 = rad(a.sh) * side;
  const ex = sx + Math.sin(a1) * up,
    ey = sy + Math.cos(a1) * up;
  const a2 = a1 + rad(a.el) * side;
  const hx = ex + Math.sin(a2) * fore,
    hy = ey + Math.cos(a2) * fore;
  return [
    [sx, sy],
    [ex, ey],
    [hx, hy],
  ];
}

export type Actor = {
  group: THREE.Group;
  card: THREE.Mesh;
  role: Role;
  setPose: (p: Pose) => void;
  /** Canvas-space hand of the last drawn pose. */
  hand: (side: -1 | 1) => [number, number];
  /** World-space point of a canvas pixel on the card. */
  toWorld: (u: number, v: number) => THREE.Vector3;
  faceCamera: (camPos: number[]) => void;
};

export function makeActor(role: Role, cardNd: Lens["cardNd"], tint = "#ffffff", scale = 1, res = 1): Actor {
  const [c, g] = canvas(W * res, H * res);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // Plane centred on the canvas centre; shift up so canvas row FOOT sits on local y = 0.
  const geo = new THREE.PlaneGeometry(W * PX, H * PX).translate(0, (FOOT - H / 2) * PX, 0);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide, color: tint });
  const card = new THREE.Mesh(geo, mat);
  card.userData.nd = cardNd(texture);
  card.castShadow = true;
  card.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 });
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.add(card);
  group.add(pivot);
  const shadow = contactShadow(2.8, 0.5);
  shadow.position.y = 0.02;
  group.add(shadow);
  group.scale.setScalar(scale);
  const cos = COSTUME[role];
  let last = "";
  let hands: [[number, number], [number, number]] = [
    [200, 700],
    [400, 700],
  ];

  const draw = (p: Pose) => {
    g.setTransform(res, 0, 0, res, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    const bob = p.bob ?? 0;
    g.translate(0, bob);
    // legs
    const st = p.stance ?? 0,
      step = p.step ?? 0;
    const hipL: [number, number] = [268, 740],
      hipR: [number, number] = [332, 740];
    const footL: [number, number] = [250 - st + step * 30, 1052 - Math.max(0, step) * 26];
    const footR: [number, number] = [350 + st - step * 30, 1052 - Math.max(0, -step) * 26];
    g.lineCap = "round";
    for (const [hip, foot, dir] of [
      [hipL, footL, -1],
      [hipR, footR, 1],
    ] as const) {
      g.beginPath();
      g.moveTo(hip[0], hip[1]);
      g.quadraticCurveTo((hip[0] + foot[0]) / 2 + dir * 6, (hip[1] + foot[1]) / 2, foot[0], foot[1]);
      g.strokeStyle = INK;
      g.lineWidth = 15;
      g.stroke();
      g.beginPath();
      g.ellipse(foot[0] + dir * 16, foot[1] + 10, 34, 15, dir * 0.08, 0, 7);
      g.fillStyle = "#2a2230";
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.stroke();
    }
    // torso lean pivot at hips
    g.translate(300, 760);
    g.rotate(rad(p.lean ?? 0));
    g.translate(-300, -760);
    // torso
    const torso = new Path2D();
    torso.moveTo(212, 470);
    torso.bezierCurveTo(212, 405, 388, 405, 388, 470);
    torso.lineTo(398, 700);
    torso.bezierCurveTo(402, 772, 198, 772, 202, 700);
    torso.closePath();
    g.fillStyle = cos.coat;
    g.fill(torso);
    g.save();
    g.clip(torso);
    if (cos.vest) {
      g.fillStyle = cos.shirt;
      g.beginPath();
      g.moveTo(270, 400);
      g.lineTo(330, 400);
      g.lineTo(316, 520);
      g.lineTo(284, 520);
      g.fill();
      g.fillStyle = cos.vest;
      g.beginPath();
      g.moveTo(262, 440);
      g.lineTo(300, 560);
      g.lineTo(338, 440);
      g.lineTo(344, 700);
      g.lineTo(256, 700);
      g.closePath();
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.stroke();
      g.fillStyle = INK;
      for (const y of [585, 625, 665]) {
        g.beginPath();
        g.arc(300, y, 6, 0, 7);
        g.fill();
      }
      g.strokeStyle = "#f5d36b";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(300, 600);
      g.quadraticCurveTo(325, 640, 344, 618);
      g.stroke();
    }
    if (cos.overalls) {
      g.fillStyle = cos.shirt;
      g.fillRect(190, 400, 220, 150);
      g.fillStyle = cos.overalls;
      g.fillRect(238, 520, 124, 260);
      g.fillRect(190, 640, 220, 160);
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.strokeRect(238, 520, 124, 130);
      for (const x of [250, 350]) {
        g.fillStyle = cos.overalls;
        g.fillRect(x - 10, 400, 20, 130);
        g.strokeRect(x - 10, 400, 20, 130);
        g.fillStyle = "#e9c46a";
        g.beginPath();
        g.arc(x, 532, 7, 0, 7);
        g.fill();
      }
    }
    if (cos.apron) {
      g.fillStyle = cos.apron;
      g.beginPath();
      g.moveTo(240, 470);
      g.lineTo(360, 470);
      g.lineTo(378, 800);
      g.lineTo(222, 800);
      g.closePath();
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.stroke();
      g.strokeStyle = "#5a321c";
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(244, 470);
      g.lineTo(226, 405);
      g.moveTo(356, 470);
      g.lineTo(374, 405);
      g.stroke();
      g.fillStyle = "#c48a4d";
      g.beginPath();
      g.roundRect(262, 590, 76, 52, 8);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.stroke();
    }
    if (role === "flad") {
      // frock coat lapels
      g.strokeStyle = cos.trim;
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(262, 430);
      g.lineTo(290, 600);
      g.moveTo(338, 430);
      g.lineTo(310, 600);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = INK;
    g.lineWidth = 10;
    g.stroke(torso);
    if (cos.scarf) {
      g.beginPath();
      g.moveTo(250, 420);
      g.quadraticCurveTo(300, 470, 350, 420);
      g.lineTo(330, 470);
      g.lineTo(300, 520);
      g.lineTo(272, 470);
      g.closePath();
      fillStroke(g, cos.scarf, 6);
    }

    // arms
    const shL: [number, number] = [222, 462],
      shR: [number, number] = [378, 462];
    if (p.crossArms) {
      limb(g, [shL, [228, 590], [372, 560]], cos.coat, 40);
      limb(g, [shR, [372, 590], [232, 566]], cos.coat, 40);
      if (p.rule === "tucked") ruleBar(g, 196, 612, -14, 150);
      mitt(g, 372, 562, 23);
      mitt(g, 230, 568, 23);
      hands = [
        [230, 568],
        [372, 562],
      ];
    } else {
      const aL = armPoints(-1, p.armL ?? { sh: 12, el: 6 }, ...shL);
      const aR = armPoints(1, p.armR ?? { sh: 12, el: 6 }, ...shR);
      limb(g, aL, cos.coat, 40);
      limb(g, aR, cos.coat, 40);
      if (p.rule === "hand" || p.rule === "tap") ruleBar(g, aR[2][0], aR[2][1], p.ruleAngle ?? -70, 200);
      if (p.rule === "tucked") ruleBar(g, 380, 500, 100, 160);
      mitt(g, aL[2][0], aL[2][1]);
      mitt(g, aR[2][0], aR[2][1]);
      hands = [aL[2], aR[2]];
    }

    // head
    g.save();
    const chin = p.chinUp ?? 0;
    g.translate(300, 410);
    g.rotate(rad((p.headTilt ?? 0) - chin * 0.25));
    g.translate(-300, -410 - chin);
    g.translate(25, 30);
    // hair: an offset rim of the head silhouette, visible only at the sides under the hat (f002 / f021)
    {
      g.save();
      g.beginPath();
      if (role === "worker" || role === "rigger") g.rect(100, 150, 120, 150);
      else g.rect(100, 150, 360, cos.sideburns ? 190 : 140);
      g.clip();
      g.translate(276, 250);
      g.scale(1.08, 1.04);
      g.translate(-276, -250);
      g.fillStyle = cos.hair;
      g.fill(new Path2D(HEAD));
      g.strokeStyle = INK;
      g.lineWidth = 7;
      g.stroke(new Path2D(HEAD));
      g.restore();
    }
    paintRcFace(g, faceFor(p));
    // hair lock over the face side under the hat (brown on the crew, grey temples on the ironmaster)
    const lock = (side: -1 | 1, depth: number) => {
      g.save();
      g.clip(new Path2D(HEAD));
      g.beginPath();
      if (side === -1) {
        g.moveTo(128, 182);
        g.lineTo(140 + depth, 182);
        g.quadraticCurveTo(150 + depth * 0.7, 232, 128, 290);
      } else {
        g.moveTo(420, 182);
        g.lineTo(406 - depth, 182);
        g.quadraticCurveTo(398 - depth * 0.7, 232, 420, 290);
      }
      g.closePath();
      g.fillStyle = cos.hair;
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 6;
      g.stroke();
      g.restore();
    };
    if (role === "worker" || role === "rigger") lock(-1, 62);
    if (role === "ironmaster") {
      lock(-1, 30);
      lock(1, 30);
    }
    if (cos.mustache) {
      g.beginPath();
      g.moveTo(276, 300);
      g.bezierCurveTo(250, 286, 222, 300, 214, 322);
      g.bezierCurveTo(240, 312, 258, 314, 276, 308);
      g.bezierCurveTo(294, 314, 312, 312, 338, 322);
      g.bezierCurveTo(330, 300, 302, 286, 276, 300);
      fillStroke(g, cos.hair, 5);
    }
    if (cos.beard) {
      const mouthOpen = p.mouth === "oh";
      g.beginPath();
      g.moveTo(162, 280);
      g.bezierCurveTo(168, 380, 220, 428, 278, 430);
      g.bezierCurveTo(340, 428, 392, 380, 402, 282);
      g.bezierCurveTo(380, 330, 350, 350, mouthOpen ? 320 : 312, 346);
      g.bezierCurveTo(300, 360, 254, 360, mouthOpen ? 236 : 242, 346);
      g.bezierCurveTo(200, 348, 178, 322, 162, 280);
      fillStroke(g, cos.hair, 6);
    }
    if (cos.spectacles) {
      g.strokeStyle = INK;
      g.lineWidth = 4;
      for (const x of [236, 314]) {
        g.beginPath();
        g.arc(x, 260, 26, 0, 7);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(262, 258);
      g.lineTo(288, 258);
      g.stroke();
    }
    if (p.sweat) {
      g.beginPath();
      g.moveTo(402, 200);
      g.quadraticCurveTo(418, 228, 404, 238);
      g.quadraticCurveTo(388, 228, 402, 200);
      fillStroke(g, "#8fd8ff", 4);
    }
    // hats
    if (cos.hat === "peaked" || cos.hat === "striped" || cos.hat === "flat") {
      g.beginPath();
      g.moveTo(140, 190);
      g.bezierCurveTo(128, 92, 220, 62, 282, 66);
      g.bezierCurveTo(360, 62, 442, 96, 424, 190);
      g.closePath();
      g.save();
      g.fillStyle = cos.hatColor;
      g.fill();
      if (cos.hat === "striped") {
        g.clip();
        g.fillStyle = "#f4f1ea";
        for (let x = 120; x < 440; x += 34) g.fillRect(x, 50, 13, 160);
      }
      g.restore();
      g.strokeStyle = INK;
      g.lineWidth = 9;
      g.stroke();
      // band and visor
      g.beginPath();
      g.moveTo(146, 184);
      g.lineTo(420, 184);
      g.lineWidth = 12;
      g.strokeStyle = cos.hat === "peaked" ? "#3a2a24" : INK;
      g.stroke();
      // short visor jutting to screen-left, like the striped rail caps
      g.beginPath();
      g.moveTo(150, 186);
      g.quadraticCurveTo(205, 214, 300, 194);
      g.quadraticCurveTo(250, 186, 150, 186);
      g.closePath();
      fillStroke(g, cos.hat === "peaked" ? "#5a2a1c" : "#26355f", 6);
      if (cos.hat === "peaked") {
        g.beginPath();
        g.arc(282, 74, 10, 0, 7);
        fillStroke(g, "#d9773f", 5);
      }
    } else if (cos.hat === "bowler") {
      g.beginPath();
      g.ellipse(282, 190, 172, 30, 0, 0, 7);
      fillStroke(g, cos.hatColor, 8);
      g.beginPath();
      g.moveTo(168, 190);
      g.bezierCurveTo(160, 70, 404, 70, 396, 190);
      g.closePath();
      fillStroke(g, cos.hatColor, 8);
      g.fillStyle = "#3a3842";
      g.fillRect(170, 170, 224, 14);
      g.fillStyle = "rgba(255,255,255,.25)";
      g.beginPath();
      g.ellipse(240, 110, 36, 14, -0.4, 0, 7);
      g.fill();
    }
    g.restore();
    g.restore();
  };

  const setPose = (p: Pose) => {
    const key = JSON.stringify(p);
    if (key === last) return;
    last = key;
    draw(p);
    texture.needsUpdate = true;
  };
  const toWorld = (u: number, v: number) => {
    group.updateMatrixWorld(true);
    return card.localToWorld(new THREE.Vector3((u / W - 0.5) * W * PX, (FOOT - v) * PX, 0.02));
  };
  const faceCamera = (camPos: number[]) => {
    group.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    group.getWorldPosition(wp);
    pivot.rotation.y = Math.atan2(camPos[0] - wp.x, camPos[2] - wp.z) - group.rotation.y;
  };
  setPose({ expression: "calm" });
  return { group, card, role, setPose, hand: (s) => hands[s === -1 ? 0 : 1], toWorld, faceCamera };
}
