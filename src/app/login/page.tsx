"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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
    <div className="min-h-screen px-6 py-10 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between rounded-2xl border border-slate-600/40 bg-slate-900/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={40} height={40} className="h-10 w-10" />
            <div>
              <p className="text-xs uppercase text-slate-300">WAY Auth Service</p>
              <p className="font-display text-lg">Sign in to continue</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-500/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#9fdd58]/60"
          >
            Back to landing
          </Link>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-600/40 bg-[linear-gradient(135deg,rgba(12,20,34,0.95),rgba(22,34,58,0.85))] p-8 shadow-[0_22px_60px_rgba(2,6,23,0.45)]">
            <h1 className="font-display text-3xl">WAY Auth Console</h1>
            <p className="mt-3 text-sm text-slate-200/90">
              Authenticate to access protected tools like the API playground. This page uses the same auth service you are
              testing.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-300" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-600/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#9fdd58]/60"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-300" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-600/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#9fdd58]/60"
                  placeholder="password"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#9fdd58] px-5 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <aside className="flex h-full flex-col gap-6 rounded-3xl border border-slate-500/40 bg-slate-900/50 p-6">
            <div className="rounded-2xl border border-slate-600/40 bg-slate-950/40 p-5 text-sm text-slate-200/90">
              <p className="font-semibold text-slate-100">Need a test account?</p>
              <p className="mt-2">
                Use the signup API (curl/Postman) with the signup secret header to create a user, then log in here.
              </p>
              <p className="mt-3 text-xs text-slate-300">
                The login endpoint sets the HttpOnly refresh cookie used to unlock protected pages.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-600/40 bg-slate-950/40 p-5 text-sm text-slate-200/90">
              <p className="font-semibold text-slate-100">After login</p>
              <p className="mt-2">
                You will be redirected to the API playground so you can run the full auth flow tests.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-600/40 bg-slate-950/40 p-5">
              <Image
                src="/way-asset-marketing-1.png"
                alt="JWT security illustration"
                width={520}
                height={280}
                className="h-auto w-full"
              />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
