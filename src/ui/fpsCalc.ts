export const FPS_WINDOW_MS = 500;

/** True when the query string contains a `debug` param (e.g. `?debug`, `?a=1&debug=1`). */
export function isDebug(search: string): boolean {
  return new URLSearchParams(search).has('debug');
}

/** Frames per second from a frame count over an elapsed time; 0 for a non-positive interval. */
export function fpsFromFrames(frames: number, elapsedMs: number): number {
  if (!(elapsedMs > 0) || !(frames > 0)) return 0;
  return (frames * 1000) / elapsedMs;
}

/** Counts frames and yields a smoothed fps value once per window. */
export function createFpsCounter(windowMs = FPS_WINDOW_MS): (nowMs: number) => number | null {
  let start: number | null = null;
  let frames = 0;
  return (nowMs) => {
    if (start === null) {
      start = nowMs;
      return null;
    }
    frames++;
    const elapsed = nowMs - start;
    if (elapsed < windowMs) return null;
    const fps = fpsFromFrames(frames, elapsed);
    start = nowMs;
    frames = 0;
    return fps;
  };
}
