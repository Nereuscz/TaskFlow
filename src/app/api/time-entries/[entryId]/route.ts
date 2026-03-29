import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTimeEntrySchema } from "@/lib/validations/time-entry";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;

  const entry = await prisma.timeEntry.findFirst({
    where: { id: entryId, userId: session.user.id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateTimeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : undefined;
  const durationMs =
    parsed.data.durationMs ??
    (endedAt ? endedAt.getTime() - entry.startedAt.getTime() : undefined);

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      ...parsed.data,
      endedAt,
      durationMs,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;

  const entry = await prisma.timeEntry.findFirst({
    where: { id: entryId, userId: session.user.id },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.timeEntry.delete({ where: { id: entryId } });
  return new NextResponse(null, { status: 204 });
}
