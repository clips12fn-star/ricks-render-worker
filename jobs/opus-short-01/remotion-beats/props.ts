/* global document */
import * as THREE from "three";
import { planks, tex, beam } from "./cinema";
import { R } from "./set";
import { canvas, iceTexture, ironTexture, ledgerTexture, ruleTexture, tileTexture } from "./textures";

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const shadowy = <T extends THREE.Object3D>(m: T) => {
  m.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return m;
};

/* ------------------------------------------------------------------ */
/* Hero object: threaded wrought-iron screw-plug                       */
/* ------------------------------------------------------------------ */

export const PLUG_R = 0.36; // thread crest radius (ft)
export const PLUG_L = 0.95; // threaded length (ft)
export const PITCH = 0.13; // ft per turn
export const COLLAR = 0.12; // drive collar thickness; its outer face is the bearing face

/**
 * A true helical thread: a dense cylinder whose radius follows a triangle wave of
 * (axial position / pitch + angle / 2π). Rotating the mesh about its axis therefore
 * makes the crests visibly travel along it, exactly like a real screw.
 */
function threadGeometry(radius: number, depth: number, length: number, pitch: number, inward = false, half = false) {
  const geo = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    96,
    Math.round(length / pitch) * 14,
    true,
    half ? Math.PI / 2 : 0,
    half ? Math.PI : Math.PI * 2,
  );
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const theta = Math.atan2(v.z, v.x);
    const phase = v.y / pitch + theta / (2 * Math.PI);
    const f = phase - Math.floor(phase);
    const tri = 1 - 2 * Math.abs(f - 0.5); // 0 root .. 1 crest
    // trapezoid profile: narrow flat crest, flat root, straight 60-degree-like flanks
    const crest = Math.min(1, Math.max(0, (tri - 0.18) / 0.64));
    // chamfer the first and last turn
    const edge = Math.min(1, (length / 2 - Math.abs(v.y)) / (pitch * 0.9));
    const r = inward ? radius + depth * (1 - crest * edge) : radius - depth + depth * crest * Math.max(0, edge);
    const s = r / Math.hypot(v.x, v.z);
    p.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  geo.computeVertexNormals();
  return geo;
}

export type Plug = { group: THREE.Group; spin: THREE.Group; nick: THREE.Mesh; chalk: THREE.Mesh; bars: THREE.Group };

/** Screw-plug along +X. `spin` rotates about X. Drive collar with capstan holes at the -X end. */
export function makePlug(): Plug {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);
  const iron = std({ map: ironTexture(), color: "#ffffff", metalness: 0.18, roughness: 0.34 });
  const body = new THREE.Mesh(threadGeometry(PLUG_R, 0.04, PLUG_L, PITCH), iron);
  body.rotation.z = -Math.PI / 2;
  spin.add(body);
  const capMat = std({ color: "#8e8b88", metalness: 0.3, roughness: 0.45 });
  const capA = new THREE.Mesh(new THREE.CircleGeometry(PLUG_R - 0.05, 48), capMat);
  capA.rotation.y = Math.PI / 2;
  capA.position.x = PLUG_L / 2;
  spin.add(capA);
  // drive collar with four capstan holes
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(PLUG_R * 1.72, PLUG_R * 1.72, COLLAR, 8), std({ color: "#6e6a68", metalness: 0.3, roughness: 0.5 }));
  collar.rotation.z = Math.PI / 2;
  collar.position.x = -PLUG_L / 2 - COLLAR / 2;
  spin.add(collar);
  for (let i = 0; i < 4; i++) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), new THREE.MeshBasicMaterial({ color: "#141218" }));
    const a = (i * Math.PI) / 2;
    hole.position.set(-PLUG_L / 2 - COLLAR / 2, Math.cos(a) * PLUG_R * 1.72, Math.sin(a) * PLUG_R * 1.72);
    hole.rotation.x = a;
    spin.add(hole);
  }
  // one bright machined nick on the upper crest, the identity mark that recurs in the loop
  const nick = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.03, 0.07),
    new THREE.MeshStandardMaterial({ color: "#fff6dc", emissive: "#ffe2a0", emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.2 }),
  );
  nick.position.set(-PLUG_L / 2 + 0.09, PLUG_R + 0.005, 0);
  spin.add(nick);
  // white chalk stripe along one crest line (explanation beat)
  const chalk = new THREE.Mesh(new THREE.BoxGeometry(PLUG_L * 0.96, 0.012, 0.045), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  chalk.position.set(0, 0, PLUG_R + 0.004);
  chalk.rotation.x = Math.PI / 2;
  chalk.visible = false;
  spin.add(chalk);
  // spanner bars (shown in explanation/payoff)
  const bars = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 10), std({ color: "#2c2a31", metalness: 0.4, roughness: 0.5 }));
    bar.position.x = -PLUG_L / 2 - COLLAR / 2;
    bar.rotation.x = (i * Math.PI) / 2;
    bars.add(bar);
  }
  bars.visible = false;
  spin.add(bars);
  return { group: shadowy(group), spin, nick, chalk, bars };
}

