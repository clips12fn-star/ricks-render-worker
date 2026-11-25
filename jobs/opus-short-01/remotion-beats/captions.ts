import { layoutCaptions } from "../../../packages/ricks-remotion-kit/captions/layout";
import { WORDS } from "./words";

/**
 * 2-3 word caption lines laid out by the factory kit in the lower band (y 1350-1650 of 1920),
 * with per-word karaoke timing taken straight from the locked 05_frames.json word track.
 */
export const CAPTIONS = layoutCaptions(
  WORDS.map((w) => ({ word: w.word, startFrame: w.startFrame, endFrame: w.endFrame, emphasis: w.emphasis })),
  [],
  { maxWordsPerLine: 3, maxCharsPerLine: 18 },
);
