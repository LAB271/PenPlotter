## 1. Implementation

- [x] 1.1 Add an optional `calibration` to the `Session` type (`src/ui/sessionStore.ts`)
- [x] 1.2 Include `cal` in the persisted session blob and add it to the persist effect's deps (`src/ui/App.tsx`)
- [x] 1.3 Adopt `session.calibration` (merged onto current cal) in the daemon session-restore handler (`src/ui/App.tsx`)

## 2. Verification

- [x] 2.1 `tsc --noEmit`, unit tests, and `vite build` pass
- [ ] 2.2 ⚙ HARDWARE: start a plot from the phone → confirm it runs at the laptop's set speed (pending operator confirmation)
