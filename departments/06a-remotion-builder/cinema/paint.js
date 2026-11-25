/* global document */
// Canvas2D painted textures (our own). All deterministic.
import * as THREE from 'three';

export const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
export const tex = (c, rx = 1, ry = 1) => {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const speckle = (g, w, h, r, n, cols, rad = [1, 3]) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.beginPath(); g.ellipse(r() * w, r() * h, rad[0] + r() * rad[1], rad[0] + r() * rad[1] * 0.7, r() * 3, 0, 7); g.fill(); } };

export function planks(seed = 1) {
  const [c, g] = cv(512, 512), r = rng(seed), n = 8, w = 512 / n;
  for (let i = 0; i < n; i++) {
    const L = 52 + r() * 10, H = 30 + r() * 6;
    g.fillStyle = hsl(H, 42, L); g.fillRect(i * w, 0, w, 512);
    for (let k = 0; k < 14; k++) { g.strokeStyle = hsl(H - 4, 40, L - 10 - r() * 8, 0.5); g.lineWidth = 1 + r() * 2; g.beginPath(); const x = i * w + 4 + r() * (w - 8); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 6 - 3, 170, x + r() * 6 - 3, 340, x + r() * 4 - 2, 512); g.stroke(); }
    const cut = r() * 512; g.fillStyle = 'rgba(40,24,14,.9)'; g.fillRect(i * w, cut, w, 4);
    for (const y of [cut - 18, cut + 18]) { g.fillStyle = '#2b2620'; g.beginPath(); g.arc(i * w + w * 0.3, y, 2.6, 0, 7); g.arc(i * w + w * 0.7, y, 2.6, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(30,18,10,.95)'; g.fillRect(i * w, 0, 3, 512);
    if (r() < 0.5) { g.fillStyle = hsl(H, 40, L - 16, .8); g.beginPath(); g.ellipse(i * w + w / 2, r() * 512, 5, 9, 0, 0, 7); g.fill(); }
  }
  return c;
}
export function beam(seed = 2, base = [30, 40, 40]) {
  const [c, g] = cv(256, 512), r = rng(seed);
  g.fillStyle = hsl(base[0], base[1], base[2]); g.fillRect(0, 0, 256, 512);
  for (let k = 0; k < 40; k++) { g.strokeStyle = hsl(base[0] - 3, base[1], base[2] - 8 - r() * 10, .45); g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * 256; g.moveTo(x, 0); g.bezierCurveTo(x + 8, 170, x - 8, 340, x + r() * 10 - 5, 512); g.stroke(); }
  return c;
}
export function stone(seed = 4, hue = 36, sat = 14, lig = 66, bw = 128, bh = 64) {
  const [c, g] = cv(512, 512), r = rng(seed);
  g.fillStyle = '#4a4238'; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 512 / bh; row++) for (let col = -1; col < 512 / bw + 1; col++) {
    const x = col * bw + (row % 2) * bw / 2, y = row * bh, L = lig - 6 + r() * 12;
    g.fillStyle = hsl(hue + r() * 8 - 4, sat, L); g.beginPath(); g.roundRect(x + 3, y + 3, bw - 6, bh - 6, 6); g.fill();
    g.fillStyle = hsl(hue, sat, L + 7, .6); g.fillRect(x + 6, y + 5, bw - 14, 5);
    g.fillStyle = hsl(hue, sat, L - 12, .5); g.fillRect(x + 6, y + bh - 10, bw - 12, 5);
    speckle(g, 0, 0, r, 0, ['#000']);
    for (let k = 0; k < 6; k++) { g.fillStyle = hsl(hue, sat, L - 8 - r() * 8, .6); g.beginPath(); g.ellipse(x + r() * bw, y + r() * bh, 2 + r() * 5, 1 + r() * 3, 0, 0, 7); g.fill(); }
  }
  return c;
}
export function radial(col = '0,0,0', a = 0.55) {
  const [c, g] = cv(128, 128), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.55, `rgba(${col},${a * 0.6})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
}
