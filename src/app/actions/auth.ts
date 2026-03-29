"use server";

import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";

export async function signup(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password, workspaceName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const slug = workspaceName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, password: hashedPassword },
    });

    const workspace = await tx.workspace.create({
      data: { name: workspaceName, slug },
    });

    await tx.workspaceUser.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
    });
  });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}
