## ADDED Requirements

### Requirement: Boot auto-start service

The gateway SHALL run as a host service that starts automatically when the Raspberry Pi powers on, connects to the plotter (retrying until present), and restarts automatically if it crashes — so powering on the Pi and plotter is enough to reach a ready, awaiting-plots state with no manual steps.

#### Scenario: Power-on brings up the gateway

- **WHEN** the Pi and plotter are powered on
- **THEN** the gateway service starts without anyone logging in, connects to the plotter, and serves the web app

#### Scenario: Crash recovery

- **WHEN** the gateway process exits unexpectedly
- **THEN** the service restarts it automatically and reconnects to the plotter

### Requirement: Access-gated web app

The Pi SHALL NOT expose plotter control openly on the WiFi. The daemon SHALL support two access models: (a) by default it binds to loopback, so the app is reachable only through an SSH local port-forward — access is an SSH key authorized on the Pi, and keys MAY be distributed to the team via a shared 1Password vault/group; or (b) optionally it binds to the LAN with a shared password, in which case the control channel SHALL be refused until the correct password is supplied. Under either model, an unauthorized device on the same WiFi SHALL NOT be able to drive the plotter.

#### Scenario: Access through an SSH tunnel (loopback default)

- **WHEN** an authorized operator opens an SSH local port-forward to the loopback-bound daemon and browses the forwarded local port
- **THEN** the web app loads and its control channel connects back through the tunnel, and the operator can run the plotter

#### Scenario: Optional shared-password LAN access

- **WHEN** the daemon is configured with a shared password and bound to the LAN, and an operator on the WiFi opens the Pi's address and supplies the password
- **THEN** the web app loads and the control channel connects once the password is accepted, and the operator can run the plotter

#### Scenario: Not reachable without authorization

- **WHEN** an unauthorized device on the same WiFi opens the Pi's address with no SSH tunnel and no/wrong password
- **THEN** it cannot control the plotter — the loopback bind refuses the direct connection, or (in LAN mode) the control channel is rejected without the correct password

#### Scenario: Upload and plot

- **WHEN** an authorized operator uploads a drawing in the web app and starts a plot
- **THEN** the drawing is converted in the browser and streamed by the Pi to the plotter

#### Scenario: Team access managed centrally

- **WHEN** a teammate is added to (or removed from) the shared 1Password group/vault holding the SSH key, with their public key on the Pi
- **THEN** they gain (or lose) the ability to open the tunnel and use the plotter

### Requirement: Unattended continuation

After a plot starts, the Pi SHALL continue it to completion even if the laptop disconnects or sleeps, because the Pi (not the laptop) drives the plot.

#### Scenario: Laptop leaves mid-plot

- **WHEN** a plot is running and the operator closes the laptop or leaves the WiFi
- **THEN** the Pi continues the plot to completion, and a later reconnect shows accurate live state

### Requirement: Stable serial access

The service SHALL access the plotter's serial device without elevated privileges and regardless of USB enumeration order, by granting the service user device access and identifying the plotter by a stable means.

#### Scenario: Device access without sudo

- **WHEN** the service starts as its normal user
- **THEN** it can open the plotter serial port without `sudo`

#### Scenario: Stable identification across reboots

- **WHEN** the Pi reboots or the device re-enumerates
- **THEN** the service still finds the plotter (via a stable path/symlink or device match), not a wrong port

### Requirement: Always-on host

The Pi SHALL be configured so the OS does not sleep or throttle the link/process when idle, so an unattended plot is never stalled by power management.

#### Scenario: Idle does not stall a plot

- **WHEN** a plot runs while no one interacts with the Pi
- **THEN** the OS does not idle-sleep or power-save the link, and the plot proceeds normally

### Requirement: Repeatable provisioning

Setting up a fresh Pi SHALL follow a repeatable, documented (and scripted where practical) process that installs the runtime and dependencies, builds the web app, and installs the service and device rules.

#### Scenario: Fresh Pi to running gateway

- **WHEN** an operator follows the provisioning steps/script on a fresh Pi
- **THEN** the gateway ends up installed, enabled on boot, and serving the web app, without undocumented manual fixes
