## 1. UI foundation

- [x] 1.1 Add and configure Tailwind CSS (build-time) in the Vite project
- [x] 1.2 Add Konva + react-konva (React-18 line). Radix deferred to the styling pass (4.3); native controls + Tailwind for now
- [x] 1.3 Confirm `npm run build` is clean and the engine (`src/grbl`) still imports nothing browser-specific

## 2. Coordinate + G-code core (vertical slice first)

- [x] 2.1 Define the artwork model: polylines in paper-mm with top-left origin (`src/plot/`)
- [x] 2.2 Implement the G-code generator: polylines → work-coord G-code (`machineX=x, machineY=y` identity — corrected from the F test), pen up/down + dwell, draw/travel feeds, framing
- [x] 2.3 Unit-test the generator: mapping, pen sequencing per stroke, feed selection, safe framing
- [x] 2.4 Generate→stream path proven (sample F plotted on hardware; wired into the Plot action in 6.4)

## 3. SVG import

- [x] 3.1 Load an `.svg` from disk (browser only); handle invalid/empty with a clear message
- [x] 3.2 Flatten geometry to polylines via DOM `getPointAtLength` + `getCTM` at a configurable mm tolerance; bake transforms
- [x] 3.3 Derive real-world size from `viewBox` + width/height (mm units; px fallback)
- [x] 3.4 Stroke-only scope: skip fills/`<text>`/clips without error and surface a "content skipped" note
- [x] 3.5 Unit-test the pure simplify pass (Douglas–Peucker); DOM flattening is browser-verified

## 4. Layout shell (Tailwind + Radix)

- [x] 4.1 Build the shell: top bar (connect, paper size, Plot), left & right panels, central canvas, bottom status strip
- [x] 4.2 Migrate existing controls (connect, jog, pen, origin, settings, soft-limit fix) into the new layout
- [ ] 4.3 Professional styling polish + Radix primitives (sliders/select/dialog) — first Tailwind pass done; refine after visual review
- [x] 4.4 Side-panel plot settings: pen-down Z, pen-up Z, dwell, draw feed, travel feed, flatten tolerance, jog feed — editable + persisted; the generator reads these

## 5. Canvas: bed, paper, artwork

- [x] 5.1 Render the bed and the paper (A4–A0, orientation toggle) anchored at the top-left corner
- [x] 5.2 Render the artwork as its flattened pen-path (WYSIWYG) on the paper
- [x] 5.3 Drag / scale / rotate the artwork via a Konva Transformer; reflect real mm/degrees
- [x] 5.4 Fit-to-corner and fit-to-paper
- [x] 5.5 Work-area clamp: detect artwork exceeding travel, warn, and guard the Plot action

## 6. Plot monitoring

- [x] 6.1 Live pen-position marker on the canvas from `WPos` (identity mapping)
- [x] 6.2 Progress bar from `streamProgress`; live state + MPos/WPos readout in the bottom strip
- [x] 6.3 Pause / resume / stop controls wired to the engine
- [x] 6.4 Plot action: generate G-code from current placement and stream it

## 7. Verification

- [x] 7.1 `npm run build` clean; `npm test` green (22 tests: generator + simplify + engine)
- [ ] 7.2 ⚙ HARDWARE: disable soft limits, set work zero at the paper corner, import an SVG, fit-to-paper, Plot — confirm correctly oriented and within the paper
- [ ] 7.3 ⚙ HARDWARE: watch the live pen marker track the real pen, progress advance, pause/stop work mid-plot

## 8. Enhancements (added after first hardware session)

