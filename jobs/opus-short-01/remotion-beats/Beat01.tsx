import React from "react";
import { Stage } from "./Stage";
import { buildHook } from "./hook";

/**
 * Bespoke anchor for this Short: the threaded wrought-iron screw-plug, live in the 3D set from frame 0.
 * `entryFrame` is the absolute storyboard frame of the first rendered frame.
 */
export const AnchorObject: React.FC<{ entryFrame: number }> = ({ entryFrame }) => <Stage from={entryFrame} build={buildHook(0)} />;

/** Beat 1 · hook · f0-f91 · macro_closeup · anomaly. "This five-inch screw saved a steel bridge." */
export const Beat01: React.FC = () => <AnchorObject entryFrame={0} />;
