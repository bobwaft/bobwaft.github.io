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
- Re-test 2026-10-28: no fallback, but `?debug` showed the median above 25 fps. DevTools CPU throttling slows JavaScript only, and with a real GPU the scene stays above 25 fps, so not falling back is correct. The test step is wrong: add a `?slow` debug flag that forces slow frames, and test with that
- Fix 2026-10-28: added the `?slow[=<ms>]` test hook (src/scene/slowFrames.ts; default 80 ms, clamped 1..500; each frame busy-waits, so ~10 fps) and changed the Phase 8 test step to use it. After "Try 3D anyway" the session flag disables the monitor, so 3D stays even with `?slow` (expected). Monitor code unchanged
- Status: closed (re-tested 2026-10-28: pass with `?slow`)

### BUG-005 — Resume page renders wholly black in the focus view
- Phase: 8
- Steps: night, lamp off; click the papers
- Expected: resume ink printed on the lit paper, text selectable (Phase 8 "blend" change)
- Actual: the page is entirely black. Likely the transparent pdf.js canvas (`background: 'rgba(0,0,0,0)'`) plus the brightness/sepia filter, or the idle overlay texture
- Severity: high
- Root cause (2026-10-28): the idle overlay multiplies the canvas texture over the baked paper, and the transparent pdf.js background gives transparent texels with rgb 0, which multiply to black; that black overlay mesh sits under the CSS layer in the focus view, whose canvas was also transparent. Fix: pages render opaque (white for the idle multiply, warm paper colour #f1ece0 for the focus canvas) with the tint filter kept. Not verified in a browser
- Status: closed (re-tested 2026-10-28: pass; paper brightness split off as BUG-009)

### BUG-006 — Shelf tube light flickers while the camera moves
- Phase: 8
- Steps: lamp on, move the mouse to look around (or let a focus tween run)
- Expected: steady light and glow
- Actual: the tube light flickers slightly whenever the camera moves. Likely bloom on the thin bright strip shimmering between pixels (threshold/resolution), or adaptive pixel-ratio steps
- Severity: med
- Root cause (2026-10-28): likely (unverified in a browser): UnrealBloom's high-pass had a near-hard cutoff (smoothWidth 0.01 at threshold 1.05), so the thin HDR tube's edge pixels flip across it as the camera moves and its coverage changes, producing shimmer; adaptive pixel-ratio steps need 2 s of sustained <50 fps so are unlikely the cause, and MSAA does apply (the composer clones the 4-sample target). Fix: soft knee smoothWidth 1 and radius 0.5 to 0.65
- Re-test 2026-10-28: still flickers. Owner's observation: it happens when panning up and down, as if how much of the light is on screen changes the glow (likely the bloom mip chain aliasing the thin strip as it moves vertically by sub-pixel amounts)
- Fix 2026-10-28 (likely cause, unverified in a browser): UnrealBloomPass's high-pass writes to a half-resolution target with a single bilinear tap per output pixel, so it skips every other scene pixel and a 1-2 px HDR strip aliases as it moves vertically by sub-pixel amounts. The bloom pass now gets a doubled size so its high-pass and first blur mip are full resolution (src/scene/postfx.ts; costs a heavier bloom, adaptive pixel ratio covers slow GPUs). MSAA is resolved before bloom, so the geometry itself is not the cause. If it still flickers, next step is lowering the strip's emissive (scene-lighting.js)
- Re-test 2026-10-28 (after full-res bloom): same flicker. Owner: it didn't exist before Phase 8, so it's the glow added to the tube light; reduce it or remove it entirely from the tube light
- Fix 2026-10-28: the shelf strip's emissive is scaled by 0.35 at load (SHELF_EMISSIVE_SCALE, scene-lighting.js, logged in MEMORY.md), putting its luma (~0.64) under the bloom threshold so it no longer blooms; street lamps and city windows still do. Full-resolution bloom hack reverted. Not verified in a browser
- Re-test 2026-10-28 (strip emissive ×0.35): no flicker, but the owner wants the strip at its previous brightness, just without the glow (exclude it from bloom instead of dimming it)
- Root cause / Fix 2026-10-28: dimming was the wrong lever. The strip's emissive is back at the original and it writes alpha 0 (uBloomMask in scene-lighting.js); the bloom high-pass weights luminosity by alpha (postfx.ts), the render pass clears to alpha 1 and the final grain pass forces alpha 1. Single scene render, no extra pass. Not verified in a browser
- Status: closed (re-tested 2026-10-28: pass)

### BUG-007 — Notebook spread: green band across the page, left-page text too high
- Phase: 8
- Steps: click the notebook, view a project spread
- Expected: clean pages; left-page text sits inside the page margins
- Actual: a green band runs across the middle of the page (remove it); left-page text floats slightly off the page's top corner (move it down)
- Severity: low
- Root cause (2026-10-28): left text: the content padding (56px) left it at the page's top corner; top padding on the left page is now 104px (CSS, unverified visually). Green band: not from code. Notebook_Band is looked up by name and hidden on open (notebookBook.open), and nothing in notebook.css draws a band, so it is most likely baked into the page texture (the band's colour or shadow, now visible since .nb-page is transparent); it needs a re-bake, or an opaque paper-coloured background on .nb-content (the tint filter would still apply) as a workaround, not applied
- Status: closed (re-tested 2026-10-28: pass; the green band is baked into the page texture, needs a re-bake or an opaque page background)
- Fix 2026-11-03 (green band): re-baked the *_Click maps and re-exported the GLB without the band (a first attempt had a UV island overlapping the calendar and notebook islands; fixed in Blender)

