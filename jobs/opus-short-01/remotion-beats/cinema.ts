// Re-export of the Station 06a cinema helpers. The originals stay untouched in
// departments/06a-remotion-builder/cinema; this pilot only imports them.
export { createLens } from "../../../departments/06a-remotion-builder/cinema/lens.js";
export { paintBeanFace } from "../../../departments/06a-remotion-builder/cinema/bean-face.js";
export { camFromKeys, idle, blinkAt, M, clamp, lerp } from "../../../departments/06a-remotion-builder/cinema/motion.js";
export { planks, beam, stone, radial, tex, rng } from "../../../departments/06a-remotion-builder/cinema/paint.js";
