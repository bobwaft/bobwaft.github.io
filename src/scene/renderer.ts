import { AgXToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { cappedPixelRatio } from './pixelRatio';

/** Creates the WebGL2 renderer. Throws if a WebGL2 context cannot be created. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const context = canvas.getContext('webgl2', { antialias: true });
  if (!context) throw new Error('WebGL2 is not available');
  const renderer = new WebGLRenderer({ canvas, context });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  renderer.setPixelRatio(cappedPixelRatio(window.devicePixelRatio));
  resizeToWindow(renderer);
  return renderer;
}

/**
 * Resizes the drawing buffer to the canvas's CSS size (which fills the window) and keeps the
 * camera undistorted. Measuring the canvas rather than innerWidth/innerHeight avoids a stretched
 * image when the two disagree (mobile toolbars, scrollbars).
 */
export function resizeToWindow(
  renderer: WebGLRenderer,
  camera?: { aspect: number; updateProjectionMatrix(): void },
): void {
  const w = Math.max(renderer.domElement.clientWidth, 1);
  const h = Math.max(renderer.domElement.clientHeight, 1);
  renderer.setPixelRatio(cappedPixelRatio(window.devicePixelRatio));
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
