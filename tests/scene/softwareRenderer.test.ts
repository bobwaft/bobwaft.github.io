import { describe, expect, it } from 'vitest';
import {
  initialPixelRatio,
  isSoftwareRenderer,
  SOFTWARE_PIXEL_RATIO,
} from '../../src/scene/softwareRenderer';

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'Mesa Software Rasterizer',
    'SWIFTSHADER',
  ])('detects %s', (name) => {
    expect(isSoftwareRenderer(name)).toBe(true);
  });

  it('does not flag real GPUs', () => {
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11, D3D11)')).toBe(
      false,
    );
    expect(isSoftwareRenderer('Apple M2')).toBe(false);
  });

  it('is false for a missing string', () => {
    expect(isSoftwareRenderer(null)).toBe(false);
    expect(isSoftwareRenderer(undefined)).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
});

describe('initialPixelRatio', () => {
  it('uses the capped device ratio on a real GPU', () => {
    expect(initialPixelRatio(3, false)).toBe(2);
    expect(initialPixelRatio(1.5, false)).toBe(1.5);
  });

  it('starts low on a software renderer', () => {
    expect(initialPixelRatio(2, true)).toBe(SOFTWARE_PIXEL_RATIO);
    expect(initialPixelRatio(0.5, true)).toBe(0.5);
  });
});
