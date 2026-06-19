## Why

The plotter now lives on the Pi and a plot survives the laptop leaving. You can already open the web app from a phone on the same network — but it's built for a desktop three-column layout (240 px / flex / 256 px side panels), so on a phone the panels collide, controls are cramped, and **you can't see the live plotter**. What's actually wanted from a phone is simple: **watch the plot happen live and be able to pause, resume, or stop it.**

This change makes the phone a clean **monitoring view** — nothing more. It does not try to be an editor or a settings console.

## What Changes

- **Responsive phone layout.** Below a phone breakpoint the app reflows to a touch-friendly layout: the live canvas as the centrepiece (sized so controls below stay visible), with jog and home/calibration laid out side by side beneath it. The desktop three-column layout is unchanged.
- **See the plotter live.** The canvas (paper, artwork, and the live pen marker that already tracks `WPos`) is the centrepiece of the phone view, alongside live machine state, position, and the progress bar.
- **Operate from the phone.** Pause / Resume / Stop (large touch targets), jog, pen up/down, and home/calibration (set work zero, motors off, go to home, unlock). Setup-only controls — artwork import, pen & feed settings, drawing controls — stay desktop-only.
- **Live plotting speed (desktop).** A speed control changes the plotting feed live via the controller's real-time feed override (10–200% of the programmed feed): pause, change the speed, resume. It does not regenerate the G-code, and resets to 100% at each plot start. (Originally scoped out, then added per operator request; it is a desktop control, not on the phone view.)

Out of scope: importing/placing/scaling artwork by touch; offline/PWA install; gesture shortcuts.

## Capabilities

### New Capabilities
- `responsive-control`: On small touch screens the web app presents a touch-friendly layout — the live plotter (canvas + pen marker), state/position/progress, Pause/Resume/Stop, jog, pen, and home/calibration — so an operator can run and watch a plot from a phone.
- `feed-override`: Live plotting-speed adjustment during a plot via the controller's real-time feed override (desktop control; pause/change/resume), without regenerating the G-code.

### Modified Capabilities
<!-- None. Reuses plot-monitoring and the existing pause/resume/stop/jog commands;
     adds the feed-override real-time path. -->

## Impact

- **Code:** `src/ui/App.tsx` + `PlotCanvas` (responsive layout, plot lock unaffected); `GrblController.setFeedOverride` (real-time feed-override bytes) exposed via `src/gateway/protocol.ts`, `gateway/server.ts`, and `src/transport/GatewayClient.ts`; a desktop speed control.
- **Behaviour:** desktop layout unchanged on wide screens; the phone runs/watches a plot; speed changes apply live to an in-flight plot.
- **Hardware:** verify on a phone that the live pen marker/progress update and the controls work; verify the speed change takes effect mid-plot.
