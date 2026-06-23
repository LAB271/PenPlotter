## 1. Build pipeline (verifiable on macOS)

- [x] 1.1 Add `esbuild` (dev dep) and a `build:gateway` script that bundles `gateway/server.ts` into `dist-gateway/gateway.js`, with `serialport` marked external and the platform set to node.
- [x] 1.2 Stamp the version: generate a build-time constant from `package.json` `version` that the daemon imports (replaces any reliance on reading `package.json` at runtime).
- [x] 1.3 Verify locally: `node dist-gateway/gateway.js` boots the daemon, serves `dist/`, and (with hardware/dev) the WebSocket works as before.
- [x] 1.4 Keep `npm run gateway` (`tsx`) working unchanged for dev.

## 2. Package artifacts

- [x] 2.1 Add `packaging/penplotter271.env` — default config consumed via `EnvironmentFile` (`GATEWAY_HOST=127.0.0.1`, `GATEWAY_PORT=8717`, `GATEWAY_DIST`, `PLOTTER_STATE=/var/lib/penplotter271/.plotter-state.json`, session path), marked a dpkg conffile. (Required `server.ts` to honor `GATEWAY_DIST`/`PLOTTER_SESSION` env — verified bundle serves GUI from `GATEWAY_DIST`.)
- [x] 2.2 Add `packaging/plotter-gateway.service` — runs `/opt/penplotter271/node /opt/penplotter271/gateway.js` as user `penplotter`, `EnvironmentFile=/etc/penplotter271/penplotter271.env`, `Restart=always`, `SupplementaryGroups=dialout`.
- [x] 2.3 Ship the udev rule via the package (nfpm maps the existing `gateway/99-plotter.rules` → `/lib/udev/rules.d/99-plotter.rules`; single source of truth).
- [x] 2.4 Add `packaging/penplotter271.sudoers` (→ `/etc/sudoers.d/penplotter271`, mode 0440) allowing the `penplotter` user only `systemctl start plotter-update.service`.
- [x] 2.5 Write maintainer scripts: `postinst` (create `penplotter` system user + `dialout`, state dir, best-effort state migration, reload udev, `daemon-reload`, enable+start), `prerm` (mid-plot guard reusing the fresh-state-file check, then stop), `postrm` (purge: remove user + `/etc/penplotter271` + `/var/lib/penplotter271`).

## 3. Assembly + nfpm

- [x] 3.1 Write `packaging/assemble.sh`: build GUI + gateway bundle, fetch a pinned arm64 Node into the staging tree, install runtime deps (serialport + ws only) incl. the arm64 `serialport` prebuild, copy `gateway.js` + `dist/` + `node_modules`, lay out `/opt/penplotter271`, then run nfpm if present. (Syntax-checked; runs on the Pi.)
- [x] 3.2 Write `nfpm.yaml`: name `penplotter271`, arch `arm64`, version from `package.json` (`${SEMVER}`), `contents` mapping (opt tree, unit, udev rule, env conffile, sudoers), `scripts` (the maintainer scripts), conffile via `config|noreplace`, `depends: [udev]`. (Update unit/script added in §5.4.)
- [x] 3.3 Bootstrap build: run `bash packaging/assemble.sh` **on the Pi**; inspect with `dpkg -c dist-deb/penplotter271_*.deb`.

## 4. Install + verify on the Pi (bootstrap)

- [x] 4.1 `sudo apt install ./penplotter271_<ver>_arm64.deb`; confirm the service is enabled, running, connected, and serving the GUI. *(Verified on the Pi: `active (running)`, journal showed `plotter connected — GRBL 3.0`.)*
- [x] 4.2 Run a real plot end-to-end via the installed package (state persists under `/var/lib/penplotter271`). *(Verified: functional test + state file driving the mid-plot guard.)*
- [x] 4.3 Verify upgrade (install a bumped build over it: service restarts, config + state preserved) and purge (service gone, user + `/etc/penplotter271` removed). *(Verified 0.1.1→0.1.2 upgrade + purge. Mid-plot guard bypass bug found & fixed in `prerm.sh` — `failed-upgrade` fallback now re-guards.)*

