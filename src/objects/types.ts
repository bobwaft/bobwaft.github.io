import type { Vec3 } from '../camera/poses';

/** How the camera frames an object's content surface in its focus view. */
export interface FocusSpec {
  /** Direction the camera looks along, or the surface's own normal (facing the user). */
  viewDirection: Vec3 | 'surface-normal';
  /** Up hint for the camera; required for top-down views where up = +Y is degenerate. */
  up?: Vec3;
  /** Distance multiplier over the exact fit (>1 leaves a border). */
  margin: number;
}

/** One interactable thing in the scene. Objects without `focus` are instant (speaker, cord). */
export interface InteractableModule {
  id: string;
  label: string;
  focus?: FocusSpec;
  onClick?(): void;
  onEnter?(): void;
  onExit?(): void;
  update?(dt: number): void;
}
