## 1. Flip the shipped default

- [x] 1.1 `packaging/penplotter271.env`: set `GATEWAY_HOST=0.0.0.0` and rewrite the comment to state the trusted-LAN-only intent + loopback opt-out
- [x] 1.2 Confirm `gateway/server.ts` keeps its `127.0.0.1` env default (no code change)

## 2. Reconcile documentation

- [x] 2.1 README `.deb` Configuration table: `GATEWAY_HOST` default → `0.0.0.0`
- [x] 2.2 README `.deb` Access section: replace the SSH-tunnel framing with LAN access + the no-auth/trusted-LAN caveat and loopback opt-out
- [x] 2.3 README dev env-var table (~line 124): note the code default is loopback but the package ships LAN-bound, so the two don't contradict
- [x] 2.4 `gateway/README.md` Access section: drop the "binds to loopback only" claim; describe the LAN default + opt-out

## 3. Release

- [x] 3.1 Bump `package.json` + `package-lock.json` to `1.0.1`
- [x] 3.2 Archive this change so `openspec/specs/pi-deployment/spec.md` reflects the new requirement
- [x] 3.3 Commit, tag `v1.0.1`, push; CI builds the arm64 `.deb` and cuts the Release
- [x] 3.4 Release notes call out the exposure change on upgrade (dpkg replaces an unmodified conffile) and the loopback opt-out
