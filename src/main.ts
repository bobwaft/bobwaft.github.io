import { createRenderer, resizeToWindow } from './scene/renderer';
import { collectNames, loadScene } from './scene/loadScene';
import { findMissingNames, MAIN_CAMERA_NAME } from './objects/registry';
import { createDebugFps } from './ui/debugFps';
import { showFallback } from './ui/fallback';
import { fallbackReason } from './ui/fallbackReason';
import { createLoadingScreen } from './ui/loading';

async function boot(): Promise<void> {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  // createRenderer requests the WebGL2 context itself and throws when it's missing.
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
  if (camera.name !== MAIN_CAMERA_NAME) {
    console.error(`Missing expected camera ${MAIN_CAMERA_NAME}; using ${camera.name || 'unnamed'}`);
  }
  for (const name of findMissingNames(collectNames(scene))) {
    console.error(`Missing expected scene object: ${name}`);
  }
  loading.markSceneResolved();
  await loading.whenReady;

  const onResize = () => resizeToWindow(renderer, camera);
  try {
    onResize();
    window.addEventListener('resize', onResize);
    renderer.render(scene, camera); // first frame before the fade
    const debugFps = createDebugFps();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
      debugFps?.();
    });
    loading.fadeOut();
  } catch (err) {
    window.removeEventListener('resize', onResize);
    renderer.setAnimationLoop(null);
    renderer.dispose();
    return showFallback('load-failed', err);
  }
}

boot().catch((err) => showFallback('load-failed', err));
