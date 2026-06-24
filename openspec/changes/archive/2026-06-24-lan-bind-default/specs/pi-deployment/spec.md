## MODIFIED Requirements

### Requirement: Access-gated web app

The daemon has **no built-in authentication**. The shipped package SHALL bind to the LAN (`0.0.0.0`) by default so the web app is reachable from any device on the network without an SSH tunnel. Because there is no authentication, binding to the LAN exposes unauthenticated plotter control to every device on the network, so this default is intended ONLY for a trusted LAN and SHALL be documented as such. On an untrusted network the operator SHALL be able to restrict access by setting the bind address to loopback (`127.0.0.1`) in the configuration file, in which case the app is reachable only over an SSH local port-forward, a VPN, or a reverse proxy that adds its own authentication. The development daemon (run from source) SHALL continue to default to loopback.

#### Scenario: LAN access without a tunnel (default)

- **WHEN** an operator on the trusted LAN opens the Pi's address in a browser, with the shipped defaults
- **THEN** the web app loads and its control channel connects without an SSH tunnel or a login, and the operator can run the plotter

#### Scenario: Restricting access on an untrusted network

- **WHEN** an operator sets `GATEWAY_HOST=127.0.0.1` in the configuration file and restarts the service
- **THEN** the daemon refuses direct connections from other devices on the network, and the app is reachable only through an SSH tunnel, a VPN, or an authenticating reverse proxy

#### Scenario: Unauthenticated exposure is explicit

- **WHEN** the package is installed with its default configuration
- **THEN** the shipped configuration and documentation state that plotter control is exposed unauthenticated on the LAN and that the LAN-bound default is intended only for a trusted network
