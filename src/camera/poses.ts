import { Matrix4, Quaternion, Vector3 } from 'three';
import type { FocusSpec } from '../objects/types';

export type IdlePoseKind = 'portrait' | 'landscape';
export type Vec3 = [number, number, number];

/** Aspect ratios below this use the portrait idle pose. */
export const PORTRAIT_ASPECT = 1;

/** Which idle pose suits the viewport aspect (width / height). */
export function idlePoseKind(aspect: number): IdlePoseKind {
  return aspect < PORTRAIT_ASPECT ? 'portrait' : 'landscape';
}

// First guess: pulled back and up from Cam_Main (eye 0,1.18,0, pitch -9 deg) so the whole
// desk fits a tall viewport. To be tuned with ?debug.
export const PORTRAIT_IDLE_POSE: { position: Vec3; target: Vec3 } = {
  position: [0, 1.32, 0.45],
  target: [0, 1.0, -0.54],
};

/** Camera pose (looks down -Z, up +Y) at position facing target. */
export function poseFromLookAt(
  position: Vec3 | Vector3,
  target: Vec3 | Vector3,
): { position: Vector3; quaternion: Quaternion } {
  const eye = Array.isArray(position) ? new Vector3(...position) : position.clone();
  const at = Array.isArray(target) ? new Vector3(...target) : target.clone();
  const m = new Matrix4().lookAt(eye, at, new Vector3(0, 1, 0));
  return { position: eye, quaternion: new Quaternion().setFromRotationMatrix(m) };
}

// Focus views (D-3). First guesses: to be hand-tuned with ?debug.

/** Set to a world-space direction (camera looks along it) to override the laptop screen normal. */
export const LAPTOP_VIEW_OVERRIDE: Vec3 | null = null;

export const LAPTOP_FOCUS: FocusSpec = {
  viewDirection: LAPTOP_VIEW_OVERRIDE ?? 'surface-normal',
  margin: 1.05,
};
// Top-down: lookAt with up = +Y degenerates, so the up hint points away from the user (-Z).
export const PAPERS_FOCUS: FocusSpec = { viewDirection: [0, -1, 0], up: [0, 0, -1], margin: 1.1 };
export const NOTEBOOK_FOCUS: FocusSpec = { viewDirection: [0, -1, 0], up: [0, 0, -1], margin: 1.1 };
