## Context

`packaging/update.sh` is the `ExecStart` of the `plotter-update` oneshot. It runs
`apt-get install -y --allow-downgrades "$DEB"` with no `DEBIAN_FRONTEND` and no dpkg
conffile option. With no controlling terminal, any conffile prompt reads EOF and the
install aborts — first triggered by v1.0.1 changing `penplotter271.env`.

## Goals / Non-Goals

**Goals:**
- A release that changes a conffile updates cleanly via the browser, no SSH.
- Operator config edits survive self-updates.

**Non-Goals:**
- Changing what config ships or the bind default (done in v1.0.1).
- Retro-fixing the already-installed v1.0.0/v1.0.1 updater (impossible — see Migration).

## Decisions

- **`--force-confold` over `--force-confnew`.** Preserve operator edits; never clobber a
  hand-tuned `penplotter271.env` on auto-update. Trade-off: an operator who edited a
  conffile won't auto-adopt a new shipped default for that file — acceptable and standard;
  fresh installs and manual upgrades still get it.
- **Also set `DEBIAN_FRONTEND=noninteractive`** so any maintainer-script prompt is
  non-blocking too, not just conffiles.

## Risks / Trade-offs

- **Bootstrap gap**: the running updater is the old buggy one, so updating *from*
  v1.0.0/v1.0.1 with an edited conffile still needs a one-time manual install → Mitigation:
  documented in the v1.0.1/v1.0.2 release notes; the fix is self-sustaining once on v1.0.2.

## Migration Plan

1. Manual one-time install of v1.0.2 on the Pi (or recover v1.0.1 first, same command).
2. From v1.0.2 onward, browser self-update handles conffile changes automatically.
3. Rollback: install a prior `.deb`; config/state preserved.
