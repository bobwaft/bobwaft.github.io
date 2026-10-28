// The top sheet of the paper stack (A-15). Click_Papers is one mesh holding every sheet, on the
// shared baked material, so the resume gets an overlay built from the top sheet's triangles.
import { Box3, Vector3 } from 'three';
import { planeNormal } from '../camera/focusPose';
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
 * Frame of a lying sheet: its own edges (minimum-area rectangle), the long side as up, flipped
 * to agree with upHint (away from the viewer), so the page reads upright from the desk.
 */
export function sheetFrame(points: readonly Vector3[], upHint: Vector3): ScreenFrame {
  const c = new Box3().setFromPoints([...points]).getCenter(new Vector3());
  const normal = planeNormal(points, c.clone().add(new Vector3(0, 1, 0)));
  // Any in-plane axis to measure angles from.
  const u0 = new Vector3(1, 0, 0).addScaledVector(normal, -normal.x).normalize();
  const v0 = new Vector3().crossVectors(normal, u0);
  const flat = points.map((p) => {
    const d = p.clone().sub(c);
    return [d.dot(u0), d.dot(v0)] as const;
  });
  let best = { area: Infinity, angle: 0, lo: [0, 0], hi: [0, 0] };
  for (let step = 0; step < 360; step++) {
    const angle = (step / 360) * (Math.PI / 2); // a rectangle repeats every 90 degrees
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const lo = [Infinity, Infinity];
    const hi = [-Infinity, -Infinity];
    for (const [x, y] of flat) {
      const a = x * cos + y * sin;
      const b = -x * sin + y * cos;
      lo[0] = Math.min(lo[0], a);
      hi[0] = Math.max(hi[0], a);
      lo[1] = Math.min(lo[1], b);
      hi[1] = Math.max(hi[1], b);
    }
    const area = (hi[0] - lo[0]) * (hi[1] - lo[1]);
    if (area < best.area) best = { area, angle, lo, hi };
  }
  const axisA = u0
    .clone()
    .multiplyScalar(Math.cos(best.angle))
    .addScaledVector(v0, Math.sin(best.angle));
  const axisB = new Vector3().crossVectors(normal, axisA);
  const sizeA = best.hi[0] - best.lo[0];
  const sizeB = best.hi[1] - best.lo[1];
  const center = c
    .clone()
    .addScaledVector(axisA, (best.lo[0] + best.hi[0]) / 2)
    .addScaledVector(axisB, (best.lo[1] + best.hi[1]) / 2);
  const aLong = sizeA >= sizeB;
  const up = (aLong ? axisA : axisB).clone();
  if (up.dot(upHint) < 0) up.negate();
  const right = new Vector3().crossVectors(up, normal).normalize();
  return {
    center,
    right,
    up,
    normal,
    width: aLong ? sizeB : sizeA,
    height: aLong ? sizeA : sizeB,
  };
}
