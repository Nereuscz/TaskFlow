import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Invalidate existing tokens
  await prisma.passwordResetToken.updateMany({
    where: { email: parsed.data.email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = await prisma.passwordResetToken.create({
    data: {
      email: parsed.data.email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // In production, send an email here. For now, log the token.
  console.log(`[Password Reset] Token for ${parsed.data.email}: ${token.token}`);
  console.log(`[Password Reset] Reset link: /reset-password/${token.token}`);

  return NextResponse.json({ success: true });
}
