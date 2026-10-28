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

/** Bloom is modest and only catches HDR values (bulb, street lamps, city windows exceed 1.0). */
export const BLOOM = { strength: 0.35, radius: 0.65, threshold: 1.05, smoothWidth: 1 } as const;
/** Grain amplitude and vignette darkening at the corners; both are subtle. */
export const GRAIN_VIGNETTE = { grain: 0.04, vignette: 0.3 } as const;
/** MSAA samples for the composer's render targets (the canvas's own antialias does not apply). */
export const MSAA_SAMPLES = 4;

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
      gl_FragColor = c;
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
  // The default knee (0.01) is a hard cutoff: a thin HDR strip (the shelf tube) changes pixel
  // coverage as the camera moves, so its edge pixels flip across the threshold and shimmer
  // (BUG-006). A wide knee makes the bloom contribution vary smoothly with coverage.
  (bloom.highPassUniforms as Record<string, { value: number }>).smoothWidth.value =
    BLOOM.smoothWidth;
  // UnrealBloomPass runs its high-pass into a half-resolution target, sampling the full-res scene
  // with one bilinear tap per half-res pixel, so it skips every other pixel. A 1-2 px HDR strip
  // (the shelf tube) then appears and disappears as the camera moves by sub-pixel amounts, and the
  // whole glow pulses (BUG-006, likely cause, not verified in a browser). Handing the pass a
  // doubled size makes its "half" target full resolution (every scene pixel is sampled; the
  // multisampled source is already resolved) and the blur mips then low-pass it properly.
  const setBloomSize = bloom.setSize.bind(bloom);
  bloom.setSize = (width, height) => setBloomSize(width * 2, height * 2);
  bloom.setSize(size.x * ratio, size.y * ratio);
  const grain = new ShaderPass(GrainVignetteShader);
  composer.addPass(new RenderPass(scene as Scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(grain);

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
