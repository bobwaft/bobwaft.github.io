// The top sheet of the paper stack (A-15). Click_Papers is one mesh holding every sheet, on the
// shared baked material, so the resume gets an overlay built from the top sheet's triangles.
import { Matrix3, Vector3, type Vector2 } from 'three';
import type { ScreenFrame } from '../scene/screenFrame';

/** Faces whose normal is within ~25 degrees of +Y count as a sheet's upper side. */
const MIN_UP = 0.9;

/**
 * Triangles (as a flat index list) of the highest connected up-facing surface.
 * Triangles connect through shared vertex positions, so split vertices (UV seams) don't
 * break a sheet apart.
 * @param points world-space vertex positions
 * @param index three vertex indices per triangle
 */
export function topSheetTriangles(points: readonly Vector3[], index: readonly number[]): number[] {
  const up: number[] = []; // triangle numbers
  const ab = new Vector3();
  const ac = new Vector3();
  const n = new Vector3();
  for (let t = 0; t + 2 < index.length; t += 3) {
    const [a, b, c] = [points[index[t]], points[index[t + 1]], points[index[t + 2]]];
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const len = n.length();
    if (len > 0 && n.y / len > MIN_UP) up.push(t / 3);
  }
  // Union-find over triangles sharing a vertex position.
  const parent = up.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<string, number>();
  const key = (p: Vector3) => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
  up.forEach((tri, i) => {
    for (let k = 0; k < 3; k++) {
      const id = key(points[index[tri * 3 + k]]);
      const other = owner.get(id);
      if (other === undefined) owner.set(id, i);
      else parent[find(i)] = find(other);
    }
  });
  const groups = new Map<number, { tris: number[]; top: number }>();
  up.forEach((tri, i) => {
    const root = find(i);
    const g = groups.get(root) ?? { tris: [], top: -Infinity };
    g.tris.push(tri);
    for (let k = 0; k < 3; k++) g.top = Math.max(g.top, points[index[tri * 3 + k]].y);
    groups.set(root, g);
  });
  let best: { tris: number[]; top: number } | null = null;
  for (const g of groups.values()) if (!best || g.top > best.top) best = g;
  return (best?.tris ?? []).flatMap((tri) => [
    index[tri * 3],
    index[tri * 3 + 1],
    index[tri * 3 + 2],
  ]);
}

/**
 * Frame of a lying sheet taken from its UVs (BUG-011): the page's texture runs along the UV axes,
 * so they give its true edges even where the outline (curl, bent corners) would tilt a bounding
 * rectangle. Fits position = origin + U*u + V*v over the vertices by least squares; the sheet is
 * the UV extent along U and V. The long side is up, flipped to agree with upHint.
 */
export function sheetFrameFromUvs(
  points: readonly Vector3[],
  uvs: readonly Vector2[],
  upHint: Vector3,
): ScreenFrame {
  // Normal equations: [u v 1]^T [u v 1] * coeffs = [u v 1]^T p, for x, y and z at once.
  const ata = new Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0);
  const a = ata.elements; // column-major, but symmetric
  const atp = [new Vector3(), new Vector3(), new Vector3()]; // rows u, v, 1
  points.forEach((p, i) => {
    const row = [uvs[i].x, uvs[i].y, 1];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) a[c * 3 + r] += row[r] * row[c];
      atp[r].addScaledVector(p, row[r]);
    }
  });
  const inv = ata.invert().elements;
  // coeff k = sum_r inv[k][r] * atp[r]
  const coeff = (k: number) =>
    atp.reduce((sum, v, r) => sum.addScaledVector(v, inv[r * 3 + k]), new Vector3());
  const U = coeff(0);
  const V = coeff(1);
  const origin = coeff(2);

  const lo = [Infinity, Infinity];
  const hi = [-Infinity, -Infinity];
  for (const uv of uvs) {
    lo[0] = Math.min(lo[0], uv.x);
    hi[0] = Math.max(hi[0], uv.x);
    lo[1] = Math.min(lo[1], uv.y);
    hi[1] = Math.max(hi[1], uv.y);
  }
  const sizeU = (hi[0] - lo[0]) * U.length();
  const sizeV = (hi[1] - lo[1]) * V.length();
  const center = origin
    .clone()
    .addScaledVector(U, (lo[0] + hi[0]) / 2)
    .addScaledVector(V, (lo[1] + hi[1]) / 2);
  const normal = new Vector3().crossVectors(U, V).normalize();
  if (normal.y < 0) normal.negate();
  const vLong = sizeV >= sizeU;
  const up = (vLong ? V : U).clone();
  up.addScaledVector(normal, -up.dot(normal)).normalize();
  if (up.dot(upHint) < 0) up.negate();
  const right = new Vector3().crossVectors(up, normal).normalize();
  return {
    center,
    right,
    up,
    normal,
    width: vLong ? sizeU : sizeV,
    height: vLong ? sizeV : sizeU,
  };
}
