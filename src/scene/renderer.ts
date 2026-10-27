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
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}

/** Resizes the renderer to the window and keeps the camera undistorted. */
export function resizeToWindow(
  renderer: WebGLRenderer,
  camera?: { aspect: number; updateProjectionMatrix(): void },
): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(cappedPixelRatio(window.devicePixelRatio));
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
}
