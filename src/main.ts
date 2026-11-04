import { createPostFx } from './scene/postfx';
import { surfaceTint, tintKey } from './scene/surfaceTint';
import { sampleDisplayedColor } from './scene/paperSample';
import {
  adaptiveRatioAllowed,
  createRenderer,
  resizeToWindow,
  setAdaptiveRatio,
} from './scene/renderer';
import { collectNames, loadScene } from './scene/loadScene';
import type { InteractableModule } from './objects/types';
import {
  collectRegistered,
  findMissingNames,
  FOCUS_SURFACE_NAMES,
  MAIN_CAMERA_NAME,
  NOTEBOOK_BAND_NAME,
  NOTEBOOK_COVER_NAME,
} from './objects/registry';
import { applyLook, createLookControls, lookSettings } from './camera/lookControls';
import { createFocusController } from './camera/focusController';
import { createPoseTween } from './camera/focusTween';
import { dampZoom, NO_ZOOM, panBy, zoomAt, zoomedPose } from './camera/focusZoom';
import { stepZoom } from './resume/layout';
import { createClickInput } from './interaction/clickInput';
import { createFocusPoseResolver } from './interaction/focusPoses';
import { hoverTarget } from './interaction/hover';
import { createHoverView } from './interaction/hoverView';
import { createPicker } from './interaction/picker';
import {
  initialState,
  transition,
  inFocusView,
  backButtonVisible,
  lifecycleHooks,
  type AppEvent,
} from './interaction/stateMachine';
import { idlePoseKind, PORTRAIT_IDLE_POSE, poseFromLookAt } from './camera/poses';
import { createDebugCamera, type DebugCamera } from './ui/debugCamera';
import { createAdaptivePixelRatio } from './scene/adaptivePixelRatio';
import { busyWait, slowFrameMs } from './scene/slowFrames';
import { createFpsMonitor, isForce3d } from './ui/fpsMonitor';
import { createDebugFps } from './ui/debugFps';
import { showFallback } from './ui/fallback';
import { fallbackReason } from './ui/fallbackReason';
import { createBackButton } from './ui/backButton';
import { createInteractableButtons } from './ui/interactableButtons';
import { createTouchDots, isTouchPointerType } from './ui/touchDots';
import { showHint } from './ui/hint';
import { createLoadingScreen } from './ui/loading';
import { lighting, setTimeOfDay } from './scene/scene-lighting.js';
import { createLamp } from './objects/lamp';
import { pullcord } from './objects/pullcord';
import { speaker } from './objects/speaker';
import { timeFromClock } from './scene/timeOfDay';
import { createPlayer } from './audio/player';
import playlist from './content/playlist.json';
import { createNowPlaying } from './ui/nowPlaying';
import aboutSource from './content/about.md?raw';
import { parseAbout } from './content/render';
import { laptop } from './objects/laptop';
import { createLaptopScreen } from './objects/laptopScreen';
import { papers } from './objects/papers';
import { createPapersSheet, type PapersSheet } from './objects/papersSheet';
import type { ScreenLayer } from './ui/screenLayer';
import { parseProject, sortProjects, type Project } from './content/projects';
import { notebook } from './objects/notebook';
import { createNotebookBook, type NotebookBook } from './objects/notebookBook';
import { COVER_SECONDS } from './notebook/cover';
import { Quaternion, Vector2, Vector3, type Mesh, type Object3D, type Texture } from 'three';

// "Skip the 3D": set once the visitor asks for the simple site. A running scene is torn down
// through stopScene; a boot still loading checks `skipped` after each await and bails out.
// A click before this script ran followed the plain link, leaving #fallback in the URL.
let skipped = window.location.hash === '#fallback';
let stopScene: (() => void) | null = null;

