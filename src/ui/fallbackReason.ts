export type FallbackReason = 'no-webgl2' | 'load-failed';

/** Decides whether the 3D scene can run. Returns null when it can. */
export function fallbackReason(
  webgl2Available: boolean,
  loadError?: unknown,
): FallbackReason | null {
  if (!webgl2Available) return 'no-webgl2';
  if (loadError !== undefined && loadError !== null) return 'load-failed';
  return null;
}
