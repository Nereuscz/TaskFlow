import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/task";
import { addDays, addWeeks, addMonths } from "date-fns";

async function getTaskOrFail(taskId: string, workspaceId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
  });
}

// Fields we track in activity log
const TRACKED_FIELDS = ["status", "priority", "assigneeId", "deadline", "columnId"] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

function fieldLabel(field: TrackedField): string {
  const labels: Record<TrackedField, string> = {
    status: "status",
    priority: "priority",
    assigneeId: "assignee",
    deadline: "deadline",
    columnId: "column",
  };
  return labels[field];
}

function formatValue(field: TrackedField, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (field === "deadline" && value instanceof Date) return value.toISOString();
  return String(value);
}

function nextRecurrenceDeadline(
  deadline: Date,
  recurrence: string
): Date {
  switch (recurrence) {
    case "DAILY": return addDays(deadline, 1);
    case "WEEKLY": return addWeeks(deadline, 1);
    case "BIWEEKLY": return addWeeks(deadline, 2);
    case "MONTHLY": return addMonths(deadline, 1);
    default: return deadline;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await getTaskOrFail(taskId, session.user.workspaceId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      createdBy: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: true } },
      subtasks: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
      checklist: { orderBy: { order: "asc" } },
      timeEntries: {
        orderBy: { startedAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      project: { select: { id: true, name: true, color: true } },
      column: { select: { id: true, name: true } },
      attachments: { orderBy: { createdAt: "asc" } },
      activityLogs: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  return NextResponse.json(full);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await getTaskOrFail(taskId, session.user.workspaceId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { tagIds, ...updateData } = parsed.data;
  const userId = session.user.id;

  const updated = await prisma.$transaction(async (tx) => {
    // Handle tag updates if provided
    if (tagIds !== undefined) {
      await tx.taskTag.deleteMany({ where: { taskId } });
      if (tagIds.length > 0) {
        await tx.taskTag.createMany({
          data: tagIds.map((tagId) => ({ taskId, tagId })),
        });
      }
    }

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        deadline: updateData.deadline !== undefined
          ? updateData.deadline ? new Date(updateData.deadline) : null
          : undefined,
        completedAt:
          updateData.status === "DONE" && task.completedAt === null
            ? new Date()
            : updateData.status && updateData.status !== "DONE"
            ? null
            : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } },
        _count: { select: { subtasks: true, checklist: true, timeEntries: true } },
      },
    });

    // Record activity log for changed tracked fields
    const activityEntries: {
      taskId: string;
      userId: string;
      action: string;
      oldValue: string | null;
      newValue: string | null;
    }[] = [];

    for (const field of TRACKED_FIELDS) {
      if (!(field in updateData)) continue;
      const oldRaw = task[field as keyof typeof task];
      const newRaw = (updateData as Record<string, unknown>)[field];
      const oldVal = formatValue(field, oldRaw);
      const newVal = formatValue(field, newRaw);
      if (oldVal !== newVal) {
        activityEntries.push({
          taskId,
          userId,
          action: fieldLabel(field),
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }

    if (activityEntries.length > 0) {
      await tx.activityLog.createMany({ data: activityEntries });
    }

    // Auto-create next occurrence if recurring task marked DONE
    if (
      updateData.status === "DONE" &&
      task.status !== "DONE" &&
      task.recurrence !== "NONE" &&
      task.deadline
    ) {
      const nextDeadline = nextRecurrenceDeadline(task.deadline, task.recurrence);
      if (!task.recurrenceEndDate || nextDeadline <= task.recurrenceEndDate) {
        const maxOrder = await tx.task.aggregate({
          where: { columnId: task.columnId, archivedAt: null },
          _max: { order: true },
        });
        await tx.task.create({
          data: {
            projectId: task.projectId,
            columnId: task.columnId,
            title: task.title,
            description: task.description,
            status: "TODO",
            priority: task.priority,
            order: (maxOrder._max.order ?? 0) + 1000,
            deadline: nextDeadline,
            assigneeId: task.assigneeId,
            createdById: task.createdById,
            recurrence: task.recurrence,
            recurrenceEndDate: task.recurrenceEndDate,
          },
        });
      }
    }

    return updatedTask;
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await getTaskOrFail(taskId, session.user.workspaceId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id: taskId } });
  return new NextResponse(null, { status: 204 });
}
