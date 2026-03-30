import { z } from "zod";
import { TaskPriority, TaskStatus, RecurrenceType } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(10000).optional(),
  projectId: z.string().cuid(),
  columnId: z.string().cuid(),
  parentId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  columnId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  deadline: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  order: z.number().int().optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  recurrence: z.nativeEnum(RecurrenceType).optional(),
  recurrenceEndDate: z.string().datetime().optional().nullable(),
});

export const reorderTaskSchema = z.object({
  columnId: z.string().cuid(),
  order: z.number().int(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
