import type { Polyline } from './types';

export interface PenOptions {
  /** Z that lifts the pen clear (≤ 0 on this inverted-Z machine). */
  penUpZ: number;
  /** Z that puts the pen on the paper (positive — inverted Z). */
  penDownZ: number;
  /** Settle dwell after each pen move, in milliseconds. */
  dwellMs: number;
  /** Feed rate for pen-down (drawing) moves, mm/min. */
  drawFeed: number;
  /** Feed rate for pen-up (travel) moves, mm/min. */
  travelFeed: number;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : Number(n.toFixed(3)).toString();
}

/**
 * Generate GRBL G-code in WORK coordinates from polylines given in paper
 * millimeters with the top-left corner as origin.
 *
 * Applies the hardware-confirmed mapping (verified by the orientation test):
 *   machineX = artworkX,  machineY = artworkY   (identity — NO Y flip;
 *   machine +Y is physically "down the page", matching the artwork's Y-down)
 *
 * Frames the program in mm/absolute, starts and ends pen-up, and returns to
 * the work origin. Stroke order follows input order (optimization is deferred).
 */
export function generateGcode(polylines: Polyline[], opts: PenOptions): string[] {
  const up = fmt(opts.penUpZ);
  const down = fmt(opts.penDownZ);
  const dwell = fmt(opts.dwellMs / 1000);
  const draw = Math.round(opts.drawFeed);
  const travel = Math.round(opts.travelFeed);

  const lines: string[] = ['G21', 'G90', `G0 Z${up}`];

  for (const poly of polylines) {
    if (poly.length < 2) continue; // a stroke needs at least one segment
    const start = poly[0];
    // Travel to the stroke start with the pen up.
    lines.push(`G1 X${fmt(start.x)} Y${fmt(start.y)} F${travel}`);
    // Pen down + settle.
    lines.push(`G0 Z${down}`, `G4 P${dwell}`);
    // Draw the remaining points.
    for (let i = 1; i < poly.length; i++) {
      lines.push(`G1 X${fmt(poly[i].x)} Y${fmt(poly[i].y)} F${draw}`);
    }
    // Pen up + settle before the next travel.
    lines.push(`G0 Z${up}`, `G4 P${dwell}`);
  }

  // Return to the work origin (pen up).
  lines.push(`G1 X0 Y0 F${travel}`);
  return lines;
}
