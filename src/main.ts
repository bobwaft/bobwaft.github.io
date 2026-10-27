import { createRenderer, resizeToWindow } from './scene/renderer';
import { collectNames, loadScene } from './scene/loadScene';
import { collectRegistered, findMissingNames, MAIN_CAMERA_NAME } from './objects/registry';
import { applyLook, createLookControls, lookSettings } from './camera/lookControls';
import { createFocusController } from './camera/focusController';
import { createPoseTween } from './camera/focusTween';
import { createClickInput } from './interaction/clickInput';
import { createFocusPoseResolver } from './interaction/focusPoses';
import { hoverTarget } from './interaction/hover';
import { createHoverView } from './interaction/hoverView';
import { createPicker } from './interaction/picker';
import { initialState, transition, inFocusView, type AppEvent } from './interaction/stateMachine';
import { idlePoseKind, PORTRAIT_IDLE_POSE, poseFromLookAt } from './camera/poses';
import { createDebugCamera, type DebugCamera } from './ui/debugCamera';
import { createDebugFps } from './ui/debugFps';
import { showFallback } from './ui/fallback';
import { fallbackReason } from './ui/fallbackReason';
import { createBackButton } from './ui/backButton';
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
  const registered = collectRegistered(scene);
  const picker = createPicker(camera, canvas, registered);
  const focusPose = createFocusPoseResolver(scene, camera, () => poses.landscape.position);
  const focusCtrl = createFocusController({
    tween: poseTween,
    idlePose: () => poses[poseKind],
    focusPose,
    seconds: () => settings.focusSeconds,
    onArrived: () => dispatch({ type: 'arrived' }),
  });
  const hoverView = createHoverView(canvas, registered);
  const backButton = createBackButton(() => dispatch({ type: 'back' }));
  let app = initialState();
  const dispatch = (event: AppEvent) => {
    const result = transition(app, event);
    app = result.state;
    const action = result.action;
    if (action?.type === 'focus') {
      if (!focusCtrl.enter(action.id)) app = { kind: 'idle' };
    } else if (action?.type === 'exit') {
      focusCtrl.exit();
    } else if (action?.type === 'activate') {
      for (const m of registered.values()) if (m.id === action.id) m.onClick?.();
    }
    hoverView.show(null); // hover only exists in idle; a state change clears it
    applyLookRange();
    backButton.setVisible(inFocusView(app));
  };
  // Slight parallax while a focus view is open (D-3); the full idle range otherwise.
  const applyLookRange = () =>
    look.setRange(inFocusView(app) ? settings.focusRange : settings.range);
  const onResize = () => {
    resizeToWindow(renderer, camera);
    if (debugCamera) return;
    const kind = idlePoseKind(aspectNow());
    if (kind !== poseKind) {
      poseKind = kind;
      focusCtrl.retarget(settings.poseTweenSeconds);
    } else if (app.kind !== 'idle') {
      focusCtrl.retarget(); // refit the focus pose to the new aspect
    }
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let settings = lookSettings(reducedMotion.matches);
  const look = createLookControls(canvas, { range: settings.range, damping: settings.damping });
  const onMotionChange = () => {
    settings = lookSettings(reducedMotion.matches);
    applyLookRange();
    look.setDamping(settings.damping);
    // Switching to reduced motion cuts a pose move that is already running.
    if (poseTween.active && settings.poseTweenSeconds === 0) focusCtrl.retarget();
  };
  reducedMotion.addEventListener('change', onMotionChange);
  let disposeClicks = () => {};
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
    if (!debugCamera) {
      disposeClicks = createClickInput(canvas, (x, y) => {
        const module = picker.pick(x, y);
        dispatch({
          type: 'click',
          hit: module ? { id: module.id, hasFocus: !!module.focus } : null,
        });
      });
    }
    if (!debugCamera) {
      const onHover = (e: PointerEvent) => {
        const module = picker.pick(e.clientX, e.clientY);
        const id = hoverTarget(app, e.pointerType, module?.id ?? null);
        hoverView.show(id ? module : null, e.clientX, e.clientY);
      };
      const onLeave = () => hoverView.show(null);
      canvas.addEventListener('pointermove', onHover);
      canvas.addEventListener('pointerleave', onLeave);
      const prev = disposeClicks;
      disposeClicks = () => {
        prev();
        canvas.removeEventListener('pointermove', onHover);
        canvas.removeEventListener('pointerleave', onLeave);
      };
    }
    dispatch({ type: 'loaded' });
    renderer.render(scene, camera); // first frame before the fade
    const debugFps = createDebugFps(renderer);
    let last: number | null = null;
    renderer.setAnimationLoop((time: number) => {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.1);
      last = time;
      if (debugCamera) {
        debugCamera.update();
      } else {
        focusCtrl.step(dt);
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
    disposeClicks();
    backButton.dispose();
    hoverView.dispose();
    debugCamera?.dispose();
    renderer.setAnimationLoop(null);
    renderer.dispose();
    return showFallback('load-failed', err);
  }
}

boot().catch((err) => showFallback('load-failed', err));
