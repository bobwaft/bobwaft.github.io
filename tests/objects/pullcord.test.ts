import { describe, expect, it, vi } from 'vitest';
import { pullcord } from '../../src/objects/pullcord';

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
