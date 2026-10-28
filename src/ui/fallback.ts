import { offersRetry3d, type FallbackReason } from './fallbackReason';
import { setForce3d } from './fpsMonitor';

/** Hides the 3D UI and shows the plain HTML fallback (placeholder content until Phase 9). */
export function showFallback(reason: FallbackReason, error?: unknown): void {
  console.error(`Falling back to the simple site (${reason})`, error ?? '');
  document.getElementById('scene')?.setAttribute('hidden', '');
  document.getElementById('loading')?.remove();
  const fallback = document.getElementById('fallback');
  if (fallback && offersRetry3d(reason) && !document.getElementById('try-3d')) {
    const button = document.createElement('button');
    button.id = 'try-3d';
    button.type = 'button';
    button.textContent = 'Try 3D anyway';
    button.addEventListener('click', () => {
      setForce3d();
      window.location.reload();
    });
    fallback.appendChild(button);
  }
  fallback?.removeAttribute('hidden');
}
