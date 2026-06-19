import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { readFileSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GrblController } from '../src/grbl/GrblController';
import { NodeSerialTransport } from './NodeSerialTransport';
import { DEFAULT_GATEWAY_PORT } from '../src/gateway/protocol';
import type { ClientMessage, Snapshot, StreamDebug } from '../src/gateway/protocol';
import type { StatusReport, GrblSettings } from '../src/grbl/types';

const PORT = Number(process.env.GATEWAY_PORT ?? DEFAULT_GATEWAY_PORT);
// Bind to loopback by default so the app is reachable only via an SSH tunnel
// (access control = SSH keys). Set GATEWAY_HOST=0.0.0.0 to expose on the LAN.
const HOST = process.env.GATEWAY_HOST ?? '127.0.0.1';
// Optional shared password. If set, clients must connect with ?token=<password>;
// the static UI loads, but the control channel (and thus the plotter) is gated.
const PASSWORD = process.env.GATEWAY_PASSWORD ?? '';
const DEVICE_PATH = process.env.PLOTTER_PATH; // optional explicit path
const RETRY_MS = 3000;
const DIST = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
// Remembered position survives daemon AND plotter power-off (no homing on this
// machine, so position is otherwise lost every power cycle). Path override lets
// it live in a writable spot under the service user on the Pi.
const STATE_FILE =
  process.env.PLOTTER_STATE ??
  join(fileURLToPath(new URL('.', import.meta.url)), '.plotter-state.json');
// The editable session (artwork + page layout) lives on the Pi so any device
// that connects gets the current drawing back.
const SESSION_FILE = join(fileURLToPath(new URL('.', import.meta.url)), '.session.json');

const transport = new NodeSerialTransport({ path: DEVICE_PATH });
const ctrl = new GrblController(transport);

// ---- persisted position (last work position + work origin) ----
interface Vec3 {
  x: number;
  y: number;
  z: number;
}
interface SavedState {
  wpos: Vec3;
  wco: Vec3;
  savedAt: string;
}
let lastWpos: Vec3 | null = null;
let lastWco: Vec3 = { x: 0, y: 0, z: 0 };
let restoredNote: string | null = null;
// Only persist once the position is trustworthy: after a restore from file, or
// after the operator sets work zero. Avoids saving a meaningless boot position.
let posReady = false;

let lastSavedKey = '';
let writing = false; // serialize async writes so 5 Hz updates can't overlap/corrupt
function persistState(sync = false) {
  if (!lastWpos) return;
  // Skip when unchanged (idle machine → no churn) or while a write is in flight.
  const key = `${lastWpos.x.toFixed(2)},${lastWpos.y.toFixed(2)},${lastWpos.z.toFixed(2)}`;
  if (!sync && (key === lastSavedKey || writing)) return;
  lastSavedKey = key;
  const data: SavedState = { wpos: lastWpos, wco: lastWco, savedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  // Write atomically (temp file + rename) so an abrupt power-off can never leave a
  // half-written/empty file — a corrupt file reads back as null and loses the home.
  const tmp = `${STATE_FILE}.tmp`;
  if (sync) {
    try {
      writeFileSync(tmp, json);
      const fd = openSync(tmp, 'r'); // fsync the data to disk before the rename
      fsyncSync(fd);
      closeSync(fd);
      renameSync(tmp, STATE_FILE);
    } catch {
      /* ignore */
    }
    return;
  }
  writing = true;
  void writeFile(tmp, json)
    .then(() => rename(tmp, STATE_FILE))
    .catch(() => undefined)
    .finally(() => {
      writing = false;
    });
}

function readSavedState(): SavedState | null {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as SavedState;
  } catch {
    return null;
  }
}

// ---- persisted editable session (artwork + page) ----
let session: unknown = (() => {
  try {
    return JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as unknown;
  } catch {
    return null;
  }
})();
function saveSessionBlob(blob: unknown) {
  session = blob;
  void writeFile(SESSION_FILE, JSON.stringify(blob)).catch(() => undefined);
}

/**
 * Restore the remembered work position after (re)connecting — a port open resets
 * the controller and (with no homing) it forgets where it is. Telling it the
 * current position equals the last saved one reinstates the work origin/home.
 * Assumes the gantry didn't move while powered off; the operator can re-calibrate
 * (Set Work Zero) if it did.
 */
async function restoreSavedPosition() {
  const saved = readSavedState();
  if (!saved?.wpos) return;
  try {
    // Restore X/Y (paper alignment) but zero Z: restoring the pen's last Z would
    // make "pen up" (work Z0) a negative machine Z. Work Z0 = pen-up at boot.
    await ctrl.setWorkPosition(saved.wpos.x, saved.wpos.y, 0);
  } catch (e) {
    log(`restore failed (machine not idle?): ${String((e as Error)?.message ?? e)}`);
    return; // don't claim a restore that didn't apply
  }
  posReady = true; // valid origin reinstated → safe to keep persisting
  restoredNote = `Restored last position ${saved.wpos.x.toFixed(1)}, ${saved.wpos.y.toFixed(1)} (saved ${saved.savedAt}). Re-calibrate (Set Work Zero) if the gantry was moved.`;
  log(restoredNote);
  broadcast({ type: 'event', event: 'log', payload: { dir: 'info', text: restoredNote } });
}

