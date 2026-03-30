"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState(session?.user.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleUpdateName() {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      toast.success("Name updated");
      updateSession();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground transition-colors">
            Settings
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Profile</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </div>

      {/* Name */}
      <div className="border border-border/60 rounded-xl p-6 bg-card shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Personal information</h2>
        <div className="space-y-2">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={session?.user.email ?? ""} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>
        <Button onClick={handleUpdateName} disabled={savingName || !name.trim()}>
          {savingName ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <Separator />

      {/* Change password */}
      <div className="border border-border/60 rounded-xl p-6 bg-card shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={savingPassword || !currentPassword || !newPassword}>
            {savingPassword ? "Changing…" : "Change password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
