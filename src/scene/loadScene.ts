import type { Group, Object3D, PerspectiveCamera } from 'three';
import { lighting, loadDeskScene, setTimeOfDay } from './scene-lighting.js';

export const GLB_URL = '/models/desk_scene_draco.glb';
export const TEXTURE_DIR = '/models/textures/';
export const DRACO_PATH = '/draco/';

// Time of day in 0..1 (see setTimeOfDay). Phase 8 decides the real behaviour (real clock, etc.).
export const DEFAULT_TIME_OF_DAY = 0.3;

export interface LoadedScene {
  scene: Group;
  camera: PerspectiveCamera;
}

/** Loads the desk scene, applies the default time of day and turns the lamp on. */
export async function loadScene(): Promise<LoadedScene> {
  const { scene, camera } = await loadDeskScene(GLB_URL, TEXTURE_DIR, DRACO_PATH);
  if (!(camera as PerspectiveCamera | undefined)?.isPerspectiveCamera) {
    throw new Error('Scene has no perspective camera (expected Cam_Main)');
  }
  setTimeOfDay(DEFAULT_TIME_OF_DAY, scene);
  lighting.uLight.value = 1;
  return { scene, camera: camera as PerspectiveCamera };
}

/** Names of every object in the scene graph. */
export function collectNames(root: Object3D): string[] {
  const names: string[] = [];
  root.traverse((o) => names.push(o.name));
  return names;
}
