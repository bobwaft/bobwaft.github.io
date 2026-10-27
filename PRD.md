# PRD — Personal Website (bobwaft.github.io)

_Last updated: 2026-10-27 (spec audit gaps G-1 to G-25 resolved)_

## 1. Summary

A personal website presented as an explorable 3D room. Visitors see a desk from a first-person view, look around by moving the mouse, and click objects on the desk to read about the owner: an about page on the laptop, the resume on a stack of papers, and past projects in a notebook. A speaker plays background music and a pull cord switches the lamp on and off.

## 2. Audience and goals

**Primary audience: recruiters and employers.** They want to see quickly who the owner is, what they've built, and how to get in touch. The 3D room should make the site memorable without slowing that down.

- Present the about page, portfolio/projects, and resume/CV in a memorable way.
- Keep the content easy to reach: every piece of content is at most one click from the default view, and the resume PDF is one more click.
- Lead with the strongest projects and make contact links obvious.
- Keep the content easy to update: changing text should not require touching 3D code.
- Run smoothly on a typical laptop browser and load quickly (see NFR-1, NFR-2).

## 3. Non-goals (v1)

- Free movement (walking around the room). The camera stays at a fixed position.
- A CMS or backend. The site is static.
- Blog, contact form, or analytics.
- **URL routing / deep links.** The URL never changes; there are no links straight into a focus view, and the browser Back button leaves the site.
- Remembering lamp/music state between visits.
- Languages other than English.
- Interactions for `Click_Calendar` and `Click_Window` (they exist in the scene but have no assigned behaviour yet; see [MEMORY.md](MEMORY.md)).

## 4. Content

| Section | Where it lives in the scene | Content |
|---|---|---|
| About | Laptop screen | Bio, photo, contact links (email, LinkedIn, GitHub), city/region |
| Resume / CV | Top sheet of the paper stack | The resume PDF itself, rendered onto the paper, plus a **Download PDF** button |
| Projects | Notebook spreads | 7–12 projects. Contents page first, then one project per two-page spread |
| Music | Speaker | A playlist of tracks. **The owner will provide the audio later** and confirm each track's licence allows web use |

**Personal data:** the site and resume show email, LinkedIn, GitHub, and city/region only. No phone number or street address.

## 5. Functional requirements

### 5.1 Main scene and camera

- **FR-1.** The main UI is a 3D scene rendered with three.js, loaded from the exported Blender scene (`desk_scene_draco.glb` + lightmaps + `scene-lighting.js`).
- **FR-2.** On landscape screens the camera starts at `Cam_Main` (eye at (0, 1.18, 0), pitched −9°, vertical FOV 42.55°). On portrait screens (aspect < 1) it uses a separate hand-tuned **portrait idle pose**, pulled back/up so the whole desk is visible. Switching orientation switches pose.
- **FR-3.** The camera pans (rotates) to follow the mouse, within a limited yaw/pitch range. It does not translate in the idle view. On touch screens, drag rotates the camera.
- **FR-4.** Interactables are discoverable:
  - Mouse: on hover, pointer cursor + label + slight brighten.
  - Touch: small pulsing dots mark each interactable; each dot fades out once that object has been used.
- **FR-5.** While the page is loading, a loading screen with progress is shown.
- **FR-5a.** On touch screens, a touch that moves less than 10 px is a tap (interact); more is a drag (look).
- **FR-5b.** The lamp is **on** when the site first loads.

### 5.2 Focus views (shared behaviour)

- **FR-6.** Clicking an interactable that has content (laptop, papers, notebook) animates the camera smoothly to a close-up "focus" view of that object, sized so the content surface fits the viewport (on any aspect ratio).
- **FR-7.** In a focus view, the mouse moves the camera only slightly (parallax of about 1–2°), and the content becomes interactive (scrollable, links clickable).
- **FR-8.** A visitor leaves a focus view with a visible **Back** control, the `Esc` key, or by clicking anywhere that isn't the focused object or its content. Clicking a different interactable while focused also just exits (it does not switch). The camera animates back to the idle view.
- **FR-9.** Other interactables cannot be triggered while a focus view is open or a camera move is in progress.

### 5.3 Laptop → About

- **FR-10.** Clicking `Click_Laptop` moves the camera in and zooms on the laptop screen (`Click_Laptop_Screen`).
- **FR-11.** The about page renders on the laptop screen as a simple, clean web page (photo, bio, contact links), optionally under a thin fake browser bar. Text is readable at the focus zoom and links open in a new tab.
- **FR-12.** In the idle view, the screen shows a static preview of the about page instead of a blank screen.

### 5.4 Papers → Resume

