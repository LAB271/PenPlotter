## Why

Deployment today is ad-hoc: code reaches the Pi by `rsync` from a laptop (or a `git pull` via `deploy.sh`), then `npm install && npm run build && systemctl restart` by hand. There is no versioning, no clean install/uninstall, and no way for the headless Pi to update itself — every update needs a laptop and a human on SSH. For a public v1.0.0 release this needs to become a proper, versioned artifact that installs and upgrades the standard Debian way and can update itself from the browser the operator already uses.

## What Changes

- **Ship the gateway + GUI as a single Debian package** (`penplotter271_<version>_arm64.deb`) targeting arm64 (64-bit Raspberry Pi OS Lite). Install/upgrade via `sudo apt install ./penplotter271_*.deb`.
- **Self-contained runtime:** the package bundles a pinned Node under `/opt/penplotter271/node` with the native `serialport` binding built against it — no NodeSource dependency, no APT repo to host.
- **No-`tsx`-at-runtime:** the gateway is esbuild-bundled to a single `gateway.js`; `tsx` stays a dev-only dependency.
- **Standard FHS layout** with a dpkg conffile for operator config (`/etc/penplotter271/penplotter271.env`) and writable state under `/var/lib/penplotter271`. Maintainer scripts create a dedicated `penplotter` system user, install the systemd + udev units, and guard against upgrading mid-plot.
- **Distribution via GitHub Releases** (Tier 2 — no signed APT repo): a `v*` tag triggers CI that builds and attaches the `.deb` to the Release.
- **NEW in-app updater:** the daemon reports its installed version and the latest released version; an operator can trigger "Update now" from the browser, which runs the install via a **detached** oneshot systemd unit (so the daemon can restart itself safely), gated by a tightly-scoped sudoers rule and disabled while plotting.
- **Reconcile the access model with the already-shipped password removal:** the package binds loopback-only with no built-in auth; remote access is via SSH tunnel / VPN / authenticating reverse proxy. (The in-app password was removed in a prior change; this updates the spec to match.)
- **BREAKING (deployment only):** `gateway/install.sh` is demoted to a from-source dev helper; the supported install path becomes the `.deb`. State files move from `gateway/.plotter-state.json` to `/var/lib/penplotter271/`.

## Capabilities

### New Capabilities
- `software-update`: Reporting the installed vs. latest released version, operator-triggered self-update from the browser, the detached-restart update mechanism on the host, and update status/feedback across the daemon restart.

### Modified Capabilities
- `pi-deployment`: Provisioning becomes a versioned Debian package (bundled Node, FHS layout, conffile, maintainer scripts, upgrade-mid-plot guard) instead of rsync/`git pull` + manual build; the access model is narrowed to loopback-only with no built-in auth.
- `gateway-protocol`: New messages for the daemon to report installed/latest version and to accept an update-trigger command and emit update-status events.

## Impact

- **New build/packaging:** esbuild bundling of `gateway/server.ts`; an `nfpm.yaml`; a version constant stamped from `package.json`.
- **New host artifacts:** `.deb` maintainer scripts (postinst/prerm/postrm), `/etc/penplotter271/penplotter271.env`, `/etc/sudoers.d/penplotter271`, a `plotter-update.service` oneshot unit; the existing systemd unit + udev rule move into the package.
- **Code:** `gateway/server.ts` (version reporting, update-trigger command, status file); `src/gateway/protocol.ts` (new messages); `src/transport/GatewayClient.ts` and `src/ui/App.tsx` (version display + update banner).
- **CI:** new `.github/workflows/release.yml` building the arm64 `.deb` (QEMU on a standard runner; swappable to a hosted arm64 runner).
- **Paths:** state relocates to `/var/lib/penplotter271`; daemon serves `dist/` and runs from `/opt/penplotter271`.
- **Docs:** README deployment section rewritten around the `.deb`; `deploy.sh`/rsync workflow superseded.
- **Dependencies:** adds `esbuild` (dev) and `nfpm` (CI only); package `Depends: udev`.
