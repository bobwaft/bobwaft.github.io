import { Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cssPlacement, screenFrame, uvTransform } from '../../src/scene/screenFrame';

const close = (a: Vector3, b: Vector3) => expect(a.distanceTo(b)).toBeLessThan(1e-6);

// A 0.28 x 0.18 screen tilted back by `tilt` radians about X, centred at c, facing +Z.
function tiltedScreen(tilt: number, c = new Vector3(0, 1, -1)) {
  const w = 0.28;
  const h = 0.18;
  const up = new Vector3(0, Math.cos(tilt), -Math.sin(tilt));
  const right = new Vector3(1, 0, 0);
  const corner = (sx: number, sy: number) =>
    c
      .clone()
      .addScaledVector(right, (sx * w) / 2)
      .addScaledVector(up, (sy * h) / 2);
  // Order: bottom-left, bottom-right, top-right, top-left.
  return { points: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], up, c, w, h };
}

describe('screenFrame', () => {
  it('finds centre, axes and size of a tilted screen', () => {
    const s = tiltedScreen(0.4);
    const f = screenFrame(s.points, new Vector3(0, 1.2, 1));
    close(f.center, s.c);
    close(f.right, new Vector3(1, 0, 0));
    close(f.up, s.up);
    expect(f.normal.dot(new Vector3(0, 0, 1))).toBeGreaterThan(0.9);
    expect(f.width).toBeCloseTo(s.w, 6);
    expect(f.height).toBeCloseTo(s.h, 6);
  });

  it('keeps right = up x normal when viewed from behind', () => {
    const s = tiltedScreen(0.2);
    const f = screenFrame(s.points, new Vector3(0, 1, -5));
    close(f.right, new Vector3(-1, 0, 0));
    close(f.right, f.up.clone().cross(f.normal));
  });
});

describe('cssPlacement', () => {
  it('scales the element to the screen and orients it along the frame', () => {
    const s = tiltedScreen(0.3);
    const f = screenFrame(s.points, new Vector3(0, 1, 1));
    const p = cssPlacement(f, 1000);
    expect(p.pxHeight).toBeCloseTo((1000 * s.h) / s.w, 6);
    expect(p.scale).toBeCloseTo(s.w / 1000, 9);
    close(new Vector3(1, 0, 0).applyQuaternion(p.quaternion), f.right);
    close(new Vector3(0, 1, 0).applyQuaternion(p.quaternion), f.up);
    close(new Vector3(0, 0, 1).applyQuaternion(p.quaternion), f.normal);
    // Nudged a hair toward the viewer so it never sits behind the screen surface.
    expect(p.position.clone().sub(f.center).dot(f.normal)).toBeGreaterThan(0);
  });
});

describe('uvTransform', () => {
  const s = tiltedScreen(0.3);
  const f = screenFrame(s.points, new Vector3(0, 1, 1));
  const apply = (uv: Vector2) => uv.clone().applyMatrix3(uvTransform(s.points, uvs, f));
  let uvs: Vector2[];

  it('is identity-like when UVs already run right/up', () => {
    uvs = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)];
    expect(apply(new Vector2(0, 1)).distanceTo(new Vector2(0, 1))).toBeLessThan(1e-6);
    expect(apply(new Vector2(1, 0)).distanceTo(new Vector2(1, 0))).toBeLessThan(1e-6);
  });

  it('undoes flipped and rotated UV layouts', () => {
    // UVs rotated 90 degrees and flipped: u runs up the screen, v runs left.
    uvs = [new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1), new Vector2(0, 0)];
    // Top-left corner (index 3) must sample the top-left of the image (0, 1).
    expect(apply(uvs[3]).distanceTo(new Vector2(0, 1))).toBeLessThan(1e-6);
    expect(apply(uvs[1]).distanceTo(new Vector2(1, 0))).toBeLessThan(1e-6);
  });
});
