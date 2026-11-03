import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  clampPan,
  dampZoom,
  NO_ZOOM,
  panBy,
  zoomAt,
  zoomedPose,
  type FocusZoom,
} from '../../src/camera/focusZoom';

describe('clampPan', () => {
  it('allows no pan at zoom 1', () => {
    expect(clampPan({ zoom: 1, x: 0.5, y: -0.5 })).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it('keeps the zoomed view inside the unzoomed one', () => {
    expect(clampPan({ zoom: 2, x: 0.9, y: -0.9 })).toEqual({ zoom: 2, x: 0.5, y: -0.5 });
  });
});

describe('zoomAt', () => {
  it('zooms on the centre without panning', () => {
    expect(zoomAt(NO_ZOOM, 2)).toEqual({ zoom: 2, x: 0, y: 0 });
  });

  it('keeps the point under the anchor where it is', () => {
    const s = zoomAt(NO_ZOOM, 2, 0.5, -0.5);
    // The anchor's point, at unzoomed NDC (0.5, -0.5), is still at screen (0.5, -0.5).
    expect(s.x + 0.5 / s.zoom).toBeCloseTo(0.5);
    expect(s.y - 0.5 / s.zoom).toBeCloseTo(-0.5);
  });

  it('recentres when zooming back out to 1', () => {
    expect(zoomAt({ zoom: 2, x: 0.4, y: 0.2 }, 1, 0.3, 0.3)).toEqual(NO_ZOOM);
  });
});

describe('panBy', () => {
  it('moves less in the unzoomed view the further in you are', () => {
    expect(panBy({ zoom: 2, x: 0, y: 0 }, 0.2, -0.2)).toEqual({ zoom: 2, x: 0.1, y: -0.1 });
  });

  it('stops at the edge', () => {
    expect(panBy({ zoom: 2, x: 0, y: 0 }, 5, 0).x).toBe(0.5);
  });
});

describe('dampZoom', () => {
  it('moves toward the target', () => {
    const next = dampZoom(NO_ZOOM, { zoom: 2, x: 0, y: 0 }, 10, 0.05);
    expect(next.zoom).toBeGreaterThan(1);
    expect(next.zoom).toBeLessThan(2);
  });

  it('snaps to the target once close', () => {
    const target: FocusZoom = { zoom: 2, x: 0.1, y: 0 };
    expect(dampZoom(target, target, 10, 0.016)).toEqual(target);
    expect(dampZoom(NO_ZOOM, target, 10, 10)).toEqual(target);
  });
});

describe('zoomedPose', () => {
  const base = { position: new Vector3(0, 1, 0), quaternion: new Quaternion() }; // looks down -Z
  const out = () => ({ position: new Vector3(), quaternion: new Quaternion() });
  const surface = new Vector3(0.3, 0, -2); // on the plane 2 m ahead

  it('leaves the pose alone without zoom', () => {
    expect(zoomedPose(base, NO_ZOOM, surface, 1, 1.5, out()).position).toEqual(base.position);
  });

  it('dollies so a surface ahead appears zoom times larger', () => {
    const p = zoomedPose(base, { zoom: 2, x: 0, y: 0 }, surface, 1, 1.5, out());
    expect(p.position.z).toBeCloseTo(-1); // half the 2 m distance left
  });

  it('pans so the unzoomed NDC point comes to the screen centre', () => {
    const vfov = 1;
    const aspect = 1.5;
    const camera = new PerspectiveCamera((vfov * 180) / Math.PI, aspect);
    camera.position.copy(base.position);
    camera.updateMatrixWorld();
    const target = new Vector3(0.4, -0.3, 0.5).unproject(camera);
    // The point at unzoomed NDC (0.4, -0.3) on the plane 2 m ahead.
    const onPlane = base.position
      .clone()
      .add(target.sub(base.position).multiplyScalar(2 / -target.z));
    const p = zoomedPose(base, { zoom: 2, x: 0.4, y: -0.3 }, surface, vfov, aspect, out());
    expect(p.position.x).toBeCloseTo(onPlane.x);
    expect(p.position.y).toBeCloseTo(onPlane.y);
  });
});