document.getElementById('skip-3d')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (skipped) return;
  skipped = true;
  stopScene?.();
  showFallback('skipped');
});

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
    if (skipped) return;
    return showFallback(fallbackReason(true, err) ?? 'load-failed', err);
  }
  const { scene, camera } = loaded;
  if (skipped) {
    disposeScene(loaded.scene);
    renderer.dispose();
    return;
  }
  if (camera.name !== MAIN_CAMERA_NAME) {
    console.error(`Missing expected camera ${MAIN_CAMERA_NAME}; using ${camera.name || 'unnamed'}`);
  }
  for (const name of findMissingNames(collectNames(scene))) {
    console.error(`Missing expected scene object: ${name}`);
  }
  loading.markSceneResolved();
  await loading.whenReady;
  if (skipped) {
    disposeScene(scene);
    renderer.dispose();
    return;
  }

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
  let papersSheet: PapersSheet | null = null;
  // Camera zoom in the papers view: the target set by the controls, and the eased one shown.
  let zoomTarget = NO_ZOOM;
  let zoomShown = NO_ZOOM;
  const sheetZoom = {
    step(delta: number, anchor?: { x: number; y: number }) {
      zoomTarget = zoomAt(zoomTarget, stepZoom(zoomTarget.zoom, delta), anchor?.x, anchor?.y);
      return zoomTarget.zoom;
    },
    pan(dx: number, dy: number) {
      zoomTarget = panBy(zoomTarget, dx, dy);
    },
    reset() {
      zoomTarget = NO_ZOOM;
    },
  };
  const papersMesh = scene.getObjectByName(FOCUS_SURFACE_NAMES.papers) as Mesh | undefined;
  if (papersMesh?.isMesh) {
    const pdfUrl = `${import.meta.env.BASE_URL}resume.pdf`;
    papersSheet = createPapersSheet(papersMesh, scene, poses.landscape.position, pdfUrl, sheetZoom);
    papersSheet?.setSize(window.innerWidth, window.innerHeight);
  }
  papers.bind({ setContentVisible: (v) => papersSheet?.setContentVisible(v) });
  let notebookBook: NotebookBook | null = null;
  const coverMesh = scene.getObjectByName(NOTEBOOK_COVER_NAME) as Mesh | undefined;
  if (coverMesh?.isMesh) {
    notebookBook = createNotebookBook(
      coverMesh,
      scene.getObjectByName(NOTEBOOK_BAND_NAME) ?? null,
      poses.landscape.position,
      loadProjects(),
      () => (settings.poseTweenSeconds === 0 ? 0 : COVER_SECONDS),
    );
    notebookBook.setSize(window.innerWidth, window.innerHeight);
    const book = notebookBook;
    notebook.bind({
      open: (done) => book.open(done),
      close: (done) => book.close(done),
      setContentVisible: (v) => book.setContentVisible(v),
    });
  }
  const focusPose = createFocusPoseResolver(
    scene,
    camera,
    () => poses.landscape.position,
    (id) => {
      if (id === 'papers') return papersSheet?.up ?? null;
      return id === 'notebook' ? (notebookBook?.up ?? null) : null;
    },
    // The notebook frames its open spread, not the closed book.
    (id) => (id === 'notebook' ? (notebookBook?.points ?? null) : null),
  );
  const focusCtrl = createFocusController({
    tween: poseTween,
    idlePose: () => poses[poseKind],
    focusPose,
    seconds: () => settings.focusSeconds,
    onArrived: () => dispatch({ type: 'arrived' }),
  });
  const hoverView = createHoverView(canvas, registered);
  // Touch devices get discoverability dots; so does anything that sends a touch pointer.
  let touchSeen = window.matchMedia('(pointer: coarse)').matches;
  const onPointerType = (e: PointerEvent) => {
    if (isTouchPointerType(e.pointerType)) touchSeen = true;
  };
  window.addEventListener('pointerdown', onPointerType);
  const touchDots = createTouchDots(registered, camera, () => touchSeen);
  const backButton = createBackButton(() => dispatch({ type: 'back' }));
  // One module per id (the laptop is registered twice: body and screen).
  const modules = new Map([...registered.values()].map((m) => [m.id, m] as const));
  const forModule = (id: string, fn: (m: InteractableModule) => void) => {
    const m = modules.get(id);
    if (m) fn(m);
  };
  const lamp = createLamp(lighting.uLight, () => (settings.poseTweenSeconds === 0 ? 0 : 0.4));
  const cordObject = [...registered].find(([, m]) => m === pullcord)?.[0];
  pullcord.bind({ toggle: () => lamp.toggle(), object: cordObject });
  // The outside follows the visitor's local clock, set once at load; the window is inert (D-18).
  setTimeOfDay(timeFromClock(new Date()), scene);
  const nowPlaying = createNowPlaying(playlist);
  const player = createPlayer({
    tracks: playlist.map((t) => t.src),
    createAudio: () => new Audio(),
    doc: document,
    onChange: (playing) => nowPlaying.setVisible(playing),
    onTrack: (src) => nowPlaying.setTrack(src),
  });
  const speakerObject = [...registered].find(([, m]) => m === speaker)?.[0];
  speaker.bind({
    toggle: () => player.toggle(),
    isPlaying: () => player.isPlaying(),
    object: speakerObject,
  });
  let screenLayer: ScreenLayer | null = null;
  const screenMesh = scene.getObjectByName(FOCUS_SURFACE_NAMES.laptop) as Mesh | undefined;
  if (screenMesh?.isMesh) {
    screenLayer = createLaptopScreen(screenMesh, poses.landscape.position, parseAbout(aboutSource));
    screenLayer.setSize(window.innerWidth, window.innerHeight);
  }
  laptop.bind({ setContentVisible: (v) => screenLayer?.setVisible(v) });
  const updatable = [...new Set(registered.values())].filter((m) => m.update);
  const buttons = createInteractableButtons({
    modules,
    registered,
    camera,
    hoverView,
    backButton: () => document.getElementById('back-button'),
    onActivate: (m) => dispatch({ type: 'click', hit: { id: m.id, hasFocus: !!m.focus } }),
    pressed: (id) =>
      id === 'speaker' ? player.isPlaying() : id === 'pullcord' ? lamp.isOn : undefined,
  });
  let app = initialState();
  const dispatch = (event: AppEvent) => {
    const before = app;
    const result = transition(app, event);
    const hooks = lifecycleHooks(app, result);
    app = result.state;
    const action = result.action;
    if (action?.type === 'focus') {
      if (focusCtrl.enter(action.id)) touchDots.markUsed(action.id);
      else app = { kind: 'idle' };
    } else if (action?.type === 'exit') {
      // The camera waits for the object to finish leaving (the notebook closes first).
      const leaving = hooks.exit ? modules.get(hooks.exit)?.onExit?.() : undefined;
      if (leaving) void leaving.then(() => focusCtrl.exit());
      else focusCtrl.exit();
    } else if (action?.type === 'activate') {
      touchDots.markUsed(action.id);
      forModule(action.id, (m) => m.onClick?.());
    }
    if (hooks.enter) forModule(hooks.enter, (m) => m.onEnter?.());
    hoverView.show(null); // hover only exists in idle; a state change clears it
    applyLookRange();
    backButton.setVisible(backButtonVisible(app));
    buttons.update(before, app);
  };
  // Slight parallax while a focus view is open (D-3); the full idle range otherwise.
  const applyLookRange = () =>
    look.setRange(inFocusView(app) ? settings.focusRange : settings.range);
  const postfx = createPostFx(renderer, scene, camera);
  const onResize = () => {
    resizeToWindow(renderer, camera);
    const drawn = renderer.getSize(new Vector2());
    postfx.setSize(drawn.x, drawn.y, renderer.getPixelRatio());
    screenLayer?.setSize(window.innerWidth, window.innerHeight);
    papersSheet?.setSize(window.innerWidth, window.innerHeight);
    notebookBook?.setSize(window.innerWidth, window.innerHeight);
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
  const onVisibility = () => monitor?.reset();
  let monitor: ReturnType<typeof createFpsMonitor> | null = null;
  let tornDown = false;
  // Single teardown for both failure paths; the animation loop stops first.
  const teardown = () => {
    if (tornDown) return;
    tornDown = true;
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', onMotionChange);
    look.dispose();
    disposeClicks();
    backButton.dispose();
    touchDots.dispose();
    buttons.dispose();
    player.dispose();
    nowPlaying.dispose();
    document.getElementById('debug-fps')?.remove();
    window.removeEventListener('pointerdown', onPointerType);
    hoverView.dispose();
    screenLayer?.dispose();
    papersSheet?.dispose();
    notebookBook?.dispose();
    debugCamera?.dispose();
    postfx.dispose();
    disposeScene(scene);
    renderer.forceContextLoss();
    renderer.dispose();
  };
  stopScene = teardown;
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
        const module = picker.pick(x, y, TAP_SLOP_PX);
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
    postfx.render(0); // first frame before the fade
    const debugFps = createDebugFps(
      renderer,
      () => monitor?.status() ?? { state: 'warming', medianFps: null },
    );
    let last: number | null = null;
    const zoomPose = { position: new Vector3(), quaternion: new Quaternion() };
    const adaptive = adaptiveRatioAllowed()
      ? createAdaptivePixelRatio({
          initial: renderer.getPixelRatio(),
          max: renderer.getPixelRatio(),
        })
      : null;
    let pendingRatio: number | null = null;
    monitor = createFpsMonitor({
      disabled: isForce3d(),
      onSlow: () => {
        teardown();
        showFallback('slow');
      },
    });
    document.addEventListener('visibilitychange', onVisibility);
    let tintKeyShown = '';
    // The resume page takes the displayed colour of the paper, sampled from the frame (BUG-009).
    let paperDirty = true;
    let paperShown = false;
    window.addEventListener('resize', () => (paperDirty = true));
    const slowMs = slowFrameMs(window.location.search);
    renderer.setAnimationLoop((time: number) => {
      // ?slow test hook: fake a slow device (BUG-004).
      if (slowMs !== null) busyWait(slowMs);
      const hidden = document.hidden;
      // A pixel-ratio change clears the drawing buffer, so it is applied before this frame draws.
      if (pendingRatio !== null) {
        setAdaptiveRatio(pendingRatio);
        pendingRatio = null;
        resizeToWindow(renderer, camera);
        const drawn = renderer.getSize(new Vector2());
        postfx.setSize(drawn.x, drawn.y, renderer.getPixelRatio());
      }
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.1);
      last = time;
      if (debugCamera) {
        debugCamera.update();
      } else {
        focusCtrl.step(dt);
        const { yaw, pitch } = look.update(dt);
        zoomShown =
          settings.poseTweenSeconds === 0
            ? zoomTarget
            : dampZoom(zoomShown, zoomTarget, ZOOM_DAMPING, dt);
        const view = papersSheet
          ? zoomedPose(
              base,
              zoomShown,
              papersSheet.center,
              camera.fov * DEG,
              camera.aspect,
              zoomPose,
            )
          : base;
        // Parallax shrinks as the view zooms, so it moves the page the same on screen.
        applyLook(camera, view, yaw / zoomShown.zoom, pitch / zoomShown.zoom);
      }
      lamp.update(dt);
      const tint = surfaceTint({
        uDay: lighting.uDay.value,
        uNight: lighting.uNight.value,
        uLight: lighting.uLight.value,
      });
      const key = tintKey(tint);
      if (key !== tintKeyShown) {
        tintKeyShown = key;
        const root = document.documentElement.style;
        root.setProperty('--surface-light', tint.brightness.toFixed(3));
        root.setProperty('--surface-warm', tint.warmth.toFixed(3));
        paperDirty = true; // the lit paper changed (lamp, time of day)
      }
      player.update(dt);
      for (const m of updatable) m.update?.(dt);
      notebookBook?.update(dt);
      touchDots.update(app);
      postfx.render(dt);
      const onPapers = app.kind === 'focused' && app.id === 'papers';
      if (onPapers && papersSheet && (paperDirty || !paperShown)) {
        // Same task as the render, so the default framebuffer still holds the frame.
        const css = sampleDisplayedColor(
          renderer.getContext(),
          camera,
          papersSheet.samplePoints,
          window.innerWidth,
          window.innerHeight,
        );
        if (css) papersSheet.setPaperColor(css);
        paperDirty = false;
        paperShown = true;
      } else if (!onPapers) {
        paperShown = false; // sample again on the next arrival
      }
      screenLayer?.render(camera);
      papersSheet?.render(camera);
      notebookBook?.render(camera);
      debugFps?.();
      const next = adaptive?.frame(time, hidden);
      if (next != null) pendingRatio = next;
      monitor?.frame(time, hidden);
    });
    // The loading screen stays up until the resume is drawn on the sheet (A-15). load() settles
    // on failure too; the timeout keeps a stalled PDF from holding the site behind it.
    if (papersSheet) await Promise.race([papersSheet.load(), wait(RESUME_LOAD_TIMEOUT_MS)]);
    if (skipped) return;
    showHint(touchSeen);
    loading.fadeOut();
  } catch (err) {
    teardown();
    if (skipped) return;
    return showFallback('load-failed', err);
  }
}

/** Frees GPU resources held by every mesh in the scene. */
function disposeScene(scene: Object3D): void {
  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      for (const value of Object.values(mat)) {
        if (value && (value as Texture).isTexture) (value as Texture).dispose();
      }
      mat.dispose();
    }
  });
}

/** Projects from src/content/projects, strongest first; a file that fails to parse is skipped. */
function loadProjects(): Project[] {
  const sources = import.meta.glob<string>('./content/projects/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const projects: Project[] = [];
  for (const [path, source] of Object.entries(sources)) {
    try {
      projects.push(parseProject(source, path.replace(/^.*\/|\.md$/g, '')));
    } catch (err) {
      console.error(err);
    }
  }
  return sortProjects(projects);
}

const DEG = Math.PI / 180;
/** A click this close to an interactable's centre still hits it (thin pull cord, BUG-013). */
const TAP_SLOP_PX = 28;
/** Rate (1/s) the camera eases to a new zoom or pan; quicker than the look damping. */
const ZOOM_DAMPING = 12;

/** Longest the loading screen waits for the resume before showing the scene without it. */
const RESUME_LOAD_TIMEOUT_MS = 10_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (skipped) showFallback('skipped');
else boot().catch((err) => showFallback('load-failed', err));
