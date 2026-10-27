/** Raw fraction loaded/total in 0..1; 0 when nothing is queued yet (0/0). */
export function progressFraction(loaded: number, total: number): number {
  if (!(total > 0) || !(loaded > 0)) return 0;
  return Math.min(1, loaded / total);
}

/**
 * Displayed progress never decreases: the item total grows as loaders queue more files, which
 * would otherwise make loaded/total jump backwards.
 */
export function monotonicProgress(previous: number, loaded: number, total: number): number {
  return Math.max(previous, progressFraction(loaded, total));
}

/** Ready once the scene promise resolved and the loading manager has nothing pending. */
export function isReady(sceneResolved: boolean, loaded: number, total: number): boolean {
  return sceneResolved && total > 0 && loaded >= total;
}
