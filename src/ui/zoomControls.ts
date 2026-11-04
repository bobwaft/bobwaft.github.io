// Zoom for every focus view (FR-16): buttons, +/- and ctrl+wheel (or a trackpad pinch) zoom; a
// two-finger pinch zooms on touch. Once zoomed in, the wheel, a drag or one finger pans. The
// buttons sit in the focus toolbar with the view's own controls, top-right (top on phones).
import { ZOOM_LEVELS, zoomKeyDelta, zoomLabel } from '../resume/layout';
import './toolbar.css';

export interface ZoomControls {
  setVisible(visible: boolean): void;
  setZoom(zoom: number): void;
  dispose(): void;
}

/** A point on screen in NDC (-1..1, y up). */
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ZoomHandlers {
  /** Zooms a step, keeping the point at anchor (default: the centre) in place. */
  step(delta: number, anchor?: ScreenPoint): void;
  /** Scales the zoom by factor about anchor (a pinch). */
  scale(factor: number, anchor: ScreenPoint): void;
  /** Pans the view by a screen NDC offset. */
  pan(dx: number, dy: number): void;
  /** True once zoomed in; until then the wheel and one finger scroll the page as usual. */
  zoomed(): boolean;
}

/** Ctrl+wheel (and trackpad pinch) travel per zoom step, in pixels. */
const WHEEL_STEP = 60;

const toNdc = (clientX: number, clientY: number): ScreenPoint => ({
  x: (clientX / window.innerWidth) * 2 - 1,
  y: 1 - (clientY / window.innerHeight) * 2,
});

/** The fixed row the focus views' controls share; created on first use. */
export function focusToolbar(): HTMLElement {
  let bar = document.getElementById('focus-toolbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'focus-toolbar';
    document.body.appendChild(bar);
  }
  return bar;
}

/** Midpoint and spread of the first two touches (spread 0 for one). */
function measure(touches: TouchList) {
  const a = touches[0];
  const b = touches[1] ?? a;
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
    spread: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
  };
}

export function createZoomControls(on: ZoomHandlers): ZoomControls {
  const root = document.createElement('div');
  root.id = 'zoom-controls';
  root.hidden = true;
  root.innerHTML =
    `<button type="button" class="zoom-out" aria-label="Zoom out">−</button>` +
    `<span class="zoom-label" aria-live="polite"></span>` +
    `<button type="button" class="zoom-in" aria-label="Zoom in">+</button>`;
  const zoomOut = root.querySelector<HTMLButtonElement>('.zoom-out')!;
  const zoomIn = root.querySelector<HTMLButtonElement>('.zoom-in')!;
  const label = root.querySelector<HTMLElement>('.zoom-label')!;
  zoomOut.addEventListener('click', () => on.step(-1));
  zoomIn.addEventListener('click', () => on.step(1));
  /** Pointers on the controls themselves don't start a pan or pinch. */
  const onControls = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('#focus-toolbar, #back-button');
  const onKey = (e: KeyboardEvent) => {
    const typing =
      e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]');
    if (root.hidden || typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const delta = zoomKeyDelta(e.key);
    if (!delta) return;
    e.preventDefault();
    on.step(delta);
  };
  // Ctrl+wheel zooms the view instead of the browser page; a trackpad pinch arrives the same way.
  let wheel = 0;
  const onWheel = (e: WheelEvent) => {
    if (root.hidden) return;
    if (!e.ctrlKey) {
      if (!on.zoomed()) return; // the page scrolls as usual
      e.preventDefault();
      on.pan(e.deltaX / (window.innerWidth / 2), -e.deltaY / (window.innerHeight / 2));
      return;
    }
    e.preventDefault();
    wheel += e.deltaY;
    if (Math.abs(wheel) < WHEEL_STEP) return;
    on.step(wheel < 0 ? 1 : -1, toNdc(e.clientX, e.clientY));
    wheel = 0;
  };
  // Mouse or pen dragging pans, content following the pointer. A mouse on a page selects text
  // instead. Touch is handled below.
  let drag: { id: number; x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (root.hidden || drag || e.pointerType === 'touch' || e.button !== 0) return;
    if (onControls(target) || target?.closest('a, button')) return;
    if (e.pointerType === 'mouse' && target?.closest('.screen-layer')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    on.pan(
      -(e.clientX - drag.x) / (window.innerWidth / 2),
      (e.clientY - drag.y) / (window.innerHeight / 2),
    );
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  // Touch: two fingers pinch (zoom about their midpoint, pan as it moves); one finger pans once
  // zoomed in. Touch events rather than pointer events, so the gesture can be claimed from the
  // browser (page zoom, a page's own scrolling) with preventDefault before it takes over.
  let touch: ReturnType<typeof measure> | null = null;
  const onTouchStart = (e: TouchEvent) => {
    if (root.hidden) return;
    if (!touch && onControls(e.target)) return;
    if (e.touches.length >= 2) e.preventDefault();
    touch = measure(e.touches);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!touch) return;
    const now = measure(e.touches);
    const pinch = e.touches.length >= 2;
    if (!pinch && !on.zoomed()) {
      touch = now;
      return;
    }
    if (e.cancelable) e.preventDefault();
    if (pinch && touch.spread > 0) on.scale(now.spread / touch.spread, toNdc(now.x, now.y));
    on.pan(
      -(now.x - touch.x) / (window.innerWidth / 2),
      (now.y - touch.y) / (window.innerHeight / 2),
    );
    touch = now;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch) return;
    // A lifted finger moves the midpoint; measure afresh so the view doesn't jump.
    touch = e.touches.length ? measure(e.touches) : null;
  };
  // Safari's own pinch zoom arrives as gesture events.
  const onGesture = (e: Event) => {
    if (!root.hidden) e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointerdown', onDown);
  // Capture: the pages stop their pointermoves from bubbling (screenLayer.ts).
  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('touchcancel', onTouchEnd);
  window.addEventListener('gesturestart', onGesture);
  window.addEventListener('gesturechange', onGesture);
  focusToolbar().appendChild(root);
  return {
    setVisible(visible) {
      root.hidden = !visible;
      drag = null;
      touch = null;
    },
    setZoom(zoom) {
      label.textContent = zoomLabel(zoom);
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
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('gesturestart', onGesture);
      window.removeEventListener('gesturechange', onGesture);
      root.remove();
    },
  };
}
