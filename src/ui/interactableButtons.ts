// Keyboard and screen-reader surface for the scene (NFR-5): one hidden-but-focusable button per
// interactable. Focusing one shows the hover label + brighten at the object; activating one is a click.
import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import type { AppState } from '../interaction/stateMachine';
import type { HoverView } from '../interaction/hoverView';
import type { InteractableModule } from '../objects/types';
import { moduleCentres, ndcToScreen } from './touchDots';

/** Where keyboard focus sits, as far as the focus rules care. */
export type FocusWhere = 'button' | 'back' | 'view' | 'body';

/** Button ids left to right by projected screen x; ties fall back to id so the order is stable. */
export function orderByScreenX(xs: ReadonlyMap<string, number>): string[] {
  return [...xs.keys()].sort((a, b) => xs.get(a)! - xs.get(b)! || a.localeCompare(b));
}

/** The buttons are in the tab order only while the scene is idle. */
export function buttonsEnabled(state: AppState): boolean {
  return state.kind === 'idle';
}

/**
 * Where focus should go after a state change. `openerId` is the button that opened the current
 * view by keyboard (null otherwise); `where` is where focus is now. The nav hides during the
 * transition, so a keyboard-opened view usually arrives with focus lost to the body.
 */
export function focusTargetAfter(
  prev: AppState,
  next: AppState,
  openerId: string | null,
  where: FocusWhere,
): 'back' | 'opener' | 'none' {
  if (next.kind === 'focused' && prev.kind !== 'focused') {
    return openerId !== null && where !== 'view' ? 'back' : 'none';
  }
  if (next.kind === 'idle' && prev.kind !== 'idle' && prev.kind !== 'loading') {
    return openerId !== null && where !== 'button' ? 'opener' : 'none';
  }
  return 'none';
}

export interface InteractableButtons {
  /** Call after every state change, after the Back button is shown or hidden. */
  update(prev: AppState, next: AppState): void;
  /** Re-reads pressed states (speaker playing, lamp on). */
  refresh(): void;
  dispose(): void;
}

export interface ButtonOptions {
  modules: ReadonlyMap<string, InteractableModule>;
  registered: ReadonlyMap<Object3D, InteractableModule>;
  camera: PerspectiveCamera;
  hoverView: HoverView;
  backButton: () => HTMLElement | null;
  /** Same path as a pointer click on the object. */
  onActivate: (module: InteractableModule) => void;
  /** Pressed state for toggles; undefined for plain buttons. */
  pressed: (id: string) => boolean | undefined;
}

export function createInteractableButtons(o: ButtonOptions): InteractableButtons {
  const centres = moduleCentres(o.registered);
  const tmp = new Vector3();
  const screenOf = (id: string) => {
    const c = centres.get(id);
    return c ? ndcToScreen(tmp.copy(c).project(o.camera), innerWidth, innerHeight) : null;
  };
  const xs = new Map<string, number>();
  for (const id of o.modules.keys()) xs.set(id, screenOf(id)?.x ?? Infinity);

  const nav = document.createElement('nav');
  nav.id = 'interactables';
  nav.setAttribute('aria-label', 'Desk');
  nav.hidden = true;
  const buttons = new Map<string, HTMLButtonElement>();
  let openerId: string | null = null;
  for (const id of orderByScreenX(xs)) {
    const module = o.modules.get(id)!;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = module.label;
    b.addEventListener('focus', () => {
      const s = screenOf(id);
      o.hoverView.show(module, s?.x ?? 0, s?.y ?? 0, true);
    });
    b.addEventListener('blur', () => o.hoverView.show(null));
    b.addEventListener('click', () => {
      openerId = module.focus ? id : null;
      o.onActivate(module);
    });
    buttons.set(id, b);
    nav.appendChild(b);
  }
  document.body.appendChild(nav);

  const refresh = () => {
    for (const [id, b] of buttons) {
      const p = o.pressed(id);
      if (p === undefined) b.removeAttribute('aria-pressed');
      else b.setAttribute('aria-pressed', String(p));
    }
  };
  const whereNow = (): FocusWhere => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'body';
    if (nav.contains(a)) return 'button';
    if (a === o.backButton()) return 'back';
    return 'view';
  };
  return {
    update(prev, next) {
      const where = whereNow();
      nav.hidden = !buttonsEnabled(next);
      refresh();
      const target = focusTargetAfter(prev, next, openerId, where);
      if (target === 'back') o.backButton()?.focus();
      else if (target === 'opener' && openerId) buttons.get(openerId)?.focus();
      if (next.kind === 'idle') openerId = null;
    },
    refresh,
    dispose() {
      nav.remove();
    },
  };
}
