export const DEFAULT_SLOW_MS = 80;
export const MIN_SLOW_MS = 1;
export const MAX_SLOW_MS = 500;

/**
 * Test hook: `?slow` (or `?slow=<ms>`) makes every animation frame busy-wait that long, so the fps
 * monitor sees a slow device (DevTools CPU throttling does not slow a GPU-bound scene, BUG-004).
 * Bare `?slow` or an invalid value gives DEFAULT_SLOW_MS; values clamp to 1..500; null when absent.
 */
export function slowFrameMs(search: string): number | null {
  const params = new URLSearchParams(search);
  if (!params.has('slow')) return null;
  const v = Number(params.get('slow'));
  if (!params.get('slow') || !Number.isFinite(v)) return DEFAULT_SLOW_MS;
  return Math.min(Math.max(v, MIN_SLOW_MS), MAX_SLOW_MS);
}

/** Blocks the thread for about `ms` milliseconds. */
export function busyWait(ms: number): void {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    /* spin */
  }
}
