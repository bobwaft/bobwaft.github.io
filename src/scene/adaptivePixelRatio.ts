export interface AdaptiveOptions {
  initial: number;
  max: number;
  min?: number;
}

export const ADAPT_WINDOW_MS = 1000;
export const LOW_FPS = 50;
export const HIGH_FPS = 58;
/** Consecutive low windows before stepping down (~2 s). */
export const DOWN_WINDOWS = 2;
/** Consecutive comfortable windows before stepping back up (~10 s). */
export const UP_WINDOWS = 10;
export const STEP = 0.75;
export const MIN_ADAPTIVE_RATIO = 0.6;
/** A frame gap longer than this is a stall or tab switch, not a measurement. */
export const MAX_FRAME_GAP_MS = 250;

/**
 * Pure controller: feed it every frame's timestamp; it returns a new pixel ratio when one should
 * be applied, else null. Steps down (x0.75) after ~2 s under 50 fps, back up after ~10 s over 58.
 * Hysteresis: a level that fails right after a step up is never tried again.
 */
export function createAdaptivePixelRatio(opts: AdaptiveOptions) {
  const min = opts.min ?? MIN_ADAPTIVE_RATIO;
  let ratio = opts.initial;
  let last: number | null = null;
  let start = 0;
  let frames = 0;
  let low = 0;
  let high = 0;
  let lastMove: 'up' | 'down' | null = null;
  let ceiling: number | null = null;

  const resetWindow = (now: number | null) => {
    start = now ?? 0;
    frames = 0;
  };

  return {
    get ratio() {
      return ratio;
    },
    frame(nowMs: number, hidden: boolean): number | null {
      if (hidden) {
        last = null;
        low = high = 0;
        resetWindow(null);
        return null;
      }
      const prev = last;
      last = nowMs;
      if (prev === null || nowMs - prev > MAX_FRAME_GAP_MS) {
        low = high = 0;
        resetWindow(nowMs);
        return null;
      }
      frames++;
      const elapsed = nowMs - start;
      if (elapsed < ADAPT_WINDOW_MS) return null;
      const fps = (frames * 1000) / elapsed;
      resetWindow(nowMs);
      if (fps < LOW_FPS) {
        low++;
        high = 0;
      } else if (fps > HIGH_FPS) {
        high++;
        low = 0;
      } else {
        low = high = 0;
      }
      if (low >= DOWN_WINDOWS) {
        low = 0;
        const next = Math.max(min, ratio * STEP);
        if (next >= ratio - 1e-9) return null;
        if (lastMove === 'up') ceiling = ratio;
        lastMove = 'down';
        ratio = next;
        return ratio;
      }
      if (high >= UP_WINDOWS) {
        high = 0;
        const next = Math.min(opts.max, ratio / STEP);
        if (next <= ratio + 1e-9) return null;
        if (ceiling !== null && next >= ceiling - 1e-9) return null;
        lastMove = 'up';
        ratio = next;
        return ratio;
      }
      return null;
    },
  };
}
