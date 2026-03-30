import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations/task";

async function getTaskOrFail(taskId: string, workspaceId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
  });
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

    return tx.task.update({
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
