## 1. Responsive phone layout

- [x] 1.1 Add Tailwind breakpoints so the three-column layout reflows to a single column on phone widths; side/editor panels collapse or stack (not removed) — main area is `flex-col` + scroll on mobile, `md:flex-row` on desktop; asides go `w-full` and stack below the canvas via `order-*`
- [x] 1.2 Make the live canvas (paper, artwork, pen marker) the centrepiece of the phone view; confirm it fits-to-container and the pen marker stays visible at phone size — canvas is `order-1 h-[55vh]` on mobile (top of the column), `md:flex-1` on desktop; existing ResizeObserver fits it and PlotCanvas already draws the live pen marker
- [x] 1.3 Surface live state, MPos/WPos, and the progress bar legibly on a phone — footer is now `flex-wrap` so state/MPos/WPos/progress wrap instead of clipping
- [x] 1.4 Large, touch-friendly Pause / Resume / Stop controls in the phone view (reuse existing daemon commands) — `transportBtn` style: `px-4 py-2 text-sm` on mobile, `md:` compact on desktop

## 2. Verification

- [ ] 2.1 ⚙ HARDWARE: open the app on a phone on the same network during a plot → confirm the live pen marker and progress update in real time and the layout looks clean (no overlap / horizontal scroll)
- [ ] 2.2 ⚙ HARDWARE: from the phone, Pause / Resume / Stop a running plot → confirm each takes effect and live state updates
- [x] 2.3 Confirm the desktop layout is unchanged on a wide screen — verified by construction: every layout change is mobile-first with `md:` variants restoring the original three-column row, widths, order, and button sizing; `tsc --noEmit` and `vite build` pass
