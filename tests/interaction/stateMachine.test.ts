import { describe, expect, it } from 'vitest';
import {
  backButtonVisible,
  inFocusView,
  lifecycleHooks,
  initialState,
  transition,
  type AppState,
} from '../../src/interaction/stateMachine';

const laptop = { id: 'laptop', hasFocus: true };
const papers = { id: 'papers', hasFocus: true };
const speaker = { id: 'speaker', hasFocus: false };

const idle: AppState = { kind: 'idle' };
const focused: AppState = { kind: 'focused', id: 'laptop' };
const tIn: AppState = { kind: 'transitioning-in', id: 'laptop' };
const tOut: AppState = { kind: 'transitioning-out', id: 'laptop' };

describe('state machine', () => {
  it('starts in loading and moves to idle when loaded', () => {
    expect(initialState()).toEqual({ kind: 'loading' });
    expect(transition(initialState(), { type: 'loaded' })).toEqual({ state: idle });
  });

  it('ignores clicks while loading', () => {
    const s = initialState();
    expect(transition(s, { type: 'click', hit: laptop })).toEqual({ state: s });
  });

  it('idle: clicking an object with a focus view starts transitioning-in', () => {
    expect(transition(idle, { type: 'click', hit: laptop })).toEqual({
      state: tIn,
      action: { type: 'focus', id: 'laptop' },
    });
  });

  it('idle: clicking an instant object stays idle and activates it', () => {
    expect(transition(idle, { type: 'click', hit: speaker })).toEqual({
      state: idle,
      action: { type: 'activate', id: 'speaker' },
    });
  });

  it('idle: misses, content clicks, back and esc do nothing', () => {
    for (const e of [
      { type: 'click', hit: null },
      { type: 'click', hit: 'content' },
      { type: 'back' },
      { type: 'esc' },
    ] as const) {
      expect(transition(idle, e)).toEqual({ state: idle });
    }
  });

  it('transitioning-in arrives at focused', () => {
    expect(transition(tIn, { type: 'arrived' })).toEqual({ state: focused });
  });

  it('transitioning-out arrives at idle', () => {
    expect(transition(tOut, { type: 'arrived' })).toEqual({ state: idle });
  });

  it('focused: back, esc, a miss, and another object all exit', () => {
    for (const e of [
      { type: 'back' },
      { type: 'esc' },
      { type: 'click', hit: null },
      { type: 'click', hit: papers },
      { type: 'click', hit: speaker },
    ] as const) {
      expect(transition(focused, e)).toEqual({ state: tOut, action: { type: 'exit' } });
    }
  });

  it('focused: clicking the focused object or its content does nothing', () => {
    expect(transition(focused, { type: 'click', hit: laptop })).toEqual({ state: focused });
    expect(transition(focused, { type: 'click', hit: 'content' })).toEqual({ state: focused });
  });

  it('ignores clicks, back and esc while transitioning', () => {
    for (const s of [tIn, tOut]) {
      for (const e of [
        { type: 'click', hit: papers },
        { type: 'click', hit: null },
        { type: 'back' },
        { type: 'esc' },
      ] as const) {
        expect(transition(s, e)).toEqual({ state: s });
      }
    }
  });

  it('ignores arrived when not transitioning', () => {
    expect(transition(idle, { type: 'arrived' })).toEqual({ state: idle });
    expect(transition(focused, { type: 'arrived' })).toEqual({ state: focused });
  });
});

describe('inFocusView', () => {
  it('is true while moving in and while focused only', () => {
    expect(inFocusView(tIn)).toBe(true);
    expect(inFocusView(focused)).toBe(true);
    expect(inFocusView(tOut)).toBe(false);
    expect(inFocusView(idle)).toBe(false);
    expect(inFocusView(initialState())).toBe(false);
  });
});

describe('backButtonVisible', () => {
  it('is true only when focused', () => {
    expect(backButtonVisible(focused)).toBe(true);
    for (const s of [idle, tIn, tOut, initialState()]) expect(backButtonVisible(s)).toBe(false);
  });
  it('back and esc are still ignored while transitioning in', () => {
    expect(transition(tIn, { type: 'back' })).toEqual({ state: tIn });
    expect(transition(tIn, { type: 'esc' })).toEqual({ state: tIn });
  });
});

describe('lifecycleHooks', () => {
  it('reports enter when focus arrives', () => {
    const r = transition(tIn, { type: 'arrived' });
    expect(lifecycleHooks(tIn, r)).toEqual({ enter: 'laptop' });
  });
  it('reports exit when the exit starts', () => {
    const r = transition(focused, { type: 'esc' });
    expect(lifecycleHooks(focused, r)).toEqual({ exit: 'laptop' });
  });
  it('reports nothing otherwise', () => {
    expect(lifecycleHooks(tOut, transition(tOut, { type: 'arrived' }))).toEqual({});
    expect(lifecycleHooks(idle, transition(idle, { type: 'click', hit: laptop }))).toEqual({});
    expect(lifecycleHooks(focused, transition(focused, { type: 'back' })).enter).toBeUndefined();
  });
});
