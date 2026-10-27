// Hover feedback choice (mouse only, idle only). Pure.
import type { AppState } from './stateMachine';

/** Id of the module to highlight, or null for none. */
export function hoverTarget(
  state: AppState,
  pointerType: string,
  hitId: string | null,
): string | null {
  if (state.kind !== 'idle' || pointerType !== 'mouse') return null;
  return hitId;
}
