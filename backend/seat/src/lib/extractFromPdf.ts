// /services/seatmap-extractor/src/lib/extractFromPdf.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extractFromSvg } from "./extractFromSvg.js";

const execFileAsync = promisify(execFile);

/**
 * PDF -> SVG via pdftocairo (Poppler), danach SVG-Extractor.
 * Nimmt nur die erste Seite (typisch Sitzplan).
 */
export async function extractFromPdf(pdfPath: string) {
  const outSvg = `${pdfPath}.page1.svg`;
  await execFileAsync("pdftocairo", [
    "-svg",
    "-f",
    "1",
    "-l",
    "1",
    pdfPath,
    outSvg,
  ]);
  // pdftocairo erstellt <outSvg>.1.svg – fange beide Varianten ab:
  const fs = await import("node:fs/promises");
  let svgContent: string | null = null;
  try {
    svgContent = await fs.readFile(outSvg, "utf8");
  } catch {
    try {
      svgContent = await fs.readFile(`${outSvg}.1.svg`, "utf8");
    } catch {
      // ignore
    }
  }
  if (!svgContent) throw new Error("pdftocairo konnte kein SVG erzeugen");
  return extractFromSvg(svgContent);
}
