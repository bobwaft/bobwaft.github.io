import { AgXToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { gpuName } from './gpuInfo';
import { pixelRatioOverride } from './pixelRatio';
import { initialPixelRatio, isSoftwareRenderer } from './softwareRenderer';

/** Startup ratio (lower on software renderers), later lowered/raised by the adaptive controller. */
let baseRatio = 1;

/** Pixel ratio: `?dpr=` wins; otherwise the startup/adaptive ratio, which survives resizes. */
function pixelRatio(): number {
  return pixelRatioOverride(window.location.search) ?? baseRatio;
}

/** True when the pixel ratio is free to adapt (no `?dpr=` override). */
export function adaptiveRatioAllowed(): boolean {
  return pixelRatioOverride(window.location.search) === null;
}

/** Sets the ratio used from now on (applied by the next resizeToWindow). */
export function setAdaptiveRatio(ratio: number): void {
  baseRatio = ratio;
}

/** Creates the WebGL2 renderer. Throws if a WebGL2 context cannot be created. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const context = canvas.getContext('webgl2', { antialias: true });
  if (!context) throw new Error('WebGL2 is not available');
  const renderer = new WebGLRenderer({ canvas, context });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  baseRatio = initialPixelRatio(window.devicePixelRatio, isSoftwareRenderer(gpuName(context)));
  renderer.setPixelRatio(pixelRatio());
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
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
