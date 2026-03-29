import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validations/task";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      project: { workspaceId: session.user.workspaceId },
      archivedAt: null,
      parentId: null,
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: [{ deadline: "asc" }, { order: "asc" }],
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      _count: { select: { subtasks: true, checklist: true, timeEntries: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, workspaceId: session.user.workspaceId },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Compute max order in column
  const maxOrder = await prisma.task.aggregate({
    where: { columnId: parsed.data.columnId },
    _max: { order: true },
  });

  const { tagIds, ...taskData } = parsed.data;

  const task = await prisma.task.create({
    data: {
      ...taskData,
      deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      createdById: session.user.id,
      order: (maxOrder._max.order ?? 0) + 1000,
      ...(tagIds?.length
        ? {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: true } },
      _count: { select: { subtasks: true, checklist: true, timeEntries: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
