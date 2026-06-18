## 1. Engine: origin helpers

- [x] 1.1 Add `home()` to `GrblController` (enqueues `$H`); ensure status reflects `Home` then `Idle`
- [x] 1.2 Add `setWorkZero()` (enqueues `G10 L20 P1 X0 Y0`) and `resetWorkOffset()` (clears the G54 offset)
- [x] 1.3 Add `goToWorkZero()` (rapid to work `0,0`)
- [x] 1.4 Keep all three framework-free (only enqueue GRBL lines); confirm `src/grbl` still imports nothing browser-specific

## 2. UI: position + origin readout

- [x] 2.1 Compute WPos from the existing parsed `MPos`/`WCO` (`WPos = MPos − WCO`)
- [x] 2.2 Show MPos and WPos as distinct, live-updating values with an active-origin indicator
- [x] 2.3 Add Home, Set work zero, Go to work zero, and Reset work offset controls (disabled when disconnected)

## 3. UI: settings visibility

- [x] 3.1 Surface the parsed `$$` settings in the panel (the engine already collects them on connect)
- [x] 3.2 Highlight `$22` (homing enable) and homing-related settings so availability is obvious

## 4. Homing safety + graceful degradation

- [x] 4.1 Gate the Home action on known-enabled homing (or an explicit confirm), reflecting the earlier deliberate-skip-`$H` caution
- [x] 4.2 Handle homing disabled (`$22=0`) / alarm responses with a clear message and a manual-set-zero fallback; never leave the UI stuck

## 5. Orientation test

- [x] 5.1 Generate a small, clearly asymmetric reference mark (e.g. an "L" with unequal legs, or an arrow) as G-code in work coordinates
- [x] 5.2 Add a "Run orientation test" control that streams it via the existing streaming path
- [x] 5.3 Verify the build is clean (`npm run build`) and existing tests still pass (`npm test`)

## 6. Hardware verification

- [x] 6.1 ⚙ HARDWARE: read the settings view — record whether `$22` is `1` (homing enabled) or `0` → **`$22=0`, homing DISABLED** (manual work-zero is the workflow)
- [x] 6.2 ⚙ HARDWARE: Home (if enabled), tape paper to the corner, Set work zero, confirm WPos reads `0,0` there → set-work-zero confirmed; origin = paper's top-left corner
- [x] 6.3 ⚙ HARDWARE: Go to work zero returns the pen to the corner
- [x] 6.4 ⚙ HARDWARE: run the orientation test; confirm the mark's X/Y orientation and Y-flip → **+X = right (no flip); Y must be flipped (artwork-down = machine −Y); origin = top-left**
