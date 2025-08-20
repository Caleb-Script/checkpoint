// /services/seatmap-extractor/src/utils/geometry.ts
export function bboxFromCircle(cx: number, cy: number, r: number) {
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
}

export function bboxFromRect(x: number, y: number, w: number, h: number) {
  return { x, y, w, h };
}

export function distance(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function nearest<T>(
  origin: { x: number; y: number },
  items: T[],
  getPoint: (t: T) => { x: number; y: number },
) {
  let best: { item: T; d: number } | null = null;
  for (const it of items) {
    const p = getPoint(it);
    const d = distance(origin.x, origin.y, p.x, p.y);
    if (!best || d < best.d) best = { item: it, d };
  }
  return best?.item ?? null;
}
