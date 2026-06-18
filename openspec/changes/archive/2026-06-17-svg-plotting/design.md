## Context

The engine (`src/grbl`) already streams G-code, reports `WPos` ~10 Hz, and is dependency-free for the future Pi. `machine-origin` resolved the coordinate facts empirically: no homing (`$22=0`, manual top-left work zero), and `machineX = artworkX`, `machineY = −artworkY`. This change adds everything *above* the engine — SVG import, a visual layout canvas, G-code generation, live monitoring, and a professional UI — all browser-side. The engine stays untouched and Pi-portable; conversion is always a browser concern.

This is the largest change so far. It is structured so an internal vertical slice works early (place a shape → generate → plot) before the UI is fully fleshed out.

## Goals / Non-Goals

**Goals:**
- Upload an SVG, place/scale/rotate it on a visualized A4–A0 page anchored at the top-left corner, and plot it correctly oriented.
- WYSIWYG: the canvas shows the actual pen-path polylines.
- Live pen marker + progress bar + pause/stop during plotting.
- A clean, professional layout (Tailwind + Radix): top bar, side panels, central drawing table, bottom status strip.

**Non-Goals:**
- Path optimization (stroke reordering / line-merge) — deferred to its own change.
- Multi-color layers, fills/hatching, `<text>` outlining — deferred.
- Raspberry Pi gateway — deferred. (But keep conversion browser-side and the engine clean so the move stays plumbing.)

## Decisions

### Browser-DOM SVG parsing (zero dependencies)
Flatten via the browser's own SVG engine: render into a hidden SVG, walk drawable elements, use `getCTM()` to bake transforms and `getPointAtLength()` to sample paths into polylines at a mm tolerance. Rationale: no new dependency, leans on a battle-tested engine, and runs in the browser (never on the Pi). A small zero-dep Douglas–Peucker simplify pass can trim oversampled straight runs if files get large. Alternative (paper.js / flatten-svg) rejected to honor "less dependency."

### Konva for the canvas, Tailwind + Radix for the shell
Konva's Transformer gives drag/scale/rotate handles out of the box — the one canvas dependency worth taking. Tailwind (build-time CSS) + Radix (accessible primitives) deliver the modern, professional look with minimal runtime weight, per the chosen UI direction. All three are browser-only.

### One coordinate authority: artwork-mm = work-coords (identity)
Everything is modeled in **artwork/paper millimeters with the top-left corner as origin** (matching SVG's natural top-left, Y-down). The on-screen canvas is also top-left/Y-down, AND the machine's physical +Y is down the page — so artwork, canvas, and machine all share one orientation. G-code emit is therefore the identity map `X=x, Y=y` (no flip), and the live pen marker maps `WPos` straight to canvas. **Correction:** the `machine-origin` change recorded `machineY = −y` from an ambiguous hand-coded "L" test; the generator-driven asymmetric "F" test plotted upside-down, proving the flip was wrong. The identity map is the verified truth. Lesson: trust the asymmetric end-to-end plot over reasoning about axis direction.

### WYSIWYG = render the flattened polylines, not the SVG
The canvas draws the same polylines that will be emitted as G-code. Rationale: for a plotter you care about the pen path (centerlines/strokes), not filled appearance; showing the path means no surprises between preview and plot, and it naturally communicates the stroke-only scope.

### Reuse the engine for monitoring; add only views
The pen marker subscribes to `status` (`WPos`), the progress bar to `streamProgress`, and pause/stop call existing engine methods. No new engine capability — this change adds producers (G-code) and views (canvas/markers/bars) around the existing control core.

### Layout
Top bar (connect, home/set-zero, paper size, Plot), left + right setting/slider panels, central drawing table (bed → paper → artwork + pen marker), bottom status strip (progress, state, WPos, pause/stop) — matching the agreed mockup.

## Risks / Trade-offs

- **`getPointAtLength` uniform sampling oversamples straight lines** → choose a sensible mm tolerance; add a simplify pass only if file size becomes a problem (streaming already handles dense files).
- **Stroke-only scope surprises users with filled art** → surface a "some content skipped (fills/text)" note on import; don't fail silently.
- **No path optimization → long pen-up travel / slow plots** → acceptable for this change; flag it as the next change. Document order may zig-zag.
- **Work-area / negative-Y reachability** → artwork lives in machine −Y from the corner; clamp to work area and warn, and ensure generation never emits moves outside travel.
- **Big change, many moving parts** → sequence tasks as an internal vertical slice (shape → gcode → plot) before the full UI, so plotting is proven before polish; consider splitting out monitoring/UI polish if it grows.

## Open Questions

- Default flattening tolerance (e.g. 0.1–0.3 mm) — pick a default, expose as a setting.
- Exact paper-size table (A4–A0 mm) and how the bed (1189×841) frames smaller papers visually.
- Where to draw the work-area boundary vs. paper boundary on the canvas for clarity.
- Whether scale is uniform-only or independent X/Y (lean uniform to preserve aspect by default).
