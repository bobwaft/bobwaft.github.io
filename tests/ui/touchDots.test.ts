import { describe, expect, it } from 'vitest';
import { createUsedSet, dotVisible, isTouchPointerType, ndcToScreen } from '../../src/ui/touchDots';

describe('used set', () => {
  it('tracks used ids', () => {
    const u = createUsedSet();
    expect(u.has('laptop')).toBe(false);
    u.add('laptop');
    u.add('laptop');
    expect(u.has('laptop')).toBe(true);
    expect(u.has('papers')).toBe(false);
  });
});

describe('dotVisible', () => {
  it('shows only in idle for unused objects', () => {
    const u = createUsedSet();
    expect(dotVisible({ kind: 'idle' }, u, 'papers')).toBe(true);
    u.add('papers');
    expect(dotVisible({ kind: 'idle' }, u, 'papers')).toBe(false);
    expect(dotVisible({ kind: 'idle' }, u, 'laptop')).toBe(true);
  });
  it('hides while not idle', () => {
    const u = createUsedSet();
    for (const s of [
      { kind: 'loading' },
      { kind: 'transitioning-in', id: 'a' },
      { kind: 'focused', id: 'a' },
      { kind: 'transitioning-out', id: 'a' },
    ] as const) {
      expect(dotVisible(s, u, 'laptop')).toBe(false);
    }
  });
});

describe('ndcToScreen', () => {
  it('maps the NDC corners and centre to pixels', () => {
    expect(ndcToScreen({ x: 0, y: 0, z: 0 }, 200, 100)).toEqual({ x: 100, y: 50, onScreen: true });
    expect(ndcToScreen({ x: -1, y: 1, z: 0 }, 200, 100)).toMatchObject({ x: 0, y: 0 });
    expect(ndcToScreen({ x: 1, y: -1, z: 0 }, 200, 100)).toMatchObject({ x: 200, y: 100 });
  });
  it('is off screen behind the camera or outside the view', () => {
    expect(ndcToScreen({ x: 0, y: 0, z: 1.5 }, 200, 100).onScreen).toBe(false);
    expect(ndcToScreen({ x: 1.5, y: 0, z: 0 }, 200, 100).onScreen).toBe(false);
  });
});

describe('isTouchPointerType', () => {
  it('is true for touch only', () => {
    expect(isTouchPointerType('touch')).toBe(true);
    expect(isTouchPointerType('mouse')).toBe(false);
    expect(isTouchPointerType('pen')).toBe(false);
  });
});
