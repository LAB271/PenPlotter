import type { MachineState, Position, StatusReport } from './types';

/** A single classified line received from GRBL. */
export type GrblLine =
  | { kind: 'ok' }
  | { kind: 'error'; code: number }
  | { kind: 'alarm'; code: number }
  | { kind: 'status'; report: StatusReport }
  | { kind: 'setting'; num: number; value: number }
  | { kind: 'banner'; version: string }
  | { kind: 'message'; text: string }
  | { kind: 'other'; text: string };

const KNOWN_STATES: MachineState[] = [
  'Idle',
  'Run',
  'Hold',
  'Jog',
  'Alarm',
  'Door',
  'Home',
  'Check',
  'Sleep',
];

export function classifyLine(raw: string): GrblLine {
  const line = raw.trim();

  if (line === 'ok') return { kind: 'ok' };

  const err = /^error:(\d+)/i.exec(line);
  if (err) return { kind: 'error', code: Number(err[1]) };

  const alarm = /^ALARM:(\d+)/i.exec(line);
  if (alarm) return { kind: 'alarm', code: Number(alarm[1]) };

  if (line.startsWith('<') && line.endsWith('>')) {
    const report = parseStatus(line);
    return report ? { kind: 'status', report } : { kind: 'other', text: line };
  }

  const setting = /^\$(\d+)=(-?[\d.]+)/.exec(line);
  if (setting) return { kind: 'setting', num: Number(setting[1]), value: Number(setting[2]) };

  if (/^Grbl\s/i.test(line)) {
    const v = /^Grbl\s+(\S+)/i.exec(line);
    return { kind: 'banner', version: v ? v[1] : 'unknown' };
  }

  if (line.startsWith('[') && line.endsWith(']')) {
    return { kind: 'message', text: line.slice(1, -1) };
  }

  return { kind: 'other', text: line };
}

/**
 * Parse a GRBL 1.1 status report:
 *   <Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
 * Returns null if it cannot be parsed (caller should ignore malformed reports).
 */
export function parseStatus(raw: string): StatusReport | null {
  const inner = raw.replace(/^</, '').replace(/>$/, '');
  const parts = inner.split('|');
  if (parts.length === 0 || parts[0] === '') return null;

  // FluidNC/GRBL append a substate, e.g. "Hold:0", "Door:1" — strip it.
  const baseState = parts[0].split(':')[0];
  const state: MachineState = (KNOWN_STATES as string[]).includes(baseState)
    ? (baseState as MachineState)
    : 'Unknown';

  let mpos: Position | null = null;
  let wpos: Position | null = null;
  let wco: Position | undefined;
  let feed: number | undefined;
  let spindle: number | undefined;

  for (const field of parts.slice(1)) {
    const idx = field.indexOf(':');
    if (idx < 0) continue;
    const key = field.slice(0, idx);
    const nums = field
      .slice(idx + 1)
      .split(',')
      .map(Number);
    switch (key) {
      case 'MPos':
        mpos = { x: nums[0], y: nums[1], z: nums[2] ?? 0 };
        break;
      case 'WPos':
        wpos = { x: nums[0], y: nums[1], z: nums[2] ?? 0 };
        break;
      case 'WCO':
        wco = { x: nums[0], y: nums[1], z: nums[2] ?? 0 };
        break;
      case 'FS':
        feed = nums[0];
        spindle = nums[1];
        break;
      case 'F':
        feed = nums[0];
        break;
    }
  }

  // Prefer MPos; derive it from WPos + WCO if only WPos is reported.
  let machine = mpos;
  if (!machine && wpos) {
    const o = wco ?? { x: 0, y: 0, z: 0 };
    machine = { x: wpos.x + o.x, y: wpos.y + o.y, z: wpos.z + o.z };
  }
  if (!machine || Number.isNaN(machine.x) || Number.isNaN(machine.y)) return null;

  return { state, mpos: machine, wco, feed, spindle };
}
