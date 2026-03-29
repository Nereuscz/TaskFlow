import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { WorkspaceRole } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) return null;

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // Only runs on initial sign-in; fetch workspace data once and embed in token
        const workspaceUser = await prisma.workspaceUser.findFirst({
          where: { userId: user.id },
          orderBy: { joinedAt: "asc" },
          include: { workspace: true },
        });

        token.id = user.id;
        token.workspaceId = workspaceUser?.workspaceId ?? null;
        token.role = (workspaceUser?.role ?? null) as WorkspaceRole | null;
        token.workspaceName = workspaceUser?.workspace.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string;
        session.user.role = token.role as WorkspaceRole;
        session.user.workspaceName = token.workspaceName as string;
      }
      return session;
    },
  },
});
