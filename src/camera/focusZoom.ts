// Viewport zoom for a focus view: the camera dollies toward the surface and pans across it.
// Pan is the view centre in the unzoomed view's NDC, so the zoomed view never leaves what the
// focus view framed.
import { Vector3 } from 'three';
import { damp } from './lookControls';
import type { Pose } from './focusTween';

export interface FocusZoom {
  zoom: number;
  /** View centre in the unzoomed view's NDC, each within +-(1 - 1/zoom). */
  x: number;
  y: number;
}

export const NO_ZOOM: FocusZoom = { zoom: 1, x: 0, y: 0 };

/** Keeps the zoomed view inside the unzoomed one. */
export function clampPan(s: FocusZoom): FocusZoom {
  const limit = 1 - 1 / s.zoom;
  if (limit <= 0) return { zoom: s.zoom, x: 0, y: 0 };
  const clamp = (v: number) => Math.min(limit, Math.max(-limit, v));
  return { zoom: s.zoom, x: clamp(s.x), y: clamp(s.y) };
}

/** Changes zoom keeping the point at screen NDC (nx, ny) under the same spot on screen. */
export function zoomAt(s: FocusZoom, zoom: number, nx = 0, ny = 0): FocusZoom {
  // The point under (nx, ny) is at s + n / s.zoom in unzoomed NDC; it stays at n after zooming.
  return clampPan({
    zoom,
    x: s.x + nx / s.zoom - nx / zoom,
    y: s.y + ny / s.zoom - ny / zoom,
  });
}

/** Moves the view centre by (dx, dy) in screen NDC. */
export function panBy(s: FocusZoom, dx: number, dy: number): FocusZoom {
  return clampPan({ zoom: s.zoom, x: s.x + dx / s.zoom, y: s.y + dy / s.zoom });
}

/** Frame-rate independent approach of current toward target; snaps once indistinguishable. */
export function dampZoom(
  current: FocusZoom,
  target: FocusZoom,
  lambda: number,
  dt: number,
): FocusZoom {
  const next = {
    zoom: damp(current.zoom, target.zoom, lambda, dt),
    x: damp(current.x, target.x, lambda, dt),
    y: damp(current.y, target.y, lambda, dt),
  };
  const close =
    Math.abs(next.zoom - target.zoom) < 1e-4 &&
    Math.abs(next.x - target.x) < 1e-4 &&
    Math.abs(next.y - target.y) < 1e-4;
  return close ? { ...target } : next;
}

const right = new Vector3();
const up = new Vector3();
const forward = new Vector3();
const toSurface = new Vector3();

/**
 * Writes base moved for s into out: panned parallel to the image plane and dollied toward the
 * surface through point `surface`, so it appears s.zoom times larger.
 */
export function zoomedPose(
  base: Pose,
  s: FocusZoom,
  surface: Vector3,
  vfov: number,
  aspect: number,
  out: Pose,
): Pose {
  out.quaternion.copy(base.quaternion);
  out.position.copy(base.position);
  if (s.zoom === 1 && s.x === 0 && s.y === 0) return out;
  right.set(1, 0, 0).applyQuaternion(base.quaternion);
  up.set(0, 1, 0).applyQuaternion(base.quaternion);
  forward.set(0, 0, -1).applyQuaternion(base.quaternion);
  const distance = forward.dot(toSurface.subVectors(surface, base.position));
  const halfH = distance * Math.tan(vfov / 2);
  out.position
    .addScaledVector(right, s.x * halfH * aspect)
    .addScaledVector(up, s.y * halfH)
    .addScaledVector(forward, distance * (1 - 1 / s.zoom));
  return out;
}
