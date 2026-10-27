import { describe, expect, it } from 'vitest';
import { isEscapeKey } from '../../src/ui/backButton';

describe('isEscapeKey', () => {
  it('accepts Escape (and legacy Esc)', () => {
    expect(isEscapeKey('Escape')).toBe(true);
    expect(isEscapeKey('Esc')).toBe(true);
  });
  it('rejects other keys', () => {
    expect(isEscapeKey('Enter')).toBe(false);
    expect(isEscapeKey('')).toBe(false);
  });
});
