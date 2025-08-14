// /services/seatmap-extractor/src/types.ts
import { z } from "zod";

export const SeatSchema = z.object({
  id: z.string().optional(),
  label: z.string().nullable().optional(),
  section: z.string().nullable().optional(),
  row: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  x: z.number(), // left
  y: z.number(), // top
  w: z.number(),
  h: z.number(),
  confidence: z.number().min(0).max(1).default(0.8),
});

export type Seat = z.infer<typeof SeatSchema>;

export const SeatMapSchema = z.object({
  width: z.number(),
  height: z.number(),
  seats: z.array(SeatSchema),
  sourceType: z.enum(["svg", "png", "pdf"]),
});

export type SeatMap = z.infer<typeof SeatMapSchema>;

export type ImportOptions = {
  eventId?: string;
  webhookUrl?: string;
};

