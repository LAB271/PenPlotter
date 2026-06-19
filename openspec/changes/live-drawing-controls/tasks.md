## 1. Source-retaining trace pipeline (PNG)

- [x] 1.1 Split `raster.ts`: `imageToField` decodes to a reusable grayscale `Float32Array` field (at `MASTER_MAXDIM`); `traceField(field, opts)` runs iso-contours → polylines. Live re-tracing reuses the cached field (no re-decode)
- [x] 1.2 Add invert + contrast transforms on the field before tracing (`adjustValue`, applied to a copy so the source field is never mutated); unit-tested in `raster.test.ts`
- [x] 1.3 Keep `flattenImageFile` working — now composes `imageToField` + `traceField`

## 2. Re-flattenable SVG

- [x] 2.1 Retain SVG text per artwork (in-memory `sourcesRef`); `deriveMaster` re-runs `flattenSvg(text, samplingMm)` at the artwork's chosen tolerance. The flattener was also fixed to sample the whole path and split subpaths by cumulative prefix length (relative subpaths no longer garble/splice)
- [x] 2.2 Coarser/finer tolerance → fewer/more points: not a Node unit test (`flattenSvg` needs the DOM `getPointAtLength`); verified at runtime (task 6.2)

## 3. Geometry controls surfaced

- [x] 3.1 DECISION (kept simple): `detail.ts` already maps the single `detail` slider to BOTH a simplify tolerance and a min-stroke-length (`detailParams`). Separate simplify + min-stroke sliders would drive the same two knobs, so the geometry stage keeps one per-artwork **Detail / smoothing** slider. Spec's "controls SHALL be sliders" still holds
- [x] 3.2 Folded into 3.1 — existing `detail.test.ts` covers the detail→(epsilon, minLen) mapping; no separate knobs added

## 4. Per-artwork model + persistence

- [x] 4.1 `PlacedArt` carries `kind` + `controls`; source kept in `sourcesRef` (in memory); PNG control defaults seeded from `cal.pngThreshold/pngLevels`
- [x] 4.2 Per-artwork control values persist via `sessionStore` (and migrate). DECISION: the raw source is held in memory only, never persisted (a PNG field is ~MBs) — after a reload the master + values are kept but source-stage controls disable until re-import (the "degrade gracefully" path, always taken)
- [x] 4.3 Migration: `normalizeArt` + `normalizeControls` fill `kind`/`controls` defaults for older sessions

## 5. Live UI

- [x] 5.1 Reusable `Slider` (range + numeric box; drag or type an exact value, box accepts values beyond the slider range); ranges/defaults centralised in `src/plot/controls.ts`
- [x] 5.2 "Drawing controls" panel bound to the selected artwork: PNG (threshold, levels, invert, contrast), SVG (sampling tolerance), shared (Detail / smoothing)
- [x] 5.3 Source re-derivation debounced 200 ms with an "updating…" affordance; geometry (detail) + canvas redraw stay immediate
- [x] 5.4 `displayItems` drives both the canvas preview and the plotted geometry from the same result
- [x] 5.5 Lock placement + all drawing controls while a plot is active (`plotting` state; `PlotCanvas` `locked` prop — no drag/transformer); cleared on complete/stop/disconnect

## 6. Verification

- [x] 6.1 Adjust PNG threshold/levels/invert/contrast on a placed image → preview updates live, no re-import (operator confirmed in use)
- [x] 6.2 Adjust SVG sampling tolerance on a placed SVG → re-flattens live; the SCHUBERG PHILIS logo renders cleanly after the subpath fix (operator confirmed)
- [x] 6.3 Two artworks tuned independently; reload session → values restored
- [x] 6.4 Start a plot → controls + placement lock; stop/complete → they unlock
- [ ] 6.5 ⚙ HARDWARE: plot a tuned PNG and a tuned SVG → confirm the pen output on paper matches the tuned preview (pending an on-paper run)
