import { describe, expect, it } from 'vitest';
import { hoverTarget } from '../../src/interaction/hover';
import { brightenFragment, canBrighten } from '../../src/scene/hoverMaterial';

describe('hoverTarget', () => {
  it('highlights the hit in idle with a mouse', () => {
    expect(hoverTarget({ kind: 'idle' }, 'mouse', 'laptop')).toBe('laptop');
  });
  it('nothing when no hit', () => {
    expect(hoverTarget({ kind: 'idle' }, 'mouse', null)).toBeNull();
  });
  it('never for touch or pen', () => {
    expect(hoverTarget({ kind: 'idle' }, 'touch', 'laptop')).toBeNull();
    expect(hoverTarget({ kind: 'idle' }, 'pen', 'laptop')).toBeNull();
  });
  it('never outside idle', () => {
    for (const s of [
      { kind: 'loading' },
      { kind: 'transitioning-in', id: 'laptop' },
      { kind: 'focused', id: 'laptop' },
      { kind: 'transitioning-out', id: 'laptop' },
    ] as const) {
      expect(hoverTarget(s, 'mouse', 'papers')).toBeNull();
    }
  });
});

describe('brightenFragment', () => {
  const src = `a\n    gl_FragColor = vec4(x, 1.0);\n    #include <tonemapping_fragment>\n`;
  it('inserts the scale right after the gl_FragColor line', () => {
    const out = brightenFragment(src, 1.15);
    expect(out.indexOf('gl_FragColor.rgb *= 1.15;')).toBeGreaterThan(out.indexOf('vec4(x'));
    expect(out.indexOf('gl_FragColor.rgb *= 1.15;')).toBeLessThan(out.indexOf('#include'));
  });
  it('throws if the shader has no gl_FragColor assignment', () => {
    expect(() => brightenFragment('void main(){}', 1.1)).toThrow();
  });
});

describe('canBrighten', () => {
  it('is true only for shaders with a gl_FragColor assignment', () => {
    expect(canBrighten('x\n  gl_FragColor = vec4(1.0);\n')).toBe(true);
    expect(canBrighten('void main(){ gl_FragColor.a = 1.0; }')).toBe(false);
  });
});
