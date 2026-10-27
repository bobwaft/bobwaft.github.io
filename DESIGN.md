# DESIGN — Design Decisions

_Last updated: 2026-10-27 (spec audit gaps resolved)_

Each decision records what was chosen and why. Add new ones at the end of the relevant section; mark superseded ones instead of deleting them.

## Experience

### D-1. The room is the navigation
There is no menu bar in the idle view. The desk objects are the navigation: laptop = About, papers = Resume, notebook = Projects.
**Why:** this is the point of the site. A conventional nav bar would compete with the scene.
**Discoverability:**
- Mouse: hover highlight + small label on each interactable.
- Touch: pulsing dots on each interactable, each fading once that object has been used.
- Both: a one-time hint ("Move your mouse to look around · click objects on the desk", or "Drag to look around · tap objects on the desk" on touch) that fades after the first interaction.

### D-2. Mouse-follow look, not drag or pointer lock
The camera rotates toward the cursor position (cursor at screen edge = max yaw/pitch). No click-and-drag and no pointer lock.
**Why:** clicking is reserved for interaction, and pointer lock would hide the cursor needed for clicking objects.
**Details:**
- Small range (starting point: yaw ±25°, pitch ±12°, tuned in-browser), eased with damping so motion feels weighty, not twitchy.
- Touch devices use drag-to-look; a touch that moves < 10 px is a tap.

### D-2a. Portrait screens get their own idle pose
On portrait screens (aspect < 1), the idle camera uses a separate hand-tuned pose, pulled back/up so the whole desk fits. Landscape uses `Cam_Main`.
**Why:** `Cam_Main` is framed for 16:9. On a phone it would show a thin slice of the desk.

### D-3. Focus views are "lean in" moments
Clicking an object moves the camera along a smooth curve (~0.8–1.2 s, ease-in-out) to a focus pose for that object. The pose's distance is computed so the content surface fits the viewport, so it also works in portrait.
- Laptop: camera in front of the screen, screen fills most of the viewport.
- Papers and notebook: camera above the object, looking down, as if the visitor leaned over the desk.

In focus, the mouse adds only a slight parallax (~1–2°), which keeps the scene alive without disturbing reading.
**Why:** it reads as physically picking something up, and keeps the content large enough to read.

### D-4. Always a way back
Every focus view shows a **Back** button in a fixed screen corner (DOM, not in-scene). `Esc`, or clicking anywhere that isn't the focused object or its content, also returns to idle. Clicking another interactable while focused exits; it does not jump to that object.
**Why:** visitors must never feel stuck in a 3D view.
**Trade-off accepted:** a stray click while reading exits the view.

### D-5. Content is real HTML, placed on the 3D surfaces
The about page and project pages are HTML laid over the 3D surfaces (see A-4 in ARCHITECTURE.md), not text baked into textures. The resume is the exception (D-11).
**Why:** crisp text at any resolution, selectable/copyable, clickable links, screen-reader accessible, and easy to edit.

### D-6. Notebook opens after the camera arrives
Sequence: camera move → short pause → cover swings open → contents spread. Closing reverses it.
**Why:** the opening is the payoff; it should be seen from the focus view rather than happening mid-flight.

### D-7. Audio is opt-in, shuffled, and polite
- Music starts only when the speaker is clicked, and is off on every visit.
- The playlist is shuffled without repeats until every track has played.
- Music pauses when the tab is hidden, so it never plays from a background tab.
- Clicking the speaker only toggles on/off; there is no skip or volume control in v1.

**Why:** autoplay is blocked by browsers, unwanted audio drives visitors away, and audio from a hidden tab is annoying.

### D-8. The lamp starts on and toggles with a fade
The lamp is on when the site loads, so the desk is well lit from the first frame. Toggling fades over ~400 ms, with a slight flicker on turn-on (optional), and the cord bobs down and springs back. State is not remembered between visits.
**Why:** an instant switch looks cheap next to baked lighting; the cord animation confirms the click.

### D-9. Visual polish (from the scene README)
- Bloom on the bulb, street lamps, and city windows.
- Subtle film grain.
- Soft vignette.
- Renderer uses `SRGBColorSpace` output and `AgXToneMapping`.

**Why:** matches the look validated in Blender previews.

### D-14. No URL routing
The URL never changes. There are no links straight into a focus view, and browser Back leaves the site.
**Why:** owner's choice for simplicity. Revisit if sharing direct links to the resume or a project turns out to matter.

## Content style

### D-15. Written for recruiters
The about page leads with a short professional bio and puts contact links (email, LinkedIn, GitHub) first. Projects are ordered strongest first.
**Why:** recruiters and employers are the primary audience; they skim.

### D-16. Laptop shows a simple web page
The about view is a clean single page (photo, bio, links), optionally under a thin fake browser bar. There's no fake desktop or terminal.
**Why:** fastest to read, and fits a professional tone.

### D-10. Projects: one project per spread, with a contents page
- The first spread is a contents page listing all 7–12 projects; clicking an entry jumps to that project.
- Each project gets one spread. The left page has the title, dates, and main image or muted looping clip. The right page has the summary, tech tags, and links.
- Headings use a handwritten-style font; body text uses a readable font.

**Why:** a spread gives each project room; a contents page lets recruiters jump straight to what interests them.

### D-11. Resume: the PDF is the single source of truth
The site renders the owner's `resume.pdf` directly onto the paper (pdf.js), and the download button serves the same file. Nothing to keep in sync.
**Trade-offs accepted:**
- Text is slightly less crisp than native HTML.
- The PDF viewer adds ~1 MB, loaded only when needed.
- The fallback page links to the PDF instead of showing resume text.

### D-17. Minimal personal data
Only email, LinkedIn, GitHub, and city/region appear on the site and in the PDF. There is no phone number or street address.
**Why:** the site is public and scraped.

## Accessibility & fallbacks

### D-12. Plain HTML fallback, built into index.html
All content (about, projects, resume download link) is pre-rendered into `index.html` at build time and hidden once the 3D view is running. It's shown instead when WebGL2 is missing, the scene fails to load, the frame rate stays below 25 fps for ~5 s, or the visitor clicks "Skip the 3D". An automatic fallback offers "Try 3D anyway".
**Why:** accessibility, search engines, slow devices.

### D-13. Reduced motion
With `prefers-reduced-motion`, camera moves become short cross-fades or quick cuts, and idle look-around and parallax are reduced.

## Open design questions

- Hover affordance: outline shader vs. emissive brighten vs. label only. (Start with label + slight brighten; outlines need an extra pass.)
- Exact fonts for the laptop page, notebook, and UI chrome.
- Time-of-day behaviour (see [MEMORY.md](MEMORY.md) open questions).
