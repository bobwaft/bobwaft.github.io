// Resume controls (FR-15, FR-16): page buttons, arrow keys, zoom and Download PDF. DOM, fixed in
// the top-right corner, shown only in the papers focus view. Zoom moves the camera (focusZoom.ts):
// buttons, +/- and ctrl+wheel (or a trackpad pinch) zoom; the wheel and dragging pan.
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

/** A point on screen in NDC (-1..1, y up). */
export interface ScreenPoint {
  x: number;
  y: number;
}

const toNdc = (clientX: number, clientY: number): ScreenPoint => ({
  x: (clientX / window.innerWidth) * 2 - 1,
  y: 1 - (clientY / window.innerHeight) * 2,
});

export function createResumeControls(
  pdfUrl: string,
  onStep: (delta: number) => void,
  /** Zooms a step, keeping the point at anchor (default: the centre) in place. */
  onZoom: (delta: number, anchor?: ScreenPoint) => void,
  /** Pans the view by a screen NDC offset. */
  onPan: (dx: number, dy: number) => void,
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
  // Ctrl+wheel zooms the view instead of the browser page; a trackpad pinch arrives the same way.
  let wheel = 0;
  const onWheel = (e: WheelEvent) => {
    if (root.hidden) return;
    e.preventDefault();
    if (!e.ctrlKey) {
      onPan(e.deltaX / (window.innerWidth / 2), -e.deltaY / (window.innerHeight / 2));
      return;
    }
    wheel += e.deltaY;
    if (Math.abs(wheel) < WHEEL_STEP) return;
    onZoom(wheel < 0 ? 1 : -1, toNdc(e.clientX, e.clientY));
    wheel = 0;
  };
  // Dragging pans, content following the pointer. A mouse on the page selects text instead.
  let drag: { id: number; x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (root.hidden || drag || e.button !== 0 || target?.closest('#resume-controls, a, button'))
      return;
    if (e.pointerType === 'mouse' && target?.closest('.resume-page')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    onPan(
      -(e.clientX - drag.x) / (window.innerWidth / 2),
      (e.clientY - drag.y) / (window.innerHeight / 2),
    );
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointerdown', onDown);
  // Capture: the page stops its pointermoves from bubbling (screenLayer.ts).
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  document.body.appendChild(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
      drag = null;
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
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      root.remove();
    },
  };
}
