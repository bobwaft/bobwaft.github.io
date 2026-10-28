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
- Status: closed (re-tested 2026-10-27: pass — real GPU after enabling hardware acceleration, ~60 fps)

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
- Status: fixed 2026-10-28, awaiting re-test
