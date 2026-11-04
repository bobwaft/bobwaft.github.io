// Music is "on by default" (owner, 2026-11-04): browsers block audio until the visitor interacts,
// so it starts at the first gesture. Pure: the event target and the deferral are injected.

/** The slice of window the auto-start listens on (lets tests pass a fake). */
export interface GestureTarget {
  addEventListener(type: string, fn: (e: { key?: string }) => void): void;
  removeEventListener(type: string, fn: (e: { key?: string }) => void): void;
}

export interface AutoStartOptions {
  /** Checked after the gesture has been handled: false if the visitor already switched it on. */
  shouldStart: () => boolean;
  start: () => void;
  /** Runs fn once the current event, and any click it causes, has finished. */
  defer?: (fn: () => void) => void;
}

export interface AutoStart {
  dispose(): void;
}

export function createAutoStart(target: GestureTarget, opts: AutoStartOptions): AutoStart {
  const defer = opts.defer ?? ((fn: () => void) => void setTimeout(fn, 0));
  const off = () => {
    target.removeEventListener('pointerup', onGesture);
    target.removeEventListener('keydown', onGesture);
  };
  function onGesture(e: { key?: string }): void {
    // Escape does not unlock audio, so it must not use up the one chance.
    if (e.key === 'Escape' || e.key === 'Esc') return;
    off();
    // A click on the speaker toggles it on in this same gesture; deferring lets that win.
    defer(() => {
      if (opts.shouldStart()) opts.start();
    });
  }
  target.addEventListener('pointerup', onGesture);
  target.addEventListener('keydown', onGesture);
  return { dispose: off };
}
