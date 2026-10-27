import type { FallbackReason } from './fallbackReason';

/** Hides the 3D UI and shows the plain HTML fallback (placeholder content until Phase 9). */
export function showFallback(reason: FallbackReason, error?: unknown): void {
  console.error(`Falling back to the simple site (${reason})`, error ?? '');
  document.getElementById('scene')?.setAttribute('hidden', '');
  document.getElementById('loading')?.remove();
  document.getElementById('fallback')?.removeAttribute('hidden');
}
