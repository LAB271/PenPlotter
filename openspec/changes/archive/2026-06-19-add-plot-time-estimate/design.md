## Context

Today the progress strip in `src/ui/App.tsx` shows `{pct}% · {acked}/{total} lines`
(around line 980). The line count is the only "how big is this job" signal and it is
meaningless to an operator. We already have everything needed to do better:

- `generateGcode(polylines, opts)` (`src/plot/gcode.ts`) emits the program in stroke order
  using nearest-travel ordering: per stroke a travel move `G1 X Y F<travelFeed>`, pen-down
  `G0 Z` + `G4 P<dwell>`, draw moves `G1 X Y F<drawFeed>`, pen-up `G0 Z` + `G4 P<dwell>`.
- `gcodeXYLength(lines)` in `App.tsx` already walks the emitted program summing XY distance
  for the smooth progress bar — the exact same walk needed for a time estimate.
- Calibration carries `drawFeed`, `travelFeed` (mm/min) and `penDwellMs`. A live
  `speedPct` override (10–200%) scales the actual feed during a plot.

So a time estimate is "the distance walk we already do, divided by the feed in force on
each segment, plus dwell time." It is intrinsically tied to speed, segment count, and the
emitted order — which is exactly what the user asked for.

## Goals / Non-Goals

**Goals:**
- A pure, unit-tested estimator that turns a generated G-code program into a duration in
  seconds, reading feeds and dwells straight from the program.
- A compact human-readable duration formatter (`~45s`, `~12m 30s`, `~1h 04m`).
- Show estimated **total** time before plotting and **remaining** time during a plot,
  replacing the `acked/total lines` text, in a way that looks clean on phone and laptop.

**Non-Goals:**
- Wall-clock accuracy. This is a planning estimate, not a countdown timer; acceleration
  ramps, controller look-ahead, and Z rapid time are not modelled.
- Changing the emitted G-code, the generator's ordering, or any hardware behaviour.
- A new spec for monitoring/responsive layout — those requirements are unchanged.

## Decisions

### Estimate by walking the generated program (not the polylines)

`estimatePlotTime(lines: string[]): number` (seconds) walks the emitted program exactly
like `gcodeXYLength`: track current `X`/`Y`; for each `G0/G1` line that carries `X`/`Y`,
add `hypot(Δx, Δy) / (feed_mm_per_min / 60)` using the line's `F` word (falling back to the
last seen feed); for each `G4 P<sec>` add the dwell seconds. Pen-Z moves (`G0 Z…`, no XY)
contribute no XY time.

- **Why walk the program, not the polylines?** The user explicitly wants the estimate to
  reflect "the updated way how the g-code is generated in which order." The travel moves
  between strokes (nearest-neighbour order) and the dwells only exist in the emitted
  program. Walking it captures speed, segment count, and order in one pass with no
  duplicated ordering logic.
- **Alternative considered:** estimate from polylines + a separate re-implementation of the
  ordering — rejected as duplicate logic that would drift from the generator.
- **Home:** `src/plot/gcode.ts`, beside `generateGcode`, so the estimator and the program
  that feeds it live together and are tested together (`gcode.test.ts` already touched).
  `gcodeXYLength` stays in `App.tsx` as-is (surgical; not refactored).

### Z rapid time ignored; dwell counted

Z-only rapids have unknown rapid speed and are tiny per stroke. Dwell (`G4 P`) is explicit
in the program and dominates per-stroke overhead, so it is counted. This keeps the
estimator dependency-free and deterministic.

### Total before plot, remaining during plot, scaled by speed override

- **Total:** compute `estimatePlotTime(gc)` for the program the current placement would
  generate (the same `generateGcode(...)` call `onPlot` already makes; before a plot we can
  compute it from `displayItems` placement). Display it near the plot status / progress
  strip. Recompute when artwork/feeds/layout change (it is cheap and pure).
- **Remaining:** at plot start, store the total estimate. Remaining ≈
  `total * (1 - progressFrac) * (100 / speedPct)`. `progressFrac` already exists (distance
  based); dividing by the live `speedPct` makes the readout respond to the override. This
  is an approximation (dwell isn't distance-proportional) but good enough for a planning
  readout and avoids re-deriving per-segment remaining time.

### Formatting and responsive placement

`formatDuration(seconds)` → `~45s` (<60s), `~12m 30s` (<1h), `~1h 04m` (≥1h). Replace the
`{progress ? ' · {acked}/{total} lines' : ''}` text in the footer with the time readout
(`~Xm left` while plotting, `~Y total` when idle). The footer already uses
`flex-wrap`/`gap`, so the short string wraps cleanly; the phone view shows the same compact
string in its progress area. No new layout columns — just shorter text in existing slots,
which keeps both phone and laptop clean.

## Risks / Trade-offs

- **Estimate vs reality drift** (acceleration, look-ahead, Z rapids not modelled) → Frame it
  as an estimate (`~` prefix); never present it as a precise countdown. Acceptable for
  planning.
- **Remaining-time approximation** when dwell-heavy art runs at a non-100% speed override →
  the distance-based `progressFrac` already drives the progress bar, so the readout stays
  consistent with the bar; small inaccuracy is acceptable.
- **Pre-plot total recompute on every change** → the walk is O(lines) and pure; cheap.
  Memoize on the same inputs `onPlot` uses if it ever shows up in profiling (not expected).

## Open Questions

- Exact placement of the pre-plot total (a label near the Plot button vs. always in the
  footer). Default: show it in the footer where the line count was, switching to
  remaining-time once a plot starts — decided unless the user prefers otherwise.
