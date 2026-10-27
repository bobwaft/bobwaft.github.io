// Maps Blender Click_* names to object modules. The only place those names appear.
import type { Object3D } from 'three';
import { laptop } from './laptop';
import { notebook } from './notebook';
import { papers } from './papers';
import { pullcord } from './pullcord';
import { speaker } from './speaker';
import type { InteractableModule } from './types';

export const MAIN_CAMERA_NAME = 'Cam_Main';

export const REQUIRED_CLICK_NAMES = [
  'Click_Laptop',
  'Click_Laptop_Screen',
  'Click_Papers',
  'Click_Notebook',
  'Click_Speaker',
  'Click_PullCord',
] as const;

/** Click_* name -> module. Click_Calendar and Click_Window are deliberately absent (inert). */
export const CLICK_REGISTRY: Readonly<Record<string, InteractableModule>> = {
  Click_Laptop: laptop,
  Click_Laptop_Screen: laptop,
  Click_Papers: papers,
  Click_Notebook: notebook,
  Click_Speaker: speaker,
  Click_PullCord: pullcord,
};

/** Object whose geometry a focus view frames, by module id. */
export const FOCUS_SURFACE_NAMES: Readonly<Record<string, string>> = {
  laptop: 'Click_Laptop_Screen',
  papers: 'Click_Papers',
  notebook: 'Click_Notebook',
};

/** Required Click_* names that are absent from presentNames (extra names are ignored). */
export function findMissingNames(presentNames: Iterable<string>): string[] {
  const present = new Set(presentNames);
  return REQUIRED_CLICK_NAMES.filter((name) => !present.has(name));
}

/** Scene objects whose names are registered, mapped to their modules. */
export function collectRegistered(root: Object3D): Map<Object3D, InteractableModule> {
  const found = new Map<Object3D, InteractableModule>();
  root.traverse((o) => {
    const mod = CLICK_REGISTRY[o.name];
    if (mod) found.set(o, mod);
  });
  return found;
}
