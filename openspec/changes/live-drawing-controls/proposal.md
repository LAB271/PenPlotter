## Why

Operators want to fine-tune how an imported drawing will look — and see the change **instantly** on the canvas — for both PNG and SVG. Today only the `detail` slider is live: it re-thins a cached master geometry in real time. Everything that controls how the source becomes that master is not live:

- **PNG `threshold` and `levels`** are number fields applied only on the *next* import. To see a different threshold you must re-add the file; art already on the page can't be retuned.
- **SVG sampling** is fixed (`MASTER_TOLERANCE_MM = 0.2`), with no operator control over how finely curves are flattened.
- There is no invert/contrast control, so high-key or inverted images trace poorly with no recourse but editing the file externally.

The reason is architectural: the **master geometry is derived once at import**, and only the cheap post-master stage is live. This change retains the **source** per artwork and re-derives the master live (debounced) when the source controls change — extending the existing live-preview model to the controls that actually shape the look, for both formats.

## What Changes

- **Two-stage live pipeline.** Each artwork keeps its source (SVG text, or the image's grayscale field). "Source" controls re-derive the master from the source (the expensive stage — debounced); "geometry" controls (detail, today) stay instant. Both the canvas preview and the plotted output are driven from the same result, so what you see is what plots.
- **Live PNG controls (sliders).** `threshold` and `levels` become live sliders that re-trace the on-page artwork instantly; add **invert** and **contrast** pre-processing so the operator can pull ink out of high-key or inverted images. Changing any of these updates the preview without re-importing.
- **Live SVG controls (sliders).** Expose the **curve sampling tolerance** (how finely Béziers/arcs are flattened) as a live slider that re-flattens the on-page SVG — the "how the SVG is converted" control requested — plus the shared geometry controls below.
- **Shared geometry controls (sliders).** Alongside the existing `detail`, expose **smoothing / simplify** (Douglas–Peucker tolerance) and **minimum stroke length** (drop speckle / tiny pen lifts) as live sliders that apply to both formats. (Detail already maps to these two knobs; this surfaces them directly.)
- **Sliders with customisable, typeable values.** Per the request, drawing-look controls are sliders — but each shows its numeric value and the operator can type an exact value (and the range is sensible/configurable), so a slider is never a barrier to a precise setting. Speed and machine feeds remain typed number fields (covered by the mobile change), not sliders.
- **Per-artwork settings.** Because controls now retune an artwork in place, each artwork carries its own control values (so two images on one page can be tuned independently), persisted with the session.
- **Lock once plotting starts.** The whole point of live controls is to dial in the look *before* committing. Once the operator is happy and starts a plot, the artwork and its controls SHALL lock — placement and every drawing control become read-only for the duration of the plot — so the geometry being drawn can't drift out from under the running plot. The controls unlock again when the plot completes, is stopped, or aborts.

Out of scope (deferred): true SVG fill/hatch tracing (still routed via PNG import, as today); GPU/worker-based tracing (debounced main-thread re-trace is the baseline — revisit if too slow on large images); colour separation / multi-pen layers.

## Capabilities

### New Capabilities
- `drawing-controls`: A live-preview control surface — sliders (with typeable, customisable values) that re-shape an imported artwork in place and update the canvas instantly, driving both preview and plot from the same geometry, for both PNG and SVG.

### Modified Capabilities
- `png-import`: tracing controls become live and per-artwork (re-trace in place, not on next import) and gain invert + contrast.
- `svg-import`: the flattening tolerance becomes an operator-controlled, live, per-artwork sampling control rather than a fixed import-time constant.

## Impact

- **Code:**
  - `src/plot/raster.ts` — split image decode/grayscale (the reusable source field) from the trace, so re-tracing at new threshold/levels/invert/contrast doesn't re-decode; add invert + contrast to the field.
  - `src/plot/svg.ts` — allow re-flattening retained SVG text at a chosen tolerance.
  - `src/plot/detail.ts` — expose simplify tolerance + min stroke length as direct controls (reuse existing logic).
  - `src/ui/App.tsx` — store source + per-artwork control values on each `PlacedArt`; debounce the expensive source re-derivation; render the slider panel; drive preview + plot from the result. `src/grbl/settings.ts` defaults / ranges for the controls. `src/ui/sessionStore.ts` — persist per-artwork control values.
  - A small reusable **slider-with-number** control (drag or type; min/max/step configurable).
- **Behaviour:** adjusting a source control re-derives that artwork's master after a short debounce and the preview updates; geometry controls update immediately; the plot uses exactly the previewed geometry. Existing sessions without per-artwork control values fall back to current defaults.
- **Performance:** source re-derivation is debounced and capped at the existing working resolution (`MASTER_MAXDIM`); the cheap geometry stage stays per-frame.
- **Hardware:** verify that what the tuned preview shows is what the pen draws, for both a tuned PNG and a tuned SVG.
