import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    const isMember = await prisma.workspaceUser.findFirst({
      where: { workspaceId: session.user.workspaceId, userId: existingUser.id },
    });
    if (isMember) {
      return NextResponse.json({ error: "User is already a member." }, { status: 409 });
    }
  }

  // Create or refresh invite
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      email: parsed.data.email,
      workspaceId: session.user.workspaceId,
      invitedById: session.user.id,
      role: parsed.data.role,
      expiresAt,
    },
    include: { workspace: { select: { name: true } } },
  });

  // In production, send email here via Resend/nodemailer
  // For now, return the invite link in the response
  const inviteLink = `${process.env.AUTH_URL}/invite/${invite.token}`;

  console.log(`Invite link for ${parsed.data.email}: ${inviteLink}`);

  return NextResponse.json({
    success: true,
    inviteLink,
    message: `Invite created. Link: ${inviteLink}`,
  });
}
