import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCoverAnimator,
  pageFrame,
  spreadFrames,
  type CoverFace,
} from '../../src/notebook/cover';

const DEG = Math.PI / 180;
// Cover-local bounds of the exported Notebook_Cover: hinge on local X at z = 0.
const FACE: CoverFace = { minX: -0.105, maxX: 0.105, minZ: -0.15, maxZ: 0, y: 0 };
const VIEWER = new Vector3(0, 1.18, 0);
// Spine at (0.3, 0.77, -0.95), turned about Y like the export.
const BASE = new Matrix4().compose(
  new Vector3(0.3, 0.77, -0.95),
  new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -128 * DEG),
  new Vector3(1, 1, 1),
);
const local = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(BASE);

describe('pageFrame', () => {
  it('closed: the page under the cover, facing up, A5 portrait along the spine', () => {
    const f = pageFrame(BASE, FACE, 0, VIEWER);
    expect(f.center.distanceTo(local(0, 0, -0.075))).toBeLessThan(1e-6);
    expect(f.normal.y).toBeCloseTo(1);
    expect(f.width).toBeCloseTo(0.15);
    expect(f.height).toBeCloseTo(0.21);
  });

  it('up runs along the spine, away from the viewer; right = up x normal', () => {
    const f = pageFrame(BASE, FACE, 0, VIEWER);
    const spine = local(1, 0, 0)
      .sub(local(0, 0, 0))
      .normalize();
    expect(Math.abs(f.up.dot(spine))).toBeCloseTo(1);
    const away = f.center.clone().sub(VIEWER).setY(0);
    expect(f.up.dot(away)).toBeGreaterThan(0);
    expect(f.right.distanceTo(new Vector3().crossVectors(f.up, f.normal))).toBeLessThan(1e-6);
  });

  it('opened flat (180 deg): mirrored across the spine, still facing up', () => {
    const f = pageFrame(BASE, FACE, 180 * DEG, VIEWER);
    expect(f.center.distanceTo(local(0, 0, 0.075))).toBeLessThan(1e-6);
    expect(f.normal.y).toBeCloseTo(1);
  });

  it('opened 165 deg: tilted 15 deg off flat', () => {
    const f = pageFrame(BASE, FACE, 165 * DEG, VIEWER);
    expect(f.normal.y).toBeCloseTo(Math.cos(15 * DEG));
  });
});

describe('spreadFrames', () => {
  const spread = spreadFrames(BASE, FACE, 165 * DEG, VIEWER);

  it('puts the cover page and the first page on either side of the spine', () => {
    const { left, right, up } = spread;
    expect(left.center.dot(right.right)).toBeLessThan(right.center.dot(right.right));
    expect(left.up.distanceTo(up)).toBeLessThan(1e-6);
    expect(right.up.distanceTo(up)).toBeLessThan(1e-6);
  });

  it('returns both pages corners for framing the camera', () => {
    expect(spread.points).toHaveLength(8);
  });
});

describe('createCoverAnimator', () => {
  const OPEN = 165 * DEG;
  const make = (seconds = 1) => {
    const angles: number[] = [];
    const cover = createCoverAnimator({
      openAngle: OPEN,
      seconds: () => seconds,
      onChange: (a) => angles.push(a),
    });
    return { cover, angles };
  };

  it('opens over the duration and calls done once at the end', () => {
    const { cover, angles } = make();
    let done = 0;
    cover.open(() => done++);
    cover.step(0.5);
    expect(cover.angle).toBeGreaterThan(0);
    expect(cover.angle).toBeLessThan(OPEN);
    expect(done).toBe(0);
    cover.step(0.6);
    cover.step(0.1);
    expect(cover.angle).toBe(OPEN);
    expect(done).toBe(1);
    expect(angles.at(-1)).toBe(OPEN);
  });

  it('closing midway reverses from where it is and drops the open callback', () => {
    const { cover } = make();
    let opened = 0;
    let closed = 0;
    cover.open(() => opened++);
    cover.step(0.5);
    const mid = cover.angle;
    cover.close(() => closed++);
    cover.step(0.1);
    expect(cover.angle).toBeLessThan(mid);
    for (let i = 0; i < 20; i++) cover.step(0.1);
    expect(cover.angle).toBe(0);
    expect(opened).toBe(0);
    expect(closed).toBe(1);
  });

  it('cuts with 0 seconds (reduced motion) and calls done at once', () => {
    const { cover, angles } = make(0);
    let done = 0;
    cover.open(() => done++);
    expect(cover.angle).toBe(OPEN);
    expect(done).toBe(1);
    expect(angles).toEqual([OPEN]);
  });

  it('calls done at once when already there', () => {
    const { cover } = make();
    let done = 0;
    cover.close(() => done++);
    expect(done).toBe(1);
  });
});
