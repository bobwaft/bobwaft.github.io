# BUGS

Bug log for the project. Used by the `manual-test` skill. General notes, scene facts, and known asset issues live in [MEMORY.md](MEMORY.md).

## Format

```
### BUG-NNN — short title
- Phase: <n>
- Steps: <how to reproduce>
- Expected: <what should happen>
- Actual: <what happens>
- Severity: low | med | high
- Status: open | fixed <YYYY-MM-DD>, awaiting re-test | closed (re-tested <YYYY-MM-DD>: pass)
```

Number bugs sequentially and never reuse a number.

## Bugs

### BUG-001 — Scene runs at 15–25 fps on the dev machine; look-around feels laggy
- Phase: 2 (perf target is NFR-1 / Phase 8)
- Steps: `npm run dev`, open `/?debug`, normal window size, move the mouse around
- Expected: ~60 fps; look-around follows smoothly (NFR-1)
- Actual: `?debug` shows 13 fps · dpr 1.5 · 1918×1038 · 44 calls · 50k tris; 22 fps with `?dpr=1`. GPU: `ANGLE (Microsoft, Microsoft Basic Render Driver … D3D11)`
- Root cause (2026-10-27): the browser is using Windows' software renderer (WARP), not the GPU — hardware acceleration off/blocked or no GPU driver. Scene cost is small (44 calls, 50k tris), so not a code bug. Fix on the machine: enable Chrome "Use graphics acceleration when available", check `chrome://gpu`, update the GPU driver. Follow-up for Phase 8: treat software renderers (Basic Render Driver / SwiftShader / llvmpipe) as a fallback trigger or start at a lower pixel ratio, since real visitors can hit this too
- Severity: high
- Status: closed (re-tested 2026-10-27: pass — real GPU after enabling hardware acceleration, ~60 fps). Phase 8 follow-up done: software renderers start at pixel ratio 0.75, adaptive pixel ratio, fps-monitor fallback with "Try 3D anyway"

### BUG-002 — Camera recentres when the mouse leaves the window
- Phase: 2
- Steps: move the mouse to a screen edge so the view turns, then move it out of the window
- Expected (user decision 2026-10-27, replaces the "return to centre on mouse leave" TODO / D-2): hold the current view when the mouse leaves; recentre gently only on window/tab blur
- Actual: view drifts back to centre on mouse leave
- Severity: med
- Status: closed (re-tested 2026-10-27: pass)

### BUG-003 — Can't drag-select resume text; dragging moves the camera
- Phase: 6
- Steps: `npm run dev`, click the papers, press on the resume text and drag across it
- Expected: text highlights and can be copied (FR-14, NFR-5); the view stays put
- Actual: no selection; the drag moves the camera instead
- Root cause (2026-10-28): looking straight down, the CSS3D camera element viewed its own plane edge-on, and Chrome's 3D hit testing then missed the page (elementFromPoint returned the WebGL canvas). Fix: the screen layer puts the element at the origin facing +Z and moves the camera into the surface's frame (`surfaceCameraMatrix`); same picture, working hit testing. Laptop page unaffected
- Severity: med
- Status: closed (re-tested 2026-10-28: pass)

### BUG-004 — Slow-device fallback never triggers under CPU throttling
- Phase: 8
- Steps: `npm run dev`, DevTools → Performance → CPU 6× (also tried 20×) slowdown, reload without `?dpr`
- Expected: within ~6 s the plain fallback appears with "Try 3D anyway"; clicking it restores the 3D for the session (A-14)
- Actual: no fallback, even at 20× slowdown
- Severity: high
- Root cause (2026-10-28): the monitor treated any frame gap over 1000 ms as a stall and restarted its window, so under heavy CPU throttle (frames 1-2 s apart) it restarted forever; it also demanded 20 samples, unreachable in a 5 s window at <4 fps. Fix: gaps count up to 5 s (hidden tabs handled by the hidden flag and visibilitychange), and a median under 4 fps needs only 3 samples. `?debug` now shows the monitor state and median fps. Not verified in a browser
- Status: fixed 2026-10-28, awaiting re-test

### BUG-005 — Resume page renders wholly black in the focus view
- Phase: 8
- Steps: night, lamp off; click the papers
- Expected: resume ink printed on the lit paper, text selectable (Phase 8 "blend" change)
- Actual: the page is entirely black. Likely the transparent pdf.js canvas (`background: 'rgba(0,0,0,0)'`) plus the brightness/sepia filter, or the idle overlay texture
- Severity: high
- Root cause (2026-10-28): the idle overlay multiplies the canvas texture over the baked paper, and the transparent pdf.js background gives transparent texels with rgb 0, which multiply to black; that black overlay mesh sits under the CSS layer in the focus view, whose canvas was also transparent. Fix: pages render opaque (white for the idle multiply, warm paper colour #f1ece0 for the focus canvas) with the tint filter kept. Not verified in a browser
- Status: fixed 2026-10-28, awaiting re-test

### BUG-006 — Shelf tube light flickers while the camera moves
- Phase: 8
- Steps: lamp on, move the mouse to look around (or let a focus tween run)
- Expected: steady light and glow
- Actual: the tube light flickers slightly whenever the camera moves. Likely bloom on the thin bright strip shimmering between pixels (threshold/resolution), or adaptive pixel-ratio steps
- Severity: med
- Status: open

### BUG-007 — Notebook spread: green band across the page, left-page text too high
- Phase: 8
- Steps: click the notebook, view a project spread
- Expected: clean pages; left-page text sits inside the page margins
- Actual: a green band runs across the middle of the page (remove it); left-page text floats slightly off the page's top corner (move it down)
- Severity: low
- Status: open

### BUG-008 — Changes requested after the Phase 8 review: no window cycling, rounded CRT corners
- Phase: 8
- Steps: click the window; open the laptop
- Expected (user decision 2026-10-28, replaces the window part of D-18): the outside follows the visitor's real local time only, and clicking the window does not change it (the window goes back to inert). The laptop's CRT page has rounded corners
- Actual: clicking the window cycles day/dusk/night; the CRT page has square corners
- Severity: low
- Status: open
