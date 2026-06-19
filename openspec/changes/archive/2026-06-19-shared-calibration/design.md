## Context

Plot G-code is generated in the browser (`generateGcode` reads `cal` for pen Z, dwell, draw/travel feeds) and streamed to the daemon. The editable session (artwork + page) is already shared: the daemon stores it (`gateway/.session.json`), serves it in the attach snapshot, and the client adopts it — gated by `sessionLoadedRef` so a stale local copy can't clobber a newer shared one. Calibration, however, lived only per-browser (localStorage + a live push to the daemon's controller for manual pen moves) and was never shared.

## Decisions

- **Reuse the shared-session channel** rather than add a separate calibration message/snapshot field. Calibration is just another field on the session blob (opaque to the daemon), so it rides the existing persistence and the existing `sessionLoadedRef` anti-clobber gate — no daemon or protocol code change.
- **Adopt on connect** via the session-restore handler (`setCal(prev => ({ ...prev, ...session.calibration }))`). Merging onto `prev` keeps any local-only fields safe if the shared object is partial.
- **Seed, don't overwrite, when absent.** If the shared session has no calibration (older blob), the client keeps its local calibration; the normal persist path then writes it into the shared session, so the first device seeds it.
- **Leave the live per-browser calibration push** (for manual pen up/down on the daemon's controller) unchanged — it's orthogonal to which feeds get baked into a plot's G-code.

## Risks / Trade-offs

- Calibration now propagates across devices on connect, so a device adopting the shared setup overrides its own local tweaks. That's the intended behaviour (one shared machine setup), matching how artwork already syncs.
