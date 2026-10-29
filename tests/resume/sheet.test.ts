import { Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sheetFrameFromUvs, topSheetTriangles } from '../../src/resume/sheet';

const DEG = Math.PI / 180;

/** Corners of a w x h sheet at height y, long side along -Z, turned by `turn` about +Y. */
function sheet(w: number, h: number, y: number, turn = 0, at = new Vector3()): Vector3[] {
  return [
    [-w / 2, h / 2],
    [w / 2, h / 2],
    [w / 2, -h / 2],
    [-w / 2, -h / 2],
  ].map(([x, z]) => new Vector3(x, y, z).applyAxisAngle(new Vector3(0, 1, 0), turn).add(at));
}

/** Two counter-clockwise (seen from above) triangles over a quad's corners, offset by base. */
const quadUp = (base: number) => [base, base + 1, base + 2, base, base + 2, base + 3];
const quadDown = (base: number) => [base, base + 2, base + 1, base, base + 3, base + 2];

describe('topSheetTriangles', () => {
  it('picks the highest up-facing sheet of a stack', () => {
    const points = [...sheet(0.2, 0.3, 0), ...sheet(0.2, 0.3, 0.004, 20 * DEG)];
    const tris = topSheetTriangles(points, [...quadUp(0), ...quadUp(4)]);
    expect(tris).toEqual(quadUp(4));
  });

  it('ignores faces that point down, even when they are higher', () => {
    const points = [...sheet(0.2, 0.3, 0), ...sheet(0.2, 0.3, 0.01)];
    const tris = topSheetTriangles(points, [...quadUp(0), ...quadDown(4)]);
    expect(tris).toEqual(quadUp(0));
  });

  it('keeps a sheet whole when its vertices are split (shared by position)', () => {
    const c = sheet(0.2, 0.3, 0.01);
    // Non-indexed: each triangle has its own copies of the shared corners.
    const points = [c[0], c[1], c[2], c[0].clone(), c[2].clone(), c[3], ...sheet(0.2, 0.3, 0)];
    const tris = topSheetTriangles(points, [0, 1, 2, 3, 4, 5, ...quadUp(6)]);
    expect(tris).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('returns nothing when no face points up', () => {
    expect(topSheetTriangles(sheet(0.2, 0.3, 0), quadDown(0))).toEqual([]);
  });
});

/** UVs of sheet()'s corners: an axis-aligned A4 island in the atlas, u across, v up the page. */
const ISLAND = { u0: 0.293, v0: 0.121, du: 0.07, dv: 0.099 };
const cornerUvs = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
].map(([s, t]) => new Vector2(ISLAND.u0 + s * ISLAND.du, ISLAND.v0 + t * ISLAND.dv));

describe('sheetFrameFromUvs (BUG-011)', () => {
  const awayFromViewer = new Vector3(0, 0, -1);
  const yAxis = new Vector3(0, 1, 0);

  it('takes size, centre and axes from the UV directions of a turned sheet', () => {
    const at = new Vector3(-0.4, 0.76, -0.98);
    const f = sheetFrameFromUvs(sheet(0.21, 0.297, 0, 20 * DEG, at), cornerUvs, awayFromViewer);
    expect(f.width).toBeCloseTo(0.21, 4);
    expect(f.height).toBeCloseTo(0.297, 4);
    expect(f.center.distanceTo(at)).toBeLessThan(1e-4);
    expect(f.normal.y).toBeCloseTo(1, 5);
    const longSide = new Vector3(0, 0, -1).applyAxisAngle(yAxis, 20 * DEG);
    expect(f.up.dot(longSide)).toBeCloseTo(1, 5);
    expect(f.right.distanceTo(new Vector3().crossVectors(f.up, f.normal))).toBeLessThan(1e-6);
  });

  it('follows the UVs where the outline would mislead a bounding rectangle', () => {
    // The paper's printed edges (UVs) are turned 4 degrees from its outline: a bent sheet whose
    // vertices sit where the min-area rectangle would be, while the texture runs along the UVs.
    const turn = 4 * DEG;
    const pts = sheet(0.21, 0.297, 0, 0);
    const uvs = pts.map((p) => {
      const q = p.clone().applyAxisAngle(yAxis, -turn); // page coordinates of each vertex
      return new Vector2(
        ISLAND.u0 + (q.x / 0.21 + 0.5) * ISLAND.du,
        ISLAND.v0 + (-q.z / 0.297 + 0.5) * ISLAND.dv,
      );
    });
    const f = sheetFrameFromUvs(pts, uvs, awayFromViewer);
    const pageUp = new Vector3(0, 0, -1).applyAxisAngle(yAxis, turn);
    expect(f.up.dot(pageUp)).toBeCloseTo(1, 5);
  });

  it('points up away from the viewer even when v runs towards them', () => {
    const flipped = cornerUvs.map((uv) => new Vector2(uv.x, 2 * ISLAND.v0 + ISLAND.dv - uv.y));
    const f = sheetFrameFromUvs(sheet(0.21, 0.297, 0), flipped, awayFromViewer);
    expect(f.up.z).toBeLessThan(0);
    expect(f.normal.y).toBeGreaterThan(0);
  });
});
