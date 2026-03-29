import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().optional(),
  color: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { columnId } = await params;

  const column = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, project: { workspaceId: session.user.workspaceId } },
  });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.kanbanColumn.update({
    where: { id: columnId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { columnId } = await params;

  const column = await prisma.kanbanColumn.findFirst({
    where: { id: columnId, project: { workspaceId: session.user.workspaceId } },
    include: { _count: { select: { tasks: true } } },
  });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (column._count.tasks > 0) {
    return NextResponse.json(
      { error: "Cannot delete column with tasks. Move or delete tasks first." },
      { status: 400 }
    );
  }

  await prisma.kanbanColumn.delete({ where: { id: columnId } });
  return new NextResponse(null, { status: 204 });
}
