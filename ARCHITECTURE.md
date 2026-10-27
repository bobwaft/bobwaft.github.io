# ARCHITECTURE — Architecture Decisions

_Last updated: 2026-10-27_

## Overview

A static single-page app. three.js renders the baked desk scene; a small interaction layer maps clicks on named scene objects to actions; content is HTML positioned onto 3D surfaces. Built with Vite and deployed to GitHub Pages.

```
            ┌─────────────── main.js ───────────────┐
            │  boot: renderer, loading screen, loop │
            └──┬──────────┬──────────┬──────────┬───┘
               │          │          │          │
          scene/      camera/    interaction/  content/
     (load GLB,     (look-around, (raycast,     (about, resume,
      lighting,      focus tweens) hover, focus  projects data
      post-fx)                     state machine) + HTML views)
               │                     │
               └────── objects/ ─────┘
          laptop · papers · notebook · speaker · pullcord
       (one module per interactable: focus pose + behaviour)
```

## Decisions

### A-1. Vite + TypeScript + three.js
**Why:** Vite needs no config, gives a fast dev server, and outputs static files for GitHub Pages. TypeScript (strict) catches mistakes in scene-object names and the three.js API early. No UI framework is needed for a handful of overlays. `scene-lighting.js` stays JavaScript (with `allowJs`) so it can still be replaced by Blender re-exports.
**Version:** pin an exact three.js version ≥ r160 (AgX tone mapping; `scene-lighting.js` needs r155+) and matching `@types/three`.
_Decided 2026-10-27 (spec audit G-1)._

