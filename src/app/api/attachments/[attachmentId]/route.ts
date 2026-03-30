import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

async function getAttachmentOrFail(attachmentId: string, workspaceId: string) {
  return prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      task: { project: { workspaceId } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attachmentId } = await params;
  const attachment = await getAttachmentOrFail(attachmentId, session.user.workspaceId);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(process.cwd(), "task-uploads", attachment.taskId, attachment.filename);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const fileBuffer = await readFile(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.name)}"`,
      "Content-Length": String(fileBuffer.length),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attachmentId } = await params;
  const attachment = await getAttachmentOrFail(attachmentId, session.user.workspaceId);
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(process.cwd(), "task-uploads", attachment.taskId, attachment.filename);
  if (existsSync(filePath)) {
    await unlink(filePath).catch(() => null);
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  return new NextResponse(null, { status: 204 });
}
