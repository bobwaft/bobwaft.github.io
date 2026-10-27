# MEMORY — Project Notes & Issues

_Last updated: 2026-10-27_

Running log of facts, gotchas, and open questions for this project. Newest entries at the bottom of each section. Bugs go in [BUGS.md](BUGS.md).

## Asset source

- Blender export: `C:\Users\donov\Documents\Blender Projects\PersonalWebsite\export\`
  - `desk_scene.glb` (5.9 MB), `desk_scene_draco.glb` (3.9 MB, needs `DRACOLoader`)
  - `textures/LM_{AO,Sun,Night,Shelf}_{Env,Click}.png`, `T_Base_{Env,Click}.png`, `lightmap_scales.json`
  - `scene-lighting.js` — loader + lightmap shader + `setTimeOfDay()` helper
  - `README.md` — full scene notes (source of the facts below)
- Blender sources: `desk_scene.blend` (working), `desk_scene_export.blend` (export-ready), backups; scripts `bake.py`, `process.py`, `export.py`, `tools/verify_runtime.py`.

## Scene facts

- ~49.7k triangles (room/props ~39k, outside ~11k). Y-up, metres. Rotation/scale applied; locations kept (pivots at natural centres).
- `Cam_Main`: vertical FOV 42.55°, 16:9, near 0.1, far 3000, eye (0, 1.18, 0), pitched −9°.
- `Ref_Lamp`: empty at the centre of the shelf tube light.
- Clickables: `Click_PullCord` (pivot at attachment point), `Click_Laptop` → child `Click_Laptop_Screen` (UV 0–1, material `M_Screen`), `Click_Notebook` (with elastic band), `Click_Papers`, `Click_Speaker` (cylindrical portable speaker), `Click_Calendar` (formerly `Click_WallNote`), `Click_Window` (double-sided glass).
- Static: `Env_*` — Room, Floor, Trim, Desk, Shelves, ShelfStrip (emissive bulb), Bed, WindowFrame, Bottles, Flag, DinoPlush, RubberDuck.
- Outside layer is not baked; tinted at runtime by `setTimeOfDay`. `Env_WindowSky` is a curved backdrop (r = 1200 m, UV u = azimuth, v = elevation).
- Lighting formula: `light = sun·kSun·uDay + night·kNight·uNight + shelf·kShelf·uLight`; `final = base × mix(1, AO, 0.5) × light (+ bulb emissive × uLight)`. Defaults kSun 1.0, kNight 0.3, kShelf 0.7.
- `TEXCOORD_1` == `TEXCOORD_0`. AO is linear (`NoColorSpace`); Sun/Night/Shelf are sRGB-encoded and normalised (multiply by decode multiplier).
- Env bake includes clickables (contact shadows baked in); each Click object baked with the other clickables hidden → **moving a clickable leaves its baked contact shadow behind** on the desk. Keep animations small (cord bob, speaker pulse, notebook cover opening over the notebook).
- GPU memory ~80 MB RGBA8 (~105 MB with mips); KTX2/Basis cuts to ~¼.
- `scene-lighting.js` leaves `M_Screen` (laptop) and `M_Glass` (window) as exported — swap the screen map for content.
- `scene-lighting.js` defaults the Draco decoder to the gstatic CDN; we pass `/draco/` (self-hosted) instead.

## Known issues

### ISSUE-1. Lightmap decode multipliers disagree (resolved 2026-10-27: read `lightmap_scales.json` at runtime, see ARCHITECTURE A-2)
- `scene-lighting.js` and the export README use Sun **1.3069**, Night **5.285**, Shelf **3.7393**.
- `textures/lightmap_scales.json` says Sun **1.3508**, Night **5.2192**, Shelf **3.7482**.
- All export files have the same timestamp (10:35), so it's unclear which values are current. The JSON was probably rewritten by a re-bake without regenerating the JS/README.
- Difference is small (≤3.4%) but should be settled. **Action (Phase 0):** confirm with the owner / re-run `export.py`; prefer reading the JSON at runtime so they can't drift again.

### ISSUE-2. Possible double tone mapping with post-processing (watch)
The baked `ShaderMaterial` includes `<tonemapping_fragment>` and `<colorspace_fragment>`. With `EffectComposer` + `OutputPass`, three.js normally renders to a linear target and tone-maps in `OutputPass`; verify the baked materials don't tone-map too (Phase 8).

## Open questions

1. **Pull cord target.** The request says the cord turns on "the lightbulb in the desk", but the only switchable light in the bake is the shelf tube light (`Env_ShelfStrip`, driven by `lighting.uLight`; `Ref_Lamp` sits at its centre). Is that the intended light, or is a separate desk bulb expected (would need a new bake pass)?
2. **Time of day.** Fixed, follow the visitor's local clock, or user-controllable (e.g. clicking the window)?
3. **`Click_Calendar` and `Click_Window`.** Exist in the scene but have no behaviour in the spec. Leave inert (no hover), or assign something later?
4. **Notebook opening.** The notebook is exported as one object with an elastic band — no separate cover or pages. Build a procedural cover in three.js, or re-export with a hinged cover?
5. **Music.** Track(s), format, and licensing — owner will provide later.
6. **Content.** About text/photo/links, resume source + PDF, and the project list — owner to provide.

### Spec audit — 2026-10-27

Audited PRD/DESIGN/ARCHITECTURE/IMPLEMENTATION against the six core spec areas (objective, commands, structure, code style, testing, boundaries) and for vague, contradictory, or missing requirements. Resolve each gap and move the answer into the relevant doc.

**Blocks Phase 0 — all resolved 2026-10-27**
- ~~G-1 Language~~ → TypeScript (ARCHITECTURE A-1).
- ~~G-2 Commands~~ → ARCHITECTURE A-13.
- ~~G-3 Code style~~ → ESLint + Prettier, conventions in A-13.
- ~~G-4 Boundaries~~ → A-13 (defaults, owner may amend).
- ~~G-5 Deployment~~ → GitHub Actions, no custom domain (A-11). Whether the GitHub repo exists is checked in Phase 0.
- ~~G-6 ISSUE-1~~ → read `lightmap_scales.json` at runtime.
- ~~G-7 Large binaries~~ → plain git, no LFS.

**Phases 1–10 — all resolved 2026-10-27.** Answers are recorded in PRD/DESIGN/ARCHITECTURE/IMPLEMENTATION. Summary:
- G-8 → portrait idle pose (D-2a); focus distance fits the surface to any aspect (A-5).
- G-9 → pulsing dots on touch (D-1). G-10 → 10 px tap/drag threshold (FR-5a).
- G-11 → outside click exits; clicking another interactable also exits, no switch (D-4).
- G-12 → slight parallax in focus (D-3).
- G-13 → no URL routing (D-14).
- G-14 → auto-fallback on load error or < 25 fps for 5 s, with "Try 3D anyway" (A-14).
- G-15 → NFR-1/NFR-2 numbers.
- G-16 → lamp starts on; nothing persisted (D-8).
- G-17 → shuffled playlist, pauses when the tab is hidden (D-7, A-9).
- G-18 → recruiters/employers (D-15). G-19 → simple web page (D-16).
- G-20 → one project per spread + contents page, 7–12 projects (D-10).
- G-21 → images + short muted clips with size limits (FR-18c).
- G-22 → render the PDF itself with pdf.js (D-11, A-15).
- G-23 → email + links + city only (D-17). G-24 → fallback in `index.html` (A-14). G-25 → English only.

Original gap descriptions, kept for reference:

**Blocks Phase 1–3 (scene, camera, interaction)**
- **G-8 Aspect ratio.** `Cam_Main` is 16:9 with a fixed vertical FOV. A portrait phone (about 9:19.5) would show a narrow sliver of the desk, and an ultrawide screen shows more of the room than intended. Not specified: keep the horizontal FOV, letterbox, or use a different idle pose on portrait screens.
- **G-9 Touch discoverability.** Hover labels (FR-4) don't exist on touch screens. How do mobile visitors know what's clickable? (Pulsing hint dots? Labels always on?)
- **G-10 Tap vs drag on touch.** Drag-to-look and tap-to-click share one gesture; a movement threshold is needed.
- **G-11 "Click outside to exit" (FR-8)** is undefined: does clicking another interactable while focused exit, or switch directly to that object? Does a mis-click on blank desk while reading kick you out (annoying)?
- **G-12 FR-7 is undecided:** look-around "disabled **or** reduced" in focus views.
- **G-13 Deep links and browser Back.** Not specified: whether `/#resume` or `/#projects/<slug>` open straight into a focus view (handy to send to recruiters), and whether the browser Back button leaves a focus view. Without this, Back leaves the site entirely.
- **G-14 Load failure.** No behaviour defined if the GLB/textures fail to load or the device is too slow (auto-switch to fallback? fps threshold?).
- **G-15 Vague acceptance wording.** "Sensible close-up", "range feels right", "reasonable time", "mid-range laptop", "typical broadband" are not testable. Need a reference device and numbers (e.g. LCP/first-render < X s on Y Mbps).

