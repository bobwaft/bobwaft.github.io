import { BoxGeometry, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  cameraBasis,
  computeFocusPose,
  fitDistance,
  planeNormal,
  projectedSize,
  worldVertices,
} from '../../src/camera/focusPose';

const DEG = Math.PI / 180;
const rect = (w: number, h: number, z = 0) => [
  new Vector3(-w / 2, -h / 2, z),
  new Vector3(w / 2, -h / 2, z),
  new Vector3(w / 2, h / 2, z),
  new Vector3(-w / 2, h / 2, z),
];

describe('fitDistance', () => {
  const vfov = 40 * DEG;
  const t = Math.tan(vfov / 2);
  it('fits height when the viewport is wide', () => {
    expect(fitDistance(1, 2, vfov, 2, 1)).toBeCloseTo(1 / t);
  });
  it('fits width when the viewport is narrow (portrait)', () => {
    expect(fitDistance(2, 1, vfov, 0.5, 1)).toBeCloseTo(1 / (t * 0.5));
  });
  it('scales with margin', () => {
    expect(fitDistance(1, 1, vfov, 1, 1.5)).toBeCloseTo(1.5 * fitDistance(1, 1, vfov, 1, 1));
  });
});

describe('cameraBasis', () => {
  it('uses +Y up by default', () => {
    const b = cameraBasis(new Vector3(0, 0, -1));
    expect(b.right.x).toBeCloseTo(1);
    expect(b.up.y).toBeCloseTo(1);
  });
  it('handles a top-down view with an up hint', () => {
    const b = cameraBasis(new Vector3(0, -1, 0), new Vector3(0, 0, -1));
    expect(b.right.x).toBeCloseTo(1);
    expect(b.up.z).toBeCloseTo(-1);
  });
  it('stays finite for a top-down view without a hint', () => {
    const b = cameraBasis(new Vector3(0, -1, 0));
    expect(b.right.toArray().every(Number.isFinite)).toBe(true);
    expect(b.right.length()).toBeCloseTo(1);
  });
});

describe('projectedSize', () => {
  it('measures extent along the camera axes', () => {
    const b = cameraBasis(new Vector3(0, 0, -1));
    const s = projectedSize(rect(4, 2), b.right, b.up);
    expect(s.width).toBeCloseTo(4);
    expect(s.height).toBeCloseTo(2);
  });
});

describe('computeFocusPose', () => {
  const base = { vfov: 40 * DEG, margin: 1 };
  it('looks at the centre from the fit distance (landscape)', () => {
    const pts = rect(4, 2).map((p) => p.add(new Vector3(10, 0, 0)));
    const pose = computeFocusPose({
      points: pts,
      viewDirection: new Vector3(0, 0, -1),
      aspect: 2,
      ...base,
    });
    expect(pose.position.x).toBeCloseTo(10);
    expect(pose.position.z).toBeCloseTo(fitDistance(4, 2, base.vfov, 2, 1));
    const fwd = new Vector3(0, 0, -1).applyQuaternion(pose.quaternion);
    expect(fwd.z).toBeCloseTo(-1);
  });
  it('is further away in portrait', () => {
    const args = { points: rect(4, 2), viewDirection: new Vector3(0, 0, -1), ...base };
    const land = computeFocusPose({ ...args, aspect: 2 });
    const port = computeFocusPose({ ...args, aspect: 0.5 });
    expect(port.position.z).toBeGreaterThan(land.position.z);
  });
  it('supports a top-down view with an up hint', () => {
    // flat sheet on the XZ plane: 2 wide (x), 3 deep (z), at y = 1
    const sheet = [
      new Vector3(-1, 1, -1.5),
      new Vector3(1, 1, -1.5),
      new Vector3(1, 1, 1.5),
      new Vector3(-1, 1, 1.5),
    ];
    const pose = computeFocusPose({
      points: sheet,
      viewDirection: new Vector3(0, -1, 0),
      up: new Vector3(0, 0, -1),
      aspect: 1,
      ...base,
    });
    expect(pose.position.x).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(0);
    expect(pose.position.y).toBeCloseTo(1 + fitDistance(2, 3, base.vfov, 1, 1));
    const fwd = new Vector3(0, 0, -1).applyQuaternion(pose.quaternion);
    expect(fwd.y).toBeCloseTo(-1);
    const camUp = new Vector3(0, 1, 0).applyQuaternion(pose.quaternion);
    expect(camUp.z).toBeCloseTo(-1);
  });
});

describe('planeNormal', () => {
  it('finds the normal of a tilted flat patch, facing the viewer', () => {
    const tilt = 30 * DEG;
    const pts = rect(4, 2).map((p) => p.applyAxisAngle(new Vector3(1, 0, 0), -tilt));
    const expected = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(1, 0, 0), -tilt);
    expect(planeNormal(pts, new Vector3(0, 0, 10)).dot(expected)).toBeCloseTo(1, 4);
    expect(planeNormal(pts, new Vector3(0, 0, -10)).dot(expected)).toBeCloseTo(-1, 4);
  });
  it('works for a thin box', () => {
    const mesh = new Mesh(new BoxGeometry(4, 2, 0.05));
    mesh.rotation.y = 0.5;
    mesh.updateMatrixWorld(true);
    const n = planeNormal(worldVertices(mesh), new Vector3(10, 0, 10));
    const expected = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), 0.5);
    expect(n.dot(expected)).toBeCloseTo(1, 3);
  });
});

describe('worldVertices', () => {
  it('applies the world transform of nested meshes', () => {
    const root = new Object3D();
    root.position.set(5, 0, 0);
    root.add(new Mesh(new BoxGeometry(2, 2, 2)));
    const pts = worldVertices(root);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(4);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(6);
  });
});
