## 1. Responsive phone layout

- [x] 1.1 Reflow the three-column layout to a touch layout on phone widths (`flex-wrap`): canvas full-width on top, jog + home/calibration as two columns below; `md:flex-nowrap` restores the desktop three columns
- [x] 1.2 Live canvas as the centrepiece, sized `h-[42vh]` on phones (`md:flex-1` on desktop); ResizeObserver fits it and PlotCanvas draws the live pen marker
- [x] 1.3 Surface live state, MPos/WPos, and the progress bar legibly on a phone (footer `flex-wrap`)
- [x] 1.4 Large, touch-friendly Pause / Resume / Stop controls (`transportBtn`: bigger on mobile, compact on desktop); jog buttons enlarged too
- [x] 1.5 Show only operate controls on the phone (transport, jog, pen, home/calibration); hide artwork import, pen & feeds, and drawing controls via `hidden md:block`

## 2. Live speed (feed override)

- [x] 2.1 `GrblController.setFeedOverride(percent)` — step the real-time feed-override bytes (±10%/±1%) toward a clamped 10–200% target; reset to 100% at each plot start
- [x] 2.2 Expose it over the gateway: `feedOverride` command in `protocol.ts`, dispatch in `gateway/server.ts`, `GatewayClient.setFeedOverride`
- [x] 2.3 Desktop "Speed %" control wired to the override (applies live; pause/change/resume)

## 3. Verification

- [x] 3.1 ⚙ HARDWARE: phone shows the live pen marker + progress during a plot and the layout is clean (operator confirmed over iterative deploys)
- [x] 3.2 ⚙ HARDWARE: Pause / Resume / Stop and jog work from the phone (operator confirmed)
- [x] 3.3 Desktop layout unchanged on wide screens — by construction (mobile-first + `md:` restores it); `tsc --noEmit` and `vite build` pass
- [ ] 3.4 ⚙ HARDWARE: confirm a speed change takes effect mid-plot (pause → change → resume) — pending operator confirmation