### A-2. Use the Draco GLB and the provided `scene-lighting.js`
Load `desk_scene_draco.glb` (3.9 MB) via `loadDeskScene()`. Copy the export into `public/models/` (GLB) and `public/models/textures/` (lightmaps).
- Self-host the Draco decoder (copy from `three/examples/jsm/libs/draco/` into `public/draco/`) instead of the gstatic CDN default, so the site has no third-party runtime dependency.
- Keep `scene-lighting.js` close to the original so re-exports from Blender can be dropped in; local changes are listed in [MEMORY.md](MEMORY.md).
- **Decode multipliers are read at runtime from `textures/lightmap_scales.json`** (the bake's source of truth) rather than hard-coded in `scene-lighting.js`. This is the one deliberate local change to the file (resolves ISSUE-1).
- The lighting uniforms (`lighting.uLight`, `uDay`, `uNight`) are the only API the rest of the app uses to change lighting.

### A-3. Object lookup by name
Interactables are found by their Blender names (`Click_Laptop`, `Click_Laptop_Screen`, `Click_Papers`, `Click_Notebook`, `Click_Speaker`, `Click_PullCord`). A registry maps each name to an object module:

```js
// objects/registry.ts
{ name: 'Click_Laptop', module: laptop }   // module: { focusPose?, onClick, onEnter?, onExit?, update? }
```
Raycasts test against the registered objects only (their meshes, recursively). A hit on a child mesh resolves upward to the nearest registered ancestor. Missing names are logged as errors at load time, so Blender renames are caught immediately.

### A-4. HTML content on 3D surfaces via `CSS3DRenderer`
Content views (about page, notebook spreads, and the resume viewer from A-15) are DOM elements rendered with three.js `CSS3DRenderer`, layered over the WebGL canvas and aligned to the target surface (laptop screen plane, top paper sheet, notebook pages).
- **Why:** real DOM gives crisp text, links, scrolling, selection, and accessibility (D-5). Since content is only interactive in focus views (camera head-on, nothing in front), the usual CSS3D occlusion problem does not arise.
- Element size and CSS3DObject scale are derived from the target mesh's bounding box so the DOM fits the surface exactly.
- In the idle view the CSS3D layer is hidden; the laptop screen shows a static texture (`M_Screen` map swapped for a preview image) instead.
- **Fallback option if alignment is poor:** project the surface's four corners to screen space and position a plain overlay with a CSS `matrix3d` transform — same idea, fewer moving parts.

### A-5. Camera controller with two modes
- **Look mode (idle):**
  - target yaw/pitch = clamp(input × range); actual rotation eases toward the target each frame (frame-rate independent damping).
  - Input is mouse NDC, or accumulated drag on touch. A pointer that moves < 10 px between down and up counts as a click/tap.
  - The base pose is `Cam_Main` on landscape screens, or a hand-tuned **portrait idle pose** when aspect < 1. Crossing that threshold on resize or rotation tweens to the other pose.
- **Focus mode:**
  - A tween drives position + quaternion (slerp) from the current pose to the object's focus pose, and back.
  - While focused, look mode runs with a tiny range (~1–2°) as parallax.
- **Focus poses** are defined per object as a lookAt target, a view direction, and the content surface size. The camera distance is computed from FOV and aspect so the surface fits the viewport, then fine-tuned by hand. This handles portrait without separate poses.
- A debug flag (`?debug`) shows a free-orbit camera and prints poses, for tuning.
- Tweens: a tiny in-house tween helper (or `@tweenjs/tween.js`) — decided at implementation time; keep it to one.

### A-6. App state machine
A single state machine owns interaction state so input handling stays simple:

```
loading → idle ⇄ transitioning-in → focused(object) → transitioning-out → idle
```
- Clicks are ignored unless in `idle`, except in `focused`, where the Back button, `Esc`, and any click that misses both the focused object and its content element trigger `transitioning-out`. Clicking another interactable while focused counts as a miss.
- There is no URL routing: state lives only in memory and the URL never changes (D-14).
- Speaker and pull cord are "instant" interactables: they run their action in `idle` without leaving it.
- Pure logic (transitions, guards) is kept free of three.js so it can be unit-tested.

### A-7. Content as data
```
src/content/
  about.md            # rendered on the laptop
  projects/*.md       # one file per project; front matter: title, dates, tags, links, media, order
  playlist.json       # list of track URLs under public/audio/
public/resume.pdf     # rendered on the paper AND downloadable (single source, D-11)
public/projects/      # project media: WebP ≤ 300 KB, MP4/WebM clips ≤ 3 MB
public/audio/         # music (provided by owner later)
```
Markdown is converted to HTML (e.g. `marked`) and the same content feeds both the 3D views and the plain HTML fallback (D-12). A unit test enforces the media size limits and required front-matter fields.

### A-8. Notebook opening
The exported notebook is a single `Click_Notebook` object (plus elastic band); it likely has no separate cover. Plan: add a procedural cover/page pair in three.js (thin boxes hinged at the spine, textured to match) that animates open over the notebook, hiding the band. Alternative: re-export the notebook from Blender with a separate cover object and pivot at the spine. See open question in [MEMORY.md](MEMORY.md).

### A-9. Audio
- A single `HTMLAudioElement` is started on the speaker click, which satisfies the browser user-gesture rule.
- The track list comes from `src/content/playlist.json`. A pure shuffle-bag module (unit-tested) gives each track once in random order, then reshuffles, never repeating the last track first. On `ended`, the next track starts.
- Volume fades in/out over ~0.5 s.
- On `visibilitychange` → hidden, pause; when visible again, resume if music was on.
- If the playlist is empty, clicking the speaker logs a warning and does nothing.

### A-10. Post-processing
three.js `EffectComposer` with `UnrealBloomPass` (bulb, street lamps, city windows), a film-grain pass, and a vignette, followed by an `OutputPass` for tone mapping/colour space. Note: `scene-lighting.js` shaders include `tonemapping_fragment`/`colorspace_fragment`; when switching to a composer, verify tone mapping is not applied twice (see [MEMORY.md](MEMORY.md)).

### A-11. Hosting and deployment
GitHub Pages user site (`bobwaft.github.io`), no custom domain. A GitHub Actions workflow (`actions/deploy-pages`) builds with Vite and deploys `dist/` on every push to `main`. Vite `base` is `/` (user site, not project site). 3D assets (~14 MB) are committed as plain git files, without LFS.
_Decided 2026-10-27 (spec audit G-5, G-7)._

### A-12. Testing
- **Unit (Vitest):** state machine, look-around clamp/damping math, content parsing (Markdown + front matter → view model), object registry validation.
- **Manual (per phase "You test" lists in IMPLEMENTATION.md):** visuals, animations, feel, browsers.

### A-14. Fallback pre-rendered into index.html, with auto-switch
- At build time, a small Vite plugin (`transformIndexHtml`) renders `about.md` and `projects/*.md` into a `<main id="fallback">` section of `index.html`, with a link to `resume.pdf`. This is the content crawlers and no-JS visitors see.
- When the 3D view starts successfully, `#fallback` gets `hidden` (still in the DOM for crawlers, out of the accessibility tree while the 3D view is used).
- `ui/fallback.ts` switches to the fallback when:
  - WebGL2 is missing;
  - the loader rejects;
  - or a frame-time monitor sees a median below 25 fps over a 5 s window after load (ignored while the tab is hidden).

  When it switches automatically, it shows "Try 3D anyway", which sets a `sessionStorage` flag that disables the fps check for the rest of the session.
- A visible "Skip the 3D" link is always available.

### A-15. Resume rendered from the PDF with pdf.js
- `pdfjs-dist` is lazy-loaded (dynamic `import()`) after the scene is interactive, so it isn't part of the initial load.
- **Idle view:** page 1 is rendered to a canvas at a modest resolution and used as a `CanvasTexture` on the top sheet (via the paper's existing UVs, or a thin plane laid on top if the UVs don't suit).
- **Focus view:** the current page is rendered to a canvas at device pixel ratio × fit scale, plus pdf.js's **text layer** for selection, inside the CSS3D element on the top sheet (A-4). Next/prev controls page through multi-page PDFs.
- The Download button is an `<a href="/resume.pdf" download>`.

### A-13. Engineering conventions
_Decided 2026-10-27 (spec audit G-2, G-3, G-4)._

**Commands**
```
npm run dev        # Vite dev server
npm run build      # tsc --noEmit && vite build → dist/
npm run preview    # serve dist/ locally
npm test           # vitest run
npm run lint       # eslint . && prettier --check .
npm run format     # prettier --write .
```

**Code style**
- TypeScript `strict`. ESLint (typescript-eslint recommended) + Prettier (defaults, single quotes, 100-col).
- Files `camelCase.ts`; types/classes `PascalCase`; constants `UPPER_SNAKE`.
- Blender object names (`Click_*`, `Env_*`) only appear in `objects/registry.ts`, never as strings scattered through the code.
- Pure logic (state machine, math, content parsing) has no three.js or DOM imports, so it's unit-testable.

**Testing**
- Vitest unit tests in `tests/`, mirroring `src/`. Every pure-logic module has tests; visuals are verified by each phase's "You test" list.
- CI runs `lint`, `test`, and `build` before deploying; a failure blocks the deploy.

**Boundaries**
- **Always:** run lint + tests before committing; keep content in `src/content/`; record bugs in BUGS.md and gotchas in MEMORY.md.
- **Ask first:** adding a runtime dependency; changing the CI/deploy workflow; editing `scene-lighting.js` beyond A-2; changing a decision recorded in DESIGN.md/ARCHITECTURE.md.
- **Never:** commit secrets or personal data not meant to be public; edit files in the Blender `export/` folder from this repo; skip or delete failing tests to get green.

## Directory layout (target)

```
index.html
src/
  main.ts                 boot, render loop, resize
  scene/   loadScene.ts, scene-lighting.js, postfx.ts
  camera/  lookControls.ts, focusTween.ts, poses.ts
  interaction/ stateMachine.ts, picker.ts (raycast + hover)
  objects/ registry.ts, laptop.ts, papers.ts, notebook.ts, speaker.ts, pullcord.ts
  content/ about.md, projects/*.md, playlist.json, render.ts
  audio/   shuffleBag.ts, player.ts
  ui/      loading.ts, backButton.ts, hint.ts, touchDots.ts, fallback.ts, fpsMonitor.ts
build/     prerenderFallback.ts (Vite plugin)
public/
  models/desk_scene_draco.glb, models/textures/*.png, models/textures/lightmap_scales.json
  draco/   (decoder files)
  resume.pdf, projects/, audio/
tests/
.github/workflows/deploy.yml
```
