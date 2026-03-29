import { WorkspaceRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

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
