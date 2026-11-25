// Frame-driven motion adapted from cartoon-short-kit.
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((value, axis) => lerp(value, b[axis], t));

export const M = {
  smooth(t) {
    t = clamp(t);
    return t ** 3 * (t * (t * 6 - 15) + 10);
  },
  easeOut: (t) => 1 - (1 - clamp(t)) ** 3,
  easeIn: (t) => clamp(t) ** 3,
  back(t, overshoot = 1.7) {
    t = clamp(t) - 1;
    return t ** 2 * ((overshoot + 1) * t + overshoot) + 1;
  },
  anticip(t, amount = .12) {
    t = clamp(t);
    if (t < .25) return -amount * Math.sin(t * 4 * Math.PI);
    return M.back((t - .25) / .75);
  },
  spring(seconds, frequency = 3, damping = 5) {
    const t = Math.max(0, seconds);
    return 1 - Math.exp(-damping * t) * Math.cos(frequency * 2 * Math.PI * t);
  },
};

// Uniform Catmull-Rom through world-space waypoints.
function spline(points, fraction) {
  const last = points.length - 1;
  const offset = clamp(fraction) * last;
  const segment = Math.min(last - 1, Math.floor(offset));
  const t = offset - segment;
  const prev = points[Math.max(0, segment - 1)];
  const start = points[segment];
  const end = points[segment + 1];
  const next = points[Math.min(last, segment + 2)];
  return start.map((a, axis) => {
    const b = end[axis], p = prev[axis], n = next[axis];
    return .5 * (2 * a + (b - p) * t + (2 * p - 5 * a + 4 * b - n) * t ** 2 + (3 * a - p - 3 * b + n) * t ** 3);
  });
}

/**
 * Keys in ascending frame order, with {f, pos, look, fov, roll?, ease?, path?}.
 * Positions and look targets use XYZ, roll uses degrees.
 * The destination key's path contains optional intermediate positions.
 */
export function camFromKeys(keys, frame, {creep = .0012, kicks = []} = {}) {
  const first = keys[0], last = keys.at(-1);
  if (!first) throw new Error("A camera path needs a starting key");
  const end = keys.findIndex((key) => key.f > frame);
  const a = end === -1 ? last : keys[Math.max(0, end - 1)];
  const b = end === -1 ? last : keys[end];
  const ease = M[b.ease ?? "smooth"];
  const t = a.f === b.f ? 0 : ease((frame - a.f) / (b.f - a.f));
  const pos = b.path?.length && a !== b ? spline([a.pos, ...b.path, b.pos], t) : lerp3(a.pos, b.pos, t);
  const look = lerp3(a.look, b.look, t);
  const fov = lerp(a.fov, b.fov, t) * (1 - Math.min(.1, creep * Math.max(0, frame - first.f) * .15));
  let roll = lerp(a.roll ?? 0, b.roll ?? 0, t);
  for (const kick of kicks) {
    const age = frame - kick.f;
    if (age < 0 || age >= 7) continue;
    const strength = (age % 2 ? -1 : 1) * kick.a * (1 - age / 7);
    look[1] += strength * 3;
    look[2] += strength * 2;
    roll += strength * 20;
  }
  return {pos, look, fov, roll};
}

export const idle = (frame, seed = 1) => ({
  bob: .006 * Math.sin((frame + seed * 11) * .11),
  tilt: 1.2 * Math.sin((frame + seed * 7) * .05),
  headTilt: 1.5 * Math.sin((frame + seed * 5) * .037 + 1),
});

export function blinkAt(frame, seed = 1) {
  const period = 38 + (seed * 17) % 31;
  const phase = (frame + seed * 13) % period;
  return [0.5, 1, 1, 0.5][phase] ?? 0;
}

/**
 * Clamp a 2D actor card's yaw within ±maxRad (default ±25°) of its scene home orientation
 * so cards never spin like flat cutouts. Returns { yaw, rel } where rel feeds paintBeanFace({ yaw: rel }).
 */
export function limitedYaw(actorX, actorZ, camX, camZ, homeYaw = 0, maxRad = 0.45) {
  const toCam = Math.atan2(camX - actorX, camZ - actorZ);
  let diff = toCam - homeYaw;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const rel = clamp(diff, -maxRad, maxRad);
  return { yaw: homeYaw + rel, rel };
}

/**
 * Compute opacity/visibility for a 2D actor card so it never fills the lens closer than minDist (default 6 units).
 */
export function cardOpacityByDistance(actorPos, camPos, minDist = 6) {
  const dx = actorPos[0] - camPos[0];
  const dy = actorPos[1] - camPos[1];
  const dz = actorPos[2] - camPos[2];
  const dist = Math.hypot(dx, dy, dz);
  const opacity = clamp((dist - minDist * 0.6) / (minDist * 0.4), 0, 1);
  return { opacity, visible: dist > minDist * 0.6, dist };
}
