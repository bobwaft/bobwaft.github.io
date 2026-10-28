// Samples the displayed colour of the lit paper so the DOM page can match it (BUG-009). A computed
// tint can't reproduce bake + tone mapping + bloom, so the focus view reads a few pixels of the
// finished frame at blank margin spots of the sheet and uses their average as the page colour.
import { Vector3, type Camera } from 'three';
import type { ScreenFrame } from './screenFrame';

/** How far out from the sheet centre the margin samples sit, as a fraction of the half-extent. */
export const MARGIN_FRACTION = 0.92;

/** World points on the sheet's blank margins: the four corners plus the left and right edges. */
export function marginPoints(
  frame: Pick<ScreenFrame, 'center' | 'right' | 'up' | 'width' | 'height'>,
  fraction = MARGIN_FRACTION,
): Vector3[] {
  const spots: Array<[number, number]> = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
  ];
  return spots.map(([x, y]) =>
    frame.center
      .clone()
      .addScaledVector(frame.right, (x * fraction * frame.width) / 2)
      .addScaledVector(frame.up, (y * fraction * frame.height) / 2),
  );
}

export interface BufferPixel {
  x: number;
  y: number;
}

/**
 * Projected NDC (y up) to a drawing-buffer pixel for gl.readPixels, whose origin is bottom-left.
 * Goes through CSS pixels (y down) and the device pixel ratio; null if the point is off-screen.
 */
export function ndcToBufferPixel(
  ndcX: number,
  ndcY: number,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  bufferWidth: number,
  bufferHeight: number,
): BufferPixel | null {
  if (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1) return null;
  const cssX = ((ndcX + 1) / 2) * cssWidth;
  const cssY = ((1 - ndcY) / 2) * cssHeight;
  const x = Math.floor(cssX * dpr);
  const y = Math.floor((cssHeight - cssY) * dpr); // flip: readPixels counts rows from the bottom
  const clamp = (v: number, size: number) => Math.min(size - 1, Math.max(0, v));
  return { x: clamp(x, bufferWidth), y: clamp(y, bufferHeight) };
}

/** Mean colour of RGB(A) samples (0..255 per channel), rounded; null for no samples. */
export function averageColor(
  samples: ReadonlyArray<ArrayLike<number>>,
): [number, number, number] | null {
  if (samples.length === 0) return null;
  const sum = [0, 0, 0];
  for (const s of samples) for (let i = 0; i < 3; i++) sum[i] += s[i];
  return sum.map((v) => Math.round(v / samples.length)) as [number, number, number];
}

export const rgbToCss = ([r, g, b]: readonly number[]) => `rgb(${r}, ${g}, ${b})`;

/** The part of WebGL2RenderingContext the sampler needs. */
export interface PixelReader {
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;
  readonly RGBA: number;
  readonly UNSIGNED_BYTE: number;
  readPixels(
    x: number,
    y: number,
    w: number,
    h: number,
    format: number,
    type: number,
    out: Uint8Array,
  ): void;
}

/**
 * Average displayed colour at the world points, read from the bound (default) framebuffer. Call
 * right after the frame is rendered, in the same task, so the buffer still holds it. Null if no
 * point is on screen.
 */
export function sampleDisplayedColor(
  gl: PixelReader,
  camera: Camera,
  points: readonly Vector3[],
  cssWidth: number,
  cssHeight: number,
): string | null {
  const dpr = gl.drawingBufferWidth / Math.max(1, cssWidth);
  const v = new Vector3();
  const out = new Uint8Array(4);
  const samples: Uint8Array[] = [];
  for (const p of points) {
    v.copy(p).project(camera);
    if (v.z > 1) continue; // behind the camera
    const px = ndcToBufferPixel(
      v.x,
      v.y,
      cssWidth,
      cssHeight,
      dpr,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
    );
    if (!px) continue;
    gl.readPixels(px.x, px.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    samples.push(out.slice());
  }
  const avg = averageColor(samples);
  return avg ? rgbToCss(avg) : null;
}
