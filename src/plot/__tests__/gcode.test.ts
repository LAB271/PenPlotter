import { describe, expect, it } from 'vitest';
import { generateGcode, PenOptions } from '../gcode';
import type { Polyline } from '../types';

const OPTS: PenOptions = {
  penUpZ: 0,
  penDownZ: 3,
  dwellMs: 250,
  drawFeed: 1500,
  travelFeed: 5000,
};

describe('generateGcode', () => {
  it('maps artwork mm directly to work coords (identity — no flip)', () => {
    const stroke: Polyline = [
      { x: 10, y: 20 },
      { x: 10, y: 60 },
    ];
    const gc = generateGcode([stroke], OPTS);
    expect(gc).toContain('G1 X10 Y20 F5000'); // travel to start (pen up)
    expect(gc).toContain('G1 X10 Y60 F1500'); // draw move (pen down)
    // Neither axis is negated (machine +Y is physically down the page).
    expect(gc.some((l) => /[XY]-\d/.test(l))).toBe(false);
  });

  it('frames the program safely (mm/absolute, pen up start, origin end)', () => {
    const gc = generateGcode(
      [
        [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
      ],
      OPTS,
    );
    expect(gc[0]).toBe('G21');
    expect(gc[1]).toBe('G90');
    expect(gc[2]).toBe('G0 Z0'); // pen up at start
    expect(gc[gc.length - 1]).toBe('G1 X0 Y0 F5000'); // return to origin
  });

  it('sequences each stroke: travel → pen down + dwell → draw → pen up + dwell', () => {
    const gc = generateGcode(
      [
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
      ],
      OPTS,
    );
    const iDown = gc.indexOf('G0 Z3');
    const iDwellAfterDown = gc.indexOf('G4 P0.25', iDown);
    const iDraw = gc.indexOf('G1 X2 Y2 F1500');
    const iUp = gc.indexOf('G0 Z0', iDown); // pen-up after drawing
    expect(iDown).toBeGreaterThan(2);
    expect(iDwellAfterDown).toBe(iDown + 1);
    expect(iDraw).toBeGreaterThan(iDown);
    expect(iUp).toBeGreaterThan(iDraw);
  });

  it('uses draw feed for pen-down moves and travel feed for pen-up moves', () => {
    const gc = generateGcode(
      [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      ],
      OPTS,
    );
    const drawMoves = gc.filter((l) => l.includes('F1500'));
    const travelMoves = gc.filter((l) => l.includes('F5000'));
    expect(drawMoves.length).toBeGreaterThan(0);
    expect(travelMoves.length).toBeGreaterThan(0);
  });

  it('skips polylines with fewer than two points', () => {
    const gc = generateGcode([[{ x: 5, y: 5 }]], OPTS);
    // No travel/draw moves emitted except the final return to origin.
    const moves = gc.filter((l) => l.startsWith('G1 X') && l !== 'G1 X0 Y0 F5000');
    expect(moves.length).toBe(0);
  });
});
