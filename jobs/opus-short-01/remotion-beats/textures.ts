/* global document */
// Story-specific painted textures (Canvas2D, deterministic seeds). Generic wood/stone come from cinema/paint.js.
import * as THREE from "three";
import { rng, tex } from "./cinema";
import type { Clock } from "./palette";

export const canvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
};

/** Vertical sky gradient with soft cumulus strokes and a sun bloom near the horizon. */
export function skyTexture(k: Clock, seed = 3) {
  const [c, g] = canvas(1024, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, k.skyTop);
  grad.addColorStop(0.3, k.skyTop);
  grad.addColorStop(0.49, k.skyHorizon);
  grad.addColorStop(1, k.skyHorizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  const r = rng(seed);
  for (let i = 0; i < 14; i++) {
    const x = r() * 1024,
      y = 150 + r() * 85,
      w = 40 + r() * 120;
    for (let k2 = 0; k2 < 6; k2++) {
      g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(x + (r() - 0.5) * w, y + (r() - 0.5) * 12, w * (0.3 + r() * 0.4), 7 + r() * 9, 0, 0, 7);
      g.fill();
    }
  }
  const sun = g.createRadialGradient(300, 236, 0, 300, 236, 220);
  sun.addColorStop(0, "rgba(255,248,220,.95)");
  sun.addColorStop(0.15, "rgba(255,230,170,.55)");
  sun.addColorStop(1, "rgba(255,210,140,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, 1024, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Saturated river surface with horizontal glints, tiled across the Mississippi plane. */
export function waterTexture(k: Clock, seed = 7) {
  const [c, g] = canvas(512, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, k.water);
  grad.addColorStop(1, k.waterDeep);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const r = rng(seed);
  for (let i = 0; i < 420; i++) {
    const y = r() * 512,
      x = r() * 512,
      w = 8 + r() * 60;
    g.strokeStyle = r() < 0.75 ? `rgba(160,210,255,${0.15 + r() * 0.25})` : `rgba(10,30,80,${0.25 + r() * 0.2})`;
    g.lineWidth = 1 + r() * 2.5;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + w / 2, y - 2 - r() * 3, x + w, y);
    g.stroke();
  }
  return tex(c, 40, 40);
}

/** Steel rib skin: blued steel staves, rivet rows and dark coupling bands every 12 ft segment. */
export function steelTexture(base: string, seed = 11) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 256);
  const r = rng(seed);
  // staves running along the tube
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`;
    g.fillRect(0, i * 43 + 4, 512, 18);
    g.fillStyle = "rgba(0,0,0,.18)";
    g.fillRect(0, i * 43 + 40, 512, 3);
  }
  // coupling band at the tile seam (u = 0 / 1)
  g.fillStyle = "rgba(20,18,26,.55)";
  g.fillRect(0, 0, 22, 256);
  g.fillRect(490, 0, 22, 256);
  for (const x of [11, 501]) {
    for (let y = 8; y < 256; y += 21) {
      g.fillStyle = "rgba(230,225,215,.5)";
      g.beginPath();
      g.arc(x, y, 3.2, 0, 7);
      g.fill();
    }
  }
  // weathering
  for (let i = 0; i < 160; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(120,70,40,.12)" : "rgba(255,240,220,.07)";
    g.beginPath();
    g.ellipse(r() * 512, r() * 256, 2 + r() * 10, 1 + r() * 3, 0, 0, 7);
    g.fill();
  }
  return tex(c, 1, 1);
}

/** Brick facade with tall sash windows for the St. Louis levee warehouses. */
export function facadeTexture(hue: number, seed = 21) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = `hsl(${hue},48%,${40 + r() * 8}%)`;
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8) {
    g.fillStyle = "rgba(0,0,0,.08)";
    g.fillRect(0, y, 256, 1);
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 18 + col * 60,
        y = 22 + row * 60;
      g.fillStyle = "#f1e6cf";
      g.fillRect(x - 3, y - 3, 30, 44);
      g.fillStyle = r() < 0.3 ? "#ffcf7a" : "#24324a";
      g.fillRect(x, y, 24, 38);
      g.fillStyle = "#f1e6cf";
      g.fillRect(x + 11, y, 2, 38);
      g.fillRect(x, y + 18, 24, 2);
    }
  }
  return tex(c, 1, 1);
}

/** Ice: pale cyan with white fracture lines and a frosted rim. */
export function iceTexture(seed = 31) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#bfefff";
  g.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < 30; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.4 + r() * 0.5})`;
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    let x = r() * 256,
      y = r() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 70;
      y += (r() - 0.5) * 70;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,.9)";
  g.lineWidth = 10;
  g.strokeRect(0, 0, 256, 256);
  return tex(c, 1, 1);
}

