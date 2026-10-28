import {
  HalfFloatType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Bloom is modest and only catches HDR values (street lamps, city windows exceed 1.0; the shelf tube is masked out via alpha). */
export const BLOOM = { strength: 0.35, radius: 0.65, threshold: 1.05, smoothWidth: 1 } as const;
/** Grain amplitude and vignette darkening at the corners; both are subtle. */
export const GRAIN_VIGNETTE = { grain: 0.04, vignette: 0.3 } as const;
/** MSAA samples for the composer's render targets (the canvas's own antialias does not apply). */
export const MSAA_SAMPLES = 4;

/** Bloom mask: the high-pass weights luminosity by texel alpha (baked materials write 1, the shelf strip 0). */
export function maskHighPass(fragmentShader: string): string {
  return fragmentShader.replace(
    'float v = luminance( texel.xyz );',
    'float v = luminance( texel.xyz ) * clamp( texel.a, 0.0, 1.0 );',
  );
}

const GrainVignetteShader = {
  name: 'GrainVignetteShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: GRAIN_VIGNETTE.grain },
    uVignette: { value: GRAIN_VIGNETTE.vignette },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette;
    varying vec2 vUv;
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 0.85)));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      c.rgb += (hash(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * uGrain;
      gl_FragColor = vec4(c.rgb, 1.0);   // the canvas is opaque; alpha was only the bloom mask
    }`,
};

export interface PostFx {
  composer: EffectComposer;
  /** Renders one frame to the canvas. */
  render(dt: number): void;
  /** Resizes the composer's buffers (CSS pixels) at the given pixel ratio. */
  setSize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/**
 * Scene -> bloom -> OutputPass -> grain/vignette, in a half-float target so HDR values survive to
 * bloom. Baked materials skip tone mapping and sRGB conversion while drawing into a render target
 * (MEMORY.md ISSUE-2), so OutputPass applies the renderer's tone mapping exactly once. Grain and
 * vignette come after it, in display space, so they are perceptually even and never tone-mapped.
 */
export function createPostFx(renderer: WebGLRenderer, scene: Object3D, camera: Camera): PostFx {
  const size = renderer.getSize(new Vector2());
  const ratio = renderer.getPixelRatio();
  const target = new WebGLRenderTarget(size.x * ratio, size.y * ratio, {
    type: HalfFloatType,
    samples: MSAA_SAMPLES,
  });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(
    new Vector2(size.x * ratio, size.y * ratio),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );
  // Soft knee: bloom contribution ramps smoothly over [threshold, threshold + smoothWidth]. The
  // shelf tube is kept out of bloom via the alpha mask (scene-lighting.js uBloomMask, BUG-006);
  // street lamps and city windows still bloom.
  bloom.materialHighPassFilter.fragmentShader = maskHighPass(
    bloom.materialHighPassFilter.fragmentShader,
  );
  bloom.materialHighPassFilter.needsUpdate = true;
  (bloom.highPassUniforms as Record<string, { value: number }>).smoothWidth.value =
    BLOOM.smoothWidth;
  const grain = new ShaderPass(GrainVignetteShader);
  const renderPass = new RenderPass(scene as Scene, camera);
  renderPass.clearAlpha = 1; // empty pixels are unmasked (alpha 1), so they bloom as before
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(grain);
  // With a caller-supplied target the composer keeps the renderer's pixel ratio on top of the
  // target's already-scaled size, so addPass sized the passes 2x too large; size them properly.
  composer.setPixelRatio(ratio);
  composer.setSize(size.x, size.y);

  // The composer makes several renderer.render calls per frame; count them as one frame (?debug).
  renderer.info.autoReset = false;
  let time = 0;
  return {
    composer,
    render(dt) {
      time += dt;
      grain.uniforms.uTime.value = time;
      renderer.info.reset();
      composer.render(dt);
    },
    setSize(width, height, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height);
    },
    dispose() {
      composer.dispose();
      for (const pass of composer.passes) pass.dispose();
    },
  };
}
