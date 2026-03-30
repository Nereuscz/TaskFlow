import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function getProjectOrFail(projectId: string, workspaceId: string) {
  return prisma.project.findFirst({ where: { id: projectId, workspaceId } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProjectOrFail(projectId, session.user.workspaceId);
  if (!project || !project.coverImage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "project-covers", project.coverImage);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(project.coverImage).toLowerCase().slice(1);
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif",
  };

  const buffer = await readFile(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeMap[ext] ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await getProjectOrFail(projectId, session.user.workspaceId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "project-covers");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  // Remove old cover if exists
  if (project.coverImage) {
    const oldPath = path.join(dir, project.coverImage);
    if (existsSync(oldPath)) await unlink(oldPath).catch(() => null);
  }

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const filePath = path.join(dir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  await prisma.project.update({
    where: { id: projectId },
    data: { coverImage: filename },
  });

  return NextResponse.json({ coverImage: filename }, { status: 201 });
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

  if (project.coverImage) {
    const filePath = path.join(process.cwd(), "project-covers", project.coverImage);
    if (existsSync(filePath)) await unlink(filePath).catch(() => null);
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { coverImage: null },
  });

  return new NextResponse(null, { status: 204 });
}
