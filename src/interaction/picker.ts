// Raycast against registered interactables only (child mesh -> nearest registered ancestor).
import { Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';
import type { InteractableModule } from '../objects/types';
import { moduleCentres } from '../ui/touchDots';

export type RegisteredMap = ReadonlyMap<Object3D, InteractableModule>;

/** The nearest registered object at or above obj, with its module; null if none. */
export function resolveRegistered(
  obj: Object3D | null,
  registered: RegisteredMap,
): { object: Object3D; module: InteractableModule } | null {
  for (let o = obj; o; o = o.parent) {
    const module = registered.get(o);
    if (module) return { object: o, module };
  }
  return null;
}

/** Id of the point nearest (x, y) within radius pixels, or null. */
export function nearestWithin(
  points: readonly { id: string; x: number; y: number }[],
  x: number,
  y: number,
  radius: number,
): string | null {
  let best: string | null = null;
  let bestD = radius * radius;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD || (d === 0 && best === null)) {
      best = p.id;
      bestD = d;
    }
  }
  return best;
}

export interface Picker {
  /**
   * Module under a client-space point, or null. With slopPx, a miss falls back to the module
   * whose centre (where its touch dot sits) is that close: a finger on a thin cord misses it.
   */
  pick(clientX: number, clientY: number, slopPx?: number): InteractableModule | null;
}

export function createPicker(
  camera: Camera,
  element: HTMLElement,
  registered: RegisteredMap,
): Picker {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const roots = [...registered.keys()];
  const modules = new Map([...registered.values()].map((m) => [m.id, m] as const));
  const centres = moduleCentres(registered);
  const tmp = new Vector3();
  return {
    pick(clientX, clientY, slopPx = 0) {
      const r = element.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(roots, true)[0];
      if (hit) return resolveRegistered(hit.object, registered)?.module ?? null;
      if (slopPx <= 0) return null;
      const points = [...centres].flatMap(([id, c]) => {
        const p = tmp.copy(c).project(camera);
        if (p.z < -1 || p.z > 1) return [];
        return [
          { id, x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height },
        ];
      });
      const id = nearestWithin(points, clientX, clientY, slopPx);
      return id ? (modules.get(id) ?? null) : null;
    },
  };
}
