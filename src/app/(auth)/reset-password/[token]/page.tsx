"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border border-border/60 rounded-2xl bg-card shadow-sm">
        {success ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Password reset</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully. Redirecting to sign in…
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
              <p className="text-sm text-muted-foreground">Enter your new password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting…" : "Reset password"}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
