// /services/seatmap-extractor/src/lib/extractFromPng.ts
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { SeatMap, Seat } from "../types.js";

/**
 * PNG-Heuristik:
 * - Binarisieren + OCR für Labels (A12, B3...)
 * - Es werden Platzhalter-Bounding-Boxes um erkannte Textblöcke gelegt.
 * - Für echte geometrische Sitzformen (Kreise/Rects) wäre OpenCV ideal;
 *   hier fokussieren wir uns auf Label-Erkennung + manuelles Review im UI.
 */
export async function extractFromPng(
    buffer: Buffer
): Promise<SeatMap> {
    const img = sharp(buffer);
    const { width = 1000, height = 1000 } = await img.metadata();

    // Preprocess: Grayscale + threshold
    const pre = await img
        .grayscale()
        .threshold(140)
        .toBuffer();

    // OCR
    const { data } = await Tesseract.recognize(pre, "eng", {
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ",
    });

    const seats: Seat[] = [];
    const labelRe = /^([A-Z]{1,2})-?(\d{1,3})$/;

    for (const w of data.words || []) {
        const text = (w.text || "").trim().replace(/\s+/g, "");
        if (!text) continue;
        if (!labelRe.test(text)) continue;

        const { x0, y0, x1, y1 } = {
            x0: w.bbox?.x0 ?? w.bbox?.x ?? w.bbox?.left ?? w.bbox?.x0 ?? 0,
            y0: w.bbox?.y0 ?? w.bbox?.y ?? w.bbox?.top ?? w.bbox?.y0 ?? 0,
            x1: w.bbox?.x1 ?? (w.bbox?.x ?? 0) + (w.bbox?.w ?? 0),
            y1: w.bbox?.y1 ?? (w.bbox?.y ?? 0) + (w.bbox?.h ?? 0),
        };

        seats.push({
            label: text,
            section: null,
            row: null,
            number: null,
            x: Math.max(0, x0 - 10),
            y: Math.max(0, y0 - 10),
            w: Math.max(20, (x1 - x0) + 20),
            h: Math.max(20, (y1 - y0) + 20),
            confidence: Math.min(1, (w.confidence ?? 70) / 100),
        });
    }

    // Optional: parse section/number
    for (const s of seats) {
        if (s.label) {
            const m = s.label.match(labelRe);
            if (m) {
                s.section = m[1].toUpperCase();
                s.number = m[2];
            }
        }
    }

    return {
        width: width || 1000,
        height: height || 1000,
        seats,
        sourceType: "png",
    };
}
