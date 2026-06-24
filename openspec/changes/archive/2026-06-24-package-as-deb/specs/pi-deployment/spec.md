## MODIFIED Requirements

### Requirement: Repeatable provisioning

Setting up a Pi SHALL be done by installing a single versioned Debian package (`penplotter271_<version>_arm64.deb`, targeting 64-bit Raspberry Pi OS) with `apt`. The package SHALL be self-contained — bundling the Node runtime and the native serial binding so no separate Node install or build step is required on the Pi — and its maintainer scripts SHALL install the systemd service and device rules, create the dedicated service user with serial access, lay down a default configuration file, and enable the service on boot. Upgrading and removing SHALL likewise go through the package manager. A from-source path MAY remain for development, but is not the supported install path.

#### Scenario: Fresh Pi to running gateway via the package

- **WHEN** an operator runs `sudo apt install ./penplotter271_<version>_arm64.deb` on a fresh 64-bit Raspberry Pi OS install
- **THEN** the gateway ends up installed with its bundled runtime, enabled on boot, serving the web app, and connected to the plotter, without a separate Node install, `npm` build, or other manual fixes

#### Scenario: Upgrade preserves operator configuration

- **WHEN** a newer package version is installed over an existing one
- **THEN** the service is updated and restarted, and operator edits to the configuration file and the remembered machine state are preserved

#### Scenario: Clean removal

- **WHEN** the package is purged
- **THEN** the service is stopped and disabled and the package-managed files are removed
