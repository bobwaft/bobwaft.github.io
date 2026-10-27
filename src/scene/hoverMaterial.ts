// A brightened variant of the shared Click_* material, built without touching scene-lighting.js.
import type { ShaderMaterial } from 'three';

/** Inserts a colour scale right after the gl_FragColor assignment (before tonemapping). */
export function brightenFragment(src: string, factor: number): string {
  const re = /^(\s*gl_FragColor\s*=.*;)\s*$/m;
  if (!re.test(src)) throw new Error('No gl_FragColor assignment to patch');
  return src.replace(
    re,
    `$1\n    gl_FragColor.rgb *= ${Number.isInteger(factor) ? factor.toFixed(1) : factor};`,
  );
}

/** Clone sharing the original's uniforms object (so lighting uniforms stay live). */
export function createHoverMaterial(original: ShaderMaterial, factor = 1.15): ShaderMaterial {
  const variant = original.clone();
  variant.uniforms = original.uniforms;
  variant.fragmentShader = brightenFragment(original.fragmentShader, factor);
  variant.needsUpdate = true;
  return variant;
}
