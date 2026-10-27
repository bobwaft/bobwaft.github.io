import { describe, expect, it } from 'vitest';
import { createTapTracker } from '../../src/interaction/clickInput';

describe('tap tracker', () => {
  it('counts a press and release at the same spot as a tap', () => {
    const t = createTapTracker();
    t.down(1, 100, 100);
    expect(t.up(1, 103, 102)).toBe(true);
  });
  it('does not count a drag past the threshold', () => {
    const t = createTapTracker();
    t.down(1, 100, 100);
    expect(t.up(1, 130, 100)).toBe(false);
  });
  it('ignores a release without a matching press, and a repeated release', () => {
    const t = createTapTracker();
    expect(t.up(1, 0, 0)).toBe(false);
    t.down(1, 0, 0);
    t.down(2, 50, 50); // second finger is ignored
    expect(t.up(2, 50, 50)).toBe(false);
    expect(t.up(1, 0, 0)).toBe(true);
    expect(t.up(1, 0, 0)).toBe(false);
  });
  it('cancel forgets the press', () => {
    const t = createTapTracker();
    t.down(1, 0, 0);
    t.cancel(1);
    expect(t.up(1, 0, 0)).toBe(false);
  });
});
