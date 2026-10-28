import { cappedPixelRatio } from './pixelRatio';

/**
 * Pixel ratio software renderers start at. WARP/SwiftShader/llvmpipe are fill-rate bound: 0.75
 * draws 44% fewer pixels than 1.0 while staying readable (BUG-001 saw 22 fps at 1.0).
 */
export const SOFTWARE_PIXEL_RATIO = 0.75;

const SOFTWARE_PATTERN = /basic render driver|swiftshader|llvmpipe|software rasterizer/i;

/** True when the WebGL renderer string names a CPU rasteriser (no hardware acceleration). */
export function isSoftwareRenderer(rendererString: string | null | undefined): boolean {
  return !!rendererString && SOFTWARE_PATTERN.test(rendererString);
}

/** Starting pixel ratio: the capped device ratio, lowered on software renderers. */
export function initialPixelRatio(devicePixelRatio: number, software: boolean): number {
  const ratio = cappedPixelRatio(devicePixelRatio);
  return software ? Math.min(ratio, SOFTWARE_PIXEL_RATIO) : ratio;
}
