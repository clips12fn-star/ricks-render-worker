/* global Path2D */
import { FACE, INK } from "./palette";

/*
 * Ricks Clips face grammar, calibrated on 02_why-perfect-railroads-dont-work (f002, f015-f017, f021, f046):
 *  - the head is the 06a bean-face silhouette (same path, white #FFFEFE, plum-black ink),
 *  - eyes are SOLID ink ovals, no white sclera; a flat upper lid cuts them for the skeptical half-lidded look,
 *  - brows are short thick tapered strokes whose angle carries the attitude,
 *  - the mouth is one thin ink line (smirk, flat, small frown); only the stunned beat gets a tiny "o".
 * Coordinates are the 600-wide bean-face design space (face x=132..415, y=104..392).
 */
export const HEAD = "M137 205 C139 127 198 100 281 104 C369 102 415 156 414 235 C415 316 372 381 301 392 C211 405 141 352 132 277 Q127 233 137 205Z";

export type Eyes = "dot" | "lidded" | "heavy" | "wide" | "closed";
export type Line = "smirk" | "flat" | "frown" | "o" | "smile" | "talk" | "grin";

export type FaceState = {
  eyes: Eyes;
  mouth: Line;
  gaze?: number; // pupil offset in px, + = screen right
  blink?: number; // 0..1
  browL?: number; // degrees, + = inner end down (angry), - = raised/worried
  browR?: number;
  liftL?: number; // px brow lift
  liftR?: number;
  mouthTalk?: number; // 0..1 openness for "talk"
};

// Eyes are pure black, a touch deeper than the plum ink outline.
const EYE_BLACK = "#050407";
const EYE_L = [232, 256] as const;
const EYE_R = [320, 256] as const;

function brow(g: CanvasRenderingContext2D, x: number, y: number, ang: number, side: -1 | 1) {
  g.save();
  g.translate(x, y);
  g.rotate((-side * ang * Math.PI) / 180);
  g.beginPath();
  // tapered stroke: thick at the inner end
  const inner = -side * 25,
    outer = side * 26;
  g.moveTo(inner, -8);
  g.quadraticCurveTo(0, -11, outer, -4);
  g.lineTo(outer, 1);
  g.quadraticCurveTo(0, 1, inner, 8);
  g.closePath();
  g.fillStyle = INK;
  g.fill();
  g.restore();
}

function eye(g: CanvasRenderingContext2D, x: number, y: number, kind: Eyes, gaze: number, blink: number) {
  const px = x + Math.max(-6, Math.min(6, gaze));
  g.fillStyle = EYE_BLACK;
  g.strokeStyle = INK;
  g.lineCap = "round";
  if (kind === "closed" || blink >= 0.85) {
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x - 13, y + 2);
    g.quadraticCurveTo(x, y + 7, x + 13, y + 2);
    g.stroke();
    return;
  }
  const rx = kind === "wide" ? 16.5 : 15;
  const ry = (kind === "wide" ? 23 : 20) * (1 - blink * 0.8);
  g.save();
  if (kind === "lidded" || kind === "heavy") {
    const cutY = y - ry + (kind === "heavy" ? ry * 1.05 : ry * 0.62);
    g.beginPath();
    g.rect(px - 30, cutY, 60, 60);
    g.clip();
  }
  g.beginPath();
  g.ellipse(px, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (kind === "lidded" || kind === "heavy") {
    const cutY = y - ry + (kind === "heavy" ? ry * 1.05 : ry * 0.62);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x - 21, cutY + 1);
    g.lineTo(x + 21, cutY - 1);
    g.stroke();
  }
  if (kind === "wide") {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(px + 3, y - 6, 3.2, 0, Math.PI * 2);
    g.fill();
  }
}

function mouth(g: CanvasRenderingContext2D, kind: Line, talk: number) {
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineCap = g.lineJoin = "round";
  g.lineWidth = 6;
  g.beginPath();
  switch (kind) {
    case "smirk": // flat on the left, hooks up on the right (f016 / f024)
      g.moveTo(258, 334);
      g.quadraticCurveTo(286, 338, 302, 330);
      g.quadraticCurveTo(310, 325, 314, 316);
      g.stroke();
      break;
    case "flat":
      g.moveTo(262, 333);
      g.lineTo(300, 331);
      g.stroke();
      break;
    case "frown": // small ∩ (f015, f017)
      g.moveTo(262, 338);
      g.quadraticCurveTo(281, 324, 300, 338);
      g.stroke();
      break;
    case "smile":
      g.moveTo(258, 328);
      g.quadraticCurveTo(281, 344, 306, 327);
      g.stroke();
      break;
    case "grin": // closed toothy grin, f046
      g.moveTo(250, 324);
      g.quadraticCurveTo(281, 352, 314, 322);
      g.quadraticCurveTo(281, 334, 250, 324);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.lineWidth = 5;
      g.stroke();
      g.beginPath();
      for (const x of [266, 281, 296]) {
        g.moveTo(x, 330);
        g.lineTo(x, 338);
      }
      g.lineWidth = 3;
      g.stroke();
      break;
    case "o": // tiny stunned o
      g.ellipse(281, 348, 8, 10, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case "talk": {
      const h = 2 + 8 * talk;
      g.ellipse(282, 333, 15 - talk * 4, h, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
  }
}

/** Paint head + features. Hair, hats and accessories are drawn by the actor around this. */
export function paintRcFace(g: CanvasRenderingContext2D, s: FaceState) {
  g.save();
  g.lineJoin = g.lineCap = "round";
  const head = new Path2D(HEAD);
  g.fillStyle = FACE;
  g.fill(head);
  g.strokeStyle = INK;
  g.lineWidth = 10;
  g.stroke(head);
  const blink = s.blink ?? 0;
  eye(g, EYE_L[0], EYE_L[1], s.eyes, s.gaze ?? 0, blink);
  eye(g, EYE_R[0], EYE_R[1], s.eyes, s.gaze ?? 0, blink);
  const raise = s.eyes === "wide" ? 3 : 0;
  brow(g, EYE_L[0], 214 - raise - (s.liftL ?? 0), s.browL ?? 0, -1);
  brow(g, EYE_R[0], 214 - raise - (s.liftR ?? 0), s.browR ?? 0, 1);
  mouth(g, s.mouth, s.mouthTalk ?? 0);
  g.restore();
}