// ---- daemon state (for snapshots) ----
let connected = false;
let version = 'unknown';
let lastStatus: StatusReport | null = null;
let settings: GrblSettings = {};
let controller: WebSocket | null = null; // the single client holding control

const clients = new Set<WebSocket>();
const send = (ws: WebSocket, msg: unknown) =>
  ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
const broadcast = (msg: unknown) => clients.forEach((ws) => send(ws, msg));
const log = (text: string) => console.log(`[gateway] ${text}`);

// ---- forward controller events to all clients ----
const fwd = (event: string) => (payload: unknown) => broadcast({ type: 'event', event, payload });

ctrl.on('connected', (e) => {
  connected = true;
  version = e.version;
  log(`plotter connected — GRBL ${e.version}`);
  fwd('connected')(e);
});
ctrl.on('disconnected', () => {
  connected = false;
  if (posReady) persistState(true); // flush the freshest position at power-off time
  // Stop persisting until the next restore. If the plotter power-cycled, it
  // reconnects reporting mpos=0 with a stale WCO; persisting that bogus position
  // (~5 Hz status) would overwrite the saved home before restoreSavedPosition()
  // can read it. restoreSavedPosition re-enables posReady once the origin is back.
  posReady = false;
  lastStatus = null;
  log('plotter disconnected');
  fwd('disconnected')(undefined);
  scheduleReconnect(); // unexpected drop → debounced retry (device re-enumerates)
});
ctrl.on('status', (s) => {
  lastStatus = s;
  if (s.wco) lastWco = s.wco;
  lastWpos = { x: s.mpos.x - lastWco.x, y: s.mpos.y - lastWco.y, z: s.mpos.z - lastWco.z };
  // Persist on every changed status (~5 Hz) so a mid-plot power-off restores
  // accurately; persistState dedupes unchanged positions and serializes writes.
  if (posReady) persistState();
  broadcast({ type: 'event', event: 'status', payload: s });
  broadcast({ type: 'streamDebug', payload: ctrl.streamDebug as StreamDebug });
});
ctrl.on('settings', (s) => {
  settings = s;
  fwd('settings')(s);
});
ctrl.on('error', fwd('error'));
ctrl.on('alarm', fwd('alarm'));
ctrl.on('streamProgress', fwd('streamProgress'));
ctrl.on('streamComplete', () => fwd('streamComplete')(undefined));
ctrl.on('streamAborted', fwd('streamAborted'));
ctrl.on('log', fwd('log'));

