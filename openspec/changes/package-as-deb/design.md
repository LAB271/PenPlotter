## Context

The gateway is a Node daemon (`gateway/server.ts`, run via `npx tsx`) that owns the serial port, streams G-code autonomously, and serves the built GUI (`dist/`). It runs on a headless 64-bit Raspberry Pi OS Lite host as a systemd service, today provisioned by `gateway/install.sh` (NodeSource + `npm install` + build) and updated by hand (`rsync`/`git pull` + rebuild + `systemctl restart`). The native `serialport` binding makes the install arch- and Node-ABI-sensitive. The in-app password was already removed, so the daemon is loopback-only with no built-in auth.

We want a versioned, self-contained `.deb` distributed via GitHub Releases (no signed APT repo), plus a browser-driven self-update — without a laptop or SSH for the common update path.

## Goals / Non-Goals

**Goals:**
- One artifact, `penplotter271_<version>_arm64.deb`, that installs/upgrades/removes cleanly with `apt`/`dpkg`.
- Self-contained: bundled Node + native `serialport` built for that Node; no NodeSource dependency, no APT repo to host.
- Operator can update from the browser; the daemon can restart itself safely as part of that.
- Bootstrap that produces a working artifact fast, with a low-friction path to automated CI.

**Non-Goals:**
- A signed/hosted APT repository (`apt update && apt upgrade`) — Tier 3, deferred.
- `armhf` / 32-bit support — arm64 only for now.
- Automatic/scheduled updates — operator-triggered only.
- Reintroducing any in-app authentication.

## Decisions

### D1. Bundle a pinned Node; build `serialport` against it
The native binding's ABI must match the runtime. Bundling a pinned Node under `/opt/penplotter271/node` and building `serialport` against it makes the package self-contained and immune to whatever (often too-old) Node the OS ships. *Alternative — `Depends: nodejs`:* smaller package but fragile ABI/version coupling and a NodeSource dependency. Rejected.

### D2. esbuild the gateway to one `gateway.js`; `tsx` stays dev-only
Production should not depend on `tsx` transpiling at boot. esbuild bundles `gateway/server.ts` (+ its `src/` imports) into a single CommonJS/ESM file run directly by the bundled Node. `serialport` stays **external** (native, resolved from the shipped `node_modules`). Dev keeps `npm run gateway` via `tsx`.

### D3. FHS layout + dpkg conffile for config
`/opt/penplotter271/{node,gateway.js,dist,node_modules}` (read-only app), `/etc/penplotter271/penplotter271.env` (dpkg **conffile**, so operator edits survive upgrades) consumed via systemd `EnvironmentFile=`, and writable state in `/var/lib/penplotter271/` (relocates `.plotter-state.json`/`.session.json` off the app tree). The unit runs as a dedicated `penplotter` system user in `dialout`.

### D4. Build the `.deb` with `nfpm`
Declarative YAML → `.deb`, no `dpkg-dev`/`debhelper` ceremony, runs anywhere (Pi or CI). Maintainer scripts (`postinst`/`prerm`/`postrm`) handle user creation, udev reload, `daemon-reload`, enable/start, the mid-plot upgrade guard, and purge cleanup. *Alternative — `dpkg-deb`/`debhelper`:* more standard but heavier; unnecessary for one package.

### D5. Self-update via a detached oneshot unit
A process cannot cleanly `systemctl restart` the service it is part of. The daemon triggers `systemctl start --no-block plotter-update.service` (a `Type=oneshot` unit, its own cgroup) and returns; that unit runs the update script: mid-plot guard → download the latest release `.deb` → `apt-get install -y ./file.deb` (dpkg restarts the daemon) → write status. Because the oneshot is independent, the daemon dying/restarting doesn't kill the update. `Restart=always` brings the daemon back. *Alternatives — in-process child (dies on self-restart) or a polling timer (that's scheduled auto-update, a non-goal).* Rejected.

### D6. Tightly-scoped privileges
The `penplotter` user gets a single `/etc/sudoers.d/penplotter271` rule allowing only `systemctl start plotter-update.service` (and the unit itself runs the `apt-get install`/restart as root). No general sudo.

### D7. Status across restart via a file
The WebSocket drops when the daemon restarts mid-update, so the update script writes `/var/lib/penplotter271/.update-status.json` (`state`, versions, log tail). The reconnecting client reads it from the snapshot and renders the outcome.

### D8. Version source of truth
`package.json` version is stamped into a constant at build time (the source isn't shipped). The "latest released version" comes from a best-effort query of the GitHub Releases API, cached, non-blocking.

### D9. CI: bootstrap on the Pi, then QEMU — same recipe
The package assembly is a single script (`nfpm` + an arm64 Node fetch + `npm ci --omit=dev`). Phase 1: run it **on the Pi** to validate the artifact on the real device. Phase 2: run the *same* script in `.github/workflows/release.yml` under QEMU (`docker/setup-qemu-action` + an arm64 container) on a standard x64 runner — free while the repo is private. Switching to a hosted arm64 runner later is a one-line `runs-on:` change because the recipe is arch-agnostic. *Alternative — start with a hosted arm64 runner:* billable on a private repo now. Deferred.

## Risks / Trade-offs

- **`serialport` ABI mismatch with bundled Node** → pin both Node version and `serialport` version together; verify `node gateway.js` opens the port on the Pi before cutting a release.
- **QEMU build is slow / native build flakiness under emulation** → prefer `serialport`'s prebuilt arm64 binary (no compile); keep the Pi bootstrap path as the fallback that's always correct.
- **`apt-get install ./file.deb` mid-update could interrupt work** → the daemon refuses the trigger while plotting, and the oneshot re-checks the fresh-state-file guard before installing.
- **Self-update leaves a broken version** → install only after a successful download; on failure the prior version keeps running (`Restart=always`); status file records the error for the operator. Manual recovery (`apt install` the prior `.deb`) documented.
- **State path migration** → first package install moves `gateway/.plotter-state.json`/`.session.json` to `/var/lib/penplotter271/` (postinst best-effort copy if present); losing it only forces a re-`Set Work Zero`, not a safety issue, but call it out in docs.
- **Privilege scope creep** → keep the sudoers rule to exactly the one unit; the unit (not the daemon) holds root.

## Migration Plan

1. Land build pipeline (esbuild bundle, version stamp) — verifiable on macOS (`node gateway.js` boots).
2. Author `nfpm.yaml` + maintainer scripts + the systemd/udev/env/sudoers artifacts.
3. **Bootstrap:** assemble the `.deb` on the Pi, `apt install` it, confirm the service runs, connects, plots, and that upgrade/purge behave. Migrate state paths.
4. Add the updater (protocol messages, daemon trigger, oneshot unit, UI banner); verify an end-to-end browser update on the Pi.
5. Add `release.yml` (QEMU); tag `v1.0.0`; confirm the Release carries a working `.deb`.
6. Rewrite README around the `.deb`; demote `install.sh`/`deploy.sh`/rsync to dev-only.

**Rollback:** the `.deb` is versioned — `sudo apt install ./penplotter271_<prev>_arm64.deb` reverts. Until v1.0.0 is tagged, the from-source path still works unchanged.

## Resolved Questions

- **Bundled Node version:** pin to the current **Node LTS** line (has an arm64 build matching a `serialport` prebuild).
- **Updater mechanism:** ship an **`update.sh`** in the package that the `plotter-update.service` oneshot runs — keeps the download/install/status logic out of the systemd unit and sudoers rule.
