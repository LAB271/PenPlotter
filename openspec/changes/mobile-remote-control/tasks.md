## 1. Responsive phone layout

- [ ] 1.1 Add Tailwind breakpoints so the three-column layout reflows to a single column on phone widths; side/editor panels collapse or stack (not removed)
- [ ] 1.2 Make the live canvas (paper, artwork, pen marker) the centrepiece of the phone view; confirm it fits-to-container and the pen marker stays visible at phone size
- [ ] 1.3 Surface live state, MPos/WPos, and the progress bar legibly on a phone
- [ ] 1.4 Large, touch-friendly Pause / Resume / Stop controls in the phone view (reuse existing daemon commands)

## 2. Verification

- [ ] 2.1 ⚙ HARDWARE: open the app on a phone on the same network during a plot → confirm the live pen marker and progress update in real time and the layout looks clean (no overlap / horizontal scroll)
- [ ] 2.2 ⚙ HARDWARE: from the phone, Pause / Resume / Stop a running plot → confirm each takes effect and live state updates
- [ ] 2.3 Confirm the desktop layout is unchanged on a wide screen
