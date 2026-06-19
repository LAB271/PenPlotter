## Context

The browser is a thin client over a Pi-hosted daemon that owns the serial port and streams autonomously; plots survive client disconnect, and the daemon already emits live status (`WPos` ~10 Hz) and stream progress. The desktop UI (`src/ui/App.tsx`) is one large component with a fixed three-column flex layout and a bottom transport strip; `PlotCanvas` already renders the bed, paper, artwork, and a live pen marker. The phone can already reach the app — it just isn't laid out for a small screen and the live view isn't surfaced.

## Goals / Non-goals

**Goals**
- A phone shows a clean view of the live plot (canvas + pen marker), state, position, and progress.
- Pause / Resume / Stop are easy to hit on touch.

**Non-goals**
- Any speed or settings adjustment from the phone (monitoring only; live feed override is deferred to a possible later change).
- Touch artwork editing (import/place/scale), jog, or pen control on mobile.
- A native app or PWA install.

## Decisions

### Monitoring only — keep it simple
The phone's job is to watch and, if needed, halt. That removes the need for any new control plumbing: Pause/Resume/Stop already exist as daemon commands, and the live view already exists in `PlotCanvas`. So this is a **layout/presentation change**, not new behaviour — the smallest thing that closes the real gap ("it doesn't look nice and I can't see the live plotter").

### Responsive via Tailwind breakpoints, one component
The existing layout reflows rather than forking a separate mobile app. At phone widths the three columns stack into a single column with the canvas (live pen marker + progress) as the centrepiece, status/position above or below it, and large Pause/Resume/Stop targets. At `>= md` the desktop three-column editor is unchanged. One source of truth, no duplicated wiring.

### Reuse the live pen marker and progress
The canvas already maps `WPos` to a pen marker and the bottom strip already shows state/progress; the phone view simply arranges these to be visible and legible on a small screen. No new data, no new events.

## Risks / Trade-offs

- **Single-component growth:** `App.tsx` is already large; responsive markup adds to it. Acceptable now; a later UI-polish change can extract components.
- **Canvas legibility on small screens:** the bed is wide (up to A0); on a phone the paper+artwork must scale to fit and the pen marker stay visible. Mitigation: the canvas already fits-to-container via `ResizeObserver`; verify the marker remains visible at phone size.

## Migration

Pure presentation change. No persisted-state or protocol changes; desktop behaviour is unchanged when the viewport is wide.

## Open Questions

- Exact phone breakpoint and whether the transport sits as a fixed bottom bar vs. inline below the canvas (visual polish — decide against a real device).
