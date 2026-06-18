export interface PaperSize {
  name: string;
  /** Short edge (mm) and long edge (mm); orientation is applied in the UI. */
  shortMm: number;
  longMm: number;
}

/** ISO A series. The machine bed is 1189×841 mm (X is the long axis). */
export const PAPER_SIZES: PaperSize[] = [
  { name: 'A4', shortMm: 210, longMm: 297 },
  { name: 'A3', shortMm: 297, longMm: 420 },
  { name: 'A2', shortMm: 420, longMm: 594 },
  { name: 'A1', shortMm: 594, longMm: 841 },
  { name: 'A0', shortMm: 841, longMm: 1189 },
  { name: 'A0 (SBP)', shortMm: 841, longMm: 1181 },
];

/** Paper dimensions (mm) placed on the bed for a given orientation. */
export function paperDims(
  size: PaperSize,
  orientation: 'landscape' | 'portrait',
): { widthMm: number; heightMm: number } {
  return orientation === 'landscape'
    ? { widthMm: size.longMm, heightMm: size.shortMm }
    : { widthMm: size.shortMm, heightMm: size.longMm };
}
