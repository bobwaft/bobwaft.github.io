import { describe, expect, it } from 'vitest';
import { formatPoseReadout } from '../../src/ui/debugCamera';

describe('formatPoseReadout', () => {
  it('formats position and target to 3 decimals in a pasteable form', () => {
    expect(formatPoseReadout([0, 1.18, 0], [0.12345, 1.0, -0.9996])).toBe(
      'position: [0.000, 1.180, 0.000], target: [0.123, 1.000, -1.000]',
    );
  });

  it('does not print negative zero', () => {
    expect(formatPoseReadout([-0.0001, 0, 0], [0, 0, 0])).toBe(
      'position: [0.000, 0.000, 0.000], target: [0.000, 0.000, 0.000]',
    );
  });
});
