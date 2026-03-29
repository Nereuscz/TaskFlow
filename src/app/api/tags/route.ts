import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tags = await prisma.tag.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, color } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.tag.findUnique({
    where: { workspaceId_name: { workspaceId: session.user.workspaceId, name: name.trim() } },
  });
  if (existing) return NextResponse.json({ error: "Tag already exists" }, { status: 409 });

  const tag = await prisma.tag.create({
    data: {
      name: name.trim(),
      color: typeof color === "string" ? color : "#64748b",
      workspaceId: session.user.workspaceId,
    },
  });

  return NextResponse.json(tag, { status: 201 });
}
