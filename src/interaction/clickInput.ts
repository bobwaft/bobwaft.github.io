// Pointer taps on the canvas: pointerdown/up within the tap threshold count as clicks.
import { isTap } from '../camera/lookControls';

export interface TapTracker {
  down(id: number, x: number, y: number): void;
  /** True when the release of pointer id completes a tap. */
  up(id: number, x: number, y: number): boolean;
  cancel(id: number): void;
}

/** Tracks one pointer at a time; extra pointers (pinch) are ignored until it lifts. */
export function createTapTracker(): TapTracker {
  let press: { id: number; x: number; y: number } | null = null;
  return {
    down(id, x, y) {
      if (!press) press = { id, x, y };
    },
    up(id, x, y) {
      if (!press || press.id !== id) return false;
      const p = press;
      press = null;
      return isTap(x - p.x, y - p.y);
    },
    cancel(id) {
      if (press?.id === id) press = null;
    },
  };
}

/** Wires pointer events on element to onClick(clientX, clientY) for taps. Returns a disposer. */
export function createClickInput(
  element: HTMLElement,
  onClick: (clientX: number, clientY: number) => void,
): () => void {
  const tracker = createTapTracker();
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tracker.down(e.pointerId, e.clientX, e.clientY);
  };
  const onUp = (e: PointerEvent) => {
    if (tracker.up(e.pointerId, e.clientX, e.clientY)) onClick(e.clientX, e.clientY);
  };
  const onCancel = (e: PointerEvent) => tracker.cancel(e.pointerId);
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointerup', onUp);
    element.removeEventListener('pointercancel', onCancel);
  };
}
