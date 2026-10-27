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
- Actual: fps readout shows 15–25; camera motion feels laggy. GPU not recorded yet
- Severity: high
- Status: open

### BUG-002 — Camera recentres when the mouse leaves the window
- Phase: 2
- Steps: move the mouse to a screen edge so the view turns, then move it out of the window
- Expected (user decision 2026-10-27, replaces the "return to centre on mouse leave" TODO / D-2): hold the current view when the mouse leaves; recentre gently only on window/tab blur
- Actual: view drifts back to centre on mouse leave
- Severity: med
- Status: open
