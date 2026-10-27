import { createRenderer, resizeToWindow } from './scene/renderer';
import { collectNames, loadScene } from './scene/loadScene';
import { findMissingNames } from './objects/registry';
import { showFallback } from './ui/fallback';
import { fallbackReason } from './ui/fallbackReason';
import { createLoadingScreen } from './ui/loading';

async function boot(): Promise<void> {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const reason = fallbackReason(canvas.getContext('webgl2') !== null);
  if (reason) return showFallback(reason);

  let renderer;
  try {
    renderer = createRenderer(canvas);
  } catch (err) {
    return showFallback('no-webgl2', err);
  }

  const loading = createLoadingScreen();
  let loaded;
  try {
    loaded = await loadScene();
  } catch (err) {
    renderer.dispose();
    return showFallback(fallbackReason(true, err) ?? 'load-failed', err);
  }
  const { scene, camera } = loaded;
  for (const name of findMissingNames(collectNames(loaded.scene))) {
    console.error(`Missing expected scene object: ${name}`);
  }
  loading.markSceneResolved();
  await loading.whenReady;

  resizeToWindow(renderer, camera);
  window.addEventListener('resize', () => resizeToWindow(renderer, camera));
  renderer.render(scene, camera); // first frame before the fade
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  loading.fadeOut();
}

boot().catch((err) => showFallback('load-failed', err));