/* ------------------------------------------------------------------ */
/* Closing tubes                                                       */
/* ------------------------------------------------------------------ */

export type ClosingTube = { group: THREE.Group; length: number; bore?: THREE.Mesh };

/**
 * Hollow closing tube along X, centred on its own origin. The standard tube is plain and pale-rimmed.
 * The backup is five inches short with an internal female thread at its +X end and a red-lead band.
 */
export function makeClosingTube(kind: "standard" | "backup", steel: THREE.Material, cut = false): ClosingTube {
  // cut = longitudinal cutaway: the front (+Z) half of every shell is removed so the plug and threads read inside.
  const t0 = cut ? Math.PI / 2 : 0,
    tl = cut ? Math.PI : Math.PI * 2,
    r0 = cut ? -Math.PI / 2 : 0;
  const length = kind === "standard" ? 12 : 12 - 5 / 12;
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, length, 40, 1, true, t0, tl),
    cut
      ? (() => {
          const m = (steel as THREE.MeshStandardMaterial).clone();
          m.side = THREE.DoubleSide;
          return m;
        })()
      : steel,
  );
  outer.rotation.z = Math.PI / 2;
  group.add(outer);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.72, R * 0.72, length, 32, 1, true, t0, tl),
    std({ color: cut ? "#8a6a58" : "#1d1c23", roughness: 0.9, side: cut ? THREE.DoubleSide : THREE.BackSide }),
  );
  inner.rotation.z = Math.PI / 2;
  group.add(inner);
  const rimMat = std({ color: kind === "standard" ? "#f0e2c0" : "#e9cfa0", metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.RingGeometry(R * 0.72, R, 48, 1, r0, tl), rimMat);
    rim.rotation.y = Math.PI / 2;
    rim.position.x = (sx * length) / 2;
    group.add(rim);
  }
  let bore: THREE.Mesh | undefined;
  if (kind === "backup") {
    // female helix inside the +X end, matching the plug pitch
    bore = new THREE.Mesh(
      threadGeometry(PLUG_R + 0.0, 0.05, 1.2, PITCH, true, cut),
      std({ map: ironTexture(9), color: "#c9c2b8", metalness: 0.3, roughness: 0.4, side: cut ? THREE.DoubleSide : THREE.BackSide }),
    );
    bore.rotation.z = -Math.PI / 2;
    bore.position.x = length / 2 - 0.6;
    group.add(bore);
    // threaded end ring that closes the steel bore down to the plug diameter
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(PLUG_R + 0.01, R * 0.72, 48, 1, r0, tl),
      std({ color: "#77716c", metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = length / 2 - 0.02;
    group.add(ring);
    if (!cut) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, 0.06, 8, 40), std({ color: "#c4472f", roughness: 0.7 }));
      band.rotation.y = Math.PI / 2;
      band.position.x = length / 2 - 1.1;
      group.add(band);
    }
    // fixed white scratch on the end ring: the stationary reference the chalk stripe winds past
    const scratch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.04), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    scratch.position.set(length / 2 + 0.005, R * 0.86, 0);
    group.add(scratch);
  }
  return { group: shadowy(group), length, bore };
}

