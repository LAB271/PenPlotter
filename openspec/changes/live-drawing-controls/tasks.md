## 1. Source-retaining trace pipeline (PNG)

- [ ] 1.1 Split `raster.ts`: a step that decodes the image to a reusable grayscale `Float32Array` field (at `MASTER_MAXDIM`), and a separate `traceField(field, opts)` that runs iso-contours → polylines. Re-tracing reuses the cached field (no re-decode)
- [ ] 1.2 Add invert + contrast transforms on the field before tracing (cheap point ops); unit-test field transforms and that re-trace at new threshold/levels matches a fresh import
- [ ] 1.3 Keep `flattenImageFile` working (compose the two steps) for first import

## 2. Re-flattenable SVG

- [ ] 2.1 Retain SVG text per artwork; allow re-running `flattenSvg(text, tolerance)` at a chosen tolerance to produce a fresh master
- [ ] 2.2 Unit-test that a coarser/finer tolerance yields fewer/more points within deviation bounds

## 3. Geometry controls surfaced

- [ ] 3.1 Expose simplify tolerance + minimum stroke length from `detail.ts` as direct controls (reuse `applyDetail` logic); keep the existing `detail` slider working
- [ ] 3.2 Unit-test the direct knobs against the existing detail mapping

## 4. Per-artwork model + persistence

- [ ] 4.1 Extend `PlacedArt` to carry its source (SVG text / grayscale field) and per-artwork control values; seed PNG defaults from current calibration
- [ ] 4.2 Persist per-artwork control values in `sessionStore`; persist source best-effort and degrade gracefully (disable source controls, keep master) when over quota
- [ ] 4.3 Migration: sessions without control values load with defaults

## 5. Live UI

- [ ] 5.1 Reusable slider-with-number control (drag or type; configurable `min`/`max`/`step`); centralise ranges/defaults
- [ ] 5.2 Drawing-controls panel bound to the selected artwork: PNG (threshold, levels, invert, contrast), SVG (sampling tolerance), shared (detail, simplify, min stroke length)
- [ ] 5.3 Debounce source re-derivation (~150–250 ms); keep geometry controls + canvas redraw immediate; show an "updating…" affordance during the debounce
- [ ] 5.4 Drive both the canvas preview and the plotted geometry from the same result

## 6. Verification

- [ ] 6.1 Adjust PNG threshold/levels/invert/contrast on a placed image → preview updates live, no re-import
- [ ] 6.2 Adjust SVG sampling tolerance on a placed SVG → re-flattens live
- [ ] 6.3 Two artworks tuned independently; reload session → values restored
- [ ] 6.4 ⚙ HARDWARE: plot a tuned PNG and a tuned SVG → confirm the pen output matches the tuned preview
