import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema } from "@/lib/validations/project";

async function getProjectOrFail(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });
  return project;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProjectOrFail(projectId, session.user.workspaceId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const board = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            where: { archivedAt: null, parentId: null },
            orderBy: { order: "asc" },
            include: {
              assignee: { select: { id: true, name: true, image: true } },
              tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
              _count: { select: { subtasks: true, checklist: true, timeEntries: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(board);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProjectOrFail(projectId, session.user.workspaceId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { tagIds, ...projectData } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (tagIds !== undefined) {
      await tx.projectTag.deleteMany({ where: { projectId } });
      if (tagIds.length > 0) {
        await tx.projectTag.createMany({
          data: tagIds.map((tagId) => ({ projectId, tagId })),
        });
      }
    }
    return tx.project.update({
      where: { id: projectId },
      data: projectData,
      include: {
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProjectOrFail(projectId, session.user.workspaceId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id: projectId } });
  return new NextResponse(null, { status: 204 });
}
