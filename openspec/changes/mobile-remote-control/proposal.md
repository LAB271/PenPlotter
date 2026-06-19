## Why

The plotter now lives on the Pi and a plot survives the laptop leaving. You can already open the web app from a phone on the same network — but it's built for a desktop three-column layout (240 px / flex / 256 px side panels), so on a phone the panels collide, controls are cramped, and **you can't see the live plotter**. What's actually wanted from a phone is simple: **watch the plot happen live and be able to pause, resume, or stop it.**

This change makes the phone a clean **monitoring view** — nothing more. It does not try to be an editor or a settings console.

## What Changes

- **Responsive monitoring layout.** Below a phone breakpoint the app collapses to a single-column view that looks right on a phone, prioritising what you need while away from the bench.
- **See the plotter live.** The canvas (paper, artwork, and the live pen marker that already tracks `WPos`) is the centrepiece of the phone view, alongside live machine state, position, and the progress bar — so you can watch the plot advance in real time. This is the main gap today.
- **Pause / Resume / Stop.** Large, touch-friendly transport controls, reusing the existing daemon commands. Stop uses the existing pen-up + return-home behaviour.

Out of scope (deliberately, to keep it simple):
- **Adjusting speed or any machine setting from the phone** — the phone is for monitoring + transport only. (Live speed via GRBL feed override was considered and is *deferred* to a possible later change; it is not built here.)
- Importing / placing / scaling artwork by touch — setup stays on the desktop.
- Jog and pen up/down on mobile — not needed for monitoring (they remain on desktop).
- Offline/PWA install, gesture shortcuts.

## Capabilities

### New Capabilities
- `responsive-control`: On small touch screens the web app presents a clean single-column monitoring view — the live plotter (canvas + pen marker), machine state, position, progress, and Pause / Resume / Stop — so an operator can watch and halt a running plot from a phone.

### Modified Capabilities
<!-- None. Reuses plot-monitoring and the existing pause/resume/stop commands
     unchanged; this is a presentation/layout change plus surfacing the live view. -->

## Impact

- **Code:** `src/ui/App.tsx` and `PlotCanvas` layout only — Tailwind responsive breakpoints and a single-column phone arrangement that keeps the canvas (live pen marker), status, progress, and Pause/Resume/Stop visible and touch-sized. No engine, protocol, or G-code changes.
- **Behaviour:** desktop layout unchanged on wide screens; the phone shows the live plot and can pause/resume/stop. No new control surface, no settings on mobile.
- **Hardware:** verify on a phone on the same network that the live pen marker and progress update during a plot and that Pause/Resume/Stop work.
