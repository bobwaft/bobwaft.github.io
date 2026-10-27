import { DefaultLoadingManager } from 'three';
import { isReady, monotonicProgress } from './loadingProgress';

export interface LoadingScreen {
  /** Call once loadScene() has resolved (its texture loads are queued by then). */
  markSceneResolved(): void;
  /** Resolves when the scene has resolved and no loader items are pending. */
  whenReady: Promise<void>;
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
