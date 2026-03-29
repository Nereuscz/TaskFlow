import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations/project";

const DEFAULT_COLUMNS = [
  { name: "To Do", order: 1000 },
  { name: "In Progress", order: 2000 },
  { name: "In Review", order: 3000 },
  { name: "Done", order: 4000 },
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { workspaceId: session.user.workspaceId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tasks: { where: { archivedAt: null } } } },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.workspaceId) {
    return NextResponse.json({ error: "No workspace found for this user" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        workspaceId: session.user.workspaceId,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
      include: { columns: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[projects/POST]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
