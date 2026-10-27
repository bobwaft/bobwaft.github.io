// Raycast against registered interactables only (child mesh -> nearest registered ancestor).
import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import type { InteractableModule } from '../objects/types';

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

export interface Picker {
  /** Module under a client-space point, or null. */
  pick(clientX: number, clientY: number): InteractableModule | null;
}

export function createPicker(
  camera: Camera,
  element: HTMLElement,
  registered: RegisteredMap,
): Picker {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const roots = [...registered.keys()];
  return {
    pick(clientX, clientY) {
      const r = element.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(roots, true)[0];
      return hit ? (resolveRegistered(hit.object, registered)?.module ?? null) : null;
    },
  };
}
