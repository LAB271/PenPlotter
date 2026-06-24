## Why

Reaching the web app today requires every operator to open an SSH local
port-forward before each session — a real barrier for a shared lab machine where
"anyone walks up and opens the app" is the actual usage. On a trusted lab LAN the
tunnel buys nothing the network boundary doesn't already provide, so it is pure
friction.

## What Changes

- **BREAKING (security posture):** the shipped `.deb` conffile now defaults
  `GATEWAY_HOST=0.0.0.0` (LAN-reachable) instead of `127.0.0.1` (loopback only).
  Operators open `http://<pi>.local:8717` directly — no SSH tunnel.
- The daemon still has **no built-in authentication**, so the LAN default exposes
  unauthenticated plotter control to every device on the network. This is now an
  explicit, documented **trusted-LAN-only** default; loopback + tunnel/VPN/proxy
  becomes the documented opt-out for untrusted networks.
- The dev code default in `gateway/server.ts` stays `127.0.0.1` — only the shipped
  package binds to the LAN, so `npm run gateway` on a laptop stays loopback-safe.
- Docs are reconciled to the new default: README `.deb` config + access sections,
  the second README env-var table, and `gateway/README.md`'s access section.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `pi-deployment`: the "Access-gated web app" requirement flips from "binds to
  loopback by default; an unauthorized device SHALL NOT be able to drive the
  plotter" to "ships LAN-bound by default for trusted networks, with the no-auth
  exposure made explicit and loopback documented as the opt-out for untrusted
  networks."

## Impact

- `packaging/penplotter271.env` — shipped conffile default + comment.
- `README.md` — `.deb` Configuration table, Access section, and the dev env-var table.
- `gateway/README.md` — Access section.
- No code change: `gateway/server.ts` keeps its `127.0.0.1` env default.
- Release `v1.0.1`. On upgrade, an unmodified conffile is replaced by dpkg, so
  existing installs that never edited it become LAN-bound — called out in the
  release notes.
