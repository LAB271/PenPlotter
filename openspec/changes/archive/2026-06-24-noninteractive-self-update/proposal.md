## Why

The browser self-update fails whenever a release changes a dpkg **conffile**:
`apt-get install` stops at the interactive "keep or replace the config file?" prompt,
but the updater runs as a headless oneshot with no terminal, so dpkg hits EOF and the
install aborts. v1.0.1 (which changed `penplotter271.env`) hit exactly this — operators
had to SSH in and reinstall by hand, which the `software-update` spec explicitly says
should not be required for common failures.

## What Changes

- The updater installs **non-interactively** with a conffile policy
  (`DEBIAN_FRONTEND=noninteractive`, `-o Dpkg::Options::="--force-confold"`), so a
  release that changes a conffile no longer deadlocks the update.
- `--force-confold` preserves operator edits to `/etc/penplotter271/penplotter271.env`
  across self-updates (the standard, safe default for an unattended updater).
- Release as **v1.0.2**.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `software-update`: tighten "Safe self-update execution" — the update SHALL apply the
  package non-interactively and SHALL NOT block on configuration-file prompts, so a
  conffile change does not require manual recovery on the Pi.

## Impact

- `packaging/update.sh` — the `apt-get install` invocation (the only code change).
- `package.json` / `package-lock.json` — version bump to 1.0.2.
- **Bootstrap caveat:** the currently-installed updater is the buggy one, so upgrading
  *from* v1.0.0/v1.0.1 with an edited conffile still needs a one-time manual install;
  the fix protects every update *after* the Pi is on v1.0.2.
