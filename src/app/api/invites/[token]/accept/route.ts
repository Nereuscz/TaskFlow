import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ error: "Invalid or already used invite." }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 400 });
  }

  const { name, password, mode } = await req.json();

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (mode === "signup" || !user) {
    if (user) {
      return NextResponse.json({ error: "An account with this email already exists. Use sign in." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: { name, email: invite.email, password: hashed },
    });
  } else {
    // Verify existing password
    if (!user.password) {
      return NextResponse.json({ error: "Use OAuth to sign in." }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
  }

  // Add to workspace
  const existing = await prisma.workspaceUser.findFirst({
    where: { workspaceId: invite.workspaceId, userId: user.id },
  });

  if (!existing) {
    await prisma.workspaceUser.create({
      data: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
    });
  }

  // Mark invite accepted
  await prisma.invite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
