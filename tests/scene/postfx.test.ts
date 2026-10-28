import { HalfFloatType, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { describe, expect, it, vi } from 'vitest';
import { BLOOM, createPostFx, GRAIN_VIGNETTE } from '../../src/scene/postfx';

function fakeRenderer() {
  return {
    getSize: (v: { set(x: number, y: number): unknown }) => v.set(800, 600),
    getPixelRatio: () => 2,
    info: { autoReset: true, reset: vi.fn() },
  } as unknown as WebGLRenderer;
}

function make() {
  return createPostFx(fakeRenderer(), new Scene(), new PerspectiveCamera());
}

describe('createPostFx', () => {
  it('orders passes render -> bloom -> output -> grain/vignette, with OutputPass once', () => {
    const { passes } = make().composer;
    expect(passes).toHaveLength(4);
    expect(passes[0]).toBeInstanceOf(RenderPass);
    expect(passes[1]).toBeInstanceOf(UnrealBloomPass);
    expect(passes[2]).toBeInstanceOf(OutputPass);
    expect(passes.filter((p) => p instanceof OutputPass)).toHaveLength(1);
  });

  it('renders in a half-float, multisampled target at the device pixel size', () => {
    const { renderTarget1, renderTarget2 } = make().composer;
    for (const rt of [renderTarget1, renderTarget2]) {
      expect(rt.texture.type).toBe(HalfFloatType);
      expect(rt.samples).toBe(4);
      expect(rt.width).toBe(1600);
    }
  });

  it('keeps bloom above 1.0 and modest, and grain/vignette subtle', () => {
    expect(BLOOM.threshold).toBeGreaterThan(1);
    expect(BLOOM.strength).toBeLessThanOrEqual(0.5);
    expect(GRAIN_VIGNETTE.grain).toBeGreaterThanOrEqual(0.03);
    expect(GRAIN_VIGNETTE.grain).toBeLessThanOrEqual(0.05);
    expect(GRAIN_VIGNETTE.vignette).toBeLessThanOrEqual(0.4);
  });

  it('resizes with the pixel ratio and counts one frame in renderer.info', () => {
    const renderer = fakeRenderer();
    const fx = createPostFx(renderer, new Scene(), new PerspectiveCamera());
    expect(renderer.info.autoReset).toBe(false);
    fx.setSize(400, 300, 1.5);
    expect(fx.composer.renderTarget1.width).toBe(600);
    expect(fx.composer.renderTarget1.height).toBe(450);
  });
});
