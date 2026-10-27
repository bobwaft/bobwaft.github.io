import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PULSE_AMPLITUDE, pulseScale, speaker } from '../../src/objects/speaker';

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

describe('pulseScale', () => {
  it('is exactly 1 at zero strength', () => {
    for (let t = 0; t < 2; t += 0.1) expect(pulseScale(t, 0)).toBe(1);
  });

  it('stays within 2-4% of the rest scale and varies', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const s = pulseScale(i / 100, 1);
      min = Math.min(min, s);
      max = Math.max(max, s);
    }
    expect(min).toBeGreaterThanOrEqual(1);
    expect(max).toBeCloseTo(1 + PULSE_AMPLITUDE, 3);
    expect(PULSE_AMPLITUDE).toBeGreaterThanOrEqual(0.02);
    expect(PULSE_AMPLITUDE).toBeLessThanOrEqual(0.04);
  });
});

describe('speaker pulse', () => {
  it('pulses only while playing and eases back to the base scale', () => {
    const o = new Object3D();
    o.scale.setScalar(2);
    let playing = false;
    speaker.bind({ toggle: () => {}, isPlaying: () => playing, object: o });
    speaker.update?.(0.3);
    expect(o.scale.x).toBe(2);

    playing = true;
    let max = 0;
    for (let i = 0; i < 60; i++) {
      speaker.update?.(1 / 60);
      max = Math.max(max, o.scale.x);
    }
    expect(max).toBeGreaterThan(2.02);
    expect(max).toBeLessThanOrEqual(2 * (1 + PULSE_AMPLITUDE) + 1e-9);

    playing = false;
    for (let i = 0; i < 120; i++) speaker.update?.(1 / 60);
    expect(o.scale.x).toBe(2);
    expect(o.scale.y).toBe(2);
  });
});
