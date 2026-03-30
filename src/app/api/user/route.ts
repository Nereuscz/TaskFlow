import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) return false;
    return true;
  },
  { message: "Current password is required to set a new password" }
);

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updateData: { name?: string; password?: string } = {};

  if (parsed.data.name) {
    updateData.name = parsed.data.name;
  }

  if (parsed.data.newPassword && parsed.data.currentPassword) {
    if (!user.password) {
      return NextResponse.json(
        { error: "Cannot change password for OAuth accounts" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    updateData.password = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}
