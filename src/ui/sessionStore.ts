import type { Placement, Polyline } from '../plot/types';

/** A placed artwork as persisted (matches App's PlacedArt). */
export interface PersistedArt {
  id: string;
  name: string;
  master: Polyline[];
  widthMm: number;
  heightMm: number;
  placement: Placement;
}

/**
 * The editable session (artwork + page layout). Persisted in localStorage so
 * reopening the tab / reloading after a reconnect restores what you were
 * plotting — the daemon keeps the plot running, but the artwork is browser state.
 */
export interface Session {
  items: PersistedArt[];
  selectedId: string | null;
  nextId: number;
  paperIdx: number;
  orientation: 'landscape' | 'portrait';
  useCustomPaper: boolean;
  customPaper: { widthMm: number; heightMm: number };
}

const KEY = 'penplotter271.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota exceeded (very large artwork) or storage unavailable — skip, no crash */
  }
}
