import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

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

  const comments = await prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await getTaskOrFail(taskId, session.user.workspaceId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: session.user.id,
      content: parsed.data.content,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
