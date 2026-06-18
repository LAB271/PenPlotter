import type { Artwork, Point, Polyline } from './types';
import { simplifyPolyline } from './svg';

const PX_TO_MM = 25.4 / 96; // CSS pixel → mm (PNGs carry no real-world size)

export interface ImportResult {
  artwork: Artwork;
  /** Count of contour levels that produced no geometry (e.g. blank image). */
  skipped: number;
}

export interface RasterOptions {
  /** Darkness cutoff in 0..1 (0 = black, 1 = white). Pixels darker than this are "inked". */
  threshold: number;
  /** Number of evenly-spaced brightness contours (1 = silhouette outline, more = tonal). */
  levels: number;
  /** Polyline simplification tolerance, mm. */
  toleranceMm: number;
  /** Working-resolution cap on the longer side (px) to keep contours smooth/fast. */
  maxDim?: number;
}

/**
 * Convert a raster image into plottable polylines by tracing grayscale
 * iso-contours (marching squares). Browser-only: rasterizes the image on a
 * canvas to read pixels. The geometry "looks like a drawing" — closed outlines
 * of the dark regions, which a pen plotter can draw efficiently.
 */
export async function flattenImageFile(file: File, opts: RasterOptions): Promise<ImportResult> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const maxDim = opts.maxDim ?? 500;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const gw = Math.max(2, Math.round(img.width * scale));
    const gh = Math.max(2, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = gw;
    canvas.height = gh;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read the image (no 2D canvas).');
    ctx.fillStyle = '#ffffff'; // composite transparency onto white
    ctx.fillRect(0, 0, gw, gh);
    ctx.drawImage(img, 0, 0, gw, gh);
    const { data } = ctx.getImageData(0, 0, gw, gh);

    // Grayscale field in 0..1 (0 = black, 1 = white).
    const field = new Float32Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) {
      const r = data[i * 4],
        g = data[i * 4 + 1],
        b = data[i * 4 + 2];
      field[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    const mmPerGrid = (img.width * PX_TO_MM) / gw;
    const levels = Math.max(1, Math.round(opts.levels));
    const t = Math.min(0.999, Math.max(0.001, opts.threshold));
    const polylines: Polyline[] = [];
    let skipped = 0;

    for (let k = 1; k <= levels; k++) {
      const value = (t * k) / levels; // light → threshold; nested for shading
      const contours = isoContours(field, gw, gh, value);
      if (contours.length === 0) {
        skipped++;
        continue;
      }
      for (const c of contours) {
        const mm = c.map((p) => ({ x: p.x * mmPerGrid, y: p.y * mmPerGrid }));
        const simplified = simplifyPolyline(mm, opts.toleranceMm);
        if (simplified.length >= 2) polylines.push(simplified);
      }
    }

    const { widthMm, heightMm } = normalizeToOrigin(polylines);
    return { artwork: { polylines, widthMm, heightMm }, skipped };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load that image file.'));
    img.src = url;
  });
}

/**
 * Marching squares: trace iso-contours of a scalar field at `level`. A cell
 * corner is "inked" when its value is <= level (darker than the cutoff). Returns
 * closed/open polylines in grid coordinates. Pure — unit-testable without a DOM.
 */
export function isoContours(
  field: Float32Array | number[],
  w: number,
  h: number,
  level: number,
): Polyline[] {
  const at = (x: number, y: number) => field[y * w + x];
  const inked = (v: number) => v <= level;
  // Linear-interpolated crossing on the edge from value fa→fb (param 0..1).
  const cross = (fa: number, fb: number) => {
    const d = fb - fa;
    return Math.abs(d) < 1e-9 ? 0.5 : (level - fa) / d;
  };

  const pts = new Map<string, Point>();
  const segs: Array<[string, string]> = [];

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = at(x, y),
        tr = at(x + 1, y),
        br = at(x + 1, y + 1),
        bl = at(x, y + 1);
      let c = 0;
      if (inked(tl)) c |= 1;
      if (inked(tr)) c |= 2;
      if (inked(br)) c |= 4;
      if (inked(bl)) c |= 8;
      if (c === 0 || c === 15) continue;

      // Edge crossing points, keyed by the shared grid edge so neighbouring
      // cells produce identical keys/points and the segments link exactly.
      const T = () => key(`h${x},${y}`, x + cross(tl, tr), y);
      const B = () => key(`h${x},${y + 1}`, x + cross(bl, br), y + 1);
      const L = () => key(`v${x},${y}`, x, y + cross(tl, bl));
      const R = () => key(`v${x + 1},${y}`, x + 1, y + cross(tr, br));

      const emit = (a: () => string, b: () => string) => segs.push([a(), b()]);
      switch (c) {
        case 1:
          emit(L, T);
          break;
        case 2:
          emit(T, R);
          break;
        case 3:
          emit(L, R);
          break;
        case 4:
          emit(R, B);
          break;
        case 5:
          emit(L, T);
          emit(R, B);
          break; // saddle (consistent pick)
        case 6:
          emit(T, B);
          break;
        case 7:
          emit(L, B);
          break;
        case 8:
          emit(B, L);
          break;
        case 9:
          emit(T, B);
          break;
        case 10:
          emit(T, R);
          emit(B, L);
          break; // saddle
        case 11:
          emit(R, B);
          break;
        case 12:
          emit(R, L);
          break;
        case 13:
          emit(T, R);
          break;
        case 14:
          emit(L, T);
          break;
      }
    }
  }

  function key(id: string, px: number, py: number): string {
    if (!pts.has(id)) pts.set(id, { x: px, y: py });
    return id;
  }

  return linkSegments(segs, pts);
}

/** Join a set of edge-keyed segments (each node has degree <= 2) into polylines. */
function linkSegments(segs: Array<[string, string]>, pts: Map<string, Point>): Polyline[] {
  const segKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const incident = new Map<string, Array<{ to: string; sk: string }>>();
  const push = (node: string, to: string, sk: string) => {
    const list = incident.get(node);
    if (list) list.push({ to, sk });
    else incident.set(node, [{ to, sk }]);
  };
  for (const [a, b] of segs) {
    const sk = segKey(a, b);
    push(a, b, sk);
    push(b, a, sk);
  }

  const used = new Set<string>();
  const take = (node: string) => (incident.get(node) ?? []).find((e) => !used.has(e.sk)) ?? null;

  const polylines: Polyline[] = [];
  for (const [a, b] of segs) {
    const sk0 = segKey(a, b);
    if (used.has(sk0)) continue;
    used.add(sk0);
    const chain = [a, b];
    // Extend forward from b, then backward from a.
    let node = b;
    for (let e = take(node); e; e = take(node)) {
      used.add(e.sk);
      chain.push(e.to);
      node = e.to;
    }
    node = a;
    for (let e = take(node); e; e = take(node)) {
      used.add(e.sk);
      chain.unshift(e.to);
      node = e.to;
    }
    polylines.push(chain.map((id) => pts.get(id)!));
  }
  return polylines;
}

/** Shift all polylines so the bounding-box top-left is (0,0); return size in mm. */
function normalizeToOrigin(polylines: Polyline[]): { widthMm: number; heightMm: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const poly of polylines)
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  if (!isFinite(minX)) return { widthMm: 0, heightMm: 0 };
  for (const poly of polylines)
    for (const p of poly) {
      p.x -= minX;
      p.y -= minY;
    }
  return { widthMm: maxX - minX, heightMm: maxY - minY };
}
