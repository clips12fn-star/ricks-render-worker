import * as THREE from "three";
import { beam, planks, radial, stone, tex } from "./cinema";
import { CLOCK, col, type Clock } from "./palette";
import { facadeTexture, skyTexture, steelTexture, waterTexture } from "./textures";

/*
 * The one location of this Short: the closing platform at the crown of the Eads Bridge
 * west arch, St. Louis, September 1873. Units are feet. The bridge axis runs along X
 * (St. Louis levee at -X), the Mississippi flows along Z, the crown of the west arch is X=0.
 * The hero joint is the lower chord of the near rib (Z = HZ) whose two hollow ends face each
 * other across the closing gap at Y = HY.
 */
export const HZ = 9; // near rib
export const HY = -12; // hero chord centreline at the crown
export const R = 0.75; // 18-inch steel rib tube
export const DECK = -16.5; // staging deck top
export const RIVER = -95;
export const HALF_SPAN = 150;
export const RISE = 42;
/*
 * Joint numbers (ft). The east seat is fixed at +6. The west lip moves with temperature.
 * Cool lip: -6.00 (gap 12.00, the standard tube would fit). Heat: -5.80 (gap 11.80).
 * After 30 tons of ice: -5.90 (gap 11.90) — still short of 12.00. The scribe marks -5.90,
 * where the closed joint finally sits. Backup tube: 12 ft minus 5 in = 11.583 ft + screw-plug.
 */
export const LIP_COOL = -6.0;
export const LIP_HOT = -5.8;
export const LIP_ICED = -5.9;
export const SCRIBE_X = -5.9;
export const EAST_SEAT = 6.0;

export const archY = (x: number, crown: number) => crown - RISE * (x / HALF_SPAN) ** 2;

class ChordCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private x0: number,
    private x1: number,
    private crown: number,
    private z: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const x = this.x0 + (this.x1 - this.x0) * t;
    return target.set(x, archY(x, this.crown), this.z);
  }
}

export type SetHandles = {
  root: THREE.Group;
  clock: Clock;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** West and east hero tube ends; translate along X to show thermal expansion of the joint. */
  westEnd: THREE.Group;
  eastEnd: THREE.Group;
  deck: THREE.Group;
  gauge: THREE.Group;
  scribeX: number;
  hoist: THREE.Group;
  desk: THREE.Group;
  steelMat: THREE.MeshStandardMaterial;
  heroSteel: THREE.MeshStandardMaterial;
  water: THREE.Mesh;
  /** Point the sun shadow frustum at the action. */
  focusShadow: (x: number, y: number, z: number, size: number) => void;
};

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const shadowy = <T extends THREE.Object3D>(m: T, cast = true, receive = true) => {
  m.traverse((o) => {
    o.castShadow = cast;
    o.receiveShadow = receive;
  });
  return m;
};

/** A hollow rib end: steel skin, sunlit lip, dark bore and an internal bearing face. */
export function ribMouth(steel: THREE.Material, length: number, dir: 1 | -1) {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, length, 40, 1, true), steel);
  skin.rotation.z = Math.PI / 2;
  skin.position.x = (-dir * length) / 2;
  g.add(skin);
  const lip = new THREE.Mesh(
    new THREE.RingGeometry(R * 0.72, R * 1.0, 48),
    std({ color: "#f3dfb4", emissive: "#ffb85a", emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.35, side: THREE.DoubleSide }),
  );
  lip.rotation.y = Math.PI / 2;
  g.add(lip);
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.72, R * 0.72, 1.6, 40, 1, true),
    std({ color: "#1c1b22", roughness: 0.9, side: THREE.BackSide }),
  );
  bore.rotation.z = Math.PI / 2;
  bore.position.x = -dir * 0.8;
  g.add(bore);
  const seat = new THREE.Mesh(new THREE.CircleGeometry(R * 0.72, 40), std({ color: "#3b3a44", metalness: 0.4, roughness: 0.6 }));
  seat.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
  seat.position.x = -dir * 1.6;
  g.add(seat);
  // coupling band one tube-length back
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, 0.08, 10, 40), std({ color: "#2c2a33", metalness: 0.5, roughness: 0.5 }));
  band.rotation.y = Math.PI / 2;
  band.position.x = -dir * (length - 0.3);
  g.add(band);
  return shadowy(g);
}

