import { describe, expect, it } from 'vitest';
import { anchorPlacement, fitPlacement, transformedBox } from '../place';

describe('transformedBox', () => {
  it('returns the box unchanged at 0°, scale 1', () => {
    const b = transformedBox(100, 60, 1, 0);
    expect(b).toMatchObject({ minX: 0, minY: 0, width: 100, height: 60 });
  });

  it('swaps width/height at 90°', () => {
    const b = transformedBox(100, 60, 1, 90);
    expect(b.width).toBeCloseTo(60, 6);
    expect(b.height).toBeCloseTo(100, 6);
  });
});

describe('fitPlacement', () => {
  it('fits within the paper and anchors the box at the corner', () => {
    const pl = fitPlacement(200, 100, 0, 100, 100); // wide art into square paper
    expect(pl.scale).toBeCloseTo(0.5, 6); // 100/200
    const box = transformedBox(200, 100, pl.scale, pl.rotation);
    expect(pl.x + box.minX).toBeCloseTo(0, 6);
    expect(pl.y + box.minY).toBeCloseTo(0, 6);
  });

  it('respects rotation: a rotated wide artwork fits by its rotated extent', () => {
    // 200x100 rotated 90° becomes 100 wide x 200 tall; into 100x100 paper, limited by height.
    const pl = fitPlacement(200, 100, 90, 100, 100);
    const box = transformedBox(200, 100, pl.scale, 90);
    expect(box.width).toBeLessThanOrEqual(100 + 1e-6);
    expect(box.height).toBeLessThanOrEqual(100 + 1e-6);
    // Anchored at the corner.
    expect(pl.x + box.minX).toBeCloseTo(0, 6);
    expect(pl.y + box.minY).toBeCloseTo(0, 6);
  });
});

describe('anchorPlacement', () => {
  it('moves a rotated artwork so its rotated box touches the corner, keeping scale', () => {
    const pl = anchorPlacement(100, 60, { x: 999, y: 999, scale: 2, rotation: 90 });
    expect(pl.scale).toBe(2);
    expect(pl.rotation).toBe(90);
    const box = transformedBox(100, 60, 2, 90);
    expect(pl.x + box.minX).toBeCloseTo(0, 6);
    expect(pl.y + box.minY).toBeCloseTo(0, 6);
  });
});
