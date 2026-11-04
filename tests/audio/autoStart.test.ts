import { describe, expect, it, vi } from 'vitest';
import { createAutoStart, type GestureTarget } from '../../src/audio/autoStart';

function fakeTarget() {
  const handlers = new Map<string, Set<(e: { key?: string }) => void>>();
  const target: GestureTarget = {
    addEventListener: (type, fn) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(fn);
    },
    removeEventListener: (type, fn) => void handlers.get(type)?.delete(fn),
  };
  const fire = (type: string, e: { key?: string } = {}) =>
    [...(handlers.get(type) ?? [])].forEach((fn) => fn(e));
  const count = () => [...handlers.values()].reduce((n, s) => n + s.size, 0);
  return { target, fire, count };
}

describe('createAutoStart', () => {
  const later = (fn: () => void) => fn(); // run the deferred check immediately

  it('starts music on the first pointer release', () => {
    const { target, fire } = fakeTarget();
    const start = vi.fn();
    createAutoStart(target, { shouldStart: () => true, start, defer: later });
    fire('pointerup');
    expect(start).toHaveBeenCalledOnce();
  });

  it('starts only once, however many gestures follow', () => {
    const { target, fire, count } = fakeTarget();
    const start = vi.fn();
    createAutoStart(target, { shouldStart: () => true, start, defer: later });
    fire('pointerup');
    fire('keydown', { key: 'a' });
    fire('pointerup');
    expect(start).toHaveBeenCalledOnce();
    expect(count()).toBe(0);
  });

  it('does nothing when the visitor already switched it on (clicked the speaker first)', () => {
    const { target, fire } = fakeTarget();
    const start = vi.fn();
    createAutoStart(target, { shouldStart: () => false, start, defer: later });
    fire('pointerup');
    expect(start).not.toHaveBeenCalled();
  });

  it('checks shouldStart after the gesture has been handled, not during it', () => {
    const { target, fire } = fakeTarget();
    const start = vi.fn();
    let on = false;
    let run: () => void = () => {};
    createAutoStart(target, { shouldStart: () => !on, start, defer: (fn) => (run = fn) });
    fire('pointerup');
    on = true; // the click handler turned it on in the same gesture
    run();
    expect(start).not.toHaveBeenCalled();
  });

  it('ignores Escape (it does not unlock audio) and keeps waiting', () => {
    const { target, fire } = fakeTarget();
    const start = vi.fn();
    createAutoStart(target, { shouldStart: () => true, start, defer: later });
    fire('keydown', { key: 'Escape' });
    expect(start).not.toHaveBeenCalled();
    fire('keydown', { key: 'Enter' });
    expect(start).toHaveBeenCalledOnce();
  });

  it('dispose removes the listeners', () => {
    const { target, fire, count } = fakeTarget();
    const start = vi.fn();
    const auto = createAutoStart(target, { shouldStart: () => true, start, defer: later });
    auto.dispose();
    fire('pointerup');
    expect(start).not.toHaveBeenCalled();
    expect(count()).toBe(0);
  });
});
