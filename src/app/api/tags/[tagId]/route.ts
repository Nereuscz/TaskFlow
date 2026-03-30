import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTagOrFail(tagId: string, workspaceId: string) {
  return prisma.tag.findFirst({
    where: { id: tagId, workspaceId },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tagId } = await params;
  const tag = await getTagOrFail(tagId, session.user.workspaceId);
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, color } = body as { name?: string; color?: string };

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const conflict = await prisma.tag.findFirst({
      where: { workspaceId: session.user.workspaceId, name: trimmed, NOT: { id: tagId } },
    });
    if (conflict) return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
  }

  const updated = await prisma.tag.update({
    where: { id: tagId },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(color !== undefined ? { color } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tagId } = await params;
  const tag = await getTagOrFail(tagId, session.user.workspaceId);
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tag.delete({ where: { id: tagId } });
  return new NextResponse(null, { status: 204 });
}
