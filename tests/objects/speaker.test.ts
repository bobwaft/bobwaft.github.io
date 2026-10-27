import { describe, expect, it, vi } from 'vitest';
import { speaker } from '../../src/objects/speaker';

describe('speaker module', () => {
  it('is instant (no focus) and toggles the bound player on click', () => {
    const toggle = vi.fn();
    speaker.bind({ toggle });
    expect(speaker.focus).toBeUndefined();
    speaker.onClick?.();
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('does not throw when clicked before binding', () => {
    expect(() => speaker.onClick?.()).not.toThrow();
  });
});