/* ------------------------------------------------------------------ */
/* Gloved hand (rigger) — 3D so it grips real geometry                 */
/* ------------------------------------------------------------------ */

export type Glove = { group: THREE.Group; setCurl: (c: number, index?: number) => void };

export function makeGlove(color = "#b98352"): Glove {
  const group = new THREE.Group();
  const leather = std({ color, roughness: 0.75 });
  const cuffMat = std({ color: "#7a4f2e", roughness: 0.8 });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), leather);
  palm.scale.set(1.05, 0.55, 1.15);
  group.add(palm);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.32, 16), cuffMat);
  cuff.rotation.z = Math.PI / 2;
  cuff.position.set(-0.3, 0.0, 0);
  group.add(cuff);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 1.2, 16), std({ color: "#2f6aa8", roughness: 0.85 }));
  sleeve.rotation.z = Math.PI / 2;
  sleeve.position.set(-1.0, 0.0, 0);
  group.add(sleeve);
  const fingers: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const base = new THREE.Group();
    base.position.set(0.17, -0.02, -0.15 + i * 0.1);
    const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.12, 4, 10), leather);
    seg1.rotation.z = -Math.PI / 2;
    seg1.position.x = 0.08;
    base.add(seg1);
    const knuckle = new THREE.Group();
    knuckle.position.x = 0.17;
    const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.1, 4, 10), leather);
    seg2.rotation.z = -Math.PI / 2;
    seg2.position.x = 0.07;
    knuckle.add(seg2);
    base.add(knuckle);
    group.add(base);
    fingers.push(base);
  }
  const thumb = new THREE.Group();
  thumb.position.set(0.05, 0.03, 0.2);
  const t1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 10), leather);
  t1.rotation.z = -Math.PI / 2;
  t1.position.x = 0.09;
  thumb.add(t1);
  thumb.rotation.y = -0.6;
  group.add(thumb);
  /** c: curl of all fingers; index (optional) overrides the first finger, e.g. 0 to point. */
  const setCurl = (c: number, index?: number) => {
    fingers.forEach((f, i) => {
      const k = i === 0 && index !== undefined ? index : c;
      f.rotation.z = k * (1.0 + i * 0.05);
      (f.children[1] as THREE.Group).rotation.z = k * 1.25;
    });
    thumb.rotation.z = c * 0.5;
  };
  setCurl(0.8);
  return { group: shadowy(group), setCurl };
}

/* ------------------------------------------------------------------ */
/* Ledger, rule, crate, troughs, ice                                   */
/* ------------------------------------------------------------------ */

export type Ledger = { group: THREE.Group; right: THREE.Mesh; setPage: (page: "due" | "closed") => void };

export function makeLedger(): Ledger {
  const due = ledgerTexture([
    { text: "LOAN LEDGER  ·  1873", y: 80, size: 40 },
    { text: "SEP 19", y: 260, size: 96, color: "#b51d2c", box: "#c22436" },
    { text: "bond due", y: 330, size: 40 },
    { text: "LONDON", y: 1260, size: 78 },
    { text: "$500,000", y: 1380, size: 96, color: "#1d1a2a" },
    { text: "J. S. Morgan & Co.", y: 1450, size: 34 },
  ]);
  const closed = ledgerTexture([
    { text: "LOAN LEDGER  ·  1873", y: 80, size: 40 },
    { text: "SEP 19", y: 260, size: 72, color: "#8c6a5a", strike: true },
    { text: "bond due", y: 330, size: 40, color: "#8c6a5a" },
    { text: "SEP 17,", y: 1230, size: 100, color: "#1f5fd0" },
    { text: "1873", y: 1350, size: 100, color: "#1f5fd0", box: "#1f5fd0" },
    { text: "west arch closed", y: 1430, size: 40 },
  ]);
  const group = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.75), std({ color: "#6a2a2a", roughness: 0.8 }));
  group.add(cover);
  const pageMat = new THREE.MeshStandardMaterial({ map: due, roughness: 0.95 });
  const right = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.65, 24, 1), pageMat);
  right.rotation.x = -Math.PI / 2;
  right.position.y = 0.06;
  // gentle curl at the outer edges
  const p = right.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, 0.05 * (Math.abs(x) / 1.1) ** 2);
  }
  right.geometry.computeVertexNormals();
  group.add(right);
  const setPage = (page: "due" | "closed") => {
    pageMat.map = page === "due" ? due : closed;
    pageMat.needsUpdate = true;
  };
  return { group: shadowy(group), right, setPage };
}

