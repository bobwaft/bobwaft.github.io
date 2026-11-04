import { retryOffer, type FallbackReason } from './fallbackReason';
import { setForce3d } from './fpsMonitor';

/** Hides the 3D UI and shows the pre-rendered HTML site, moving focus to its heading. */
export function showFallback(reason: FallbackReason, error?: unknown): void {
  if (reason === 'skipped') console.info('Showing the simple site (skipped)');
  else console.error(`Falling back to the simple site (${reason})`, error ?? '');
  document.getElementById('scene')?.setAttribute('hidden', '');
  document.getElementById('loading')?.remove();
  document.getElementById('skip-3d')?.setAttribute('hidden', '');
  const fallback = document.getElementById('fallback');
  const offer = retryOffer(reason);
  if (fallback && offer && !document.getElementById('try-3d')) {
    const button = document.createElement('button');
    button.id = 'try-3d';
    button.type = 'button';
    button.textContent = offer.label;
    button.addEventListener('click', () => {
      if (offer.force3d) setForce3d();
      window.location.reload();
    });
    fallback.appendChild(button);
  }
  fallback?.removeAttribute('hidden');
  fallback?.querySelector<HTMLElement>('h1')?.focus();
}
