import frames from "../05_frames.json";

/** Locked word track from Station 05 (30 fps). */
export type Word = { word: string; startFrame: number; endFrame: number; emphasis: boolean };
export const WORDS: Word[] = (frames as unknown as { words: Word[] }).words;

/** Frame where a word (exact text) starts, searched from `after`. Keeps every gesture keyed to the lock. */
export const wf = (text: string, after = 0) => {
  const w = WORDS.find((x) => x.word === text && x.startFrame >= after);
  if (!w) throw new Error(`Word ${text} not found after f${after}`);
  return w.startFrame;
};

/**
 * Mouth for an on-screen line spoken by the narrator voice (dramatised quote). Inside a word the
 * mouth opens on its first frames and closes on the last, so lips track the locked syllable edges.
 */
export function lipSync(f: number, from: number, to: number, rest: "scoff" | "smirk" | "tight" = "tight"): "talk" | "scoff" | "smirk" | "tight" {
  if (f < from || f >= to) return rest;
  const w = WORDS.find((x) => f >= x.startFrame && f < x.endFrame);
  if (!w) return rest;
  const k = f - w.startFrame;
  return k % 6 < 4 ? "talk" : rest;
}
