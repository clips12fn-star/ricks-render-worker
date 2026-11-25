import React from "react";
import { useCurrentFrame } from "remotion";
import type { PlacedCaption } from "./layout.js";

export interface WordCaptionsProps {
  captions: readonly PlacedCaption[];
  accentColor?: string;
}

/**
 * 2-3 word phrase captions with exact frame-level karaoke word highlight.
 * Renders cleanly centered in the safe lower-third band with thick black outline.
 */
export const WordCaptions: React.FC<WordCaptionsProps> = ({ captions, accentColor = "#ffd23f" }) => {
  const frame = useCurrentFrame();
  const active = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!active) return null;
  const age = frame - active.startFrame;
  const pop = Math.min(1, 0.88 + age * 0.05) + (age < 2 ? 0.04 : 0);
  const cx = active.bbox.x + active.bbox.width / 2;
  const cy = active.bbox.y + active.bbox.height / 2;
  const ty = active.bbox.y + active.bbox.height * 0.78;
  const highlight = accentColor === "#ffffff" ? "#ffd23f" : accentColor;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
      <text
        x={cx}
        y={ty}
        textAnchor="middle"
        fontSize={active.fontSize}
        fontWeight={900}
        fontFamily="Impact, Arial Black, sans-serif"
        fill="#ffffff"
        stroke="#05060a"
        strokeWidth={Math.round(active.fontSize / 6.2)}
        strokeLinejoin="round"
        paintOrder="stroke"
        transform={`translate(${cx} ${cy}) scale(${pop}) translate(${-cx} ${-cy})`}
      >
        {active.words && active.words.length > 0
          ? active.words.map((w, idx) => {
              const isSpoken = frame >= w.startFrame && frame < w.endFrame;
              return (
                <tspan key={`${w.startFrame}-${idx}`} fill={isSpoken ? highlight : "#ffffff"}>
                  {idx > 0 ? " " : ""}
                  {w.text}
                </tspan>
              );
            })
          : active.text}
      </text>
    </svg>
  );
};
