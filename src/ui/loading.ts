import { DefaultLoadingManager } from 'three';
import { isReady, monotonicProgress } from './loadingProgress';

/**
 * True when a key press should start the site from "Click to start": Enter or Space, not held
 * down, without modifiers, and not aimed at a focused control (Enter on "Skip the 3D" is a skip).
 */
export function isStartKey(e: {
  key: string;
  repeat: boolean;
  modified: boolean;
  onControl: boolean;
}): boolean {
  return (e.key === 'Enter' || e.key === ' ') && !e.repeat && !e.modified && !e.onControl;
}

export interface LoadingScreen {
  /** Call once loadScene() has resolved (its texture loads are queued by then). */
  markSceneResolved(): void;
  /** Resolves when the scene has resolved and no loader items are pending. */
  whenReady: Promise<void>;
  /** Swaps the progress bar for "Click to start"; resolves on a click or Enter/Space (a gesture). */
  promptStart(): Promise<void>;
  /** Fades the screen out (instantly under prefers-reduced-motion), then removes it. */
  fadeOut(): void;
  /** Removes the screen immediately (e.g. when switching to the fallback). */
  hide(): void;
}

/** Wires the #loading markup to THREE.DefaultLoadingManager. */
export function createLoadingScreen(): LoadingScreen {
  const root = document.getElementById('loading');
  const fill = document.getElementById('loading-fill');
  const label = document.getElementById('loading-pct');

  let loaded = 0;
  let total = 0;
  let shown = 0;
  let sceneResolved = false;
  let resolveReady: () => void = () => {};
  const whenReady = new Promise<void>((resolve) => (resolveReady = resolve));

  const update = (): void => {
    shown = monotonicProgress(shown, loaded, total);
    const pct = Math.round(shown * 100);
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}%`;
    if (isReady(sceneResolved, loaded, total)) resolveReady();
  };

  DefaultLoadingManager.onStart = (_url, itemsLoaded, itemsTotal) => {
    loaded = itemsLoaded;
    total = itemsTotal;
    update();
  };
  DefaultLoadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
    loaded = itemsLoaded;
    total = itemsTotal;
    update();
  };
  DefaultLoadingManager.onLoad = () => {
    loaded = total;
    update();
  };

  const remove = (): void => root?.remove();

  return {
    markSceneResolved() {
      sceneResolved = true;
      update();
    },
    whenReady,
    promptStart() {
      if (!root) return Promise.resolve();
      document.getElementById('loading-bar')?.remove();
      label?.remove();
      const prompt = document.createElement('p');
      prompt.id = 'start-prompt';
      prompt.textContent = 'Click to start';
      root.classList.add('ready');
      root.appendChild(prompt);
      // The whole screen is the target; Enter or Space also start it, for keyboard users.
      // Never resolves if the screen is removed first (Skip the 3D); the listeners go with it.
      return new Promise((resolve) => {
        const off = () => {
          root.removeEventListener('click', go);
          window.removeEventListener('keydown', onKey);
        };
        const go = () => {
          off();
          if (root.isConnected) resolve();
        };
        const onKey = (e: KeyboardEvent) => {
          if (!root.isConnected) return off();
          const target = e.target instanceof Element ? e.target : null;
          const startKey = isStartKey({
            key: e.key,
            repeat: e.repeat,
            modified: e.ctrlKey || e.altKey || e.metaKey,
            onControl: !!target?.closest('a, button, input, select, textarea'),
          });
          if (startKey) go();
        };
        root.addEventListener('click', go);
        window.addEventListener('keydown', onKey);
      });
    },
    fadeOut() {
      if (!root) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return remove();
      root.addEventListener('transitionend', remove, { once: true });
      root.classList.add('done');
      window.setTimeout(remove, 1000); // safety net if transitionend never fires
    },
    hide: remove,
  };
}
