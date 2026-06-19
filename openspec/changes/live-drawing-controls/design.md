## Context

Imported artwork is flattened to "master" polylines once at import (`flattenSvg` at a fixed 0.2 mm tolerance; `flattenImageFile` at the import-time threshold/levels). `applyDetail` then thins the master live for both the canvas preview and the plot — this is the only live control today. PNG threshold/levels live in `Calibration` (global, persisted) and apply only to the *next* import; the SVG tolerance is a module constant.

## Goals / Non-goals

**Goals**
- Re-shape an artwork already on the page and see it instantly, for PNG and SVG.
- Drive preview and plot from the same geometry (no "looks different when plotted").
- Sliders for look; each value typeable and within a sensible, configurable range.
- Per-artwork settings so multiple artworks tune independently.

**Non-goals**
- True SVG fill/hatch tracing (still via PNG import).
- Offloading tracing to a worker/GPU (debounced main thread first).
- Colour/multi-pen separation.

## Decisions

### Two-stage pipeline: source → master → display
```
 SOURCE (retained per artwork)        SOURCE controls (debounced, expensive)
   SVG: raw text                      PNG: threshold, levels, invert, contrast
   PNG: grayscale field (Float32)     SVG: sampling tolerance
        │  re-derive master
        ▼
 MASTER polylines (full detail)       GEOMETRY controls (instant, pure)
        │  applyDetail + simplify      detail, smoothing/simplify, min stroke len
        ▼
 DISPLAY polylines  ──▶  canvas preview  +  plot
```
Today only the bottom arrow is live. The change is to **retain the source** and make the top arrow live (debounced), keeping the bottom arrow per-frame.

- **PNG:** separate decode+grayscale (produces a reusable `Float32Array` field at working resolution) from the iso-contour trace. Invert and contrast are cheap point transforms on the field. Re-tracing on a threshold/levels/invert/contrast change reuses the cached field — no re-decode. (`raster.ts` already computes the field; this exposes it.)
- **SVG:** retain the SVG text; re-run `flattenSvg` at the chosen tolerance. Flattening uses the DOM `getPointAtLength` path and is heavier than PNG re-trace per call but only re-runs on a tolerance change, debounced.

### Per-artwork source + control values
Controls now retune an artwork *in place*, so the values must travel with the artwork, not be a single global applied at import. Each `PlacedArt` gains its source (text or field) and its control values. The session persists the control values (and ideally the source, subject to storage limits — large images may exceed quota, in which case the artwork persists its derived master only and source-controls are disabled until re-import, matching today's graceful-skip behaviour).

### Sliders with typeable, configurable values
A small reusable control: a range slider plus a numeric box bound to the same value, with `min`/`max`/`step` props. Drag or type; typing accepts exact values. "Customisable values" = the ranges are defined centrally (in settings/defaults) and the numeric box lets the operator exceed the slider's comfortable range when needed. Look controls are sliders; speed/feeds stay number fields (mobile change).

### Lock controls while a plot runs
Live re-derivation and a running plot must not overlap: the plot streams G-code generated from the current display geometry, so letting a control (or placement) change mid-plot would desync what's drawn from what's on screen. When a plot starts, the artwork and all drawing controls become read-only; they re-enable on `streamComplete` / stop / `streamAborted`. This reuses the existing plot lifecycle the UI already tracks (`plottingRef`, the stream events) — no new state machine, just gating the controls on "is a plot active." It also matches the operator's mental model: tune freely, then commit, then it's locked until done.

### Debounce the expensive stage only
Source-control changes schedule a debounced re-derivation (e.g. ~150–250 ms after the last change) so dragging a slider doesn't fire a re-trace per pixel; the cheap geometry stage and the canvas redraw stay immediate. The preview shows the latest derived master; a subtle "updating…" affordance covers the debounce gap.

## Risks / Trade-offs

- **Re-trace cost on large images / complex SVGs:** mitigated by the existing `MASTER_MAXDIM` working-resolution cap, reusing the decoded field for PNG, and debouncing. If still janky, a later change can move tracing to a Web Worker (explicit non-goal here).
- **Session storage bloat:** retaining sources per artwork can exceed localStorage/daemon-session limits. Mitigation: persist control values always; persist source best-effort and degrade gracefully (disable source controls, keep the master) when too large — consistent with today's quota handling.
- **Preview/plot divergence risk:** avoided by construction — plot consumes the exact display polylines, as it does today.

## Migration

Additive and backward-compatible. Sessions without per-artwork control values load with current defaults; the global PNG threshold/levels become per-artwork defaults seeded from the existing calibration values. No protocol change.

## Open Questions

- Contrast model: simple linear contrast/brightness on the grayscale field vs. a gamma curve — pick the one that gives the most intuitive slider during implementation.
- Whether to persist the raw source in the daemon session (cross-device retune) or only locally; depends on observed session sizes.
- Default ranges for each slider (threshold 0–1; levels 1–N; tolerance lo–hi mm; min stroke length mm) — set sensible defaults, refine against real artwork.