### BUG-008 — Changes requested after the Phase 8 review: no window cycling, rounded CRT corners
- Phase: 8
- Steps: click the window; open the laptop
- Expected (user decision 2026-10-28, replaces the window part of D-18): the outside follows the visitor's real local time only, and clicking the window does not change it (the window goes back to inert). The laptop's CRT page has rounded corners
- Actual: clicking the window cycles day/dusk/night; the CRT page has square corners
- Severity: low
- Root cause (2026-10-28): design change, not a defect: the window was registered as an interactable that cycled the time. Fix: Click_Window is no longer registered or required, src/objects/window.ts and the cycle code/tests are removed (timeFromClock kept; main.ts sets the clock time once at load); D-18 and MEMORY.md updated. The CRT page gets 28px rounded corners (CSS border-radius with the overlay inheriting it; the idle texture clips to the same radius), not verified visually
- Re-test 2026-10-28: the window part passes. The owner changed their mind on the corners: undo the rounded corners and instead shrink the laptop screen content slightly so a thin black border (bezel) shows around it, on both the DOM page and the idle texture
- Fix 2026-10-28: rounded corners removed (CSS and canvas clip). Instead a 20px black bezel: `.screen-page` is black with 20px padding around a new `.screen-inner` (browser bar + scroll), so the element still fills the screen mesh exactly; the CRT overlay is inset to the inner area, and the idle texture fills black then draws the page and CRT pass translated and clipped inside it (BEZEL_PX in laptopScreen.ts). Not verified visually
- Re-test 2026-10-28: bezel passes; make the margins a little thinner
- Fix 2026-10-28: bezel reduced from 20px to 12px (BEZEL_PX and .screen-page padding/CRT inset). Not verified visually
- Status: closed (re-tested 2026-10-28: pass)

