import { MultiplyBlending, Vector2, Vector3, type MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createOverlay } from '../../src/objects/papersSheet';

describe('resume overlay', () => {
  const points = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1)];
  const uvs = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(0, 1)];

  it('is drawn after the rest of the scene so the transparent sort cannot hide it (BUG-010)', () => {
    const overlay = createOverlay(points, uvs, [0, 1, 2]);
    expect(overlay.renderOrder).toBeGreaterThan(0);
  });

  it('multiplies the page over the paper and stays hidden until page 1 is drawn', () => {
    const overlay = createOverlay(points, uvs, [0, 1, 2]);
    expect((overlay.material as MeshBasicMaterial).blending).toBe(MultiplyBlending);
    expect(overlay.visible).toBe(false);
  });
});
