import { Emitter } from '../grbl/emitter';
import type { Calibration } from '../grbl/settings';
import type { GrblSettings, StatusReport } from '../grbl/types';
import type { ClientCommand, ServerMessage, StreamDebug } from '../gateway/protocol';

type ClientEvents = {
  connected: { version: string };
  disconnected: undefined;
  status: StatusReport;
  settings: GrblSettings;
  error: { code: number; line: string };
  alarm: { code: number };
  streamProgress: { acked: number; total: number };
  streamComplete: undefined;
  streamAborted: { reason: string };
  log: { dir: 'tx' | 'rx' | 'info'; text: string };
  /** Local-only: control/link state changed (for UI). */
  control: { inControl: boolean };
  /** The editable session stored on the daemon (null if none), sent on connect. */
  session: unknown;
  /** The daemon rejected the connection — a password is needed (or wrong). */
  authRequired: undefined;
};

/**
 * Browser client for the gateway daemon. Presents the same observe-events +
 * command surface the UI used on GrblController, but everything flows over a
 * WebSocket — the browser never opens a serial port. The daemon owns the link.
 */
export class GatewayClient {
  private events = new Emitter<ClientEvents>();
  private ws: WebSocket | null = null;
  private wantOpen = false;
  private retry: ReturnType<typeof setTimeout> | null = null;

  private _connected = false; // plotter connected (per daemon), not WS state
  private _status: StatusReport | null = null;
  private _settings: GrblSettings = {};
  private _version = 'unknown';
  private _streamDebug: StreamDebug = { inflight: 0, bytes: 0, queued: 0 };
  private _inControl = false;
  private _calibration: Calibration | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();
  private token = localStorage.getItem('penplotter271.token') ?? '';
  private needsAuth = false;

  constructor(private url = `ws://${location.hostname}:8717`) {}

  /** Submit a password and (re)connect. Stored so it's remembered next time. */
  authenticate(password: string): void {
    this.token = password;
    localStorage.setItem('penplotter271.token', password);
    this.needsAuth = false;
    this.wantOpen = true;
    this.openSocket();
  }

  on = this.events.on.bind(this.events);
  get connected(): boolean {
    return this._connected;
  }
  get lastStatus(): StatusReport | null {
    return this._status;
  }
  get settings(): GrblSettings {
    return this._settings;
  }
  get firmwareVersion(): string {
    return this._version;
  }
  get streamDebug(): StreamDebug {
    return this._streamDebug;
  }
  get inControl(): boolean {
    return this._inControl;
  }

  /** Calibration is pushed to the daemon (the engine there reads pen Z / feeds / dwell). */
  set calibration(cal: Calibration) {
    this._calibration = cal;
    void this.cmd({ cmd: 'setCalibration', calibration: cal }).catch(() => undefined);
  }

  /** "Connect" = attach to the daemon WebSocket (the daemon owns the plotter link). */
  connect(): Promise<void> {
    this.wantOpen = true;
    this.openSocket();
    return Promise.resolve();
  }

  /**
   * "Disconnect" = pause the plot, then detach from the daemon. The serial port
   * stays open on the daemon, and reconnecting auto-resumes the held plot.
   * (An *unintentional* drop — closed laptop — does NOT pause: the daemon keeps
   * plotting, since that path never calls this.)
   */
  async disconnect(): Promise<void> {
    this.wantOpen = false;
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
    await this.cmd({ cmd: 'pause' }).catch(() => undefined);
    this.ws?.close();
    this.ws = null;
    this.setConnected(false);
  }

