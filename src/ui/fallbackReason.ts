export type FallbackReason = 'no-webgl2' | 'load-failed' | 'slow';

/** Decides whether the 3D scene can run. Returns null when it can. */
export function fallbackReason(
  webgl2Available: boolean,
  loadError?: unknown,
): FallbackReason | null {
  if (!webgl2Available) return 'no-webgl2';
  if (loadError !== undefined && loadError !== null) return 'load-failed';
  return null;
}

/** "Try 3D anyway" only makes sense when the fallback was automatic and 3D might still work. */
export function offersRetry3d(reason: FallbackReason): boolean {
  return reason !== 'no-webgl2';
}
