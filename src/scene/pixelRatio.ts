export const MAX_PIXEL_RATIO = 2;

/** Device pixel ratio capped at MAX_PIXEL_RATIO; falls back to 1 for invalid values. */
export function cappedPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
}
