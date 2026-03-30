import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function getTaskOrFail(taskId: string, workspaceId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
  });
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

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "task-uploads", taskId);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.name);
  const storedFilename = `${randomUUID()}${ext}`;
  const filePath = path.join(uploadDir, storedFilename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      name: file.name,
      filename: storedFilename,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
