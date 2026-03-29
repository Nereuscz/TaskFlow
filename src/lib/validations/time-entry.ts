import { z } from "zod";
import { TimeEntrySource } from "@prisma/client";

export const createTimeEntrySchema = z.object({
  taskId: z.string().cuid(),
  description: z.string().max(500).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional().nullable(),
  durationMs: z.number().int().positive().optional(),
  source: z.nativeEnum(TimeEntrySource).default(TimeEntrySource.MANUAL),
});

export const updateTimeEntrySchema = z.object({
  description: z.string().max(500).optional(),
  endedAt: z.string().datetime().optional().nullable(),
  durationMs: z.number().int().positive().optional(),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
