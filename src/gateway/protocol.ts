/**
 * Shared WebSocket protocol between the gateway daemon and browser clients.
 * Event names mirror the GrblController's events 1:1 so the bridge is mechanical.
 */
import type { GrblSettings, StatusReport } from '../grbl/types';
import type { Calibration } from '../grbl/settings';

export const DEFAULT_GATEWAY_PORT = 8717;

export interface StreamDebug {
  inflight: number;
  bytes: number;
  queued: number;
}

/** Commands a client sends to the daemon (1:1 with controller operations). */
export type ClientCommand =
  | { cmd: 'plot'; gcode: string[] }
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  | { cmd: 'stop' }
  | { cmd: 'jog'; dx: number; dy: number; dz: number; feed: number }
  | { cmd: 'jogCancel' }
  | { cmd: 'feedOverride'; percent: number }
  | { cmd: 'penUp' }
  | { cmd: 'penDown' }
  | { cmd: 'setWorkZero' }
  | { cmd: 'goToWorkZero' }
  | { cmd: 'motorsOff' }
  | { cmd: 'unlock' }
  | { cmd: 'setSetting'; num: number; value: number }
  | { cmd: 'setCalibration'; calibration: Calibration }
  // Persist the editable session (artwork + page) on the daemon so it lives on
  // the Pi and is restored on any device that connects. Opaque blob to the daemon.
  | { cmd: 'saveSession'; session: unknown };

export type ClientMessage = { type: 'cmd'; id: number } & ClientCommand;

/** Snapshot of current state sent to a client on attach. */
export interface Snapshot {
  connected: boolean;
  version: string;
  status: StatusReport | null;
  settings: GrblSettings;
  streamDebug: StreamDebug;
  inControl: boolean;
  /** True if a plot is currently paused (e.g. via a Disconnect-as-pause). */
  paused: boolean;
  /** Note if a remembered position was restored on connect (else null). */
  restoredNote: string | null;
  /** The editable session (artwork + page) stored on the daemon, or null. */
  session: unknown | null;
}

/** Controller events forwarded verbatim (event name === controller event name). */
export interface ForwardedEvents {
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
}

export type ServerMessage =
  | { type: 'snapshot'; payload: Snapshot }
  | { type: 'control'; inControl: boolean }
  | { type: 'streamDebug'; payload: StreamDebug }
  | { type: 'ack'; id: number }
  | { type: 'authError'; message: string }
  | { type: 'cmdError'; id?: number; message: string }
  | {
      [K in keyof ForwardedEvents]: { type: 'event'; event: K; payload: ForwardedEvents[K] };
    }[keyof ForwardedEvents];
