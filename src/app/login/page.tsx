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
    <div className="grid-bg flex min-h-screen items-center justify-center px-4 py-10 text-[#e0eaf3]">
      {/* Ambient glow */}
      <div className="animate-glow-pulse pointer-events-none fixed left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9fdd58]/5 blur-[120px]" />

      <main className="animate-fade-in-up relative mx-auto w-full max-w-[440px]">
        {/* Back nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={24} height={24} className="h-6 w-6" />
            <span className="font-display text-xs tracking-widest text-slate-400 transition group-hover:text-[#9fdd58]">
              WAY Auth
            </span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-[#9fdd58]"
          >
            &larr; Back
          </Link>
        </div>

        {/* Login card */}
        <div className="hud-panel relative rounded-none p-7">
          {/* Top accent */}
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9fdd58]/30 to-transparent" />

          <div className="mb-6 flex items-center gap-3">
            <div className="h-3 w-px bg-[#9fdd58]/40" />
            <h1 className="font-display text-lg tracking-[0.15em] text-[#e0eaf3]">Authenticate</h1>
          </div>

          <p className="mb-6 text-xs text-slate-500">
            Sign in to access protected endpoints and the API playground.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border border-[#9fdd58]/10 bg-[#050a0f] px-4 py-2.5 font-mono text-sm text-[#e0eaf3] outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-[#9fdd58]/10 bg-[#050a0f] px-4 py-2.5 font-mono text-sm text-[#e0eaf3] outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {errorMessage ? (
              <div className="animate-fade-in flex items-start gap-2 border border-red-500/20 bg-red-950/20 px-3 py-2.5 font-mono text-xs text-red-300">
                <span className="mt-px font-bold text-red-400">ERR</span>
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-[#9fdd58]/40 bg-[#9fdd58] py-3 font-mono text-xs font-bold uppercase tracking-widest text-[#050a0f] transition hover:shadow-[0_0_25px_rgba(159,221,88,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="hud-divider my-6" />

          {/* Info blocks */}
          <div className="space-y-3">
            <div className="border-l-2 border-[#9fdd58]/15 bg-[#050a0f]/50 py-2.5 pl-3 pr-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">Test Account</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Use the signup API with the{" "}
                <span className="font-mono text-slate-400">x-way-signup-secret</span>{" "}
                header to create a user, then sign in here.
              </p>
            </div>

            <div className="border-l-2 border-[#3a5f95]/20 bg-[#050a0f]/50 py-2.5 pl-3 pr-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">After Sign In</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                You&apos;ll be redirected to the API playground where you can test the full auth flow.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="animate-fade-in delay-200 mt-4 text-center font-mono text-[9px] uppercase tracking-widest text-slate-600">
          HttpOnly refresh cookie &middot; Session-based auth
        </p>
      </main>
    </div>
  );
}
