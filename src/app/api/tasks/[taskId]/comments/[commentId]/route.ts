import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, commentId } = await params;

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, taskId, task: { project: { workspaceId: session.user.workspaceId } } },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workspaceUser = await prisma.workspaceUser.findUnique({
    where: {
      workspaceId_userId: { workspaceId: session.user.workspaceId, userId: session.user.id },
    },
  });
  const isAdminOrOwner = workspaceUser?.role === "ADMIN" || workspaceUser?.role === "OWNER";

  if (comment.authorId !== session.user.id && !isAdminOrOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return new NextResponse(null, { status: 204 });
}
