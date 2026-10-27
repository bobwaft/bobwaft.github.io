import { createFpsCounter, isDebug } from './fpsCalc';

/** Returns a per-frame hook that updates a fixed fps overlay, or null unless `?debug` is set. */
export function createDebugFps(): (() => void) | null {
  if (!isDebug(window.location.search)) return null;
  const el = document.createElement('div');
  el.id = 'debug-fps';
  el.style.cssText =
    'position:fixed;top:8px;left:8px;padding:2px 6px;background:rgba(0,0,0,.6);' +
    'color:#9f9;font:12px monospace;z-index:20;pointer-events:none';
  el.textContent = '-- fps';
  document.body.appendChild(el);
  const tick = createFpsCounter();
  return () => {
    const fps = tick(performance.now());
    if (fps !== null) el.textContent = `${fps.toFixed(0)} fps`;
  };
}
