import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  averageColor,
  marginPoints,
  ndcToBufferPixel,
  rgbToCss,
  sampleDisplayedColor,
  type PixelReader,
} from '../../src/scene/paperSample';

describe('ndcToBufferPixel', () => {
  it('maps the screen centre to the buffer centre', () => {
    expect(ndcToBufferPixel(0, 0, 800, 600, 1, 800, 600)).toEqual({ x: 400, y: 300 });
  });
  it('flips y: the top of the screen is the last buffer row', () => {
    expect(ndcToBufferPixel(-1, 1, 800, 600, 1, 800, 600)).toEqual({ x: 0, y: 599 });
    expect(ndcToBufferPixel(1, -1, 800, 600, 1, 800, 600)).toEqual({ x: 799, y: 0 });
  });
  it('scales CSS pixels by the device pixel ratio', () => {
    // 25% across, 25% down from the top, at 2x
    expect(ndcToBufferPixel(-0.5, 0.5, 800, 600, 2, 1600, 1200)).toEqual({ x: 400, y: 900 });
  });
  it('returns null off-screen', () => {
    expect(ndcToBufferPixel(1.2, 0, 800, 600, 1, 800, 600)).toBeNull();
    expect(ndcToBufferPixel(0, -1.01, 800, 600, 1, 800, 600)).toBeNull();
  });
});

describe('averageColor', () => {
  it('averages RGB and ignores alpha', () => {
    expect(
      averageColor([
        [100, 200, 50, 255],
        [200, 100, 51, 0],
      ]),
    ).toEqual([150, 150, 51]);
  });
  it('is null without samples', () => {
    expect(averageColor([])).toBeNull();
  });
  it('formats as CSS', () => {
    expect(rgbToCss([225, 195, 165])).toBe('rgb(225, 195, 165)');
  });
});

describe('marginPoints', () => {
  it('lies inside the sheet, near its edges', () => {
    const frame = {
      center: new Vector3(1, 2, 3),
      right: new Vector3(1, 0, 0),
      up: new Vector3(0, 0, -1),
      width: 2,
      height: 4,
    };
    const pts = marginPoints(frame);
    expect(pts).toHaveLength(6);
    for (const p of pts) {
      expect(Math.abs(p.x - 1)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.z - 3)).toBeLessThanOrEqual(2);
      expect(p.y).toBe(2);
    }
    expect(pts[0].x).toBeCloseTo(1 - 0.92);
    expect(pts[0].z).toBeCloseTo(3 - 0.92 * 2); // up is -z
  });
});

describe('sampleDisplayedColor', () => {
  const camera = new PerspectiveCamera(50, 800 / 600, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.updateMatrixWorld();
  const fakeGl = (colorAt: (x: number, y: number) => number[]) => {
    const reads: Array<[number, number]> = [];
    const gl: PixelReader = {
      drawingBufferWidth: 1600,
      drawingBufferHeight: 1200,
      RGBA: 1,
      UNSIGNED_BYTE: 2,
      readPixels(x, y, _w, _h, _f, _t, out) {
        reads.push([x, y]);
        out.set(colorAt(x, y));
      },
    };
    return { gl, reads };
  };

  it('reads the pixels under the projected points (dpr 2) and averages them', () => {
    const { gl, reads } = fakeGl((x) => (x < 800 ? [100, 100, 100, 255] : [200, 140, 80, 255]));
    const css = sampleDisplayedColor(
      gl,
      camera,
      [new Vector3(-0.5, 0, 0), new Vector3(0.5, 0, 0)],
      800,
      600,
    );
    expect(css).toBe('rgb(150, 120, 90)');
    expect(reads[0][0]).toBeLessThan(800);
    expect(reads[1][0]).toBeGreaterThanOrEqual(800);
    expect(reads[0][1]).toBe(600); // vertical centre of a 1200-row buffer
  });
  it('skips points behind the camera or off-screen; null when none remain', () => {
    const { gl, reads } = fakeGl(() => [1, 2, 3, 255]);
    const hidden = [new Vector3(0, 0, 10), new Vector3(50, 0, 0)];
    expect(sampleDisplayedColor(gl, camera, hidden, 800, 600)).toBeNull();
    expect(reads).toHaveLength(0);
    expect(sampleDisplayedColor(gl, camera, [new Vector3(0, 0, 0)], 800, 600)).toBe('rgb(1, 2, 3)');
  });
});
