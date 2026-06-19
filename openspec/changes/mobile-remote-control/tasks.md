## 1. Feed override (engine + protocol)

- [ ] 1.1 Add `GrblController.setFeedOverride(targetPercent)`: clamp to 10–200, then step the override toward the target using the existing `FEED_PLUS_10/MINUS_10/PLUS_1/MINUS_1` and `FEED_100` real-time bytes via `sendRealtime`; converge against the reported override (don't assume success)
- [ ] 1.2 Parse the `Ov:` field from GRBL status reports into `StatusReport` (feed/rapid/spindle override %); expose the feed override on the controller and emit it with status
- [ ] 1.3 Reset the tracked override on (re)connect so it re-syncs from the first status line
- [ ] 1.4 Add an "override target" command to `src/gateway/protocol.ts` and `GatewayClient` (real-time, like pause/resume); daemon routes it to `setFeedOverride`
- [ ] 1.5 Unit tests: clamping, step sequence toward a target, convergence on reported value, re-sync after reset (extend `streaming.test.ts` / status parsing tests)

## 2. Speed control UI

- [ ] 2.1 Speed control = numeric target % input + shown effective mm/min (from `cal.drawFeed`); reflects the reported override, debounced on input
- [ ] 2.2 Wire the control to the gateway override command; usable both idle and mid-plot

## 3. Responsive remote layout

- [ ] 3.1 Add Tailwind breakpoints so the three-column layout reflows to a single column on phone widths; side/editor panels collapse or stack (not removed)
- [ ] 3.2 Compose a small-screen remote region: live state + MPos/WPos, progress bar, large Pause/Resume/Stop, Pen up/down, jog pad, speed control
- [ ] 3.3 Ensure touch hit targets are adequate; confirm press-and-hold jog and pen buttons work via pointer events on touch
- [ ] 3.4 Keep the live pen marker + progress visible on the shrunk canvas in the remote view

## 4. Verification

- [ ] 4.1 ⚙ HARDWARE: start a plot, change the speed % mid-plot → confirm the machine feed changes live, the plot does not restart, and the displayed % tracks the reported `Ov:`
- [ ] 4.2 ⚙ HARDWARE: set a speed while idle, then plot → confirm the plot runs at the pre-set override
- [ ] 4.3 ⚙ HARDWARE: from a phone on the same WiFi/tunnel, drive Pause/Resume/Stop, pen, jog, and speed on a running plot; confirm live state updates
- [ ] 4.4 ⚙ HARDWARE: disconnect/reconnect the phone mid-plot → confirm speed and state re-sync
