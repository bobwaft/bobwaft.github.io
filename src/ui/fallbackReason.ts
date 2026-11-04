export type FallbackReason = 'no-webgl2' | 'load-failed' | 'slow' | 'skipped';

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
  return reason === 'slow' || reason === 'load-failed';
}

/** The button the fallback offers to get back to the 3D, or null when there is no way back. */
export function retryOffer(reason: FallbackReason): { label: string; force3d: boolean } | null {
  if (reason === 'skipped') return { label: 'Back to the 3D', force3d: false };
  if (offersRetry3d(reason)) return { label: 'Try 3D anyway', force3d: true };
  return null;
}
