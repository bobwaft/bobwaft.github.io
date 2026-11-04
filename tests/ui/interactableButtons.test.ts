import { describe, expect, it } from 'vitest';
import { buttonsEnabled, focusTargetAfter, orderByScreenX } from '../../src/ui/interactableButtons';

describe('orderByScreenX', () => {
  it('sorts ids left to right, ties by id', () => {
    const xs = new Map([
      ['speaker', 700],
      ['laptop', 100],
      ['pullcord', 700],
      ['papers', 300],
    ]);
    expect(orderByScreenX(xs)).toEqual(['laptop', 'papers', 'pullcord', 'speaker']);
  });
  it('handles an empty map', () => {
    expect(orderByScreenX(new Map())).toEqual([]);
  });
});

describe('buttonsEnabled', () => {
  it('is true only in idle', () => {
    expect(buttonsEnabled({ kind: 'idle' })).toBe(true);
    expect(buttonsEnabled({ kind: 'loading' })).toBe(false);
    expect(buttonsEnabled({ kind: 'focused', id: 'laptop' })).toBe(false);
    expect(buttonsEnabled({ kind: 'transitioning-in', id: 'laptop' })).toBe(false);
    expect(buttonsEnabled({ kind: 'transitioning-out', id: 'laptop' })).toBe(false);
  });
});

describe('focusTargetAfter', () => {
  const idle = { kind: 'idle' } as const;
  const focused = { kind: 'focused', id: 'papers' } as const;
  const going = { kind: 'transitioning-in', id: 'papers' } as const;
  const out = { kind: 'transitioning-out', id: 'papers' } as const;

  it('moves to Back when a view the keyboard opened arrives', () => {
    expect(focusTargetAfter(going, focused, 'papers', 'body')).toBe('back');
    expect(focusTargetAfter(going, focused, 'papers', 'button')).toBe('back');
  });
  it('leaves focus alone on arrival for a pointer-opened view or if the user moved it', () => {
    expect(focusTargetAfter(going, focused, null, 'body')).toBe('none');
    expect(focusTargetAfter(going, focused, 'papers', 'view')).toBe('none');
  });
  it('returns to the opener on idle when focus was inside the view, on Back, or lost', () => {
    for (const where of ['view', 'back', 'body'] as const) {
      expect(focusTargetAfter(out, idle, 'papers', where)).toBe('opener');
    }
  });
  it('does not steal focus on idle with no opener or focus on a button', () => {
    expect(focusTargetAfter(out, idle, null, 'body')).toBe('none');
    expect(focusTargetAfter(out, idle, 'papers', 'button')).toBe('none');
  });
  it('does nothing on other transitions', () => {
    expect(focusTargetAfter(idle, going, 'papers', 'button')).toBe('none');
    expect(focusTargetAfter({ kind: 'loading' }, idle, null, 'body')).toBe('none');
  });
});
