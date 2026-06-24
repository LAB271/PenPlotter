## 1. Fix the updater

- [x] 1.1 `packaging/update.sh`: run the install as `DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-downgrades -o Dpkg::Options::="--force-confold" "$DEB"`

## 2. Release

- [x] 2.1 Bump `package.json` + `package-lock.json` to `1.0.2`
- [x] 2.2 Archive this change so `openspec/specs/software-update/spec.md` reflects the new requirement
- [x] 2.3 Commit, push `main`, tag `v1.0.2` + push; CI builds the arm64 `.deb` and cuts the Release
