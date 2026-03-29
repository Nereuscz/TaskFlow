"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InviteData = {
  email: string;
  workspaceName: string;
  expired?: boolean;
  invalid?: boolean;
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then(setInvite)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, mode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      // Sign in after accepting
      const result = await signIn("credentials", {
        email: invite!.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created, but login failed. Please sign in manually.");
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading invite…</p>
      </div>
    );
  }

  if (!invite || invite.invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Invalid invite</h1>
          <p className="text-muted-foreground text-sm">This invite link is invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Invite expired</h1>
          <p className="text-muted-foreground text-sm">Ask the workspace admin to send a new invite.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border rounded-xl bg-card shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Join {invite.workspaceName}</h1>
          <p className="text-sm text-muted-foreground">
            You were invited as <strong>{invite.email}</strong>
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={mode === "login" ? "Your existing password" : "Choose a password"}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Joining…" : "Accept invite"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            className="underline"
          >
            {mode === "signup" ? "Sign in instead" : "Create new account"}
          </button>
        </p>
      </div>
    </div>
  );
}
