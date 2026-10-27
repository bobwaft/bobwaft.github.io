// Resolves an object id to its focus pose in the loaded scene (D-3).
import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { computeFocusPose, planeNormal, worldVertices } from '../camera/focusPose';
import type { Pose } from '../camera/focusTween';
import { CLICK_REGISTRY, FOCUS_SURFACE_NAMES } from '../objects/registry';

const DEG = Math.PI / 180;

/**
 * Returns a function giving the focus pose for an id (or null if it has no focus view).
 * Uses the camera's current fov and aspect, so call it again after a resize.
 * Poses are first guesses, to be hand-tuned with ?debug (see poses.ts).
 * @param viewerPosition where the user is, used to pick the screen normal's facing side
 */
export function createFocusPoseResolver(
  scene: Object3D,
  camera: PerspectiveCamera,
  viewerPosition: () => Vector3,
): (id: string) => Pose | null {
  const points = new Map<string, Vector3[]>();
  const surfacePoints = (id: string): Vector3[] | null => {
    const cached = points.get(id);
    if (cached) return cached;
    const name = FOCUS_SURFACE_NAMES[id];
    const surface = name ? scene.getObjectByName(name) : null;
    if (!surface) return null;
    const verts = worldVertices(surface);
    if (verts.length === 0) return null;
    points.set(id, verts);
    return verts;
  };
  const specs = new Map(
    Object.values(CLICK_REGISTRY)
      .filter((m) => m.focus)
      .map((m) => [m.id, m.focus!] as const),
  );
  return (id) => {
    const spec = specs.get(id);
    const verts = surfacePoints(id);
    if (!spec || !verts) return null;
    const dir =
      spec.viewDirection === 'surface-normal'
        ? planeNormal(verts, viewerPosition()).negate()
        : new Vector3(...spec.viewDirection);
    return computeFocusPose({
      points: verts,
      viewDirection: dir,
      up: spec.up ? new Vector3(...spec.up) : undefined,
      vfov: camera.fov * DEG,
      aspect: camera.aspect,
      margin: spec.margin,
    });
  };
}
