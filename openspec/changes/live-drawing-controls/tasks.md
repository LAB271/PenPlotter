## 1. Source-retaining trace pipeline (PNG)

- [x] 1.1 Split `raster.ts`: `imageToField` decodes to a reusable grayscale `Float32Array` field (at `MASTER_MAXDIM`); `traceField(field, opts)` runs iso-contours → polylines. Live re-tracing reuses the cached field (no re-decode)
- [x] 1.2 Add invert + contrast transforms on the field before tracing (`adjustValue`, applied to a copy so the source field is never mutated); unit-tested in `raster.test.ts` (invert flips a light-on-dark source to the dark-on-light trace; contrast clamps; deterministic re-trace)
- [x] 1.3 Keep `flattenImageFile` working — now composes `imageToField` + `traceField`

## 2. Re-flattenable SVG

- [x] 2.1 Retain SVG text per artwork (in-memory `sourcesRef`); `deriveMaster` re-runs `flattenSvg(text, samplingMm)` at the artwork's chosen tolerance to produce a fresh master
- [~] 2.2 Coarser/finer tolerance → fewer/more points: NOT a unit test here — `flattenSvg` needs the DOM `getPointAtLength`, and tests run in Node (no DOM). Covered by runtime verification 6.2 instead

## 3. Geometry controls surfaced

- [~] 3.1 DEVIATION (kept simple): `detail.ts` already maps the single `detail` slider to BOTH a simplify tolerance and a min-stroke-length (`detailParams`). Exposing separate simplify + min-stroke sliders would drive the same two knobs and confuse the UI, so the geometry stage keeps one per-artwork **Detail / smoothing** slider. Suggest updating the spec/proposal to match.
- [~] 3.2 Folded into 3.1 — existing `detail.test.ts` still covers the detail→(epsilon, minLen) mapping; no separate knobs added

## 4. Per-artwork model + persistence

- [x] 4.1 `PlacedArt` carries `kind` + `controls`; source kept in `sourcesRef` (in memory); PNG control defaults seeded from `cal.pngThreshold/pngLevels`
- [~] 4.2 Per-artwork control values persist via `sessionStore` (and migrate). DEVIATION: the raw source is held in memory only, never persisted (a PNG field is ~MBs) — so after a reload the master + values are kept but source-stage controls are disabled until re-import (the "degrade gracefully" path, always taken rather than quota-gated)
- [x] 4.3 Migration: `normalizeArt` + `normalizeControls` fill `kind`/`controls` defaults for sessions saved before they existed

## 5. Live UI

- [x] 5.1 Reusable `Slider` (range + numeric box; drag or type an exact value, box accepts values beyond the slider range); ranges/defaults centralised in `src/plot/controls.ts`
- [x] 5.2 "Drawing controls" panel bound to the selected artwork: PNG (threshold, levels, invert, contrast), SVG (sampling tolerance), shared (Detail / smoothing)
- [x] 5.3 Source re-derivation debounced 200 ms with an "updating…" affordance; geometry (detail) + canvas redraw stay immediate
- [x] 5.4 `displayItems` drives both the canvas preview and the plotted geometry from the same result
- [x] 5.5 Lock placement + all drawing controls while a plot is active: `plotting` state set on plot start, cleared on streamComplete / streamAborted (covers stop) / disconnect; `PlotCanvas` gains a `locked` prop (no drag, no transformer)

## 6. Verification

- [ ] 6.1 Adjust PNG threshold/levels/invert/contrast on a placed image → preview updates live, no re-import (run the app — visual)
- [ ] 6.2 Adjust SVG sampling tolerance on a placed SVG → re-flattens live (run the app — visual)
- [ ] 6.3 Two artworks tuned independently; reload session → values restored (run the app)
- [ ] 6.4 Start a plot → controls + placement lock; stop/complete → they unlock (run the app)
- [ ] 6.5 ⚙ HARDWARE: plot a tuned PNG and a tuned SVG → confirm the pen output matches the tuned preview
