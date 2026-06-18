## Why

The plotter-control-core change proved we can drive the machine, but it left the question of *where* the pen draws unanswered: there is no fixed, repeatable origin yet. Before building the SVG canvas (where artwork is placed on a visualized page), the app needs a known origin that maps the on-screen paper corner to a real machine position. The operator's chosen workflow makes this clean: home to a fixed corner, register every sheet (A4–A0) to that same corner, and work in **work coordinates** anchored there — so the app never needs to know where on the A0 bed the paper physically sits.

Two facts are still unverified and block confident canvas work: whether the machine homes at all (`$22` was not in the partial settings dump), and the true axis orientation (the spiral we plotted is radially symmetric, so it could not reveal a mirrored/flipped Y). This change settles both empirically.

## What Changes

- Add a **Home (`$H`)** action that runs the GRBL homing cycle, reflects the `Home`/`Idle`/`Alarm` state, and degrades gracefully if homing is disabled (`$22=0`) instead of failing silently.
- Add **Set work zero** (`G10 L20 P1 X0 Y0` — current position becomes work origin) and **Go to work zero** (rapid to work `0,0`), with the option to reset the work offset.
- Display **both machine position (MPos) and work position (WPos)** in the UI, with a clear indicator of the active origin. (The status parser already retains `WCO`; `WPos = MPos − WCO`.)
- **Surface the `$$` settings** in the UI — especially `$22` (homing enable) and homing-related settings — so the operator can see whether homing is available.
- Add an **orientation test**: plot a small *asymmetric* reference mark (an "L"/arrow) near the work origin so the operator can confirm axis orientation, the Y-flip, and which corner is the homed corner — before the canvas is built on those assumptions.
- Add small **engine methods** (`home`, `setWorkZero`, `goToWorkZero`) that enqueue the corresponding GRBL lines, keeping `src/grbl` framework-free.

Out of scope (deferred): SVG upload/parsing, the Konva canvas, paper-size selection, SVG→G-code conversion, path optimization, multi-color layers, the Tailwind+Radix UI restyle, and the Raspberry Pi gateway.

## Capabilities

### New Capabilities
- `work-coordinates`: Establishing and using a fixed, repeatable origin — running the homing cycle, setting/clearing/returning to a work zero at the registration corner, exposing machine vs. work position, surfacing homing configuration, and verifying axis orientation with a test plot.

### Modified Capabilities
<!-- None. device-connection already exposes settings "at minimum"; surfacing more is additive and needs no spec change. The control-core engine/specs are reused unchanged. -->

## Impact

- **UI (browser):** new origin/homing controls and a settings/position readout added to the existing minimal panel; no restyle yet.
- **Engine (`src/grbl`):** three additive, framework-free methods (`home`, `setWorkZero`, `goToWorkZero`); no changes to streaming/status/transport.
- **No new dependencies.** Reuses the archived control-core specs and engine.
- **Hardware required** for verification (homing, set-zero, orientation test). Resolves the open `$22`/homing and Y-orientation questions for the next change.
