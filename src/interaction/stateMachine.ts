// App state: loading -> idle <-> transitioning-in -> focused -> transitioning-out -> idle (A-6).
// Pure: no three.js or DOM. Transitions are returned as data for main.ts to act on.

export type AppState =
  | { kind: 'loading' }
  | { kind: 'idle' }
  | { kind: 'transitioning-in'; id: string }
  | { kind: 'focused'; id: string }
  | { kind: 'transitioning-out'; id: string };

/** What a click landed on: a registered object, the focused object's HTML content, or nothing. */
export type ClickHit = { id: string; hasFocus: boolean } | 'content' | null;

export type AppEvent =
  | { type: 'loaded' }
  | { type: 'click'; hit: ClickHit }
  | { type: 'back' }
  | { type: 'esc' }
  | { type: 'arrived' };

export type AppAction =
  { type: 'focus'; id: string } | { type: 'exit' } | { type: 'activate'; id: string };

export interface TransitionResult {
  state: AppState;
  action?: AppAction;
}

export function initialState(): AppState {
  return { kind: 'loading' };
}

/** Next state (and optional action) for an event; unhandled events leave the state unchanged. */
export function transition(state: AppState, event: AppEvent): TransitionResult {
  switch (state.kind) {
    case 'loading':
      return event.type === 'loaded' ? { state: { kind: 'idle' } } : { state };
    case 'idle': {
      if (event.type !== 'click' || event.hit === null || event.hit === 'content') {
        return { state };
      }
      const { id, hasFocus } = event.hit;
      if (!hasFocus) return { state, action: { type: 'activate', id } };
      return { state: { kind: 'transitioning-in', id }, action: { type: 'focus', id } };
    }
    case 'focused': {
      const exit: TransitionResult = {
        state: { kind: 'transitioning-out', id: state.id },
        action: { type: 'exit' },
      };
      if (event.type === 'back' || event.type === 'esc') return exit;
      if (event.type !== 'click') return { state };
      if (event.hit === 'content') return { state };
      if (event.hit !== null && event.hit.id === state.id) return { state };
      return exit;
    }
    case 'transitioning-in':
      return event.type === 'arrived' ? { state: { kind: 'focused', id: state.id } } : { state };
    case 'transitioning-out':
      return event.type === 'arrived' ? { state: { kind: 'idle' } } : { state };
  }
}
