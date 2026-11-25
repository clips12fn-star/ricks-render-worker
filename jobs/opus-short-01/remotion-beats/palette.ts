import * as THREE from "three";

// Ink and face constants shared with the 06a bean-face grammar.
export const INK = "#151124";
export const FACE = "#fffefe";

// Calibration seed from the 06a SPEC (cobalt, red, gold, cyan), reassigned to roles below.
export const SEED = { cobalt: "#1455ED", red: "#EF2647", gold: "#FFBF37", cyan: "#61D8FF" };

/**
 * Color clock per beat. `board` holds the exact paletteHexes locked in 04_storyboard.json;
 * the remaining keys translate them into light, sky and water roles for the 3D set.
 * anomaly (hook, context) -> pressure (friction, esc1, esc2) -> explanation -> payoff.
 */
export type Clock = {
  board: [string, string, string];
  key: string; // sun / key light
  keyI: number;
  fill: string; // hemisphere sky fill
  ground: string; // hemisphere ground bounce
  fillI: number;
  skyTop: string;
  skyHorizon: string;
  haze: string; // fog colour
  hazeDensity: number;
  water: string;
  waterDeep: string;
  steel: string;
  tint: string; // multiplier on ink actor cards so faces sit in the scene light
};

export const CLOCK: Clock[] = [
  // 0 hook · anomaly · #EBB870 #364354 #87ADBD
  {
    board: ["#EBB870", "#364354", "#87ADBD"],
    key: "#ffd08a",
    keyI: 4.03,
    fill: "#8fb6d6",
    ground: "#7a5a3a",
    fillI: 1.52,
    skyTop: "#2f62c9",
    skyHorizon: "#f3c27a",
    haze: "#e8c391",
    hazeDensity: 0.00051,
    water: "#2b6fc4",
    waterDeep: "#173f86",
    steel: "#7d93b2",
    tint: "#fffdf9",
  },
  // 1 context · anomaly · #EAC084 #B25B38 #48576A
  {
    board: ["#EAC084", "#B25B38", "#48576A"],
    key: "#ffc77a",
    keyI: 4.29,
    fill: "#9bb7cf",
    ground: "#8a5233",
    fillI: 1.38,
    skyTop: "#3a66c4",
    skyHorizon: "#f5b968",
    haze: "#eab77c",
    hazeDensity: 0.00058,
    water: "#2c69bb",
    waterDeep: "#183a7c",
    steel: "#8092ae",
    tint: "#fffdf9",
  },
  // 2 friction · pressure · #D59650 #773D31 #33444C
  {
    board: ["#D59650", "#773D31", "#33444C"],
    key: "#ffad55",
    keyI: 3.9,
    fill: "#7e98b0",
    ground: "#6e3a2b",
    fillI: 1.23,
    skyTop: "#2d4f9c",
    skyHorizon: "#f09a4a",
    haze: "#d9955a",
    hazeDensity: 0.00067,
    water: "#25599f",
    waterDeep: "#132f66",
    steel: "#73839c",
    tint: "#fffdf9",
  },
  // 3 escalation1 · pressure · #AC694E #86CFD8 #503B34
  {
    board: ["#AC694E", "#86CFD8", "#503B34"],
    key: "#ffb067",
    keyI: 3.77,
    fill: "#86cfd8",
    ground: "#6d4232",
    fillI: 1.45,
    skyTop: "#2c56a6",
    skyHorizon: "#ee9f5c",
    haze: "#cf9a72",
    hazeDensity: 0.00064,
    water: "#2a63ae",
    waterDeep: "#143570",
    steel: "#77809a",
    tint: "#fffdf9",
  },
  // 4 escalation2 · pressure · #7DAEB8 #423D39 #DBA96B
  {
    board: ["#7DAEB8", "#423D39", "#DBA96B"],
    key: "#ffc27c",
    keyI: 3.51,
    fill: "#7daeb8",
    ground: "#4b423b",
    fillI: 1.59,
    skyTop: "#2e5cae",
    skyHorizon: "#e7b175",
    haze: "#bfae94",
    hazeDensity: 0.00061,
    water: "#2b68b4",
    waterDeep: "#163a78",
    steel: "#7489a0",
    tint: "#fffdf9",
  },
  // 5 explanation · #E0D6B6 #648F99 #42494D  (saturated blue depth, locally lit subject)
  {
    board: ["#E0D6B6", "#648F99", "#42494D"],
    key: "#fff0cf",
    keyI: 3.9,
    fill: "#6f9fb0",
    ground: "#42494d",
    fillI: 1.74,
    skyTop: "#1f55c8",
    skyHorizon: "#a9d3e6",
    haze: "#8fb9cc",
    hazeDensity: 0.00045,
    water: "#1d5fc2",
    waterDeep: "#0f3a8a",
    steel: "#7a90ac",
    tint: "#fffdf9",
  },
  // 6 payoff · #EBC789 #48697A #394650
  {
    board: ["#EBC789", "#48697A", "#394650"],
    key: "#ffd795",
    keyI: 4.42,
    fill: "#8fb3c9",
    ground: "#5b4c3e",
    fillI: 1.52,
    skyTop: "#2a63cf",
    skyHorizon: "#f6cf8a",
    haze: "#e9cd9a",
    hazeDensity: 0.00042,
    water: "#2770c9",
    waterDeep: "#143f8c",
    steel: "#7a93b4",
    tint: "#fffdf9",
  },
];

export const col = (hex: string) => new THREE.Color(hex);
