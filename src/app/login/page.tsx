"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function normalizeRedirect(target: string | null): string | null {
  if (!target) {
    return null;
  }

  if (!target.startsWith("/") || target.startsWith("//")) {
    return null;
  }

  return target;
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const error = payload as { error?: { message?: string } };
  if (error.error?.message) {
    return error.error.message;
  }

  return fallback;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTarget = useMemo(() => normalizeRedirect(searchParams.get("next")), [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        let parsed: unknown = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = null;
        }

        setErrorMessage(resolveErrorMessage(parsed, "Unable to sign in."));
        return;
      }

      window.location.assign(redirectTarget ?? "/playground");
    } catch {
      setErrorMessage("Unable to reach the auth service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-100">
      {/* Background decorations */}
      <div className="animate-glow-pulse pointer-events-none fixed left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#9fdd58]/8 blur-[120px]" />
      <div className="animate-glow-pulse delay-500 pointer-events-none fixed bottom-0 right-0 h-[400px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-[#3a5f95]/15 blur-[100px]" />

      <main className="animate-fade-in-up relative mx-auto w-full max-w-[460px]">
        {/* Logo + back link */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={36} height={36} className="h-9 w-9" />
            <span className="font-display text-base tracking-wide text-slate-300 transition group-hover:text-slate-100">
              WAY Auth
            </span>
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            Back to home
          </Link>
        </div>

        {/* Login card */}
        <div className="animate-fade-in-up delay-100 relative overflow-hidden rounded-3xl border border-slate-600/20 bg-[linear-gradient(155deg,rgba(12,20,34,0.97),rgba(18,30,52,0.85))] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
          {/* Subtle top accent line */}
          <div className="absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-[#9fdd58]/30 to-transparent" />

          <div className="mb-8">
            <h1 className="font-display text-3xl tracking-tight">Sign in</h1>
            <p className="mt-2 text-sm text-slate-400">
              Authenticate to access the API playground and protected tools.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-600/30 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#9fdd58]/40 focus:shadow-[0_0_0_3px_rgba(159,221,88,0.08)]"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-600/30 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#9fdd58]/40 focus:shadow-[0_0_0_3px_rgba(159,221,88,0.08)]"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {errorMessage ? (
              <div className="animate-fade-in flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#9fdd58] px-5 py-3.5 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] hover:shadow-[0_0_30px_rgba(159,221,88,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700/40" />
            <span className="text-[11px] uppercase tracking-widest text-slate-500">Info</span>
            <div className="h-px flex-1 bg-slate-700/40" />
          </div>

          {/* Info cards */}
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-700/25 bg-slate-950/30 p-4 text-sm">
              <p className="font-medium text-slate-200">Need a test account?</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Use the signup API with the{" "}
                <span className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                  x-way-signup-secret
                </span>{" "}
                header to create a user, then sign in here.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/25 bg-slate-950/30 p-4 text-sm">
              <p className="font-medium text-slate-200">After sign in</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                You&apos;ll be redirected to the API playground where you can test the full auth flow in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Footer subtle text */}
        <p className="animate-fade-in delay-300 mt-6 text-center text-[11px] text-slate-500">
          Login sets an HttpOnly refresh cookie to maintain your session.
        </p>
      </main>
    </div>
  );
}
