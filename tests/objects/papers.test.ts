import { describe, expect, it } from 'vitest';
import { papers } from '../../src/objects/papers';

describe('papers', () => {
  it('hides the resume on bind, shows it on enter and hides it on exit', () => {
    const calls: boolean[] = [];
    papers.bind({ setContentVisible: (v) => calls.push(v) });
    expect(calls).toEqual([false]);
    papers.onEnter?.();
    papers.onExit?.();
    expect(calls).toEqual([false, true, false]);
  });

  it('has a top-down focus view', () => {
    expect(papers.focus?.viewDirection).toEqual([0, -1, 0]);
  });
});
