import { HalfFloatType, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import lightingSource from '../../src/scene/scene-lighting.js?raw';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { describe, expect, it, vi } from 'vitest';
import { BLOOM, createPostFx, GRAIN_VIGNETTE, maskHighPass } from '../../src/scene/postfx';

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

  it('weights the bloom high-pass luminosity by texel alpha (BUG-006)', () => {
    const bloom = make().composer.passes[1] as UnrealBloomPass;
    expect(bloom.materialHighPassFilter.fragmentShader).toContain('* clamp( texel.a, 0.0, 1.0 )');
    expect(maskHighPass('nothing to patch')).toBe('nothing to patch');
  });

  it('clears to alpha 1 and forces the final output alpha to 1', () => {
    const fx = make();
    expect((fx.composer.passes[0] as RenderPass).clearAlpha).toBe(1);
    const grain = fx.composer.passes[3] as ShaderPass;
    expect(grain.material.fragmentShader).toContain('vec4(c.rgb, 1.0)');
  });

  it('leaves the shelf strip at its original emissive and masks it from bloom', () => {
    const src = lightingSource;
    expect(src).toContain('new THREE.Color(3.0, 1.6, 0.6) : null');
    expect(src).not.toContain('SHELF_EMISSIVE_SCALE');
    expect(src).toContain("'M_Env_ShelfBulb' ? 0 : 1");
    expect(src).toContain('uEmissive * uLight, uBloomMask)');
  });

  it('uses a wide soft knee for a smooth bloom ramp', () => {
    const bloom = make().composer.passes[1] as UnrealBloomPass;
    expect(
      (bloom.highPassUniforms as Record<string, { value: number }>).smoothWidth.value,
    ).toBeGreaterThanOrEqual(0.5);
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
