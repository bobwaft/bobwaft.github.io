import { describe, expect, it } from 'vitest';
import { createAdaptivePixelRatio } from '../../src/scene/adaptivePixelRatio';

type Ctl = ReturnType<typeof createAdaptivePixelRatio>;

/** Feeds frames at a fixed fps for `seconds`; returns the ratio changes requested. */
function run(ctl: Ctl, state: { t: number }, fps: number, seconds: number, hidden = false) {
  const changes: number[] = [];
  const dt = 1000 / fps;
  const end = state.t + seconds * 1000;
  while (state.t < end) {
    state.t += dt;
    const r = ctl.frame(state.t, hidden);
    if (r !== null) changes.push(r);
  }
  return changes;
}

const make = () => createAdaptivePixelRatio({ initial: 2, max: 2, min: 0.6 });

describe('createAdaptivePixelRatio', () => {
  it('stays put at full speed', () => {
    expect(run(make(), { t: 0 }, 60, 30)).toEqual([]);
  });

  it('steps down after ~2 s under 50 fps', () => {
    const s = { t: 0 };
    const ctl = make();
    expect(run(ctl, s, 40, 1)).toEqual([]);
    const changes = run(ctl, s, 40, 3);
    expect(changes[0]).toBeCloseTo(1.5);
  });

  it('keeps stepping down but not below the floor', () => {
    const s = { t: 0 };
    const ctl = make();
    const changes = run(ctl, s, 20, 30);
    expect(changes.at(-1)).toBeCloseTo(0.6);
    expect(Math.min(...changes)).toBeGreaterThanOrEqual(0.6);
  });

  it('ignores hidden frames and gaps from tab switches', () => {
    const s = { t: 0 };
    const ctl = make();
    expect(run(ctl, s, 10, 10, true)).toEqual([]);
    run(ctl, s, 60, 1);
    s.t += 20000; // tab was away: one giant gap
    expect(ctl.frame(s.t, false)).toBeNull();
    expect(run(ctl, s, 60, 5)).toEqual([]);
  });

  it('steps back up after a long comfortable stretch', () => {
    const s = { t: 0 };
    const ctl = make();
    run(ctl, s, 40, 3); // down to 1.5
    const up = run(ctl, s, 60, 20);
    expect(up.length).toBeGreaterThan(0);
    expect(up[0]).toBeGreaterThan(1.5);
  });

  it('does not oscillate: gives up on a level that failed right after stepping up', () => {
    const s = { t: 0 };
    const ctl = make();
    const seen: number[] = [];
    let ratio = 2; // fast only at or below 1.5
    for (let i = 0; i < 300; i++) {
      const fps = ratio > 1.5 + 1e-9 ? 40 : 60;
      for (const r of run(ctl, s, fps, 1)) {
        ratio = r;
        seen.push(r);
      }
    }
    expect(seen).toHaveLength(3); // down, tried up, down again for good
    expect(ratio).toBeCloseTo(1.5);
  });
});
