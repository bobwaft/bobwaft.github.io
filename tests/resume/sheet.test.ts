import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { sheetFrame, topSheetTriangles } from '../../src/resume/sheet';

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

describe('sheetFrame', () => {
  const awayFromViewer = new Vector3(0, 0, -1);

  it('finds the size, centre and axes of a turned sheet', () => {
    const at = new Vector3(-0.4, 0.76, -0.98);
    const f = sheetFrame(sheet(0.21, 0.297, 0, 20 * DEG, at), awayFromViewer);
    expect(f.width).toBeCloseTo(0.21, 3);
    expect(f.height).toBeCloseTo(0.297, 3);
    expect(f.center.distanceTo(at)).toBeLessThan(1e-3);
    expect(f.normal.y).toBeCloseTo(1, 5);
    const longSide = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), 20 * DEG);
    expect(f.up.dot(longSide)).toBeCloseTo(1, 3);
  });

  it('points up away from the viewer whichever way the long side was found', () => {
    const f = sheetFrame(sheet(0.21, 0.297, 0, 170 * DEG), awayFromViewer);
    expect(f.up.z).toBeLessThan(0);
  });

  it('makes right = up x normal, as for a CSS3D element', () => {
    const f = sheetFrame(sheet(0.21, 0.297, 0, 35 * DEG), awayFromViewer);
    expect(f.right.distanceTo(new Vector3().crossVectors(f.up, f.normal))).toBeLessThan(1e-6);
  });

  it('uses the long side as up for a portrait page even with a skewed hint', () => {
    const f = sheetFrame(sheet(0.21, 0.297, 0, 50 * DEG), awayFromViewer);
    expect(f.height).toBeGreaterThan(f.width);
  });
});