- [x] 8.1 Multiple artworks on the page: a list with add/select/remove; the canvas renders all, the Transformer attaches to the selected one; Plot generates G-code for all placed artworks combined
- [x] 8.2 90° rotate button on the selected artwork, plus rotation-aware fit-to-paper / fit-to-corner (anchor the *rotated* bounding box to the top-left corner) — `transformedBox`/`fitPlacement`/`anchorPlacement` in `src/plot/place.ts`
- [x] 8.3 Stop → pen up → return to work zero (X0 Y0) and ready to re-Plot — `stopAndReturnHome()` (homing stays disabled; work zero is the paper corner)
- [x] 8.4 PNG/JPEG import: rasterize → grayscale → marching-squares iso-contours (`threshold` + `levels`) → polylines into the existing pipeline (`src/plot/raster.ts`); threshold/levels controls in the side panel
- [x] 8.5 Fill-based SVGs (e.g. potrace traces): clearer message pointing the operator to PNG import. Deferred: proper SVG fill-outline tracing (fix relative-subpath split + tiny-contour drop)
- [x] 8.9 Detail **slider** with live preview: artwork is flattened/traced once at full detail (the "master"); the 0–1 slider thins it live (Douglas–Peucker epsilon + dropping whole sub-threshold strokes) for both the canvas preview and the plot. Pure `applyDetail`/`detailParams` in `src/plot/detail.ts`; recomputed via `useMemo`. Dropping small strokes (fewer pen lifts) is the real plot-time win
- [x] 8.8 Skip non-rendered SVG geometry on import (computed `display:none`/`visibility:hidden`/`opacity:0` incl. ancestors, and `defs`/`clipPath`/`symbol`/`mask`/`marker`/`pattern` content) so hidden layers/guide tracks don't plot — `isRendered()` in `src/plot/svg.ts`
- [x] 8.6 Unit-test the pure cores: `isoContours` marching squares + `transformedBox`/`fitPlacement`/`anchorPlacement`; build + test green (31 tests)
- [x] 8.10 Streaming reliability (found during hardware verify — plot froze silently at a repeatable line): fix char-counting RX-buffer off-by-one (cap 128→127, stay strictly below GRBL's buffer) + add an App-side stall watchdog that lifts the pen, returns home, and reports the stalled line + last TX when the machine sits Idle with no progress
- [x] 8.11 Fix mid-plot freeze (main-thread saturation): render the live pen marker on its own Konva layer and memoize the artwork shapes so the full drawing isn't reconciled/redrawn on every ~10 Hz pen-position update. Prevents UI lock-up that also blocked the stall watchdog
- [x] 8.12 Pause/Resume reliability: stall watchdog now ignores paused time (paused flag set on Pause, timer reset on Resume) so resuming after a long hold no longer triggers a reset-while-moving (ALARM:3) + lockout (error:9). Added an Unlock ($X) button
- [x] 8.13 Faster SVG import: skip non-rendered elements via a null getCTM() (one cheap test, no per-ancestor getComputedStyle walk) + single visibility lookup per element; relax master flatten tolerance 0.1→0.2 mm (still finer than the pen)
- [x] 8.14 Smooth Stop: wait for motion to fully decelerate (poll MPos until stable) before the soft reset, so Stop no longer resets mid-motion → ALARM:3 → locked-out pen-up/home (which looked like a "double" pen-up because the operator had to unlock + Go-home manually). Stop now does pen-up + return-home in one clean pass
- [x] 8.15 Diagnostic logging: in-app serial log panel (TX/RX with status spam filtered, ERR/ALARM/ABORT/STALL/SYS) + a ~1 Hz plot heartbeat (state, acked/total, inflight/bytes/queued via `streamDebug`, mpos), kept in a ref ring buffer and mirrored to console so it survives a UI freeze; Copy/Clear buttons. Lets us classify a freeze (browser-frozen vs GRBL-stalled vs pump-stuck) instead of guessing
- [x] 8.16 Connectivity: disconnect now fully releases the port so connect/disconnect works anytime (no replug). Robust transport close — cancel reader + await the read loop to release its lock, abort the writer (cancels stuck writes) before releaseLock, then close the port. Fixes the "Paired"/in-use stuck state
- [x] 8.17 Crash-proof read loop + timer heartbeat: isolate each data-listener so a throwing line handler can't silently kill all reads (the freeze signature: reads stop, no disconnect); log listener/read-loop errors; move the plot heartbeat to a setInterval (independent of serial reads) reporting state/acked/inflight/queued/rxAge so we can tell a frozen JS thread from a dead read pipeline
- [x] 8.18 Reconnect-without-refresh (root cause, likely also the freezes): `disconnect()` via `clearPending()` was permanently unsubscribing the transport data/close listeners (set once in the constructor), so after one disconnect the controller was deaf to all incoming serial data until a page refresh. Moved the unsubscribe into a new `dispose()` (unmount only); `disconnect()` now keeps listeners so reconnect works. Also reset transient session state on `connect()` (LineReader buffer, banner waiters, last status, write chain). App unmount calls `dispose()`
- [x] 8.19 Pause/resume stall root cause: (a) status state parsed as `Unknown` during a feed hold — FluidNC reports `<Hold:0|…>` and the substate wasn't stripped (`parseStatus` now splits on `:`); (b) the machine went silent ~6 s into a hold because we kept firing `?` at ~10 Hz while it consumed nothing — `pause()` now suspends polling (and `resume()`/`stop()` restart it), and base poll rate eased 100→200 ms (GRBL's recommended max)
- [x] 8.20 Dead-link detection + recovery: a timer-driven (read-independent) check fires when no serial data arrives for >5 s during a plot (skipped while paused, since polling is intentionally off), surfaces a clear "lost contact — Disconnect then Connect" message, and stops the plot state. Pause/Resume/Stop presses are now logged
- [x] 8.21 Pause root cause (feed-hold wedges the FluidNC/CH340 USB link — proven: link stayed dead after Resume and with polling off, so not a poll-rate issue): replaced firmware feed-hold pause with a **soft pause** — `pause()` just stops feeding new lines (`pump()` checks a `paused` flag), the machine drains its buffer and idles normally, the link stays healthy and keeps polling; `resume()` clears the flag and pumps. `paused` reset on stream start/abort/connect. Reverted the poll-suspend-during-pause change; dead-link detector no longer gated on paused
- [x] 8.22 Reconnect "Failed to open" after a wedged link: `close()` steps are now time-boxed (`settleWithin`) so teardown always releases the port and never hangs, leaving it reusable for the next connect
- [x] 8.23 Stop wedged the link too (root cause of the "dies after pause/stop testing + can't reconnect without replug"): `stop()` was still doing feed-hold (`!`) + soft-reset (`Ctrl-X`) — the feed-hold wedges the FluidNC/CH340 link (same as pause did) and the reset reboots the board. Replaced with a soft stop: drop the remaining program, let the few buffered moves finish, then lift pen + return to work zero. No `!`, no `Ctrl-X` → link stays healthy, work zero preserved, reconnect works without replugging. Removed `waitUntilStopped`/`delay` (now unused). In-session ESP32 resets are now eliminated (only the unavoidable port-open reset at connect remains)
- [x] 8.24 Custom paper size + A0 (SBP) 1181×841 preset; subtle paper-dimensions label centered on the paper in the canvas (mm)
- [x] 8.25 Quick pause/stop: reverted to immediate feed-hold (`!`) for pause and feed-hold→settle→reset for stop (soft pause/stop waited for buffered moves, slow on long strokes). Polling stays on throughout. Trade-off: feed-hold/reset are the suspected USB-wedge contributors — the durable answer is the Pi gateway
- [x] 8.26 Link-death hardening: serial write() is time-boxed (3 s) and logs failures so a wedged USB link surfaces instead of hanging the pipeline; auto-reconnect on the `navigator.serial` connect event (replug → gesture-free `reopen()` of the granted port, shared `afterOpen()` handshake). NOTE: a CH340 wedged at the USB level still needs a physical replug to reset — not software-fixable; auto-reconnect makes that recovery seamless
- [ ] 8.7 ⚙ HARDWARE: add a PNG + a 2nd artwork, rotate 90° + fit, Plot — confirm both plot correctly oriented/within paper; press Stop mid-plot and confirm the pen lifts and returns to the corner, ready to re-Plot
