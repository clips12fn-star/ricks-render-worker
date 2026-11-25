import React from "react";
import { AbsoluteFill, Audio, Composition, registerRoot, Sequence } from "remotion";
import { WordCaptions } from "../../../packages/ricks-remotion-kit/captions/WordCaptions";
import storyboard from "../04_storyboard.json";
import mastered from "../05_mastered.wav";
import { CAPTIONS } from "./captions";
import { Beat01 } from "./Beat01";
import { Beat02 } from "./Beat02";
import { Beat03 } from "./Beat03";
import { Beat04 } from "./Beat04";
import { Beat05 } from "./Beat05";
import { Beat06 } from "./Beat06";
import { Beat07 } from "./Beat07";

/*
 * Station 06a · Opus pilot · short_01_eads_bridge_ice_screw
 * Each beat sits in a <Sequence> on its locked 04_storyboard.json span; beats receive absolute
 * storyboard frames internally (Stage `from`), so every gesture is keyed to the 05_frames.json lock.
 */
const BEATS = [Beat01, Beat02, Beat03, Beat04, Beat05, Beat06, Beat07];
const FPS = 30;
const TOTAL = 1756;

export const RicksMainShort: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0b0d12" }}>
    {storyboard.beats.map((b, i) => {
      const Beat = BEATS[i];
      return (
        <Sequence key={b.beatId} from={b.startFrame} durationInFrames={b.endFrame - b.startFrame} name={`Beat0${i + 1} · ${b.beatId}`}>
          <Beat />
        </Sequence>
      );
    })}
    <WordCaptions captions={CAPTIONS} accentColor="#FFBF37" />
    <Audio src={mastered} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <Composition id="RicksMainShort" component={RicksMainShort} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);

registerRoot(RemotionRoot);