export function makeRule(inches: number, highlight?: [number, number]) {
  const len = inches / 12;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.055), [
    std({ color: "#d9b35d" }),
    std({ color: "#d9b35d" }),
    std({ map: ruleTexture(inches, highlight), roughness: 0.7 }),
    std({ color: "#c8a250" }),
    std({ color: "#d9b35d" }),
    std({ color: "#d9b35d" }),
  ]);
  m.castShadow = true;
  return m;
}

export function makeCrate() {
  const group = new THREE.Group();
  const wood = std({ map: tex(planks(17), 1, 1), roughness: 0.85 });
  const [c, g] = canvas(512, 256);
  g.drawImage(planks(17), 0, 0, 512, 256);
  g.font = 'bold 74px "DejaVu Sans", Arial, sans-serif';
  g.fillStyle = "rgba(28,22,30,.85)";
  g.textAlign = "center";
  g.fillText("J. B. EADS", 256, 120);
  g.font = 'bold 40px "DejaVu Sans", Arial, sans-serif';
  g.fillText("CLOSING TUBES", 256, 190);
  const side = new THREE.CanvasTexture(c);
  side.colorSpace = THREE.SRGBColorSpace;
  const front = std({ map: side, roughness: 0.85 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(13, 2.2, 3), [wood, wood, wood, wood, front, wood]);
  box.position.y = 1.1;
  group.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.25, 3.2), wood);
  lid.position.y = 2.32;
  group.add(lid);
  // straw packing visible once the lid slides
  const straw = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.1, 2.6), std({ color: "#e8c46c", roughness: 1 }));
  straw.position.y = 2.05;
  group.add(straw);
  return { group: shadowy(group), lid };
}

/** Half of a timber ice trough that clamps round the rib tube: one side board + half the floor + strap. */
export function makeTroughHalf(length: number, side: 1 | -1) {
  const g = new THREE.Group();
  const wood = std({ map: tex(beam(23, [30, 44, 46]), 1, 2), roughness: 0.85 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 2.2, 0.2), wood);
  wall.position.set(0, 0.2, side * 1.15);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 1.15), wood);
  floor.position.set(0, -0.9, side * 0.58);
  g.add(wall, floor);
  for (const x of [-length / 2 + 0.8, 0, length / 2 - 0.8]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.24), std({ color: "#2b2930", metalness: 0.4 }));
    strap.position.set(x, 0.2, side * 1.27);
    g.add(strap);
  }
  return shadowy(g);
}

const iceMat = () => std({ map: iceTexture(), color: "#e9fbff", roughness: 0.18, metalness: 0.0, emissive: "#7fdcff", emissiveIntensity: 0.18 });

/** Deterministic block pile (seeded), each block can be revealed by index for the pour. */
export function makeIcePile(count: number, length: number, seed: number) {
  const g = new THREE.Group();
  const mat = iceMat();
  let s = seed;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < count; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 + r() * 0.4, 0.4 + r() * 0.3, 0.45 + r() * 0.35), mat);
    const x = (r() - 0.5) * length;
    const a = r() * Math.PI;
    b.position.set(x, R * 0.55 + Math.sin(a) * 0.55 + r() * 0.3, Math.cos(a) * 0.85);
    b.rotation.set(r() * 0.8, r() * 3, r() * 0.8);
    b.castShadow = true;
    b.receiveShadow = true;
    g.add(b);
  }
  return g;
}