// ---- connect with retry; never busy-reopen a present device ----
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensureConnected();
  }, RETRY_MS);
}
/** Reject if a promise doesn't settle in time — so a hung connect can't wedge the retry loop. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

async function ensureConnected() {
  if (connected) return;
  try {
    // Time-box the handshake: after a USB drop the reopened port can be half-alive
    // and `$$` never gets an `ok`, hanging connect() forever (no recovery). The
    // timeout makes it fail so we clean up and retry until the real device responds.
    await withTimeout(ctrl.connect(), 12000, 'connect');
    // This machine can't home ($22=0). Soft limits then (a) lock it in "must home"
    // Alarm and (b) false-trip after a position restore, because the work area maps
    // to NEGATIVE machine coords (e.g. Y target:-51, Z target:-3) → ALARM:2. On
    // FluidNC `$20` is read-only, so disable soft limits PER-AXIS via the named
    // config (brute force, best-effort), then clear the alarm.
    log('disabling per-axis soft limits (FluidNC) — unusable without homing here');
    for (const ax of ['x', 'y', 'z']) {
      await ctrl.sendRaw(`$axes/${ax}/soft_limits=false`).catch(() => undefined);
    }
    await ctrl.unlock().catch(() => undefined); // $X — clear any boot/soft-limit alarm → Idle
    await restoreSavedPosition(); // now Idle → G10 L20 applies (syncs home + position)
  } catch (e) {
    log(`connect failed (${String((e as Error)?.message ?? e)}); retrying in ${RETRY_MS}ms`);
    await ctrl.disconnect().catch(() => undefined); // close a half-open/zombie port before retrying
    scheduleReconnect();
  }
}

function snapshot(ws: WebSocket): Snapshot {
  return {
    connected,
    version,
    status: lastStatus,
    settings,
    streamDebug: ctrl.streamDebug as StreamDebug,
    inControl: controller === ws,
    paused: ctrl.isPaused,
    restoredNote,
    session,
  };
}

function releaseControlOnClose(ws: WebSocket) {
  clients.delete(ws);
  if (controller === ws) {
    controller = clients.values().next().value ?? null; // hand control to the next client
    if (controller) send(controller, { type: 'control', inControl: true });
    log('control released');
  }
}

async function handleCommand(ws: WebSocket, msg: ClientMessage) {
  const id = msg.id;
  if (controller !== ws) {
    send(ws, { type: 'cmdError', id, message: 'Another operator is in control.' });
    return;
  }
  try {
    switch (msg.cmd) {
      case 'plot':
        ctrl.streamProgram(msg.gcode);
        break;
      case 'pause':
        ctrl.pause();
        break;
      case 'resume':
        ctrl.resume();
        break;
      case 'stop':
        await ctrl.stopAndReturnHome();
        break;
      case 'jog':
        await ctrl.jog(msg.dx, msg.dy, msg.dz, msg.feed);
        break;
      case 'jogCancel':
        await ctrl.jogCancel();
        break;
      case 'penUp':
        await ctrl.penUp();
        break;
      case 'penDown':
        await ctrl.penDown();
        break;
      case 'setWorkZero':
        await ctrl.setWorkZero();
        posReady = true;
        persistState();
        break;
      case 'goToWorkZero':
        await ctrl.goToWorkZero();
        break;
      case 'motorsOff':
        await ctrl.motorsOff();
        break;
      case 'unlock':
        await ctrl.unlock();
        break;
      case 'setSetting':
        await ctrl.setSetting(msg.num, msg.value);
        break;
      case 'setCalibration':
        ctrl.calibration = msg.calibration;
        break;
      case 'saveSession':
        saveSessionBlob(msg.session);
        break;
      default:
        send(ws, { type: 'cmdError', id, message: `Unknown command` });
        return;
    }
    send(ws, { type: 'ack', id }); // round-trip ack — paces the client's held jog
  } catch (e) {
    send(ws, { type: 'cmdError', id, message: String((e as Error)?.message ?? e) });
  }
}

// ---- static GUI + WebSocket on one HTTP server ----
const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};
const httpServer = createServer(async (req, res) => {
  try {
    const url = (req.url ?? '/').split('?')[0];
    const rel = url === '/' ? 'index.html' : normalize(url).replace(/^(\.\.[/\\])+/, '');
    const file = join(DIST, rel);
    const body = await readFile(file).catch(() => readFile(join(DIST, 'index.html'))); // SPA fallback
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found (build the GUI with `npm run build`).');
  }
});

const wss = new WebSocketServer({ server: httpServer });

// Keepalive: ping each client every 30 s and drop ones that don't pong. Keeps
// the browser↔Pi link alive through router/WiFi idle timeouts and reaps dead
// sockets (so a laptop that slept doesn't linger as a phantom controller).
const alive = new WeakSet<WebSocket>();
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) {
      ws.terminate();
      continue;
    }
    alive.delete(ws); // expect a pong before the next tick
    ws.ping();
  }
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', (ws, req) => {
  if (PASSWORD) {
    const token = new URL(req.url ?? '/', 'http://localhost').searchParams.get('token');
    if (token !== PASSWORD) {
      send(ws, { type: 'authError', message: 'Wrong or missing password.' });
      ws.close(4001, 'auth'); // 4001 → client shows the password prompt
      log('client rejected (bad password)');
      return;
    }
  }
  clients.add(ws);
  alive.add(ws);
  ws.on('pong', () => alive.add(ws));
  if (!controller) controller = ws; // first client holds control
  send(ws, { type: 'snapshot', payload: snapshot(ws) });
  log(
    `client connected (${clients.size} total)${controller === ws ? ' — in control' : ' — read-only'}`,
  );

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: 'cmdError', message: 'Malformed message' });
      return;
    }
    if (msg?.type === 'cmd') void handleCommand(ws, msg);
  });
  ws.on('close', () => {
    releaseControlOnClose(ws);
    log(`client disconnected (${clients.size} total)`);
  });
});

// Keep macOS awake for the daemon's lifetime. When the laptop is left idle the
// OS throttles/suspends the process (App Nap) and dims the display (which also
// throttles the browser tab) — the plot then stalls. `caffeinate -w <pid>` holds
// idle/display/system-sleep assertions until this process exits. No-op elsewhere
// (the Pi should disable sleep at the OS level instead).
function preventIdleSleep() {
  if (process.platform !== 'darwin') return;
  try {
    const c = spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore' });
    c.on('error', () =>
      log('caffeinate unavailable — run `caffeinate -dimsu npm run gateway` manually'),
    );
    log('caffeinate engaged — Mac will not idle-sleep while the daemon runs');
  } catch {
    log('could not start caffeinate');
  }
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    persistState(true); // save the latest position synchronously before exiting
    void transport.close().finally(() => process.exit(0));
  });
}

httpServer.listen(PORT, HOST, () => {
  log(
    `listening on http://${HOST}:${PORT}  (GUI + WebSocket)${HOST === '127.0.0.1' ? ' — loopback only; reach it via an SSH tunnel' : ''}`,
  );
  preventIdleSleep();
  void ensureConnected();
});
