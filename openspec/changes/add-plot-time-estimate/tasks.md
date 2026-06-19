## 1. Estimator core (pure)

- [x] 1.1 Add `estimatePlotTime(lines: string[]): number` (seconds) to `src/plot/gcode.ts`: walk the program tracking X/Y and the last-seen feed; for each `G0/G1` line with X/Y add `hypot(Δx, Δy) / (feed_mm_per_min / 60)` using that line's `F` word (fallback to last feed); for each `G4 P<sec>` add the dwell seconds; Z-only moves add no XY time.
- [x] 1.2 Add `formatDuration(seconds: number): string` to `src/plot/gcode.ts` producing `~45s` (<60s), `~12m 30s` (<1h), `~1h 04m` (≥1h).
- [x] 1.3 Unit-test both in `src/plot/__tests__/gcode.test.ts`: a known program (draw + travel + dwell) sums to the expected seconds; empty/no-pen-down program → 0; faster feed and shorter-travel order each lower the estimate; `formatDuration` boundary cases (59s, 60s, 3600s).

## 2. Wire into the UI

- [x] 2.1 In `src/ui/App.tsx`, compute the pre-plot **total** estimate from the program the current placement would generate (reuse the `generateGcode(...)` inputs already used in `onPlot`), recomputing when artwork/feeds/layout change.
- [x] 2.2 At plot start (`onPlot`), store the total estimate alongside the existing progress refs.
- [x] 2.3 Compute remaining time during a plot as `total * (1 - progressFrac) * (100 / speedPct)` and clamp to ≥ 0.
- [x] 2.4 Replace the `{progress ? ' · {acked}/{total} lines' : ''}` readout in the footer (around line 980) with the time readout: `~X left` while plotting, `~Y total` when idle.
- [x] 2.5 Ensure the phone view shows the same compact time string in its progress area and the desktop footer wraps cleanly (no overlap, no horizontal scroll).

## 3. Verify

- [x] 3.1 `npm run build` and the test suite pass.
- [ ] 3.2 Manually confirm in the app: a placed artwork shows a sensible `~total`; during a plot the readout counts down and responds to the speed override; the layout reads cleanly on a phone-width window and on the desktop layout.
