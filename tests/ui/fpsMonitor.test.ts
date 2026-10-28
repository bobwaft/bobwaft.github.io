import { describe, expect, it, vi } from 'vitest';
import {
  createFpsMonitor,
  FORCE_3D_KEY,
  isForce3d,
  medianFps,
  setForce3d,
} from '../../src/ui/fpsMonitor';

type Monitor = ReturnType<typeof createFpsMonitor>;

function feed(m: Monitor, s: { t: number }, fps: number, seconds: number, hidden = false) {
  const dt = 1000 / fps;
  const end = s.t + seconds * 1000;
  while (s.t < end) {
    s.t += dt;
    m.frame(s.t, hidden);
  }
}

describe('medianFps', () => {
  it('takes the median of per-frame fps from frame times', () => {
    expect(medianFps([100, 20, 20, 20, 20])).toBeCloseTo(50);
    expect(medianFps([100, 100, 100, 20, 20])).toBeCloseTo(10);
  });
  it('is the mean of the middle pair for even counts', () => {
    expect(medianFps([10, 20])).toBeCloseTo(75);
  });
  it('is null with no usable samples', () => {
    expect(medianFps([])).toBeNull();
    expect(medianFps([0, -1])).toBeNull();
  });
});

describe('createFpsMonitor', () => {
  it('triggers when median fps < 25 over 5 s', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 15, 4.5);
    expect(onSlow).not.toHaveBeenCalled();
    feed(m, s, 15, 1);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('does not trigger at 30 fps across several windows', () => {
    const onSlow = vi.fn();
    feed(createFpsMonitor({ onSlow, warmupMs: 0 }), { t: 0 }, 30, 20);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('triggers only once', () => {
    const onSlow = vi.fn();
    feed(createFpsMonitor({ onSlow, warmupMs: 0 }), { t: 0 }, 10, 30);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('a brief stutter does not trigger (median, not mean)', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 60, 2);
    feed(m, s, 5, 0.9);
    feed(m, s, 60, 2.2);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('ignores hidden frames and resets the window on visibility change', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 15, 4); // 4 s slow
    feed(m, s, 15, 10, true); // hidden: ignored
    feed(m, s, 60, 6); // window restarted, fast
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('the first frame after being hidden (huge dt) does not count', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 60, 1);
    s.t += 60000;
    m.frame(s.t, true);
    s.t += 60000;
    m.frame(s.t, false);
    feed(m, s, 60, 6);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('a long stall restarts the window instead of being sampled', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 60, 0.3);
    s.t += 60000; // tab was hidden, no frames and no hidden flag
    feed(m, s, 60, 6);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('a stall right after load does not give a ~0 fps median', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 60, 0.1);
    s.t += 30000;
    feed(m, s, 60, 6);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('ignores a slow warm-up period after load', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow }); // default 1 s warm-up
    const s = { t: 0 };
    feed(m, s, 5, 1); // compile hitches
    feed(m, s, 60, 6);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('still fires when slow after the warm-up', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow });
    feed(m, { t: 0 }, 10, 8);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('needs a minimum sample count before it can trigger', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0, windowMs: 1000, minSamples: 10 });
    const s = { t: 0 };
    feed(m, s, 5, 1.8); // 9 samples over the window: too few
    expect(onSlow).not.toHaveBeenCalled();
    feed(m, s, 5, 1);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('reset() restarts the window', () => {
    const onSlow = vi.fn();
    const m = createFpsMonitor({ onSlow, warmupMs: 0 });
    const s = { t: 0 };
    feed(m, s, 15, 4.5);
    m.reset();
    feed(m, s, 60, 6);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onSlow = vi.fn();
    feed(createFpsMonitor({ onSlow, disabled: true, warmupMs: 0 }), { t: 0 }, 5, 30);
    expect(onSlow).not.toHaveBeenCalled();
  });
});

describe('force-3D flag', () => {
  const fake = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  it('is unset by default, set after setForce3d', () => {
    const st = fake();
    expect(isForce3d(st)).toBe(false);
    setForce3d(st);
    expect(isForce3d(st)).toBe(true);
    expect(st.getItem(FORCE_3D_KEY)).toBe('1');
  });

  it('survives storage that throws or is missing', () => {
    const deny = () => {
      throw new Error('denied');
    };
    const bad = { getItem: deny, setItem: deny };
    expect(isForce3d(bad)).toBe(false);
    expect(() => setForce3d(bad)).not.toThrow();
    expect(isForce3d(null)).toBe(false);
    expect(() => setForce3d(null)).not.toThrow();
  });
});
