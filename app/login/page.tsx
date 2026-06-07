"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupAllowed, setSignupAllowed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === "CredentialsSignin" ? "Invalid email or password." : null,
  );
  const [success, setSuccess] = useState<string | null>(null);

  // Check if signup is allowed (no users yet)
  useEffect(() => {
    fetch("/api/auth/signup")
      .then((r) => r.json())
      .then((d) => { if (d.signupAllowed) { setSignupAllowed(true); setMode("signup"); } })
      .catch(() => {});
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account.");
        return;
      }

      setSuccess("Account created! Signing you in...");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created but sign-in failed. Try signing in manually.");
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-tight">
            <span className="font-semibold text-brand-textPrimary">Sales.io</span>
            <span className="text-brand-textFaint font-light ml-1">OS</span>
          </h1>
          <p className="mt-2 text-sm text-brand-textMuted">
            {mode === "signin" ? "Sign in to your dashboard" : "Create your account"}
          </p>
        </div>

        {/* Tabs — only show when signup is allowed */}
        {signupAllowed && (
        <div className="flex rounded-lg border border-brand-border overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-brand-elevated text-brand-textPrimary"
                : "text-brand-textMuted hover:text-brand-textSecondary"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-brand-elevated text-brand-textPrimary"
                : "text-brand-textMuted hover:text-brand-textSecondary"
            }`}
          >
            Sign Up
          </button>
        </div>
        )}

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-brand-negative/30 bg-brand-negative/10 px-4 py-3 text-sm text-brand-negative">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-brand-positive/30 bg-brand-positive/10 px-4 py-3 text-sm text-brand-positive">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-brand-textMuted">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-brand-textMuted">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-brand-textMuted">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Your password" : "Min 8 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent text-black hover:bg-brand-accent/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
