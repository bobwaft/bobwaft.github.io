import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CORD_SECONDS, cordOffset, pullcord } from '../../src/objects/pullcord';

describe('pullcord module', () => {
  it('is instant (no focus) and toggles the bound lamp on click', () => {
    const toggle = vi.fn();
    pullcord.bind({ toggle });
    expect(pullcord.focus).toBeUndefined();
    pullcord.onClick?.();
    pullcord.onClick?.();
    expect(toggle).toHaveBeenCalledTimes(2);
  });

  it('does not throw when clicked before binding', () => {
    expect(() => pullcord.onClick?.()).not.toThrow();
  });
});

describe('cordOffset', () => {
  it('starts and ends at 0 with a peak in between', () => {
    expect(cordOffset(0)).toBe(0);
    expect(cordOffset(1)).toBe(0);
    expect(cordOffset(2)).toBe(0);
    let max = 0;
    for (let i = 0; i <= 100; i++) max = Math.max(max, cordOffset(i / 100));
    expect(max).toBeCloseTo(1, 1);
  });
});

describe('pullcord animation', () => {
  const bound = () => {
    const object = new Object3D();
    object.position.set(1, 2, 3);
    pullcord.bind({ toggle: () => {}, object });
    return object;
  };

  it('moves the cord down then restores it exactly', () => {
    const o = bound();
    pullcord.onClick?.();
    pullcord.update?.(CORD_SECONDS * 0.2);
    expect(o.position.y).toBeLessThan(2);
    expect(o.position.x).toBe(1);
    pullcord.update?.(CORD_SECONDS);
    expect(o.position.y).toBe(2);
  });

  it('restarts when clicked mid-animation and still toggles', () => {
    const toggle = vi.fn();
    const o = new Object3D();
    pullcord.bind({ toggle, object: o });
    pullcord.onClick?.();
    pullcord.update?.(CORD_SECONDS * 0.9);
    pullcord.onClick?.();
    pullcord.update?.(CORD_SECONDS * 0.2);
    expect(o.position.y).toBeLessThan(0);
    expect(toggle).toHaveBeenCalledTimes(2);
  });
});
