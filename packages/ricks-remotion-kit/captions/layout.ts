/**
 * Word-by-word subtitle layout with anti-collision against protected zones
 * (anchor object, character face, proof area, UI props). Frame: 1080x1920.
 * Subtitle band: y in [1350, 1650] (lower third of the vertical frame, above platform UI).
 */

export const CAPTION_BAND = { yMin: 1350, yMax: 1650 } as const;
export const FRAME_WIDTH = 1080;
export const FRAME_HEIGHT = 1920;

export interface CaptionWord {
  word: string;
  startFrame: number;
  endFrame: number;
  emphasis: boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedCaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
  emphasis: boolean;
}

export interface PlacedCaption {
  text: string;
  startFrame: number;
  endFrame: number;
  emphasis: boolean;
  bbox: Box;
  fontSize: number;
  /** Optional word-level timings inside a 2-3 word phrase line for exact karaoke sync. */
  words?: PlacedCaptionWord[];
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Rough text metrics for the bold display font used by the kit (avg glyph width ~0.58em). */
export function measureCaption(text: string, fontSize: number): { width: number; height: number } {
  return { width: Math.ceil(text.length * fontSize * 0.58) + 40, height: Math.ceil(fontSize * 1.35) };
}

export interface ZoneAtFrame {
  startFrame: number;
  endFrame: number;
  bbox: Box;
}

/**
 * Groups word-level timings into readable 2-3 word caption lines (breaking on punctuation,
 * natural pauses >= 8 frames, or line character limit) and places each line in the caption band
 * without colliding against active protected zones.
 */
export function layoutCaptions(
  words: readonly CaptionWord[],
  zones: readonly ZoneAtFrame[],
  options: { baseFontSize?: number; maxWordsPerLine?: number; maxCharsPerLine?: number } = {},
): PlacedCaption[] {
  const maxWords = options.maxWordsPerLine ?? 3;
  const maxChars = options.maxCharsPerLine ?? 18;
  const base = options.baseFontSize ?? 86;

  // Group into 2-3 word chunks while preserving exact per-word startFrame/endFrame.
  const groups: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i]!;
    const prev = cur[cur.length - 1];
    const candidateText = [...cur, w].map((x) => x.word).join(" ");
    const prevEndsClause = prev ? /[.!?,;:—–-]$/.test(prev.word) : false;
    const pauseGap = prev ? w.startFrame - prev.endFrame >= 8 : false;

    if (
      cur.length > 0 &&
      (cur.length >= maxWords ||
        candidateText.length > maxChars ||
        prevEndsClause ||
        pauseGap)
    ) {
      groups.push(cur);
      cur = [w];
    } else {
      cur.push(w);
    }
  }
  if (cur.length > 0) groups.push(cur);

  const placed: PlacedCaption[] = [];
  for (const grp of groups) {
    const startFrame = grp[0]!.startFrame;
    const endFrame = Math.max(startFrame + 1, grp[grp.length - 1]!.endFrame);
    const text = grp.map((w) => w.word.toUpperCase()).join(" ");
    const emphasis = grp.some((w) => w.emphasis);
    const groupWords: PlacedCaptionWord[] = grp.map((w) => ({
      text: w.word.toUpperCase(),
      startFrame: w.startFrame,
      endFrame: Math.max(w.startFrame + 1, w.endFrame),
      emphasis: w.emphasis,
    }));

    const activeZones = zones.filter((z) => startFrame < z.endFrame && endFrame > z.startFrame);
    let chosen: PlacedCaption | undefined;
    const sizeCandidates = [Math.min(92, base), 82, 74, 66, 58];
    for (const fontSize of sizeCandidates) {
      const { width, height } = measureCaption(text, fontSize);
      if (width > FRAME_WIDTH - 48 && fontSize > 58) continue;
      const clampedW = Math.min(FRAME_WIDTH - 48, width);
      const x = Math.max(24, Math.min(FRAME_WIDTH - clampedW - 24, (FRAME_WIDTH - clampedW) / 2));
      const candidates: number[] = [];
      for (let y = CAPTION_BAND.yMin; y + height <= CAPTION_BAND.yMax; y += 20) candidates.push(y);
      const centre = (CAPTION_BAND.yMin + CAPTION_BAND.yMax) / 2 - height / 2;
      candidates.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
      for (const y of candidates) {
        const bbox: Box = { x, y, width: clampedW, height };
        if (!activeZones.some((z) => boxesOverlap(bbox, z.bbox))) {
          chosen = { text, startFrame, endFrame, emphasis, bbox, fontSize, words: groupWords };
          break;
        }
      }
      if (chosen) break;
    }
    if (!chosen) {
      const fontSize = 58;
      const { width, height } = measureCaption(text, fontSize);
      const clampedW = Math.min(FRAME_WIDTH - 48, width);
      chosen = {
        text,
        startFrame,
        endFrame,
        emphasis,
        bbox: {
          x: Math.max(24, (FRAME_WIDTH - clampedW) / 2),
          y: CAPTION_BAND.yMax - height,
          width: clampedW,
          height,
        },
        fontSize,
        words: groupWords,
      };
    }
    placed.push(chosen);
  }
  return placed;
}

/** Returns the human-readable collisions left after layout (empty = clean). */
export function findCaptionCollisions(
  captions: readonly PlacedCaption[],
  zones: readonly ZoneAtFrame[],
): string[] {
  const issues: string[] = [];
  for (const c of captions) {
    for (const z of zones) {
      if (c.startFrame < z.endFrame && c.endFrame > z.startFrame && boxesOverlap(c.bbox, z.bbox)) {
        issues.push(`Caption '${c.text}' collides with a protected zone at frames ${c.startFrame}-${c.endFrame}`);
      }
    }
  }
  return issues;
}
