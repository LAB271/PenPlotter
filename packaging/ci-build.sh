#!/usr/bin/env bash
# Build the arm64 PenPlotter271 .deb in a Linux environment.
#
# Invoked by .github/workflows/release.yml inside an arm64 container (QEMU on a
# standard x64 runner). Also runs directly on a native arm64 Linux host/runner.
# Installs the build-only tools the base image lacks (nfpm + xz), then hands off
# to assemble.sh, which produces dist-deb/penplotter271_<ver>_arm64.deb.
set -euo pipefail
cd "$(dirname "$0")/.."

NFPM_VERSION="${NFPM_VERSION:-2.47.0}"
SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "==> Installing build tools (nfpm $NFPM_VERSION + xz)"
$SUDO apt-get update
$SUDO apt-get install -y --no-install-recommends curl ca-certificates xz-utils
curl -fsSL "https://github.com/goreleaser/nfpm/releases/download/v${NFPM_VERSION}/nfpm_${NFPM_VERSION}_Linux_arm64.tar.gz" \
  | $SUDO tar -xz -C /usr/local/bin nfpm
nfpm --version

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Assembling + packaging the .deb"
bash packaging/assemble.sh
