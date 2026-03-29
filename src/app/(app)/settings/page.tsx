"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [workspaceName, setWorkspaceName] = useState(session?.user.workspaceName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Workspace updated");
    } catch {
      toast.error("Failed to update workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="border rounded-xl p-6 bg-card space-y-4">
        <h2 className="text-sm font-medium">Workspace</h2>
        <div className="space-y-2">
          <Label htmlFor="ws-name">Workspace name</Label>
          <Input
            id="ws-name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={saving || !workspaceName.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="border rounded-xl p-6 bg-card space-y-2">
        <h2 className="text-sm font-medium">Account</h2>
        <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        <p className="text-xs text-muted-foreground capitalize">
          Role: {session?.user.role?.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
