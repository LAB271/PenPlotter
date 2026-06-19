## Why

The plotter now lives on the Pi and a plot survives the laptop leaving — but the only way to watch or adjust a running plot is the desktop UI. Operators want to step away with just a phone and still **monitor the plot and change its speed on the move**. Two things block that today:

1. The UI is a fixed three-column desktop layout (240 px / flex / 256 px side panels). On a phone it is unusable — the side panels and canvas collide, controls are tiny, and the bottom strip overflows.
2. **Speed cannot change once a plot is streaming.** The draw feed is baked into the G-code at Plot time, so the only thing that can affect an in-flight plot is GRBL's real-time feed override — and we don't expose it. The override bytes (`0x90`–`0x94`) are already defined in `GrblController` but unused.

This change makes the app usable as a **touch remote** on a phone and adds **live speed control** that actually takes effect mid-plot.

## What Changes

- **Responsive remote layout.** Below a phone breakpoint the app collapses from three columns to a single-column, touch-first **remote** surface that prioritises what you need while away from the bench: live state + position, the progress bar, large Pause / Resume / Stop targets, Pen up / Pen down, jog, and the live speed control. The desktop editor (import, place, scale, rotate, side panels) stays the primary surface for setup on a larger screen — per the chosen scope, the phone is a remote, not a full editor. Editor sections remain reachable on mobile (e.g. collapsible / scrollable) but are not redesigned for touch placement.
- **Live speed control via feed override.** A new `GrblController` method drives the real-time override bytes to reach a target percentage of the baked draw feed (GRBL override range 10–200 %, in 10 % / 1 % steps). The operator enters speed as a **number** (a target %, with the resulting mm/min shown), consistent with "speed and machine settings are typed, drawing look is sliders." The control reflects the override GRBL reports back in its status line, and works both during a plot and while idle (it persists for the next motion).
- **Touch-friendly controls.** Jog, pen, and transport buttons get adequately sized hit targets and use pointer events that already back the press-and-hold jog, so they behave on touch.

Out of scope (deferred): importing/placing/scaling artwork by touch on the phone (the editor stays desktop-first); a separate rapid/travel override (GRBL's rapid override is coarse — 25/50/100 % only — and travel speed matters less for look); offline/PWA install; gesture shortcuts.

## Capabilities

### New Capabilities
- `responsive-control`: The web app adapts to small touch screens, presenting a single-column remote (live status, progress, transport, pen, jog, speed) so an operator can monitor and steer a running plot from a phone.
- `feed-override`: Live adjustment of plotting speed during an active plot via GRBL real-time feed override, driven by a typed target and reflecting the machine's reported override.

### Modified Capabilities
<!-- None. Reuses plot-monitoring, manual-control, and gcode-streaming unchanged;
     feed override is additive (real-time bytes that bypass the line queue). -->

## Impact

- **Code:** `src/grbl/GrblController.ts` — add a feed-override method that steps the override toward a target % (using the existing `sendRealtime` + the `FEED_*` bytes) and parse/track the override field GRBL reports in `<...>` status. `src/grbl/types.ts` / status parsing — surface the reported override. `src/transport/GatewayClient.ts` + `src/gateway/protocol.ts` — a command to set the override target (real-time, like pause/resume). `src/ui/App.tsx` + `PlotCanvas` layout — responsive breakpoints (Tailwind) and the remote view; a speed number field wired to the override.
- **Behaviour:** changing speed mid-plot retargets the machine immediately and does not restart or regenerate the plot. On disconnect/reconnect the override re-syncs from the next status line.
- **No protocol breakage:** the override command is additive; existing clients keep working.
- **Hardware:** verify on the real machine that the override changes feed live mid-plot, the reported % tracks, and the remote view drives Pause/Resume/Stop/jog/pen/speed from a phone on the same network.
