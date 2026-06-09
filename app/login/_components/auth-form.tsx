"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  signupAllowed,
  googleAvailable,
}: {
  signupAllowed: boolean;
  googleAvailable: boolean;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">(
    signupAllowed ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === "CredentialsSignin" ? "Invalid email or password." : null,
  );
  const [success, setSuccess] = useState<string | null>(null);

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

      {/* Google OAuth */}
      {googleAvailable && mode === "signin" && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-brand-border" />
            <span className="text-[11px] text-brand-textFaint">or</span>
            <div className="flex-1 h-px bg-brand-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full gap-2 text-brand-textSecondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>
        </>
      )}
    </div>
  );
}
