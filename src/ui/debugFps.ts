import { Vector2, type WebGLRenderer } from 'three';
import { gpuName } from '../scene/gpuInfo';
import type { MonitorState } from './fpsMonitor';
import { createFpsCounter, formatPerfReadout, isDebug } from './fpsCalc';

/**
 * Returns a per-frame hook (call after render) that updates a fixed perf overlay — fps, pixel
 * ratio, buffer size, draw calls, GPU — or null unless `?debug` is set.
 */
export function createDebugFps(
  renderer: WebGLRenderer,
  monitorStatus?: () => { state: MonitorState; medianFps: number | null },
): (() => void) | null {
  if (!isDebug(window.location.search)) return null;
  const el = document.createElement('div');
  el.id = 'debug-fps';
  el.style.cssText =
    'position:fixed;bottom:8px;left:8px;padding:2px 6px;background:rgba(0,0,0,.6);' +
    'color:#9f9;font:12px monospace;z-index:20;pointer-events:none;white-space:pre';
  el.textContent = '-- fps';
  document.body.appendChild(el);
  const gpu = gpuName(renderer.getContext() as WebGL2RenderingContext);
  const size = new Vector2();
  const tick = createFpsCounter();
  return () => {
    const fps = tick(performance.now());
    if (fps === null) return;
    renderer.getDrawingBufferSize(size);
    const mon = monitorStatus?.();
    const monLine = mon
      ? `
fallback monitor: ${mon.state} � median ${mon.medianFps === null ? '--' : mon.medianFps.toFixed(1)} fps`
      : '';
    el.textContent =
      formatPerfReadout({
        fps,
        pixelRatio: renderer.getPixelRatio(),
        width: size.x,
        height: size.y,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        gpu,
      }) + monLine;
  };
}
