// Resume controls (FR-15, FR-16): page buttons, arrow keys, zoom and Download PDF. DOM, fixed in
// the top-right corner, shown only in the papers focus view.
import { keyDelta, pageLabel, ZOOM_LEVELS, zoomKeyDelta, zoomLabel } from '../resume/layout';

export interface ResumeControls {
  setVisible(visible: boolean): void;
  /** Updates the label and button states; paging controls hide for a single page. */
  setPage(page: number, count: number): void;
  setZoom(zoom: number): void;
  dispose(): void;
}

/** Ctrl+wheel (and trackpad pinch) travel per zoom step, in pixels. */
const WHEEL_STEP = 60;

export function createResumeControls(
  pdfUrl: string,
  onStep: (delta: number) => void,
  onZoom: (delta: number) => void,
): ResumeControls {
  const root = document.createElement('div');
  root.id = 'resume-controls';
  root.hidden = true;
  root.innerHTML =
    `<div class="resume-pager" hidden>` +
    `<button type="button" class="resume-prev" aria-label="Previous page">‹</button>` +
    `<span class="resume-label" aria-live="polite"></span>` +
    `<button type="button" class="resume-next" aria-label="Next page">›</button>` +
    `</div>` +
    `<div class="resume-pager resume-zoom-controls">` +
    `<button type="button" class="resume-zoom-out" aria-label="Zoom out">−</button>` +
    `<span class="resume-zoom-label" aria-live="polite"></span>` +
    `<button type="button" class="resume-zoom-in" aria-label="Zoom in">+</button>` +
    `</div>` +
    `<a class="resume-download" download>Download PDF</a>`;
  root.querySelector<HTMLAnchorElement>('.resume-download')!.href = pdfUrl;
  const pager = root.querySelector<HTMLElement>('.resume-pager')!;
  const prev = root.querySelector<HTMLButtonElement>('.resume-prev')!;
  const next = root.querySelector<HTMLButtonElement>('.resume-next')!;
  const label = root.querySelector<HTMLElement>('.resume-label')!;
  const zoomOut = root.querySelector<HTMLButtonElement>('.resume-zoom-out')!;
  const zoomIn = root.querySelector<HTMLButtonElement>('.resume-zoom-in')!;
  const zoomText = root.querySelector<HTMLElement>('.resume-zoom-label')!;
  prev.addEventListener('click', () => onStep(-1));
  next.addEventListener('click', () => onStep(1));
  zoomOut.addEventListener('click', () => onZoom(-1));
  zoomIn.addEventListener('click', () => onZoom(1));
  const onKey = (e: KeyboardEvent) => {
    const typing =
      e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]');
    if (root.hidden || typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const zoom = zoomKeyDelta(e.key);
    if (zoom) {
      e.preventDefault();
      onZoom(zoom);
      return;
    }
    const delta = keyDelta(e.key);
    if (pager.hidden || !delta) return;
    e.preventDefault();
    onStep(delta);
  };
  // Ctrl+wheel zooms the page instead of the browser; a trackpad pinch arrives the same way.
  let wheel = 0;
  const onWheel = (e: WheelEvent) => {
    if (root.hidden || !e.ctrlKey) return;
    e.preventDefault();
    wheel += e.deltaY;
    if (Math.abs(wheel) < WHEEL_STEP) return;
    onZoom(wheel < 0 ? 1 : -1);
    wheel = 0;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: false });
  document.body.appendChild(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
    },
    setPage(page, count) {
      pager.hidden = count < 2;
      label.textContent = pageLabel(page, count);
      prev.disabled = page <= 1;
      next.disabled = page >= count;
    },
    setZoom(zoom) {
      zoomText.textContent = zoomLabel(zoom);
      zoomOut.disabled = zoom <= ZOOM_LEVELS[0];
      zoomIn.disabled = zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
    },
    dispose() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      root.remove();
    },
  };
}