**Blocks Phase 4 (lamp, speaker)**
- **G-16 Initial lamp state** and whether lamp/music state persists across visits (localStorage?) are unspecified.
- **G-17 Audio details:** one track or a playlist? Volume control? Pause when the tab is hidden? Licence for the track(s)?

**Blocks Phase 5–7 (content)**
- **G-18 Audience/objective.** Who is the site for (recruiters, clients, peers)? This drives what goes on the about page and which projects lead.
- **G-19 Laptop UI.** What does the screen look like: a plain page, a fake desktop with windows, or a terminal?
- **G-20 Notebook spread.** An open notebook shows two pages. "One project per page" could mean two projects per spread, or one project per spread (image on the left, text on the right). Also: is there a table of contents, and what is the maximum number of projects?
- **G-21 Project media.** Images only, or GIFs/video too? Size limits?
- **G-22 Resume drift (D-11).** HTML and PDF are maintained separately, so they will drift. Generate one from the other?
- **G-23 Resume privacy.** A public PDF shouldn't include a phone number or home address. Confirm what's included.

**Blocks Phase 9 (fallback, SEO)**
- **G-24 Fallback location.** Separate URL (`/plain/`) or rendered into the same page? Crawlers only index content present in the HTML, so the fallback content should be in the initial HTML for SEO.
- **G-25 Language.** Is the site English-only? (assumed)

## Bugs

Tracked in [BUGS.md](BUGS.md).
