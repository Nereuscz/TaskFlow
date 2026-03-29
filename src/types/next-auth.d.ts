import { WorkspaceRole } from "@prisma/client";
import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string;
      role: WorkspaceRole;
      workspaceName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    workspaceId?: string | null;
    role?: WorkspaceRole | null;
    workspaceName?: string | null;
  }
}
