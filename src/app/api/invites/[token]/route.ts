import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ invalid: true });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ expired: true });
  }

  return NextResponse.json({
    email: invite.email,
    workspaceName: invite.workspace.name,
  });
}
