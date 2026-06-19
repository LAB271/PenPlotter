## Why

Operators currently see only a raw G-code line counter (`123/4567 lines`) while a plot
runs — a number that means nothing about how long the job will take. They want to know
"how long is this plot going to take" before they press Plot, and "how much longer" once
it is running. A meaningful time estimate, shown cleanly on both phone and laptop,
replaces the opaque line count.

## What Changes

- Add a pure time estimator that computes the expected plot duration by walking the
  generated G-code program: it accounts for the configured draw/travel **feeds** (speed),
  the number of move segments (**amount of lines**), and the actual **stroke order** the
  generator emits (nearest-neighbour travel), plus pen-settle dwells.
- Show an **estimated total time** for the placed artwork before plotting (so the operator
  knows the cost up front), and a **remaining-time** readout during the plot that tracks
  progress and scales with the live speed override.
- **Replace** the `acked/total lines` readout in the progress strip with the time readout,
  formatted compactly (e.g. `~12m left`, `~1h 04m total`) so it reads well on both the
  phone view and the desktop layout.

## Capabilities

### New Capabilities
- `plot-time-estimate`: Compute and display an estimated plot duration — derived from the
  programmed feeds, the segment count, and the generated stroke order — both before a plot
  (total) and during a plot (remaining), rendered cleanly on phone and laptop, replacing
  the raw line counter.

### Modified Capabilities
<!-- None: G-code generation, monitoring, and responsive layout requirements are unchanged.
     The estimator reads the already-generated program; the line-count text it replaces is
     not itself a spec requirement. -->

## Impact

- **Code**: `src/plot/gcode.ts` (new pure `estimatePlotTime` + duration formatter, sharing
  the existing program-walking approach used by `gcodeXYLength`); `src/ui/App.tsx`
  (compute the estimate at placement and plot start, render the readout in the progress
  strip in place of the line count). Unit tests in `src/plot/__tests__/gcode.test.ts`.
- **No new dependencies**, no hardware behaviour change, no change to the emitted G-code.
