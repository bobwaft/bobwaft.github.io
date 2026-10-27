import { createRenderer, resizeToWindow } from './scene/renderer';
import { collectNames, loadScene } from './scene/loadScene';
import { findMissingNames, MAIN_CAMERA_NAME } from './objects/registry';
import { applyLook, createLookControls, lookSettings } from './camera/lookControls';
import { createPoseTween } from './camera/focusTween';
import { idlePoseKind, PORTRAIT_IDLE_POSE, poseFromLookAt } from './camera/poses';
import { createDebugCamera, type DebugCamera } from './ui/debugCamera';
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

  const poses = {
    landscape: { position: camera.position.clone(), quaternion: camera.quaternion.clone() },
    portrait: poseFromLookAt(PORTRAIT_IDLE_POSE.position, PORTRAIT_IDLE_POSE.target),
  };
  const aspectNow = () => window.innerWidth / Math.max(1, window.innerHeight);
  let poseKind = idlePoseKind(aspectNow());
  const poseTween = createPoseTween(poses[poseKind]);
  const base = poseTween.current;
  let debugCamera: DebugCamera | null = null;
  const onResize = () => {
    resizeToWindow(renderer, camera);
    if (debugCamera) return;
    const kind = idlePoseKind(aspectNow());
    if (kind === poseKind) return;
    poseKind = kind;
    poseTween.start(base, poses[kind], settings.poseTweenSeconds);
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let settings = lookSettings(reducedMotion.matches);
  const look = createLookControls(canvas, { range: settings.range });
  const onMotionChange = () => {
    settings = lookSettings(reducedMotion.matches);
    look.setRange(settings.range);
  };
  reducedMotion.addEventListener('change', onMotionChange);
  try {
    onResize();
    window.addEventListener('resize', onResize);
    applyLook(camera, base, 0, 0);
    debugCamera = createDebugCamera(
      camera,
      canvas,
      () => `aspect: ${camera.aspect.toFixed(3)}, pose: ${poseKind}`,
    );
    look.setEnabled(!debugCamera);
    renderer.render(scene, camera); // first frame before the fade
    const debugFps = createDebugFps();
    let last: number | null = null;
    renderer.setAnimationLoop((time: number) => {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.1);
      last = time;
      if (debugCamera) {
        debugCamera.update();
      } else {
        poseTween.step(dt);
        const { yaw, pitch } = look.update(dt);
        applyLook(camera, base, yaw, pitch);
      }
      renderer.render(scene, camera);
      debugFps?.();
    });
    loading.fadeOut();
  } catch (err) {
    window.removeEventListener('resize', onResize);
    reducedMotion.removeEventListener('change', onMotionChange);
    look.dispose();
    debugCamera?.dispose();
    renderer.setAnimationLoop(null);
    renderer.dispose();
    return showFallback('load-failed', err);
  }
}

boot().catch((err) => showFallback('load-failed', err));
