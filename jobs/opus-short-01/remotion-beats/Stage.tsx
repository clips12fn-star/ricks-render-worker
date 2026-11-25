import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createLens } from "./cinema";

/** Camera state as returned by camFromKeys: XYZ position/target, vertical FOV and roll in degrees. */
export type Cam = { pos: number[]; look: number[]; fov: number; roll?: number };

/** What a beat returns every frame: the camera, focus depth (camera space) and lens aperture in px. */
export type ShotState = { cam: Cam; focus: number; aperture: number; flash?: number };

export type Lens = ReturnType<typeof createLens>;

export type BeatWorld = {
  update: (frame: number) => ShotState;
  dispose?: () => void;
};

export type Tools = { scene: THREE.Scene; cardNd: Lens["cardNd"]; renderer: THREE.WebGLRenderer };

/** Builds one beat's scene into `scene`. `cardNd` lets ink-drawn actor cards write depth without world ink. */
export type BuildWorld = (tools: Tools) => BeatWorld;

export const applyCam = (camera: THREE.PerspectiveCamera, cam: Cam) => {
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  if (cam.roll) camera.rotateZ((cam.roll * Math.PI) / 180);
  if (camera.fov !== cam.fov) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
};

/**
 * One WebGL canvas per beat. The renderer and world are built on mount and every
 * Remotion frame is drawn synchronously in a layout effect through the depth/normal
 * ink + depth-of-field lens from the 06a cinema kit. `from` is the beat start frame,
 * so beats receive absolute storyboard frames (f0..f1755).
 */
export const Stage: React.FC<{ from: number; build: BuildWorld }> = ({ from, build }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<{
    renderer: THREE.WebGLRenderer;
    lens: Lens;
    camera: THREE.PerspectiveCamera;
    world: BeatWorld;
  } | null>(null);
  const frame = from + useCurrentFrame();
  const { width, height } = useVideoConfig();
  const flashRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft was removed in three r18x; PCF gives the same result
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 6000);
    const sceneHolder = new THREE.Scene();
    const lens = createLens(renderer, sceneHolder, camera, width, height);
    const world = build({ scene: sceneHolder, cardNd: lens.cardNd, renderer });
    live.current = { renderer, lens, camera, world };
    return () => {
      world.dispose?.();
      sceneHolder.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      lens.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      live.current = null;
    };
    // The world is built once per beat mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const s = live.current;
    if (!s) return;
    const state = s.world.update(frame);
    applyCam(s.camera, state.cam);
    s.lens.draw(Math.max(0.1, state.focus), state.aperture);
    if (flashRef.current) flashRef.current.style.opacity = String(Math.max(0, Math.min(1, state.flash ?? 0)));
  }, [frame]);

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
      <AbsoluteFill ref={flashRef} style={{ background: "#fff8e6", opacity: 0 }} />
    </AbsoluteFill>
  );
};
