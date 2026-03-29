import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTimeEntrySchema } from "@/lib/validations/time-entry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: session.user.workspaceId } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await prisma.timeEntry.findMany({
    where: { taskId },
    orderBy: { startedAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(entries);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: session.user.workspaceId } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = createTimeEntrySchema.safeParse({ ...body, taskId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Close any open timer for this user
  if (parsed.data.source !== "MANUAL") {
    await prisma.timeEntry.updateMany({
      where: { userId: session.user.id, endedAt: null },
      data: { endedAt: new Date(), durationMs: 0 },
    });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId: session.user.id,
      description: parsed.data.description,
      startedAt: new Date(parsed.data.startedAt),
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      durationMs: parsed.data.durationMs,
      source: parsed.data.source,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(entry, { status: 201 });
}
