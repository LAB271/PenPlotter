## Context

Builds directly on the archived `plotter-control-core`. The engine (`src/grbl/GrblController.ts`) already connects, polls status (`<State|MPos|FS|WCO>`, retaining `WCO`), jogs, controls the pen, and streams G-code with character-counting; the minimal React panel already shows MPos and exposes connect/jog/pen/stream. This change adds only origin/work-coordinate setup on top, with no changes to streaming/status/transport.

The operator's workflow defines the model: home to one fixed corner, register every sheet (A4–A0) to that corner, and operate in work coordinates anchored there — so the app never needs the paper's absolute bed offset. Two unknowns this change resolves on hardware: the homing config (`$22`, absent from the earlier partial dump) and the true axis orientation (untestable with the symmetric spiral).

## Goals / Non-Goals

**Goals:**
- A repeatable origin: home, set/return-to/reset a work zero at the registration corner.
- Make machine vs. work position legible (MPos + WPos).
- Surface `$$`/`$22` so homing availability is known.
- Empirically confirm axis orientation + Y-flip via an asymmetric test plot, de-risking the canvas change.

**Non-Goals:**
- No SVG, canvas, paper-size selection, or G-code conversion.
- No UI restyle (Tailwind+Radix lands with `svg-plotting`).
- No new dependencies; no engine changes beyond three additive line-sending helpers.

## Decisions

### Work coordinates, not absolute bed coordinates
Set the work origin (`G10 L20 P1 X0 Y0`) at the registration corner and operate relative to it. Rationale: decouples the app's spatial model from where paper sits on the A0 bed — the corner is the only reference needed. Alternative (track absolute bed offsets per job) was rejected: it forces ruler measurements and adds a coordinate layer for no benefit given fixed-corner registration. `G10 L20 P1` is preferred over `G92` because it sets a persistent G54 offset rather than a volatile temporary one.

### Homing is surfaced, not assumed
`$H` is offered, but because `$22` is unknown the UI must handle "homing disabled/alarmed" gracefully (inform + offer manual set-zero) rather than hanging. The settings view exposes `$22` so the operator (and we) learn the real config. If homing turns out enabled, the homed corner can later be tied to work zero via a homing offset; if not, manual set-zero at the corner is the workflow.

### Orientation test uses an asymmetric mark
A small "L"/arrow in work coordinates, streamed through the existing path. Rationale: a symmetric shape (like the spiral) cannot reveal a mirrored or 180°-rotated Y axis; an asymmetric mark makes the true orientation readable at a glance. This is the cheap empirical check that lets the canvas change trust its Y-flip instead of guessing.

### Engine stays framework-free
`home()`, `setWorkZero()`, `goToWorkZero()` just enqueue GRBL lines (`$H`, `G10 L20 P1 X0 Y0`, `G0` in work coords) via the existing queue — no DOM/React, preserving Pi portability. WPos is computed in the UI from the already-parsed `MPos`/`WCO`.

## Risks / Trade-offs

- **`$H` hangs if no limit switches** → guard with the `$22` check and a clear "homing unavailable" path; never block the UI on an `$H` that can't complete.
- **Homing slams the axes** → only expose Home once `$22` is known to be enabled (or behind an explicit confirm), consistent with deliberately skipping `$H` during the earlier probe.
- **Orientation still ambiguous if the mark is too small/symmetric** → make the test clearly asymmetric and labeled (distinct leg lengths/arrowhead).
- **`G10 L20` writes a persistent offset** → provide a reset/clear action so a stale offset can't silently misplace a later job.

## Open Questions — RESOLVED on hardware (2026-06-15)

- Is `$22=1`? **No — `$22=0`, homing is disabled.** There are no usable limit switches, so `$H` is moot; the operator sets work zero manually at the paper corner each session. (The UI's "homing disabled" path is the normal flow, not a fallback.)
- Auto-bind work zero to a homed corner, or set manually? **Manual** — it's the only option with `$22=0`. Origin = the paper's **top-left** corner.
- Axis orientation (from the "L" test): **+X = right (no X flip). Y must be FLIPPED for artwork** — the drawing's top-left is the origin and "down the page" maps to machine **−Y** (+Y is physically up/away). So for the svg-plotting change: `machineX = artworkX`, `machineY = −artworkY`, origin at top-left work zero. Consequence: artwork occupies machine −Y from the corner, so clearance is needed below-and-right of the zero point.
- Orientation mark shape: an asymmetric "L" (40 mm leg / 20 mm foot) was sufficient to read orientation.
