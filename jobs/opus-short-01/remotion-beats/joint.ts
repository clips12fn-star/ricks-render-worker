import * as THREE from "three";
import { makeClosingTube, makePlug, PITCH, PLUG_L, COLLAR } from "./props";
import { EAST_SEAT, HY, HZ, LIP_ICED } from "./set";

/*
 * Backup closing assembly: the 11.583 ft threaded tube plus the screw-plug in its +X bore.
 * `p` is how far the plug's bearing face (outer face of the drive collar) stands proud of the tube end.
 *   p = 0.36  as delivered (too long for the iced gap of 11.90 ft)
 *   p = 0.12  cranked inward: collar against the tube, assembly 11.70 ft -> daylight at both ends
 *   p = 0.317 spun outward until the collar bears on the east seat: the arch is locked.
 * Rotation is tied to travel (one turn per PITCH) so the thread visibly screws rather than slides.
 */
export const P_DELIVERED = 0.36;
export const P_IN = COLLAR;
export function lockP(tubeLength: number) {
  return EAST_SEAT - (LIP_ICED + tubeLength);
}

export type Assembly = {
  group: THREE.Group;
  tube: ReturnType<typeof makeClosingTube>;
  plug: ReturnType<typeof makePlug>;
  length: number;
  pLock: number;
  /** west: x of the tube's west end; y: centreline; p: plug stand-off. */
  set: (west: number, y: number, p: number) => void;
  nickWorld: () => THREE.Vector3;
};

export function makeAssembly(steel: THREE.Material, cut: boolean): Assembly {
  const tube = makeClosingTube("backup", steel, cut);
  const plug = makePlug();
  plug.chalk.visible = true;
  // collar faces +X (out of the tube) — flip the plug around Y
  plug.group.rotation.y = Math.PI;
  const group = new THREE.Group();
  group.add(tube.group, plug.group);
  const length = tube.length;
  const pLock = lockP(length);
  const set = (west: number, y: number, p: number) => {
    const end = west + length;
    tube.group.position.set(west + length / 2, y, HZ);
    const collarOuter = end + p;
    const bodyCentre = collarOuter - COLLAR - PLUG_L / 2;
    plug.group.position.set(bodyCentre, y, HZ);
    // angle 0 at the locked stand-off so the nick sits on top in the final state
    plug.spin.rotation.x = ((p - pLock) / PITCH) * Math.PI * 2;
  };
  set(LIP_ICED, HY, pLock);
  const nickWorld = () => {
    group.updateMatrixWorld(true);
    return plug.nick.getWorldPosition(new THREE.Vector3());
  };
  return { group, tube, plug, length, pLock, set, nickWorld };
}