- **FR-13.** Clicking `Click_Papers` moves the camera above the stack and zooms in from above.
- **FR-14.** The resume **PDF** is rendered onto the top sheet (the PDF is the single source of truth; there is no separate HTML resume). Text in the rendered resume is selectable.
- **FR-15.** When zoomed in, a **Download PDF** button is visible and downloads the same PDF.
- **FR-16.** If the PDF has more than one page, the visitor can page through it (next/prev controls and arrow keys).
- **FR-16a.** In the idle view, the top sheet shows page 1 of the resume.

### 5.5 Notebook → Projects

- **FR-17.** Clicking `Click_Notebook` moves the camera above the notebook and zooms in from above, then the notebook opens (animated).
- **FR-18.** The first spread is a **contents page** listing all projects (7–12); clicking an entry jumps to that project.
- **FR-18a.** Each project fills one two-page spread: left page has the title, dates, and main image or clip; right page has the description, tech tags, and links.
- **FR-18b.** Visitors can go to the next/previous spread with buttons, arrow keys, and clicking the page edges. Turning a page plays a page-turn transition.
- **FR-18c.** Project media: images (WebP, ≤ 300 KB each) and optional short muted looping clips (MP4/WebM, ≤ 3 MB each), loaded only when their spread is shown.
- **FR-19.** Leaving the focus view closes the notebook before the camera returns.

### 5.6 Speaker → Music

- **FR-20.** Clicking `Click_Speaker` toggles background music on/off. The camera does not move.
- **FR-21.** Music is off on every visit (browsers block autoplay).
- **FR-21a.** Music plays from a playlist in shuffled order, without repeats until every track has played, then reshuffles.
- **FR-21b.** Music pauses when the browser tab is hidden and resumes when it is visible again (if it was on).
- **FR-22.** The speaker gives visual feedback of its state (a subtle pulse while playing).
- **FR-23.** Until audio is provided, clicking the speaker does nothing visible and throws no errors.

### 5.7 Pull cord → Lamp

- **FR-24.** Clicking (or dragging down) `Click_PullCord` plays a pull animation and toggles the light.
- **FR-25.** Turning the light on/off fades the baked light pass (`lighting.uLight`) and the bulb's emissive glow over ~400 ms, rather than switching instantly.

## 6. Non-functional requirements

- **NFR-1 Performance.**
  - 60 fps at 1080p on an Intel Iris Xe / Apple M1-class laptop.
  - ≥ 30 fps on a recent mid-range phone.
- **NFR-2 Load.** Scene interactive in < 5 s on a 25 Mbps connection; total transfer on first load ≤ 15 MB. Project media, the PDF viewer, and music load on demand and don't count towards this.
- **NFR-3 Browser support.** Latest Chrome, Firefox, Safari, Edge (desktop and mobile). WebGL2 required for the 3D view.
- **NFR-4 Fallback.** A plain HTML version of all content (about, projects, resume download link) is part of `index.html`, so crawlers and no-JS visitors see it. It is shown instead of the 3D view when:
  - WebGL2 is unavailable;
  - the scene fails to load;
  - the frame rate stays below 25 fps for ~5 s after loading;
  - or the visitor chooses "Skip the 3D".

  An auto-fallback shows a "Try 3D anyway" link.
- **NFR-5 Accessibility.** About and project content is real DOM text; the resume PDF has a selectable text layer. Interactables are reachable by keyboard. `prefers-reduced-motion` shortens or removes camera animations.
- **NFR-6 Mobile.** Every interaction works on phones (see FR-2, FR-4, FR-5a), and focus views stay readable on small screens.
- **NFR-7 Hosting.** Static site deployed to GitHub Pages at `bobwaft.github.io` via GitHub Actions, no custom domain.
- **NFR-8 Maintainability.** Content lives in plain Markdown files and `resume.pdf`, separate from scene code.
- **NFR-9 Privacy.** No phone number or street address anywhere on the site or in the PDF. No cookies or tracking.

## 7. Success criteria

- Each of the five interactions works as described above on desktop Chrome, Firefox, Safari, Edge, and on iOS Safari and Android Chrome.
- All three content sections are reachable from the idle view in one click and readable once focused, in both landscape and portrait.
- The resume PDF renders on the paper and downloads correctly.
- NFR-1 and NFR-2 targets are met (measured with Chrome DevTools throttling to 25 Mbps and an in-app fps readout).
- With WebGL disabled, the fallback shows all content; Lighthouse performance on the fallback ≥ 90.

## 8. Open questions

See **Open questions** in [MEMORY.md](MEMORY.md): which light the pull cord controls, time-of-day behaviour, `Click_Calendar`/`Click_Window`, how the notebook opening is modelled, and the owner-provided content (about text, resume PDF, projects, music).
