// /services/seatmap-extractor/src/graphql/resolvers.ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FileUpload } from "graphql-upload-minimal";
import { SeatMapSchema, type SeatMap, type ImportOptions } from "../types.js";
import { extractFromSvg } from "../lib/extractFromSvg.js";
import { extractFromPng } from "../lib/extractFromPng.js";
import { extractFromPdf } from "../lib/extractFromPdf.js";
import { pushToCheckpoint as doPush } from "../adapters/checkpointPush.js";

export const resolvers = {
  Query: {
    _health: () => "ok",
  },
  Mutation: {
    importSeatMap: async (
      _: any,
      args: { file: Promise<FileUpload>; options?: ImportOptions },
    ): Promise<SeatMap> => {
      const { file, options } = args;
      const upload = await file;
      const stream = upload.createReadStream();
      const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "seatmap-"));
      const tmpFile = path.join(tmpDir, upload.filename);
      const out = fs.createWriteStream(tmpFile);
      await new Promise((res, rej) => {
        stream.pipe(out).on("finish", res).on("error", rej);
      });

      const ext = path.extname(upload.filename).toLowerCase();
      let seatMap: SeatMap;

      if (ext === ".svg") {
        const svgContent = await fsp.readFile(tmpFile, "utf8");
        seatMap = await extractFromSvg(svgContent);
      } else if (ext === ".png") {
        const buf = await fsp.readFile(tmpFile);
        seatMap = await extractFromPng(buf);
      } else if (ext === ".pdf") {
        seatMap = await extractFromPdf(tmpFile);
      } else {
        throw new Error(`Dateityp nicht unterstützt: ${ext}`);
      }

      // EventId anreichern? (nur zur Info – SeatMap hat kein Feld dafür)
      void options; // reserviert

      // Validieren
      SeatMapSchema.parse(seatMap);
      return seatMap;
    },

    pushToCheckpoint: async (
      _: any,
      args: { seatMap: string; options: ImportOptions },
    ) => {
      const seatMap: SeatMap = JSON.parse(args.seatMap);
      SeatMapSchema.parse(seatMap);
      const res = await doPush(seatMap, args.options);
      return res;
    },
  },
};