  private openSocket() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    )
      return;
    const url = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      // Re-push calibration so the daemon's engine has the right pen Z / feeds.
      if (this._calibration) this.cmd({ cmd: 'setCalibration', calibration: this._calibration });
    };
    ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data) as ServerMessage);
    ws.onclose = (ev) => {
      if (this.ws === ws) this.ws = null;
      // Reject in-flight commands so awaiting callers (e.g. the held-jog loop) stop.
      for (const p of this.pending.values()) p.reject(new Error('disconnected'));
      this.pending.clear();
      this.setConnected(false);
      if (ev.code === 4001 || this.needsAuth) {
        // Rejected for auth — don't retry; wait for the user to enter a password.
        this.needsAuth = true;
        this.events.emit('authRequired', undefined);
        return;
      }
      if (this.wantOpen) this.retry = setTimeout(() => this.openSocket(), 1500); // reattach
    };
    ws.onerror = () => ws.close();
  }

  private onMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'authError':
        this.needsAuth = true; // the onclose(4001) that follows emits authRequired
        break;
      case 'snapshot': {
        this.needsAuth = false; // got in → password accepted (if any)
        const s = msg.payload;
        this._version = s.version;
        this._settings = s.settings;
        this._status = s.status;
        this._streamDebug = s.streamDebug;
        this.setInControl(s.inControl);
        this.setConnected(s.connected);
        if (s.restoredNote) this.events.emit('log', { dir: 'info', text: s.restoredNote });
        // Hand the daemon-stored session to the UI (it restores the artwork/page).
        this.events.emit('session', s.session ?? null);
        // Continue a plot that was paused by a previous Disconnect-as-pause.
        if (s.paused) this.resume();
        break;
      }
      case 'control':
        this.setInControl(msg.inControl);
        break;
      case 'streamDebug':
        this._streamDebug = msg.payload;
        break;
      case 'ack': {
        this.pending.get(msg.id)?.resolve();
        this.pending.delete(msg.id);
        break;
      }
      case 'cmdError':
        if (msg.id !== undefined) {
          this.pending.get(msg.id)?.reject(new Error(msg.message));
          this.pending.delete(msg.id);
        }
        this.events.emit('log', { dir: 'info', text: `command rejected: ${msg.message}` });
        break;
      case 'event': {
        if (msg.event === 'connected') {
          this._version = msg.payload.version;
          this.setConnected(true);
        } else if (msg.event === 'disconnected') this.setConnected(false);
        else if (msg.event === 'status') this._status = msg.payload;
        else if (msg.event === 'settings') this._settings = msg.payload;
        this.events.emit(msg.event, msg.payload as never);
        break;
      }
    }
  }

  private setConnected(v: boolean) {
    if (this._connected === v) return;
    this._connected = v;
    if (v) this.events.emit('connected', { version: this._version });
    else this.events.emit('disconnected', undefined);
  }
  private setInControl(v: boolean) {
    if (this._inControl === v) return;
    this._inControl = v;
    this.events.emit('control', { inControl: v });
  }

  /** Send a command and resolve when the daemon acks it (rejects on error/close). */
  private cmd(c: ClientCommand): Promise<void> {
    const id = this.nextId++;
    return new Promise<void>((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('not connected'));
        return;
      }
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ type: 'cmd', id, ...c }));
    });
  }

  // ---- command surface (mirrors GrblController) ----
  // jog is AWAITED by the UI's press-and-hold loop, so its promise (resolved on
  // the daemon ack) paces the loop — without this the loop floods jogs and the
  // machine won't stop. Fire-and-forget commands swallow rejection.
  async jog(dx: number, dy: number, dz: number, feed: number): Promise<void> {
    await this.cmd({ cmd: 'jog', dx, dy, dz, feed });
  }
  streamProgram(gcode: string[]): void {
    void this.cmd({ cmd: 'plot', gcode }).catch(() => undefined);
  }
  /** Persist the editable session (artwork + page) on the daemon. Fire-and-forget. */
  saveSession(data: unknown): void {
    void this.cmd({ cmd: 'saveSession', session: data }).catch(() => undefined);
  }
  pause(): void {
    void this.cmd({ cmd: 'pause' }).catch(() => undefined);
  }
  resume(): void {
    void this.cmd({ cmd: 'resume' }).catch(() => undefined);
  }
  async jogCancel(): Promise<void> {
    await this.cmd({ cmd: 'jogCancel' }).catch(() => undefined);
  }
  async stopAndReturnHome(): Promise<void> {
    await this.cmd({ cmd: 'stop' });
  }
  async penUp(): Promise<void> {
    await this.cmd({ cmd: 'penUp' });
  }
  async penDown(): Promise<void> {
    await this.cmd({ cmd: 'penDown' });
  }
  async setWorkZero(): Promise<void> {
    await this.cmd({ cmd: 'setWorkZero' });
  }
  async goToWorkZero(): Promise<void> {
    await this.cmd({ cmd: 'goToWorkZero' });
  }
  async motorsOff(): Promise<void> {
    await this.cmd({ cmd: 'motorsOff' });
  }
  async unlock(): Promise<void> {
    await this.cmd({ cmd: 'unlock' });
  }
  async setSetting(num: number, value: number): Promise<void> {
    await this.cmd({ cmd: 'setSetting', num, value });
  }
}
