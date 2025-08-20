// /services/seatmap-extractor/src/lib/extractFromSvg.ts
import { parse } from "svgson";
import { Seat, SeatMap } from "../types";
type SvgNode = any;

// --- simple 2D transform matrix helper (a c e; b d f; 0 0 1) ---
type M = [number, number, number, number, number, number]; // a,b,c,d,e,f (SVG matrix order a b c d e f)
const I: M = [1, 0, 0, 1, 0, 0];

function mmul(A: M, B: M): M {
  // A∘B
  const [a1, b1, c1, d1, e1, f1] = A;
  const [a2, b2, c2, d2, e2, f2] = B;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}
function tTranslate(tx: number, ty: number): M {
  return [1, 0, 0, 1, tx, ty];
}
function tScale(sx: number, sy?: number): M {
  const syv = sy ?? sx;
  return [sx, 0, 0, syv, 0, 0];
}
function tMatrix(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): M {
  return [a, b, c, d, e, f];
}
function apply(Mm: M, x: number, y: number) {
  const [a, b, c, d, e, f] = Mm;
  return { x: a * x + c * y + e, y: b * x + d * y + f };
}

// --- parse transform attribute (supports translate, scale, matrix) ---
function parseTransform(attr?: string): M {
  if (!attr) return I;
  let m = I as M;
  const re = /(matrix|translate|scale)\s*\(([^)]+)\)/g;
  let mth: RegExpExecArray | null;
  while ((mth = re.exec(attr))) {
    const [, kind, argsStr] = mth;
    const nums = argsStr
      .split(/[, \t]+/)
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    if (kind === "translate") {
      const [tx, ty = 0] = nums;
      m = mmul(m, tTranslate(tx || 0, ty || 0));
    } else if (kind === "scale") {
      const [sx, sy] = nums;
      m = mmul(m, tScale(sx || 1, sy));
    } else if (kind === "matrix" && nums.length >= 6) {
      const [a, b, c, d, e, f] = nums as M;
      m = mmul(m, tMatrix(a, b, c, d, e, f));
    }
  }
  return m;
}

type TextItem = { x: number; y: number; text: string };
type RectItem = { x: number; y: number; w: number; h: number; area: number };

