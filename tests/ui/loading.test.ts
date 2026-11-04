import { describe, expect, it } from 'vitest';
import { isStartKey } from '../../src/ui/loading';

const key = (k: string, extra: Partial<Parameters<typeof isStartKey>[0]> = {}) => ({
  key: k,
  repeat: false,
  modified: false,
  onControl: false,
  ...extra,
});

describe('isStartKey ("Click to start" from the keyboard)', () => {
  it('starts on Enter or Space', () => {
    expect(isStartKey(key('Enter'))).toBe(true);
    expect(isStartKey(key(' '))).toBe(true);
  });
  it('ignores other keys', () => {
    expect(isStartKey(key('Tab'))).toBe(false);
    expect(isStartKey(key('Escape'))).toBe(false);
  });
  it('leaves Enter on a focused link or button (Skip the 3D) to that control', () => {
    expect(isStartKey(key('Enter', { onControl: true }))).toBe(false);
  });
  it('ignores key repeat and modified presses', () => {
    expect(isStartKey(key('Enter', { repeat: true }))).toBe(false);
    expect(isStartKey(key('Enter', { modified: true }))).toBe(false);
  });
});
