"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to send reset email");
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 border border-border/60 rounded-2xl bg-card shadow-sm">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
              <Mail className="h-6 w-6 text-primary" />
            </div>
              <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account with that email exists, we&apos;ve sent a password reset link.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