export function buildSet(scene: THREE.Scene, clockIndex: number): SetHandles {
  const k = CLOCK[clockIndex];
  const root = new THREE.Group();
  scene.add(root);
  scene.fog = new THREE.FogExp2(col(k.haze), k.hazeDensity);
  scene.background = col(k.skyTop);

  // Sky dome (excluded from ink and depth passes).
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4500, 48, 24),
    new THREE.MeshBasicMaterial({ map: skyTexture(k), side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.userData.sky = true;
  sky.rotation.y = -0.4;
  root.add(sky);

  // Light: warm key from the south-west sun, sky fill, warm ground bounce.
  const sun = new THREE.DirectionalLight(col(k.key), k.keyI);
  sun.position.set(-60, 90, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  root.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(col(k.fill), col(k.ground), k.fillI);
  root.add(hemi);
  const focusShadow = (x: number, y: number, z: number, size: number) => {
    sun.target.position.set(x, y, z);
    sun.position.set(x - 60, y + 90, z + 70);
    const c = sun.shadow.camera;
    c.left = -size;
    c.right = size;
    c.top = size;
    c.bottom = -size;
    c.near = 1;
    c.far = 400;
    c.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
  };
  focusShadow(0, DECK, HZ, 30);

  // Mississippi.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), std({ map: waterTexture(k), roughness: 0.32, metalness: 0.05 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = RIVER;
  water.receiveShadow = true;
  root.add(water);

  // Steel.
  const steelMat = std({ map: steelTexture(k.steel), color: "#ffffff", metalness: 0.08, roughness: 0.5 });
  const heroSteel = std({ map: steelTexture(k.steel, 12), color: "#ffffff", metalness: 0.1, roughness: 0.42 });

  const ribs = new THREE.Group();
  const ribZ = [-27, -9, 9, 27];
  const brace = new THREE.MeshStandardMaterial({ color: "#3e4049", metalness: 0.4, roughness: 0.55 });
  const braceGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 6);
  const braceList: THREE.Matrix4[] = [];
  const addBrace = (a: THREE.Vector3, b: THREE.Vector3) => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    braceList.push(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, d.length(), 1)));
  };
  // Half arches: west arch (x in [-150,150]) and the centre arch cantilevering east from the pier at +150.
  const halves: [number, number][] = [
    [-HALF_SPAN, -6],
    [6, HALF_SPAN],
    [HALF_SPAN, HALF_SPAN + 112],
  ];
  for (const [x0, x1] of halves) {
    for (const z of ribZ) {
      for (const crown of [0, -12]) {
        const centre = x0 >= HALF_SPAN ? 2 * HALF_SPAN : 0; // centre arch mirrors around its own crown at +300
        const len = x1 - x0;
        // keep the last 12 ft of the hero chord as separate movable ends
        const hero = z === HZ && crown === HY && centre === 0;
        const a = hero ? (x0 < 0 ? x0 : x0 + 12) : x0;
        const b = hero ? (x0 < 0 ? x1 - 12 : x1) : x1;
        const curve = new ChordCurve(a - centre, b - centre, crown, z);
        const geo = new THREE.TubeGeometry(curve, Math.max(8, Math.round(len / 3)), R, 16, false);
        const m = steelMat.clone();
        m.map = steelMat.map!.clone();
        m.map.repeat.set((b - a) / 12, 1);
        m.map.needsUpdate = true;
        const tube = new THREE.Mesh(geo, m);
        tube.position.x = centre;
        ribs.add(tube);
      }
      // web bracing between the chords of each rib
      for (let x = x0 + 3; x < x1 - 2; x += 12) {
        const cx = x0 >= HALF_SPAN ? x - 2 * HALF_SPAN : x;
        const off = x0 >= HALF_SPAN ? 2 * HALF_SPAN : 0;
        const top = new THREE.Vector3(x, archY(cx, 0) - R, z);
        const bot = new THREE.Vector3(x + 6, archY(cx + 6, -12) + R, z);
        const bot2 = new THREE.Vector3(x - 6, archY(cx - 6, -12) + R, z);
        top.x = x;
        bot.x = x + 6;
        bot2.x = x - 6;
        void off;
        addBrace(top, bot);
        addBrace(top, bot2);
      }
    }
    // cross struts between ribs on the upper chord
    for (let x = x0 + 9; x < x1 - 2; x += 24) {
      const cx = x0 >= HALF_SPAN ? x - 2 * HALF_SPAN : x;
      addBrace(new THREE.Vector3(x, archY(cx, 0), -27), new THREE.Vector3(x, archY(cx, 0), 27));
    }
  }
  const braces = new THREE.InstancedMesh(braceGeo, brace, braceList.length);
  braceList.forEach((m, i) => braces.setMatrixAt(i, m));
  ribs.add(braces);
  // Short top struts across the gap carried by the upper chord temporary splice plates.
  root.add(shadowy(ribs));

  // Hero movable ends.
  const westEnd = new THREE.Group();
  westEnd.add(ribMouth(heroSteel, 12.6, 1));
  westEnd.position.set(LIP_COOL, HY, HZ);
  // tilt the end along the arch tangent (very small at the crown)
  westEnd.rotation.z = Math.atan((-2 * RISE * -9) / HALF_SPAN ** 2);
  const eastEnd = new THREE.Group();
  eastEnd.add(ribMouth(heroSteel, 12.6, -1));
  eastEnd.position.set(EAST_SEAT, HY, HZ);
  eastEnd.rotation.z = Math.atan((-2 * RISE * 9) / HALF_SPAN ** 2);
  root.add(westEnd, eastEnd);

  // Piers / abutment in painted stone, with timber construction towers and stay cables.
  const stoneMat = std({ map: tex(stone(4, 34, 18, 70), 6, 6), roughness: 0.9 });
  const mkPier = (x: number, w: number, h: number) => {
    const p = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 84), stoneMat);
    body.position.y = RIVER + h / 2;
    p.add(body);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 4, 1), stoneMat);
    nose.rotation.y = Math.PI / 4;
    nose.scale.set(1, 1, 0.8);
    for (const z of [-44, 44]) {
      const n = nose.clone();
      n.position.set(0, RIVER + h / 2, z);
      p.add(n);
    }
    p.position.x = x;
    return shadowy(p);
  };
  root.add(mkPier(HALF_SPAN, 36, archY(HALF_SPAN, -12) - RIVER + 2));
  root.add(mkPier(2 * HALF_SPAN + 220, 36, archY(HALF_SPAN, -12) - RIVER + 2));
  // St. Louis abutment and levee
  const abut = new THREE.Mesh(new THREE.BoxGeometry(70, archY(HALF_SPAN, -12) - RIVER + 26, 110), stoneMat);
  abut.position.set(-HALF_SPAN - 30, RIVER + (archY(HALF_SPAN, -12) - RIVER + 26) / 2, 0);
  root.add(shadowy(abut));
  const towerMat = std({ map: tex(beam(5, [28, 38, 36]), 1, 6), roughness: 0.85 });
  const tower = (x: number) => {
    const t = new THREE.Group();
    for (const z of [-30, 30]) {
      for (const dx of [-10, 10]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, 110, 1.6), towerMat);
        post.position.set(x + dx, archY(HALF_SPAN, -12) + 55, z);
        t.add(post);
      }
      for (let y = 0; y < 110; y += 22) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 1.2), towerMat);
        rail.position.set(x, archY(HALF_SPAN, -12) + y + 8, z);
        t.add(rail);
      }
    }
    return shadowy(t);
  };
  root.add(tower(HALF_SPAN), tower(-HALF_SPAN - 12));
  // stay cables from tower tops to the cantilevered half arches
  const cableMat = new THREE.LineBasicMaterial({ color: "#1d1b24" });
  const cablePts: THREE.Vector3[] = [];
  for (const [tx, dir] of [
    [HALF_SPAN, -1],
    [-HALF_SPAN - 12, 1],
    [HALF_SPAN, 1],
  ] as const) {
    for (const z of [-27, 27]) {
      for (const reach of [40, 80, 120]) {
        const x = tx + dir * reach;
        const cx = x > HALF_SPAN ? x - 2 * HALF_SPAN : x;
        cablePts.push(new THREE.Vector3(tx, archY(HALF_SPAN, -12) + 112, z), new THREE.Vector3(x, archY(cx, 0) + R, z));
      }
    }
  }
  const cables = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePts), cableMat);
  cables.userData.ndSkip = true;
  root.add(cables);

  // St. Louis riverfront: levee, warehouses, a spire and two steamboats.
  const levee = new THREE.Mesh(new THREE.BoxGeometry(900, 40, 2400), std({ map: tex(stone(9, 30, 10, 56, 64, 32), 60, 160), roughness: 0.95 }));
  levee.position.set(-HALF_SPAN - 520, RIVER + 12, -700);
  root.add(levee);
  const city = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const h = 30 + ((i * 37) % 50);
    const w = 28 + ((i * 13) % 22);
    const facade = std({ map: facadeTexture(8 + ((i * 7) % 26), 21 + i), roughness: 0.9 });
    facade.map!.repeat.set(Math.max(1, Math.round(w / 26)), Math.max(1, Math.round(h / 24)));
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 40), facade);
    b.position.set(-HALF_SPAN - 120 - (i % 4) * 70, RIVER + 32 + h / 2 + (i % 4) * 6, 120 - Math.floor(i / 4) * 95);
    city.add(b);
    if (i % 5 === 0) {
      const chim = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 26, 8), std({ color: "#5a2f2a" }));
      chim.position.set(b.position.x + 6, b.position.y + h / 2 + 13, b.position.z);
      city.add(chim);
    }
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(9, 70, 8), std({ color: "#6e7f8c", roughness: 0.6 }));
  spire.position.set(-HALF_SPAN - 260, RIVER + 150, -260);
  const tower2 = new THREE.Mesh(new THREE.BoxGeometry(18, 80, 18), std({ map: tex(stone(13, 32, 16, 72), 1, 3) }));
  tower2.position.set(-HALF_SPAN - 260, RIVER + 80, -260);
  city.add(spire, tower2);
  root.add(shadowy(city, false, true));
  const boat = (x: number, z: number, s: number) => {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(80, 8, 26), std({ color: "#f3efe6" }));
    hull.position.y = 4;
    const deck2 = new THREE.Mesh(new THREE.BoxGeometry(60, 8, 22), std({ color: "#ffffff" }));
    deck2.position.y = 12;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(82, 1.6, 27), std({ color: "#c8323d" }));
    trim.position.y = 8.5;
    b.add(hull, deck2, trim);
    for (const dz of [-6, 6]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 34, 10), std({ color: "#1b1a20" }));
      st.position.set(22, 30, dz);
      b.add(st);
    }
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 6, 16), std({ color: "#b52b37" }));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-40, 8, 0);
    b.add(wheel);
    b.position.set(x, RIVER, z);
    b.rotation.y = Math.PI / 2;
    b.scale.setScalar(s);
    return b;
  };
  root.add(shadowy(boat(-HALF_SPAN - 40, -260, 1), true, true), shadowy(boat(-HALF_SPAN - 60, -620, 1), true, true));
  // East (Illinois) bank: low green-brown shore with trees far away.
  const eastBank = new THREE.Mesh(new THREE.BoxGeometry(3000, 20, 6000), std({ color: "#6f7a45", roughness: 1 }));
  eastBank.position.set(2 * HALF_SPAN + 1900, RIVER + 4, -1200);
  root.add(eastBank);
  const treeMat = std({ color: "#4d6b37", roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(18 + (i % 5) * 4, 10, 8), treeMat);
    t.position.set(2 * HALF_SPAN + 420 + (i % 6) * 60, RIVER + 26, 300 - i * 110);
    root.add(t);
  }

  // Closing platform: timber staging hung below the crown.
  const deck = new THREE.Group();
  const plankMat = std({ map: tex(planks(3), 3, 2), roughness: 0.85 });
  const deckTop = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 20), plankMat);
  deckTop.position.set(0, DECK - 0.3, 12);
  deck.add(deckTop);
  const joistMat = std({ map: tex(beam(8, [26, 40, 30]), 1, 4), roughness: 0.85 });
  for (const x of [-25, -13, 0, 13, 25]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 21), joistMat);
    j.position.set(x, DECK - 1, 12);
    deck.add(j);
  }
  // hanger rods from the upper chords
  for (const x of [-24, -12, 12, 24]) {
    for (const z of [3, 21]) {
      const rodTop = archY(x, 0);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, rodTop - DECK, 6), std({ color: "#2a2830" }));
      rod.position.set(x, (rodTop + DECK) / 2, z);
      deck.add(rod);
    }
  }
  // back railing and corner posts
  for (const x of [-26, -13, 13, 26]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), joistMat);
    post.position.set(x, DECK + 2, 2.4);
    deck.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(52, 0.35, 0.35), joistMat);
  rail.position.set(0, DECK + 3.6, 2.4);
  deck.add(rail);
  // clutter: barrels, rope coil, tool chest
  const barrelMat = std({ map: tex(planks(11), 2, 1), roughness: 0.8 });
  for (const [x, z] of [
    [-22, 6],
    [-20.6, 7.2],
    [21, 6.5],
  ]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.95, 2.8, 16), barrelMat);
    b.position.set(x, DECK + 1.4, z);
    deck.add(b);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.07, 6, 20), std({ color: "#2b2930" }));
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(x, DECK + 2.2, z);
    deck.add(hoop);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 10, 24), std({ color: "#c9a36b", roughness: 1 }));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(18, DECK + 0.35, 17);
  deck.add(coil);
  root.add(shadowy(deck));

  // Fixed timber gauge with a pale scribe line beside the west lip (front of the tube).
  const gauge = new THREE.Group();
  const scribeX = SCRIBE_X;
  const gPost = new THREE.Mesh(new THREE.BoxGeometry(0.5, HY - DECK - 0.2, 0.5), joistMat);
  gPost.position.set(-7.2, (HY + DECK) / 2 - 0.4, HZ + 1.35);
  const gArm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.9), std({ color: "#d8b277", roughness: 0.8 }));
  gArm.position.set(-6.4, HY - R - 0.15, HZ + 0.95);
  const scribe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.92), new THREE.MeshBasicMaterial({ color: "#fffef0" }));
  scribe.position.set(scribeX, HY - R - 0.14, HZ + 0.95);
  gauge.add(gPost, gArm, scribe);
  root.add(shadowy(gauge));

  // Hoist: timber derrick on the deck with a boom over the gap. The rope and sling belong to beats.
  const hoist = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.9, 26, 0.9), joistMat);
  mast.position.set(-10, DECK + 13, 4);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1), joistMat);
  const a = new THREE.Vector3(-10, DECK + 22, 4),
    b = new THREE.Vector3(0, DECK + 25, HZ);
  boom.position.copy(a.clone().add(b).multiplyScalar(0.5));
  boom.scale.z = a.distanceTo(b);
  boom.lookAt(b);
  const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16), std({ color: "#2b2930" }));
  sheave.rotation.x = Math.PI / 2;
  sheave.position.copy(b);
  hoist.add(mast, boom, sheave);
  // timber guides either side of the gap
  // guides stand on the far side only, so the near side of the joint stays open to camera
  for (const x of [-6.6, 6.6]) {
    for (const z of [HZ - 1.3]) {
      const gd = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9, 0.35), joistMat);
      gd.position.set(x, HY + 3.2, z);
      hoist.add(gd);
    }
  }
  root.add(shadowy(hoist));

  // Plank desk on the west staging (ledger is a beat prop).
  const desk = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 3), plankMat);
  top.position.y = 3.2;
  desk.add(top);
  for (const [x, z] of [
    [-2.2, -1.2],
    [2.2, -1.2],
    [-2.2, 1.2],
    [2.2, 1.2],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), joistMat);
    leg.position.set(x, 1.6, z);
    desk.add(leg);
  }
  desk.position.set(-17, DECK, 16);
  root.add(shadowy(desk));

  return { root, clock: k, sun, hemi, westEnd, eastEnd, deck, gauge, scribeX, hoist, desk, steelMat, heroSteel, water, focusShadow };
}

/** Soft contact shadow disc (no ink, no depth). */
export function contactShadow(size: number, opacity = 0.45) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex(radial("20,14,24", opacity), 1, 1), transparent: true, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.userData.ndSkip = true;
  m.renderOrder = 1;
  return m;
}
