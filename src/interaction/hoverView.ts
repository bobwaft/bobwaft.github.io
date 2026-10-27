// DOM/three glue for hover feedback: pointer cursor, floating label, brightened material.
import type { Mesh, Material, Object3D, ShaderMaterial } from 'three';
import { createHoverMaterial } from '../scene/hoverMaterial';
import type { InteractableModule } from '../objects/types';

export interface HoverView {
  /** Highlights a module (or clears with null); x,y position the label. */
  show(module: InteractableModule | null, x?: number, y?: number): void;
  dispose(): void;
}

export function createHoverView(
  canvas: HTMLElement,
  registered: ReadonlyMap<Object3D, InteractableModule>,
): HoverView {
  const label = document.createElement('div');
  label.id = 'hover-label';
  label.hidden = true;
  document.body.appendChild(label);
  let variant: ShaderMaterial | null = null;
  let swapped: { mesh: Mesh; material: Material | Material[] }[] = [];
  let current: string | null = null;

  const restore = () => {
    for (const s of swapped) s.mesh.material = s.material;
    swapped = [];
  };
  const brighten = (id: string) => {
    for (const [obj, mod] of registered) {
      if (mod.id !== id) continue;
      obj.traverse((o) => {
        const mesh = o as Mesh;
        const mat = mesh.isMesh ? mesh.material : null;
        if (!mat || Array.isArray(mat) || !(mat as ShaderMaterial).isShaderMaterial) return;
        if (swapped.some((s) => s.mesh === mesh)) return;
        variant ??= createHoverMaterial(mat as ShaderMaterial);
        swapped.push({ mesh, material: mat });
        mesh.material = variant;
      });
    }
  };
  return {
    show(module, x = 0, y = 0) {
      if (module) {
        label.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
        if (module.id !== current) {
          restore();
          brighten(module.id);
          label.textContent = module.label;
          current = module.id;
        }
        label.hidden = false;
        canvas.style.cursor = 'pointer';
      } else if (current !== null) {
        restore();
        current = null;
        label.hidden = true;
        canvas.style.cursor = '';
      }
    },
    dispose() {
      restore();
      label.remove();
      canvas.style.cursor = '';
    },
  };
}
