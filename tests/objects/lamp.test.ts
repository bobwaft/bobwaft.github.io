import { describe, expect, it } from 'vitest';
import { createLamp } from '../../src/objects/lamp';

describe('createLamp', () => {
  it('starts on', () => {
    const u = { value: 0 };
    const lamp = createLamp(u);
    expect(u.value).toBe(1);
    expect(lamp.isOn).toBe(true);
  });

  it('fades to 0 over ~400 ms with easing', () => {
    const u = { value: 1 };
    const lamp = createLamp(u);
    lamp.toggle();
    expect(lamp.isOn).toBe(false);
    lamp.update(0.2);
    expect(u.value).toBeCloseTo(0.5);
    lamp.update(0.1);
    expect(u.value).toBeGreaterThan(0);
    expect(u.value).toBeLessThan(0.5);
    lamp.update(0.5);
    expect(u.value).toBe(0);
  });

  it('reverses mid-fade from its current value', () => {
    const u = { value: 1 };
    const lamp = createLamp(u);
    lamp.toggle();
    lamp.update(0.2);
    const mid = u.value;
    lamp.toggle();
    lamp.update(0);
    expect(u.value).toBeCloseTo(mid);
    lamp.update(0.1);
    expect(u.value).toBeGreaterThan(mid);
    lamp.update(1);
    expect(u.value).toBe(1);
  });

  it('cuts instantly when the duration is 0 (reduced motion)', () => {
    const u = { value: 1 };
    const lamp = createLamp(u, () => 0);
    lamp.toggle();
    lamp.update(0.016);
    expect(u.value).toBe(0);
  });

  it('does nothing on update when idle', () => {
    const u = { value: 1 };
    createLamp(u).update(1);
    expect(u.value).toBe(1);
  });
});