### BUG-009 — Resume paper much too bright
- Phase: 8
- Steps: click the papers, with the lamp on and off, day and night
- Expected: the paper in the focus view matches the brightness of the lit paper in the scene around it
- Actual: the paper is much too bright compared with how it should look (after the BUG-005 fix rendered it opaque on #f1ece0 / white)
- Root cause (2026-10-28): the old tint scaled the near-white CSS paper by the raw light level (1.0 in daylight), but the scene paper is lit below 1.0 and then bloom/AgX tone-mapped, so it displays far darker; the CSS layer is not tone-mapped. Fix: surfaceTint now maps light to the displayed paper colour (PAPER_RADIANCE 0.45 through an AgX-like shoulder and sRGB encode, divided by the CSS paper's luma), giving about 0.67 by day, 0.39 at night with the lamp off, and lamp-on night equal to day. The constants are assumptions tuned without the lightmap values, so expect a by-eye tweak. The filter already covers paper and ink (both are in the canvas); the notebook uses the same variables, so it is consistent (its ink only, over baked paper)
- Re-test 2026-10-28 (owner screenshot): the resume page is a flat, desaturated grey-green (~rgb 167,162,148) while the papers under it are warm peach (~rgb 225,195,165) under the lamp. Too dark and too cold; a computed tint can't match the bake + AgX + bloom result
- Fix 2026-10-28: the page background is now the SAMPLED displayed colour: right after postfx.render, main.ts reads 6 margin pixels of the top sheet (gl.readPixels, averaged, src/scene/paperSample.ts) when the papers focus view arrives, on lamp/time tint changes and on resize. The PDF canvas renders on white with mix-blend-mode multiply over that background; the brightness/sepia filter is dropped for the resume. The notebook stays on surfaceTint (its pages are ink over the baked paper, so there is no paper colour to match). Not verified in a browser
- Status: closed (re-tested 2026-10-28: pass; missing idle preview split off as BUG-010)

### BUG-010 — Resume preview no longer shows on the paper stack before clicking
- Phase: 6/7 (found in Phase 8; predates it)
- Steps: load the site, look at the papers on the desk without clicking them
- Expected: page 1 of the resume is visible on the top sheet in the idle view (A-15), as before Phase 8
- Actual: no preview on the stack until the papers are clicked
- Severity: med
- Investigation 2026-10-28 (static, no browser/GPU available, not fixed): the idle path is unchanged since Phase 8 apart from the opaque white page (IDLE_PAPER). With three's premultiplied MultiplyBlending (dst*src + dst*(1-srcAlpha)) a white opaque page and a transparent one both leave blank paper untouched, so the white background alone cannot hide the preview; nothing in main.ts, papersSheet.ts, the sampler (focus only) or setContentVisible (touches only the DOM canvas) hides or disposes the overlay or its texture. Remaining suspects need a real GPU: load() failing silently (check the console for 'Resume failed to render' and that Resume_Overlay.visible becomes true), or the ink-only multiply being too faint at the idle sheet size (1024px texture minified onto a small sheet). Next step: open the site with ?debug and inspect Resume_Overlay
- Re-test 2026-10-28: still no preview after waiting ~5 s; no console error
- Root cause (2026-10-29): not a Phase 8 regression. The Phase 7 build (711229c) shows no preview either; the owner noticed it appears at certain camera angles. The overlay was an exact coplanar copy of the top sheet, and the sheet won the depth test from most angles despite the polygon offset (z-fighting). Fix: lift the overlay 1 mm above the sheet (`OVERLAY_LIFT`), keep `renderOrder = 1`; regression tests in tests/objects/papersSheet.test.ts
- Status: closed (re-tested 2026-10-29: pass; rotation misalignment split off as BUG-011)

### BUG-011 — Resume preview and focus page are rotated relative to the top sheet
- Phase: 6/7 (found in Phase 8)
- Steps: look at the paper stack in the idle view; then click the papers
- Expected: page 1 lines up with the edges of the top sheet, both in the idle preview and in the focus view
- Actual: both the idle preview and the focus-view PDF are at a different angle from the top sheet
- Severity: med
- Root cause (2026-10-29): `sheetFrame` took the page's orientation from the minimum-area rectangle around the top sheet's vertices; the re-exported sheet isn't a perfect flat rectangle (curl/bent corners), so that rectangle sat a few degrees off the paper's real edges. Both the idle overlay (via the frame-to-UV transform) and the focus view use the frame, so both were turned. Likely also made the BUG-009 paper-colour samples (92% out to the corners) land partly off the sheet (owner screenshot: page browner than the paper). Fix: `sheetFrameFromUvs` fits position = origin + U·u + V·v over the sheet's vertices and uses the UV axes (an axis-aligned A4 island in the atlas) as the page edges; the old bounding-rectangle `sheetFrame` is removed
- Re-test 2026-10-29 (UV-based frame): same angle. Decoding the GLB showed the real cause: `topSheetTriangles` picked the wrong sheet. The stack has a flat two-triangle top sheet (u 0.014–0.084, y ≈ 0.0006) over three curled sheets; one curled sheet's corner rises to y ≈ 0.0028, and the code ranked sheets by their highest vertex. Fix: rank by median height (regression test with a curled lower sheet). The UV-based frame stays
- Status: closed (re-tested 2026-10-29: pass)

### BUG-012 — "Back to the 3D" is an unstyled button at the end of the simple site
- Phase: 9
- Steps: click "Skip the 3D"; look for the way back
- Expected: "Back to the 3D" is an overlay button (fixed on screen, always visible) styled like the about page (Mocha About Me look)
- Actual: a default browser button appended after the fallback content
- Severity: low
- Status: open

### BUG-013 — Pull cord doesn't toggle the light on touch
- Phase: 9 (found in the phone check; DevTools device mode, portrait, touch)
- Steps: open the site in a phone preset with touch; tap the pull cord
- Expected: the cord animates and the lamp fades off/on (FR-24), as with a mouse
- Actual: the light doesn't change; speaker, laptop, papers and notebook taps all work
- Severity: med
- Status: open

### BUG-014 — Resume controls are squished on a phone
- Phase: 9 (found in the phone check; DevTools device mode, portrait)
- Steps: open the papers focus view on a narrow portrait screen
- Expected: page, zoom and Download PDF controls fit and stay tappable (NFR-6)
- Actual: the buttons in the top-right control bar are squished
- Severity: low
- Status: open
