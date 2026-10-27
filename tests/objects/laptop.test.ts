import { describe, expect, it } from 'vitest';
import { laptop } from '../../src/objects/laptop';

describe('laptop', () => {
  it('hides the content on bind, shows it on enter and hides it on exit', () => {
    const calls: boolean[] = [];
    laptop.bind({ setContentVisible: (v) => calls.push(v) });
    expect(calls).toEqual([false]);
    laptop.onEnter?.();
    laptop.onExit?.();
    expect(calls).toEqual([false, true, false]);
  });

  it('has a focus view', () => {
    expect(laptop.focus).toBeDefined();
  });
});