export function makeBasket() {
  const g = new THREE.Group();
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = "#b98a4a";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#7d5428";
  ctx.lineWidth = 4;
  for (let y = 8; y < 128; y += 16) {
    for (let x = (y / 16) % 2 ? 0 : 12; x < 256; x += 24) {
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 6, 0, 0, 7);
      ctx.stroke();
    }
  }
  const wick = new THREE.CanvasTexture(c);
  wick.colorSpace = THREE.SRGBColorSpace;
  wick.wrapS = THREE.RepeatWrapping;
  wick.repeat.set(3, 1);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.75, 1.2, 24, 1, true), std({ map: wick, side: THREE.DoubleSide, roughness: 0.9 }));
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), std({ color: "#7d5428" }));
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.6;
  g.add(bottom);
  const ice = makeIcePile(7, 0.8, 99);
  ice.scale.setScalar(0.9);
  ice.position.y = 0.1;
  g.add(ice);
  return { group: shadowy(g), ice };
}

/* ------------------------------------------------------------------ */
/* Rope helper: a tube along a sagging curve, rebuilt per frame        */
/* ------------------------------------------------------------------ */

export function makeRope(color = "#c9a36b", radius = 0.06) {
  const mat = std({ color, roughness: 1 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.castShadow = true;
  const set = (a: THREE.Vector3, b: THREE.Vector3, sag: number) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.TubeGeometry(curve, 24, radius, 6, false);
  };
  return { mesh, set };
}

/* ------------------------------------------------------------------ */
/* Shower-rod insert (explanation analogy)                             */
/* ------------------------------------------------------------------ */

export function makeShowerInsert() {
  const g = new THREE.Group();
  const tile = std({ map: tileTexture(), roughness: 0.35 });
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), tile);
  wallL.position.set(-2.7, 0, 0);
  const wallR = wallL.clone();
  wallR.position.x = 2.7;
  const back = new THREE.Mesh(new THREE.BoxGeometry(5.8, 6, 0.3), std({ map: tileTexture(43), color: "#9fd7d9", roughness: 0.4 }));
  back.position.set(0, 0, -2);
  g.add(wallL, wallR, back);
  const chrome = std({ color: "#e8eef5", metalness: 0.65, roughness: 0.18 });
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 24), chrome);
  outer.rotation.z = Math.PI / 2;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 24), chrome);
  inner.rotation.z = Math.PI / 2;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 24), std({ color: "#ffffff", roughness: 0.4 }));
  sleeve.rotation.z = Math.PI / 2;
  const footMat = std({ color: "#2a2a2e", roughness: 0.9 });
  const footL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24), footMat);
  footL.rotation.z = Math.PI / 2;
  const footR = footL.clone();
  // twist marker so the rotation reads
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: "#ef2647" }));
  const rod = new THREE.Group();
  rod.add(outer, inner, sleeve, footL, footR, stripe);
  g.add(rod);
  /** extension: total rod length from foot to foot; twist: radians of the sleeve. */
  const setRod = (extension: number, twist: number) => {
    const half = extension / 2;
    outer.position.x = -half + 1.3;
    inner.position.x = half - 1.3;
    footL.position.x = -half - 0.04;
    footR.position.x = half + 0.04;
    sleeve.position.x = 0;
    stripe.position.set(0, Math.cos(twist) * 0.125, Math.sin(twist) * 0.125);
    stripe.rotation.x = twist;
  };
  setRod(5.0, 0);
  return { group: shadowy(g), rod, setRod };
}

/** White ink-style mitt for the analogy insert hands. */
export function makeMitt() {
  const g = new THREE.Group();
  const white = std({ color: "#fffefe", roughness: 0.7 });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), white);
  palm.scale.set(1, 0.7, 1.1);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 8), white);
  thumb.position.set(0.05, 0.1, 0.2);
  thumb.rotation.x = 0.8;
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 14), std({ color: "#2f6aa8", roughness: 0.85 }));
  cuff.position.y = -0.8;
  g.add(palm, thumb, cuff);
  return shadowy(g);
}

void document;
