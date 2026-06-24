## Context

The gateway serves the GUI + WebSocket on `:8717` and owns the serial port. It has
no built-in auth (the earlier shipped password was removed). Today the `.deb` ships
`GATEWAY_HOST=127.0.0.1`, so access requires an SSH tunnel. For a shared lab Pi this
is friction with no benefit on a trusted LAN. The hardware has no limit switches and
"will drive the gantry into the frame" if mis-driven, so widening access is a safety
consideration, not just a security one.

## Goals / Non-Goals

**Goals:**
- The shipped package is reachable on a trusted LAN with no SSH tunnel.
- The no-auth exposure is explicit in config + docs, with a documented opt-out.
- Spec and docs stay internally consistent (no doc still claims loopback-only).

**Non-Goals:**
- Adding authentication (a separate, larger change; noted as the safer long-term path).
- Changing the dev/from-source default — `npm run gateway` stays loopback.
- TLS / reverse-proxy automation.

## Decisions

- **Flip only the shipped conffile (`packaging/penplotter271.env`), not `gateway/server.ts`.**
  The `.deb` always sets `GATEWAY_HOST` via `EnvironmentFile`, so the code default is
  moot for the package; leaving it `127.0.0.1` keeps laptop dev safe-by-default.
  Alternative — flipping the code default too — rejected: it would silently expose dev
  laptops with no upside.
- **Document, don't authenticate.** The trade-off (trusted-LAN-only) is made explicit
  in the conffile comment and README rather than gated by a password. Alternative —
  re-introduce the shared password — rejected for this change as out of scope, but
  recorded as the recommended path for untrusted networks.

## Risks / Trade-offs

- **Unauthenticated machine control on the LAN** → Mitigation: documented trusted-LAN-only
  default; loopback + tunnel/VPN/proxy is one conffile line away for untrusted networks.
- **Silent exposure on upgrade**: dpkg replaces an *unmodified* conffile, so an existing
  install that never edited `penplotter271.env` becomes LAN-bound after upgrading with no
  operator action → Mitigation: call this out explicitly in the v1.0.1 release notes so
  operators on untrusted networks can set loopback before/after upgrading.

## Migration Plan

1. Ship v1.0.1 with the new conffile default.
2. Release notes flag the exposure change and the loopback opt-out.
3. Rollback: install the prior `.deb`, or set `GATEWAY_HOST=127.0.0.1` and restart —
   config and state are preserved across both.