export async function extractFromSvg(svgContent: string): Promise<SeatMap> {
  const root = await parse(svgContent, { camelcase: true });
  // width/height können als Zahl, mit Einheiten oder nur via viewBox kommen
  let width = parseFloat(root.attributes.width || "");
  let height = parseFloat(root.attributes.height || "");
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    const vb = (root.attributes.viewBox || root.attributes.viewbox || "")
      .toString()
      .trim();
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      width = parts[2];
      height = parts[3];
    }
  }
  if (!Number.isFinite(width)) width = 1000;
  if (!Number.isFinite(height)) height = 1000;

  const texts: TextItem[] = [];
  const rects: RectItem[] = [];

  // Parameter/Heuristiken
  const minSeatSize = Math.max(6, Math.min(width, height) * 0.005); // ~0.5% der kleineren Kante, mind. 6px
  const maxSeatWidth = Math.max(30, Math.min(width, height) * 0.06); // ~6% -> verhindert fette Blöcke
  const maxSeatHeight = Math.max(30, Math.min(width, height) * 0.06);
  const maxCanvasArea = width * height;
  const maxSeatArea = Math.min(
    maxCanvasArea * 0.01,
    maxSeatWidth * maxSeatHeight,
  ); // niemals >1% der Fläche
  const dedupEps = 0.75; // px

  // Hilfsfunktionen
  const pushRect = (x: number, y: number, w: number, h: number) => {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(w) ||
      !Number.isFinite(h)
    )
      return;
    if (w <= 0 || h <= 0) return;
    const area = w * h;
    // Filter: zu große/backdrop-Rects raus
    if (w > maxSeatWidth || h > maxSeatHeight) return;
    if (area > maxSeatArea) return;
    // Filter: zu kleine raus
    if (w < minSeatSize && h < minSeatSize) return;
    rects.push({ x, y, w, h, area });
  };

  const pushText = (x: number, y: number, text: string) => {
    const t = text.trim();
    if (!t) return;
    texts.push({ x, y, text: t });
  };

  function walk(node: SvgNode, parentMatrix: M) {
    const name = (node.name || "").toLowerCase();
    const a = node.attributes || {};
    const own = parseTransform(a.transform);
    const Mnow = mmul(parentMatrix, own);

    if (name === "text") {
      // x/y können fehlen; fallback (0,0)
      const x = parseFloat(a.x ?? "0");
      const y = parseFloat(a.y ?? "0");
      let txt = "";
      for (const c of node.children || []) {
        if (c.type === "text") txt += c.value || "";
        if ((c.name || "").toLowerCase() === "tspan") {
          for (const gc of c.children || [])
            if (gc.type === "text") txt += gc.value || "";
        }
      }
      const p = apply(Mnow, x, y);
      pushText(p.x, p.y, txt);
    } else if (name === "tspan") {
      // gelegentlich gibt es standalone tspans
      const x = parseFloat(a.x ?? "0");
      const y = parseFloat(a.y ?? "0");
      let txt = "";
      for (const c of node.children || [])
        if (c.type === "text") txt += c.value || "";
      const p = apply(Mnow, x, y);
      pushText(p.x, p.y, txt);
    } else if (name === "circle") {
      const cx = parseFloat(a.cx ?? "0");
      const cy = parseFloat(a.cy ?? "0");
      const r = parseFloat(a.r ?? "0");
      if (r > 0) {
        const p = apply(Mnow, cx, cy);
        pushRect(p.x - r, p.y - r, r * 2, r * 2);
      }
    } else if (name === "ellipse") {
      const cx = parseFloat(a.cx ?? "0");
      const cy = parseFloat(a.cy ?? "0");
      const rx = parseFloat(a.rx ?? "0");
      const ry = parseFloat(a.ry ?? "0");
      if (rx > 0 && ry > 0) {
        const p = apply(Mnow, cx, cy);
        pushRect(p.x - rx, p.y - ry, rx * 2, ry * 2);
      }
    } else if (name === "rect") {
      const x = parseFloat(a.x ?? "0");
      const y = parseFloat(a.y ?? "0");
      const w = parseFloat(a.width ?? "0");
      const h = parseFloat(a.height ?? "0");
      if (w > 0 && h > 0) {
        const p = apply(Mnow, x, y);
        pushRect(p.x, p.y, w, h);
      }
    }
    // paths ignorieren (zu uneinheitlich) – falls gewünscht: optionalen Path-Kreis-Detector ergänzen

    for (const c of node.children || []) walk(c, Mnow);
  }

  walk(root, I);

  // Deduplikation (häufige Duplikate aus ClipGroups etc.)
  const key = (r: RectItem) =>
    `${Math.round(r.x / dedupEps)},${Math.round(r.y / dedupEps)},${Math.round(r.w / dedupEps)},${Math.round(r.h / dedupEps)}`;
  const unique = new Map<string, RectItem>();
  for (const r of rects) {
    const k = key(r);
    if (!unique.has(k)) unique.set(k, r);
  }
  const cleanRects = Array.from(unique.values());

  // Texte normieren (mehrfach auftretende Labels zusammenführen)
  const cleanTexts: TextItem[] = [];
  const tSeen = new Set<string>();
  for (const t of texts) {
    const k = `${Math.round(t.x)},${Math.round(t.y)},${t.text}`;
    if (!tSeen.has(k)) {
      tSeen.add(k);
      cleanTexts.push(t);
    }
  }

  // Nearest-Text-Zuordnung (nur wenn Text in sinnvoller Nähe liegt)
  function nearestText(
    cx: number,
    cy: number,
    maxDist: number,
  ): TextItem | null {
    let best: TextItem | null = null;
    let bestD = Infinity;
    for (const t of cleanTexts) {
      const dx = t.x - cx;
      const dy = t.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < bestD && d <= maxDist) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  const seats: Seat[] = [];
  for (const r of cleanRects) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const maxDist = Math.max(r.w, r.h) * 2.2; // Label in der Nähe (ca. zwei Sitzbreiten)
    const nt = nearestText(cx, cy, maxDist);
    const seat: Seat = {
      label: nt?.text ?? null,
      section: null,
      row: null,
      number: null,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      confidence: nt ? 0.93 : 0.7,
    };

    // SECTION/NUMBER aus Label parsen (A12, A-12, B-1-23 …)
    if (seat.label) {
      const norm = seat.label.replace(/\s+/g, "");
      const m =
        norm.match(/^([A-Z]{1,2})-?(\d{1,2})-?(\d{1,3})$/i) ||
        norm.match(/^([A-Z]{1,2})(\d{1,3})$/i);
      if (m) {
        if (m[1] && m[2] && m[3]) {
          seat.section = m[1].toUpperCase();
          seat.row = m[2];
          seat.number = m[3];
        } else if (m[1] && m[2]) {
          seat.section = m[1].toUpperCase();
          seat.number = m[2];
        }
      }
    }

    seats.push(seat);
  }

  // Sortierung (erst nach y, dann x) – schöner fürs UI
  seats.sort((a, b) => a.y - b.y || a.x - b.x);

  return {
    width,
    height,
    seats,
    sourceType: "svg",
  };
}