/** Tile wall for the shower-rod insert. */
export function tileTexture(seed = 41) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = "#cfd8d6";
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = `hsl(178,${30 + r() * 8}%,${80 + r() * 6}%)`;
      g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
      g.fillStyle = "rgba(255,255,255,.35)";
      g.fillRect(x * 64 + 8, y * 64 + 8, 22, 6);
    }
  }
  return tex(c, 3, 3);
}

/** Wrought iron: dark grey with mill scale flecks. The chalk stripe and nick are separate meshes. */
export function ironTexture(seed = 51) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = "#9a9aa2";
  g.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(30,28,34,.25)" : "rgba(200,190,175,.12)";
    g.fillRect(r() * 256, r() * 256, 1 + r() * 4, 1 + r() * 2);
  }
  return tex(c, 2, 1);
}

/** Ledger page with ruled lines and diegetic entries. `entries` are drawn on geometry, never as overlays. */
export function ledgerTexture(entries: { text: string; y: number; size: number; color?: string; strike?: boolean; box?: string }[]) {
  const [c, g] = canvas(1024, 768);
  g.fillStyle = "#f2e6c9";
  g.fillRect(0, 0, 1024, 768);
  // gutter shading between the two pages
  const gut = g.createLinearGradient(470, 0, 554, 0);
  gut.addColorStop(0, "rgba(90,60,30,0)");
  gut.addColorStop(0.5, "rgba(90,60,30,.35)");
  gut.addColorStop(1, "rgba(90,60,30,0)");
  g.fillStyle = gut;
  g.fillRect(470, 0, 84, 768);
  g.strokeStyle = "rgba(60,90,140,.35)";
  g.lineWidth = 2;
  for (let y = 120; y < 760; y += 52) {
    g.beginPath();
    g.moveTo(30, y);
    g.lineTo(994, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(190,40,50,.5)";
  g.beginPath();
  g.moveTo(110, 20);
  g.lineTo(110, 760);
  g.moveTo(620, 20);
  g.lineTo(620, 760);
  g.stroke();
  for (const e of entries) {
    g.font = `bold ${e.size}px "DejaVu Serif", Georgia, serif`;
    g.fillStyle = e.color ?? "#1d1a2a";
    g.textBaseline = "alphabetic";
    const x = e.y >= 1000 ? 640 : 130;
    const y = e.y % 1000;
    g.fillText(e.text, x, y);
    const w = g.measureText(e.text).width;
    if (e.box) {
      g.strokeStyle = e.box;
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(x + w / 2, y - e.size * 0.35, w / 2 + 26, e.size * 0.85, 0, 0, 7);
      g.stroke();
    }
    if (e.strike) {
      g.strokeStyle = "#1d1a2a";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x - 6, y - e.size * 0.33);
      g.lineTo(x + w + 6, y - e.size * 0.38);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Folding rule face: boxwood with inch ticks and numerals so the five-inch span reads in close-up. */
export function ruleTexture(inches: number, highlight?: [number, number]) {
  const px = 64;
  const [c, g] = canvas(Math.round(inches * px), 64);
  g.fillStyle = "#e9c46a";
  g.fillRect(0, 0, c.width, 64);
  if (highlight) {
    g.fillStyle = "rgba(239,38,71,.85)";
    g.fillRect(highlight[0] * px, 0, (highlight[1] - highlight[0]) * px, 10);
    g.fillRect(highlight[0] * px, 54, (highlight[1] - highlight[0]) * px, 10);
  }
  g.fillStyle = "#1d1a2a";
  for (let i = 0; i <= inches * 8; i++) {
    const x = (i / 8) * px;
    const h = i % 8 === 0 ? 26 : i % 4 === 0 ? 18 : i % 2 === 0 ? 12 : 8;
    g.fillRect(x - 1, 0, 2, h);
  }
  g.font = 'bold 26px "DejaVu Sans", Arial, sans-serif';
  g.textAlign = "center";
  for (let i = 1; i < inches; i++) g.fillText(String(i), i * px, 54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
