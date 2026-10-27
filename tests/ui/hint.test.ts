import { describe, expect, it } from 'vitest';
import { createHintDismisser, hintText } from '../../src/ui/hint';

describe('hintText', () => {
  it('uses mouse wording', () => {
    expect(hintText(false)).toBe('Move your mouse to look around · click objects on the desk');
  });
  it('uses touch wording', () => {
    expect(hintText(true)).toBe('Drag to look around · tap objects on the desk');
  });
});

describe('hint dismissal', () => {
  it('ignores small movement, dismisses once past the threshold (cumulative)', () => {
    const d = createHintDismisser(30);
    expect(d.move(5, 5)).toBe(false);
    expect(d.move(10, 0)).toBe(false);
    expect(d.move(20, 0)).toBe(true);
    expect(d.move(100, 0)).toBe(false); // only reports once
  });
  it('dismisses on the first click, once', () => {
    const d = createHintDismisser(30);
    expect(d.click()).toBe(true);
    expect(d.click()).toBe(false);
    expect(d.move(500, 0)).toBe(false);
  });
});