## 5. In-app updater

- [x] 5.1 Protocol: extend the snapshot with installed version + latest-known version, add an `update` command and update-status events (`src/gateway/protocol.ts`). *(Added `UpdateStatus`, snapshot `appVersion`/`latestVersion`/`update`, `update` cmd, `versionInfo`+`updateStatus` events.)*
- [x] 5.2 Daemon: best-effort cached lookup of the latest GitHub release version (non-blocking); include both versions in the snapshot. *(GitHub Releases API fetch on boot + every 6 h, 8 s timeout, swallowed errors; `GITHUB_REPO` configurable.)*
- [x] 5.3 Daemon: handle the `update` command — refuse while plotting; otherwise `systemctl start --no-block plotter-update.service`. *(`isPlotting()` guard via streamDebug/paused/Run·Hold; detached `sudo systemctl start --no-block`.)*
- [x] 5.4 Add `plotter-update.service` (oneshot) + `packaging/update.sh`: mid-plot guard → download latest release `.deb` to `/var/lib/penplotter271` → `apt-get install -y ./file.deb` → write `/var/lib/penplotter271/.update-status.json` throughout. *(Shipped via nfpm; update.sh resolves the .deb asset via the bundled Node, no jq. Sudoers updated to include `--no-block`.)*
- [x] 5.5 Client + UI: show current version near the header logo; render an "update available (vX → vY)" banner with an "Update now" action disabled while plotting; read final status from the snapshot after the auto-reconnect. *(GatewayClient version/update getters + `update()`; App header version + amber banner.)*
- [ ] 5.6 Verify on the Pi: trigger an update from the browser to a newer release; service restarts, app reconnects and shows the new version; failed-download case leaves the old version running with a reported error.

## 6. CI release workflow

> Releases are produced by CI, not by hand: a `v*` tag builds the arm64 `.deb` and attaches it to the GitHub Release. The in-app updater (§5) downloads from these CI-built Releases, so every auto-installed artifact is reproducible and traceable to a tag.

- [x] 6.1 Add `.github/workflows/release.yml`: on a `v*` tag, set up QEMU (`docker/setup-qemu-action`), run `assemble.sh` + `nfpm` inside an arm64 container on the standard x64 runner, attach the `.deb` to the GitHub Release. Structure `runs-on`/build step so switching to a hosted arm64 runner is a one-line change. *(Build logic factored into `packaging/ci-build.sh` (installs nfpm v2.47.0, `npm ci`, then `assemble.sh`); workflow validates the tag matches `package.json`, builds under QEMU in `node:22-bookworm` arm64, uploads via `gh release`. Actions pinned to SHA. Native-arm64 swap = change `runs-on` + drop the docker wrapper.)*
- [ ] 6.2 Tag `v1.0.0`; confirm the Release carries a `.deb` that installs and runs on the Pi (matches the bootstrap artifact).

## 7. Docs + migration

- [x] 7.1 Rewrite the README deployment section around `sudo apt install ./penplotter271_*.deb`; document config (`/etc/penplotter271/penplotter271.env`), update-from-browser, and rollback (`apt install --allow-downgrades` a prior `.deb`). *(New "Raspberry Pi deployment (Debian package)" section: install, what the package lays down, config conffile, access, browser update banner, rollback, CI/manual build.)*
- [x] 7.2 Demote `gateway/install.sh` to a from-source dev helper; note `deploy.sh`/rsync are superseded by the package. *(README "From source (development only)" subsection.)*
- [x] 7.3 Update `gateway/README.md` and the env-var table for the new paths (`/opt/penplotter271`, `/var/lib/penplotter271`) and loopback-only/no-auth posture. *(Pi section now installs the `.deb`; env table documents `/etc/penplotter271/penplotter271.env` + `GITHUB_REPO`.)*
