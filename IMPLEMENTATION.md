# IMPLEMENTATION — Phased Plan

_Last updated: 2026-10-27 (spec audit gaps resolved)_

Work through phases in order. Each phase ends with a **You test** checklist for manual verification. Tick items `- [ ]` → `- [x]` as they are done. Specs: [PRD.md](PRD.md) · decisions: [DESIGN.md](DESIGN.md), [ARCHITECTURE.md](ARCHITECTURE.md) · notes: [MEMORY.md](MEMORY.md) · bugs: [BUGS.md](BUGS.md).

---

## Phase 0 — Project setup

- [x] `git init`, add `.gitignore` (node_modules, dist), first commit with the docs
- [x] Scaffold Vite (`vanilla-ts` template), TypeScript strict + `allowJs`; install an exact three.js version ≥ r160, `@types/three`, and Vitest
- [x] ESLint (typescript-eslint) + Prettier; add the npm scripts from ARCHITECTURE A-13
- [x] Copy `desk_scene_draco.glb` → `public/models/`, `textures/*.png` + `lightmap_scales.json` → `public/models/textures/`, `scene-lighting.js` → `src/scene/`
- [x] Copy the Draco decoder from `three/examples/jsm/libs/draco/` → `public/draco/`
- [x] Change `scene-lighting.js` to read decode multipliers from `lightmap_scales.json` (ISSUE-1); unit-test the JSON → multipliers parsing
- [x] Create the directory layout from ARCHITECTURE.md (empty modules are fine)
- [x] GitHub Actions workflow: lint → test → build → deploy `dist/` to GitHub Pages on push to `main`
- [ ] Create the `bobwaft.github.io` repo on GitHub (if it doesn't exist), set Pages source to "GitHub Actions", push

### You test
- [x] `npm run dev` starts and shows a blank page with no console errors
- [x] `npm run build`, `npm test`, and `npm run lint` all succeed
- [ ] Pushing to `main` runs the workflow and deploys to https://bobwaft.github.io
- [ ] A deliberately failing test blocks the deploy (then revert it)

---

## Phase 1 — Render the scene

- [x] Renderer: WebGL2, `outputColorSpace = SRGBColorSpace`, `toneMapping = AgXToneMapping`, pixel ratio capped at 2, resize handling
- [x] Load the scene with `loadDeskScene('/models/desk_scene_draco.glb', '/models/textures/', '/draco/')`
- [x] Use `Cam_Main` (FOV, near/far, pose) as the camera; update aspect on resize
- [x] Apply a default time of day (`setTimeOfDay`) and **lamp on** (`lighting.uLight = 1`)
- [x] Loading screen with progress (GLB + textures via `LoadingManager`), fades out when ready
- [ ] Fallback triggers, first part: WebGL2 missing or loader rejects → show `#fallback` (placeholder content until Phase 9)
- [ ] Verify all `Click_*` names exist after load; log an error for any missing
- [ ] In-app fps readout under `?debug` (used for NFR-1 checks)

### You test
- [ ] The room renders and looks like the Blender preview (lighting, colours, outside view), with the lamp on
- [ ] Resizing the window keeps the image undistorted
- [ ] Loading screen appears on a throttled (25 Mbps) reload and disappears when the scene shows; scene is interactive in < 5 s
- [ ] With WebGL disabled (e.g. `chrome://flags` or a browser setting), the fallback placeholder shows instead
- [ ] No console errors or warnings

---

## Phase 2 — Look-around camera

- [ ] `lookControls`: input → target yaw/pitch, clamp to range, damp toward target (frame-rate independent) — unit tested
- [ ] Return to centre gently when the mouse leaves the window
- [ ] Touch: drag-to-look; tap/drag threshold of 10 px — unit tested
- [ ] Portrait idle pose (aspect < 1): tune with `?debug`, store in `poses.ts`; tween between landscape and portrait poses on resize/rotation
- [ ] `prefers-reduced-motion`: reduce range/smoothing per D-13
- [ ] `?debug` mode: free orbit camera + on-screen readout of camera position/target (for tuning poses)

### You test
- [ ] Moving the mouse pans the view smoothly; it stops at the edges of the allowed range
- [ ] The whole desk is visible and you can't look at the ceiling or floor
- [ ] On a phone in portrait, the whole desk is visible; rotating to landscape switches smoothly to the `Cam_Main` view
- [ ] On touch, dragging looks around and a short tap doesn't move the camera
- [ ] `?debug` lets you orbit freely and shows camera coordinates

---

## Phase 3 — Interaction framework

- [ ] App state machine (`loading → idle ⇄ transitioning → focused`) with guards, including outside-click and other-interactable-click → exit — unit tested
- [ ] Object registry + raycast picker against registered objects only (child → registered ancestor)
- [ ] Mouse hover feedback: pointer cursor + label + slight brighten on interactables
- [ ] Touch discoverability: pulsing dots on each interactable, each fading once that object has been used (session only)
- [ ] Focus tween: position + quaternion slerp to a pose and back, ease-in-out, ~1 s
- [ ] Focus poses: lookAt target + view direction + surface size; distance computed from FOV/aspect to fit the surface — unit tested; then hand-tune laptop, papers (top-down), notebook (top-down)
- [ ] Slight parallax (~1–2°) while focused
- [ ] Back button, `Esc`, and clicking outside the focused object/content all return to idle
- [ ] Ignore clicks while transitioning
- [ ] Reduced-motion variant of the focus transition
- [ ] One-time hint (mouse and touch wording)

### You test
- [ ] Hovering laptop, papers, notebook, speaker, and pull cord shows a pointer and label; other objects don't
- [ ] On a phone, dots mark the five interactables and each one's dot disappears after you use it
- [ ] Clicking laptop / papers / notebook moves the camera to a close-up that fits the object, in both landscape and portrait
- [ ] While focused, the mouse moves the view only very slightly
- [ ] Back button, `Esc`, clicking empty space, and clicking another object each return to the idle view smoothly
- [ ] Rapid double-clicks or clicking during a move don't break the camera

---

## Phase 4 — Lamp (pull cord) and speaker

- [ ] Pull cord: click (and optional drag-down) plays a pull-and-spring-back animation
- [ ] Toggle tweens `lighting.uLight` 1 ↔ 0 over ~400 ms (bulb emissive follows via the shader); lamp starts on
- [ ] Confirm which light the cord controls (MEMORY.md open question 1) and adjust if needed
- [ ] Shuffle-bag playlist (no repeats until all played, no immediate repeat across reshuffles) — unit tested
- [ ] Audio player: on/off toggle with volume fade, next track on `ended`, pause on tab hidden / resume on visible
- [ ] Speaker pulse while playing
- [ ] Empty-playlist handling: warning in console, no visible change, no errors
- [ ] Add the owner's tracks to `public/audio/` and `playlist.json` once provided (licence confirmed)

### You test
- [ ] The lamp is on at page load; the pull cord animates and fades it off, then on again
- [ ] Clicking the speaker starts music (once provided) and clicking again fades it out
- [ ] Tracks play in a shuffled order and move to the next track when one ends
- [ ] Switching to another tab pauses the music; coming back resumes it
- [ ] The speaker pulses only while music plays; neither interaction moves the camera

---

## Phase 5 — Laptop → About

- [ ] Write `src/content/about.md` (owner provides bio, photo, email/LinkedIn/GitHub, city/region; no phone or address)
- [ ] Content pipeline: Markdown → HTML (`marked`), shared by 3D views and fallback — unit tested
- [ ] `CSS3DRenderer` layer; CSS3DObject sized and aligned to `Click_Laptop_Screen`
- [ ] About page styling: clean single page, contact links prominent, optional thin browser bar; scrollable if long
- [ ] Idle view: swap `M_Screen` map for a static preview of the about page
- [ ] Show the HTML layer only when focused on the laptop; hide it on exit

### You test
- [ ] Clicking the laptop zooms in and the about page sits exactly on the screen (no gaps/overhang), in landscape and portrait
- [ ] Text is sharp and readable; contact links are visible without scrolling; links open in a new tab
- [ ] Scrolling works if the content is longer than the screen
- [ ] Clicking the about page's content doesn't exit the view; clicking outside the laptop does
- [ ] In the idle view the screen shows the preview, not a blank screen

---

## Phase 6 — Papers → Resume (from PDF)

- [ ] Owner provides `public/resume.pdf` (email + links + city/region only)
- [ ] Lazy-load `pdfjs-dist` after the scene is interactive; confirm it isn't in the initial bundle
- [ ] Idle: render page 1 to a `CanvasTexture` on the top sheet
- [ ] Focus: render the current page at device pixel ratio + text layer inside a CSS3DObject aligned to the top sheet
- [ ] Next/prev page controls and arrow keys for multi-page PDFs
- [ ] **Download PDF** button (`<a download>`) visible only in the papers focus view

### You test
- [ ] In the idle view, the top sheet shows the first page of the resume
- [ ] Clicking the papers moves the camera above the stack and the resume is sharp and readable on the sheet
- [ ] You can select and copy text from the resume
- [ ] Paging works if the PDF has more than one page
- [ ] **Download PDF** downloads the same file
- [ ] The initial page load doesn't download pdf.js (check the Network tab before clicking the papers)

---

## Phase 7 — Notebook → Projects

- [ ] Decide approach for the opening (procedural cover vs. Blender re-export) — see ARCHITECTURE A-8 and MEMORY.md
- [ ] Opening/closing animation: camera arrives → cover swings open → contents spread; reverse on exit
- [ ] `src/content/projects/*.md` with front matter (title, dates, tags, links, media, order); owner provides 7–12 projects, strongest first
- [ ] Content check test: required fields present, media within size limits (WebP ≤ 300 KB, clips ≤ 3 MB)
- [ ] Contents spread listing all projects; clicking an entry jumps to its spread
- [ ] Project spreads: left page title, dates, image or muted looping clip; right page summary, tags, links
- [ ] Lazy-load each spread's media when it's shown
- [ ] Navigation: next/prev buttons, arrow keys, clicking page edges; page-turn transition
- [ ] Handle elastic band (hide/move when opening)

### You test
- [ ] Clicking the notebook moves the camera above it, then it opens on the contents page
- [ ] Clicking a contents entry jumps to that project
- [ ] Each project fills its own spread; next/prev, arrow keys, and edge clicks all work
- [ ] Clips play muted and loop; media loads only when its spread is opened (Network tab)
- [ ] First/last spread can't be paged past
- [ ] Back closes the notebook and then returns the camera

---

## Phase 8 — Visual polish and performance

- [ ] Post-processing: bloom (bulb, street lamps, city windows), film grain, vignette via `EffectComposer` + `OutputPass`
- [ ] Check tone mapping is applied once only with the composer (MEMORY.md ISSUE-2)
- [ ] Measure against NFR-1/NFR-2; convert textures to KTX2 (Basis) if over 15 MB or under target fps
- [ ] Adaptive pixel ratio if below target fps
- [ ] Fallback triggers, second part: fps monitor (median < 25 fps over 5 s after load, ignored while hidden) → fallback with "Try 3D anyway" (sessionStorage flag) — unit tested
- [ ] Decide and implement time-of-day behaviour (MEMORY.md open question 2)

### You test
- [ ] Bulb, street lamps, and city windows glow; grain and vignette are subtle
- [ ] Colours match the Phase 1 look (no washed-out or double-tone-mapped image)
- [ ] 60 fps at 1080p on an Iris Xe / M1-class laptop; ≥ 30 fps on a mid-range phone
- [ ] First-load transfer ≤ 15 MB; interactive in < 5 s at 25 Mbps
- [ ] With heavy CPU throttling (DevTools 6× slowdown), the site switches to the fallback, and "Try 3D anyway" brings the 3D back

---

## Phase 9 — Accessibility, fallback, mobile

- [ ] Vite plugin pre-renders about + projects + resume link into `<main id="fallback">` in `index.html`; hidden when 3D runs
- [ ] "Skip the 3D" link always available
- [ ] Keyboard: Tab cycles interactables (with visible focus label), Enter activates, Esc goes back
- [ ] Screen reader: interactables exposed as buttons with names; content views are real DOM
- [ ] Mobile layout: focus views readable in portrait; Back button reachable with a thumb
- [ ] Page title, meta description, Open Graph image

### You test
- [ ] View page source: about and project text is present in the HTML
- [ ] With WebGL disabled, the fallback shows all content and the PDF link; Lighthouse performance ≥ 90
- [ ] "Skip the 3D" switches to the fallback
- [ ] The whole site is usable with only the keyboard
- [ ] On a phone, every interaction works and all content is readable
- [ ] Shared link previews show the title, description, and image

---

## Phase 10 — Launch

- [ ] Final content review (about, resume PDF, projects, music licences); confirm no phone/address anywhere
- [ ] Cross-browser pass: Chrome, Firefox, Safari, Edge (desktop); iOS Safari, Android Chrome
- [ ] Deploy to GitHub Pages; verify live site

### You test
- [ ] Every PRD success criterion (PRD §7) passes on the live site
