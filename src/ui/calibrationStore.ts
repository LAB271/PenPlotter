import { Calibration, DEFAULT_CALIBRATION } from '../grbl/settings';

const KEY = 'penplotter271.calibration';

/** Load calibration from localStorage (browser layer — kept out of the engine). */
export function loadCalibration(): Calibration {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return { ...DEFAULT_CALIBRATION };
}

export function saveCalibration(c: Calibration): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore quota/availability errors */
  }
}
