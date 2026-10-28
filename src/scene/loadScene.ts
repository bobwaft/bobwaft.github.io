import type { Group, Object3D, PerspectiveCamera } from 'three';
import { lighting, loadDeskScene, setTimeOfDay } from './scene-lighting.js';
import { timeFromClock } from './timeOfDay';

export const GLB_URL = '/models/desk_scene_draco.glb';
export const TEXTURE_DIR = '/models/textures/';
export const DRACO_PATH = '/draco/';

export interface LoadedScene {
  scene: Group;
  camera: PerspectiveCamera;
}

/** Loads the desk scene, applies the local-clock time of day and turns the lamp on. */
export async function loadScene(): Promise<LoadedScene> {
  const { scene, camera } = await loadDeskScene(GLB_URL, TEXTURE_DIR, DRACO_PATH);
  if (!(camera as PerspectiveCamera | undefined)?.isPerspectiveCamera) {
    throw new Error('Scene has no perspective camera (expected Cam_Main)');
  }
  setTimeOfDay(timeFromClock(new Date()), scene);
  lighting.uLight.value = 1;
  return { scene, camera: camera as PerspectiveCamera };
}

/** Names of every object in the scene graph. */
export function collectNames(root: Object3D): string[] {
  const names: string[] = [];
  root.traverse((o) => names.push(o.name));
  return names;
}
