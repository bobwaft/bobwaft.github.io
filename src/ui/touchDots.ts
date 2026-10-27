// Pulsing discoverability dots on touch screens (D-4 / Phase 3). Session-only "used" memory.
import { Box3, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import type { AppState } from '../interaction/stateMachine';
import type { InteractableModule } from '../objects/types';

export interface UsedSet {
  add(id: string): void;
  has(id: string): boolean;
}

export function createUsedSet(): UsedSet {
  const ids = new Set<string>();
  return { add: (id) => void ids.add(id), has: (id) => ids.has(id) };
}

/** A dot shows only in idle, and only until its object has been used. */
export function dotVisible(state: AppState, used: UsedSet, id: string): boolean {
  return state.kind === 'idle' && !used.has(id);
}

export function isTouchPointerType(pointerType: string): boolean {
  return pointerType === 'touch';
}

/** NDC (from Vector3.project) to CSS pixels; onScreen is false behind or outside the view. */
export function ndcToScreen(
  ndc: { x: number; y: number; z: number },
  width: number,
  height: number,
): { x: number; y: number; onScreen: boolean } {
  return {
    x: ((ndc.x + 1) / 2) * width,
    y: ((1 - ndc.y) / 2) * height,
    onScreen: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z >= -1 && ndc.z <= 1,
  };
}

export interface TouchDots {
  /** Per frame: positions dots and applies the visibility rule. */
  update(state: AppState): void;
  /** Permanently fades the object's dot (session only). */
  markUsed(id: string): void;
  dispose(): void;
}

/** One dot per module id, at the world-space centre of its registered objects. */
export function createTouchDots(
  registered: ReadonlyMap<Object3D, InteractableModule>,
  camera: PerspectiveCamera,
  isEnabled: () => boolean,
): TouchDots {
  const used = createUsedSet();
  const boxes = new Map<string, Box3>();
  for (const [obj, mod] of registered) {
    const box = new Box3().setFromObject(obj);
    const existing = boxes.get(mod.id);
    boxes.set(mod.id, existing ? existing.union(box) : box);
  }
  const dots = new Map<string, { el: HTMLElement; centre: Vector3 }>();
  for (const [id, box] of boxes) {
    const el = document.createElement('div');
    el.className = 'touch-dot';
    el.setAttribute('aria-hidden', 'true');
    el.style.opacity = '0';
    document.body.appendChild(el);
    dots.set(id, { el, centre: box.getCenter(new Vector3()) });
  }
  const tmp = new Vector3();
  return {
    update(state) {
      const on = isEnabled();
      for (const [id, d] of dots) {
        const visible = on && dotVisible(state, used, id);
        if (visible) {
          const s = ndcToScreen(tmp.copy(d.centre).project(camera), innerWidth, innerHeight);
          d.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
          d.el.style.opacity = s.onScreen ? '1' : '0';
        } else {
          d.el.style.opacity = '0';
        }
      }
    },
    markUsed(id) {
      used.add(id);
    },
    dispose() {
      for (const d of dots.values()) d.el.remove();
    },
  };
}
