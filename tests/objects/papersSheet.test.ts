import { MultiplyBlending, Vector2, Vector3, type MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createOverlay, OVERLAY_LIFT } from '../../src/objects/papersSheet';

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

  it('sits a little above the sheet so the coplanar sheet cannot win the depth test (BUG-010)', () => {
    const overlay = createOverlay(points, uvs, [0, 1, 2]);
    const pos = overlay.geometry.getAttribute('position');
    expect(OVERLAY_LIFT).toBeGreaterThan(0);
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeCloseTo(points[i].y + OVERLAY_LIFT, 6);
      expect(pos.getX(i)).toBe(points[i].x);
      expect(pos.getZ(i)).toBe(points[i].z);
    }
  });
});
