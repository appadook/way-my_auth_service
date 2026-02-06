"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type CorsOriginItem = {
  id: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialOrigins: CorsOriginItem[];
};

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function CorsAdminClient({ initialOrigins }: Props) {
  const [origins, setOrigins] = useState<CorsOriginItem[]>(initialOrigins);
  const [originInput, setOriginInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedOrigins = useMemo(
    () => [...origins].sort((a, b) => a.origin.localeCompare(b.origin)),
    [origins],
  );

  async function handleAddOrigin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!originInput.trim()) {
      setErrorMessage("Origin is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/v1/admin/cors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ origin: originInput.trim() }),
      });

      const payloadText = await response.text();
      let payload: { origin?: CorsOriginItem; error?: { message?: string } } | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as { origin?: CorsOriginItem; error?: { message?: string } }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to add origin.");
        return;
      }

      if (payload?.origin) {
        setOrigins((prev) => {
          const existing = prev.find((item) => item.id === payload.origin!.id);
          if (existing) {
            return prev.map((item) => (item.id === payload.origin!.id ? payload.origin! : item));
          }
          return [...prev, payload.origin!];
        });
      }

      setOriginInput("");
      setSuccessMessage("Origin added.");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveOrigin(originId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/cors/${originId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setErrorMessage(payload?.error?.message ?? "Failed to remove origin.");
        return;
      }

      setOrigins((prev) => prev.filter((item) => item.id !== originId));
      setSuccessMessage("Origin removed.");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 text-slate-100 md:px-8 md:py-12">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* ── Nav ── */}
        <nav className="animate-fade-in-up glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={36} height={36} className="h-9 w-9" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Admin</p>
              <p className="font-display text-base tracking-wide">CORS Origins</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Home
            </Link>
            <Link
              href="/playground"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Playground
            </Link>
            <Link
              href="/admin/cors"
              className="rounded-lg border border-[#9fdd58]/25 bg-[#9fdd58]/8 px-3 py-2 text-xs font-semibold text-[#c8ef97]"
            >
              CORS Admin
            </Link>
            <Link
              href="/admin/sessions"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Sessions
            </Link>
          </div>
        </nav>

        {/* ── Description ── */}
        <div className="animate-fade-in-up delay-100 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          <p className="text-sm leading-relaxed text-slate-300/90">
            Manage which external origins can call this auth service with credentials.
            Same-origin requests always work. Add origins for cross-origin browser clients.
          </p>
        </div>

        {/* ── Add origin ── */}
        <section className="animate-fade-in-up delay-200 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          <h2 className="font-display flex items-center gap-3 text-xl tracking-wide text-[#c8ef97]">
            <span className="h-5 w-1 rounded-full bg-[#9fdd58]/50" />
            Add Origin
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Full origins only, e.g. <span className="rounded bg-slate-800/50 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">https://app.example.com</span>
          </p>

          <form onSubmit={handleAddOrigin} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={originInput}
              onChange={(event) => setOriginInput(event.target.value)}
              placeholder="https://app.example.com"
              className="flex-1 rounded-xl border border-slate-600/30 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#9fdd58]/40 focus:shadow-[0_0_0_3px_rgba(159,221,88,0.08)]"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#9fdd58] px-6 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] hover:shadow-[0_0_20px_rgba(159,221,88,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add origin
            </button>
          </form>

          {errorMessage ? (
            <div className="animate-fade-in mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-950/20 px-4 py-3 text-sm text-red-200">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="animate-fade-in mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          ) : null}
        </section>

        {/* ── Origins list ── */}
        <section className="animate-fade-in-up delay-300 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          <h2 className="font-display flex items-center gap-3 text-xl tracking-wide text-[#c8ef97]">
            <span className="h-5 w-1 rounded-full bg-[#9fdd58]/50" />
            Allowed Origins
          </h2>

          {sortedOrigins.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-700/30 bg-slate-950/20 p-8 text-center">
              <p className="text-sm text-slate-400">No origins added yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Same-origin requests still work. Add external origins for cross-origin clients.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {sortedOrigins.map((origin) => (
                <li
                  key={origin.id}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-700/15 bg-slate-950/25 px-5 py-4 transition hover:border-slate-600/25 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-slate-200">{origin.origin}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Added {formatTimestamp(origin.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOrigin(origin.id)}
                    disabled={isSubmitting}
                    className="shrink-0 rounded-lg border border-slate-600/25 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[11px] text-slate-500">
            {sortedOrigins.length} origin{sortedOrigins.length !== 1 ? "s" : ""} configured
          </p>
        </section>
      </main>
    </div>
  );
}
