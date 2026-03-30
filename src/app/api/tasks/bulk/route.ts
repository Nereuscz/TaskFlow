import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1),
  data: z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().cuid().nullable().optional(),
  }),
});

const bulkDeleteSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { taskIds, data } = parsed.data;

  // Verify all tasks belong to the workspace
  const count = await prisma.task.count({
    where: { id: { in: taskIds }, project: { workspaceId: session.user.workspaceId } },
  });
  if (count !== taskIds.length) {
    return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = { ...data };
  if (data.status) {
    updatePayload.completedAt = data.status === TaskStatus.DONE ? new Date() : null;
  }

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: updatePayload,
  });

  return NextResponse.json({ updated: taskIds.length });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { taskIds } = parsed.data;

  const count = await prisma.task.count({
    where: { id: { in: taskIds }, project: { workspaceId: session.user.workspaceId } },
  });
  if (count !== taskIds.length) {
    return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
  }

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { archivedAt: new Date() },
  });

  return NextResponse.json({ archived: taskIds.length });
}
