import type { Artwork, Point, Polyline } from './types';

const DRAWABLE = 'path,line,polyline,polygon,rect,circle,ellipse';
const PX_TO_MM = 25.4 / 96; // CSS pixel → mm fallback when no real units are given

export interface ImportResult {
  artwork: Artwork;
  /** Count of elements skipped (e.g. unsupported shapes). */
  skipped: number;
}

/**
 * Flatten an SVG's stroke geometry into polylines in millimeters, with the
 * artwork's bounding-box top-left at (0,0). Browser-only (uses the DOM's SVG
 * engine: getCTM + getPointAtLength). Stroke-based: fills/text are ignored.
 */
export function flattenSvg(svgText: string, toleranceMm: number): ImportResult {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Invalid SVG file.');
  const rootEl = parsed.querySelector('svg');
  if (!rootEl) throw new Error('No <svg> element found.');

  const host = document.createElement('div');
  host.setAttribute(
    'style',
    'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden',
  );
  const svg = document.importNode(rootEl, true) as SVGSVGElement;
  host.appendChild(svg);
  document.body.appendChild(host);

  try {
    const unitToMm = computeUnitToMm(svg);
    const tolUser = Math.max(toleranceMm / unitToMm, 1e-4);
    const polylines: Polyline[] = [];
    let skipped = 0;

    for (const el of Array.from(svg.querySelectorAll<SVGGraphicsElement>(DRAWABLE))) {
      // A null CTM means the element is not rendered (display:none, inside
      // <defs>/<clipPath>/<symbol>, or detached) — skip cheaply, no style lookup.
      const ctm = el.getCTM();
      if (!ctm || !isVisible(el)) {
        skipped++;
        continue;
      }
      const subpaths = shapeToSubpathDs(el);
      if (subpaths.length === 0) {
        skipped++;
        continue;
      }
      for (const d of subpaths) {
        const local = samplePathD(svg, d, tolUser);
        const mm = local.map((p) => toMm(p, ctm, unitToMm));
        const simplified = simplifyPolyline(mm, toleranceMm);
        if (simplified.length >= 2) polylines.push(simplified);
      }
    }

    const { widthMm, heightMm } = normalizeToOrigin(polylines);
    return { artwork: { polylines, widthMm, heightMm }, skipped };
  } finally {
    document.body.removeChild(host);
  }
}

/**
 * Cheap visibility check (one computed-style lookup). display:none and
 * defs/clip content are already excluded by a null getCTM(); this catches
 * visibility:hidden and opacity:0. visibility inherits, so the element's own
 * computed value reflects a hidden ancestor.
 */
function isVisible(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
  if (parseFloat(cs.opacity || '1') === 0) return false;
  return true;
}

function computeUnitToMm(svg: SVGSVGElement): number {
  const vb = svg.viewBox?.baseVal;
  const wAttr = svg.getAttribute('width');
  const mm = wAttr && /mm$/.test(wAttr.trim()) ? parseFloat(wAttr) : null;
  if (mm && vb && vb.width > 0) return mm / vb.width; // real-world units declared
  return PX_TO_MM; // assume user units are CSS pixels
}

/** Split a shape into subpath `d` strings (one per pen-down stroke). */
function shapeToSubpathDs(el: SVGGraphicsElement): string[] {
  const tag = el.tagName.toLowerCase();
  let d: string | null = null;
  switch (tag) {
    case 'path':
      d = el.getAttribute('d');
      break;
    case 'line': {
      const x1 = num(el, 'x1'),
        y1 = num(el, 'y1'),
        x2 = num(el, 'x2'),
        y2 = num(el, 'y2');
      d = `M${x1},${y1} L${x2},${y2}`;
      break;
    }
    case 'polyline':
    case 'polygon': {
      const pts = (el.getAttribute('points') ?? '').trim();
      if (!pts) return [];
      d = `M${pts}` + (tag === 'polygon' ? ' Z' : '');
      break;
    }
    case 'rect': {
      const x = num(el, 'x'),
        y = num(el, 'y'),
        w = num(el, 'width'),
        h = num(el, 'height');
      d = `M${x},${y} H${x + w} V${y + h} H${x} Z`;
      break;
    }
    case 'circle': {
      const cx = num(el, 'cx'),
        cy = num(el, 'cy'),
        r = num(el, 'r');
      d = `M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`;
      break;
    }
    case 'ellipse': {
      const cx = num(el, 'cx'),
        cy = num(el, 'cy'),
        rx = num(el, 'rx'),
        ry = num(el, 'ry');
      d = `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`;
      break;
    }
  }
  if (!d) return [];
  // Split into subpaths at each moveto so the pen lifts between them.
  return d
    .split(/(?=[Mm])/)
    .map((s) => s.trim())
    .filter((s) => /[0-9]/.test(s));
}

function samplePathD(svg: SVGSVGElement, d: string, stepUser: number): Point[] {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  try {
    const total = path.getTotalLength();
    if (!total || !isFinite(total)) return [];
    const n = Math.max(1, Math.ceil(total / stepUser));
    const pts: Point[] = [];
    for (let i = 0; i <= n; i++) {
      const p = path.getPointAtLength((i / n) * total);
      pts.push({ x: p.x, y: p.y });
    }
    return pts;
  } finally {
    svg.removeChild(path);
  }
}

function toMm(p: Point, ctm: DOMMatrix | null, unitToMm: number): Point {
  const x = ctm ? ctm.a * p.x + ctm.c * p.y + ctm.e : p.x;
  const y = ctm ? ctm.b * p.x + ctm.d * p.y + ctm.f : p.y;
  return { x: x * unitToMm, y: y * unitToMm };
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

function num(el: Element, attr: string): number {
  return parseFloat(el.getAttribute(attr) ?? '0') || 0;
}

/**
 * Douglas–Peucker polyline simplification (pure; mm units). Removes points that
 * deviate from the line by less than epsilon — trims oversampled straight runs.
 */
export function simplifyPolyline(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points.slice();
  let maxDist = 0;
  let index = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], a, b);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist <= epsilon) return [a, b];
  const left = simplifyPolyline(points.slice(0, index + 1), epsilon);
  const right = simplifyPolyline(points.slice(index), epsilon);
  return left.slice(0, -1).concat(right);
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}
