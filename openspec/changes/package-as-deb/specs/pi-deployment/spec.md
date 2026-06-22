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

### Requirement: Access-gated web app

The Pi SHALL NOT expose plotter control openly on the WiFi. The daemon SHALL bind to loopback by default and has no built-in authentication, so the app is reachable only through an SSH local port-forward — access control is an SSH key authorized on the Pi, and keys MAY be distributed to the team via a shared 1Password vault/group. Reaching the app from another device SHALL be done over an SSH tunnel, a VPN, or a reverse proxy that adds its own authentication. Binding the daemon directly to the LAN exposes unauthenticated control and SHALL only be done on a trusted network.

#### Scenario: Access through an SSH tunnel (loopback default)

- **WHEN** an authorized operator opens an SSH local port-forward to the loopback-bound daemon and browses the forwarded local port
- **THEN** the web app loads and its control channel connects back through the tunnel, and the operator can run the plotter

#### Scenario: Not reachable without authorization

- **WHEN** an unauthorized device on the same WiFi opens the Pi's address with no SSH tunnel
- **THEN** it cannot reach the loopback-bound daemon and cannot control the plotter

#### Scenario: Team access managed centrally

- **WHEN** a teammate is added to (or removed from) the shared 1Password group/vault holding the SSH key, with their public key on the Pi
- **THEN** they gain (or lose) the ability to open the tunnel and use the plotter
