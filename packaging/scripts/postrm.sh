#!/bin/sh
# Runs after the package's files are removed.
set -e

case "$1" in
  purge)
    systemctl disable plotter-gateway.service >/dev/null 2>&1 || true
    systemctl daemon-reload >/dev/null 2>&1 || true
    # Remove config, runtime state, and the service user (purge = remove all).
    rm -rf /etc/penplotter271 /var/lib/penplotter271
    if id -u penplotter >/dev/null 2>&1; then
      deluser --system penplotter >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
