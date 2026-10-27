export const MAX_PIXEL_RATIO = 2;

/** Device pixel ratio capped at MAX_PIXEL_RATIO; falls back to 1 for invalid values. */
export function cappedPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) return 1;
  return Math.min(devicePixelRatio, MAX_PIXEL_RATIO);
}

export const MIN_PIXEL_RATIO_OVERRIDE = 0.5;

/** Pixel ratio forced by `?dpr=<n>` (for perf testing), clamped to 0.5..MAX; null if absent/invalid. */
export function pixelRatioOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('dpr');
  if (!raw) return null;
  const v = Number(raw);
  if (!Number.isFinite(v)) return null;
  return Math.min(Math.max(v, MIN_PIXEL_RATIO_OVERRIDE), MAX_PIXEL_RATIO);
}
