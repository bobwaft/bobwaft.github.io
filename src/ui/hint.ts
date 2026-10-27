// One-time interaction hint (Phase 3): shown after load, gone after the first interaction.
// Nothing is stored; it shows again on every page load.

export function hintText(touch: boolean): string {
  return touch
    ? 'Drag to look around · tap objects on the desk'
    : 'Move your mouse to look around · click objects on the desk';
}

export interface HintDismisser {
  /** Adds pointer travel in px; true exactly once, when it first passes the threshold. */
  move(dxPx: number, dyPx: number): boolean;
  /** True exactly once, for the first click or tap. */
  click(): boolean;
}

export function createHintDismisser(thresholdPx = 30): HintDismisser {
  let travelled = 0;
  let done = false;
  const finish = () => {
    if (done) return false;
    done = true;
    return true;
  };
  return {
    move(dx, dy) {
      if (done) return false;
      travelled += Math.hypot(dx, dy);
      return travelled >= thresholdPx ? finish() : false;
    },
    click: finish,
  };
}

export interface Hint {
  dispose(): void;
}

/** Shows the hint now and fades it after the first look movement or click/tap. */
export function showHint(touch: boolean): Hint {
  const el = document.createElement('div');
  el.id = 'hint';
  el.setAttribute('role', 'status');
  el.textContent = hintText(touch);
  document.body.appendChild(el);
  // Next frame so the opacity transition runs.
  requestAnimationFrame(() => el.classList.add('show'));
  const dismisser = createHintDismisser();
  let last: { x: number; y: number } | null = null;
  const dismiss = () => {
    el.classList.remove('show');
    off();
  };
  const onMove = (e: PointerEvent) => {
    if (last && dismisser.move(e.clientX - last.x, e.clientY - last.y)) dismiss();
    last = { x: e.clientX, y: e.clientY };
  };
  const onDown = () => {
    if (dismisser.click()) dismiss();
  };
  const off = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerdown', onDown);
  return {
    dispose() {
      off();
      el.remove();
    },
  };
}
