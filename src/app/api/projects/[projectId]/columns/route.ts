import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int(),
  color: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: session.user.workspaceId },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createColumnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const column = await prisma.kanbanColumn.create({
    data: { ...parsed.data, projectId },
  });

  return NextResponse.json(column, { status: 201 });
}
