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
    <div className="grid-bg min-h-screen px-4 py-6 text-[#e0eaf3] md:px-6 md:py-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {/* ── Nav ── */}
        <nav className="animate-fade-in-up hud-panel flex flex-wrap items-center justify-between gap-3 rounded-none px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={28} height={28} className="h-7 w-7" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">Admin</p>
              <p className="font-display text-sm tracking-widest">CORS Origins</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Link href="/" className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-[#9fdd58]">
              Home
            </Link>
            <Link href="/playground" className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-[#9fdd58]">
              Playground
            </Link>
            <Link
              href="/admin/cors"
              className="border border-[#9fdd58]/25 bg-[#9fdd58]/8 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9fdd58]"
            >
              CORS
            </Link>
            <Link href="/admin/sessions" className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-[#9fdd58]">
              Sessions
            </Link>
          </div>
        </nav>

        {/* ── Description ── */}
        <div className="animate-fade-in-up delay-100 border-l-2 border-[#9fdd58]/10 bg-[#0a1018]/90 py-2.5 pl-3 pr-3">
          <p className="text-xs text-slate-500">
            Manage which external origins can call this auth service with credentials.
            Same-origin requests always work. Add origins for cross-origin browser clients.
          </p>
        </div>

        {/* ── Add origin ── */}
        <section className="animate-fade-in-up delay-200 hud-panel rounded-none p-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-px bg-[#9fdd58]/40" />
            <h2 className="font-display text-xs tracking-[0.2em] text-slate-300">Add Origin</h2>
          </div>
          <p className="mt-2 pl-[19px] font-mono text-[10px] text-slate-600">
            Full origins only, e.g. <span className="text-slate-400">https://app.example.com</span>
          </p>

          <form onSubmit={handleAddOrigin} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={originInput}
              onChange={(event) => setOriginInput(event.target.value)}
              placeholder="https://app.example.com"
              className="flex-1 border border-[#9fdd58]/10 bg-[#050a0f] px-4 py-2.5 font-mono text-xs text-[#e0eaf3] outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="border border-[#9fdd58]/40 bg-[#9fdd58] px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#050a0f] transition hover:shadow-[0_0_20px_rgba(159,221,88,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add origin
            </button>
          </form>

          {errorMessage ? (
            <div className="animate-fade-in mt-4 flex items-start gap-2 border-l-2 border-red-500/20 bg-red-950/10 py-2 pl-3 font-mono text-xs text-red-300">
              <span className="font-bold text-red-400">ERR</span>
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="animate-fade-in mt-4 flex items-start gap-2 border-l-2 border-emerald-500/20 bg-emerald-950/10 py-2 pl-3 font-mono text-xs text-emerald-300">
              <span className="font-bold text-emerald-400">OK</span>
              {successMessage}
            </div>
          ) : null}
        </section>

        {/* ── Origins list ── */}
        <section className="animate-fade-in-up delay-300 hud-panel rounded-none p-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-px bg-[#9fdd58]/40" />
            <h2 className="font-display text-xs tracking-[0.2em] text-slate-300">Allowed Origins</h2>
            <span className="h-px flex-1 bg-[#9fdd58]/8" />
            <span className="font-mono text-[9px] text-slate-600">
              {sortedOrigins.length} origin{sortedOrigins.length !== 1 ? "s" : ""}
            </span>
          </div>

          {sortedOrigins.length === 0 ? (
            <div className="mt-5 border border-dashed border-[#9fdd58]/10 bg-[#050a0f]/50 p-6 text-center">
              <p className="font-mono text-[10px] text-slate-500">No origins added yet.</p>
              <p className="mt-1 font-mono text-[9px] text-slate-600">
                Same-origin requests still work. Add external origins for cross-origin clients.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-px">
              {sortedOrigins.map((origin) => (
                <div
                  key={origin.id}
                  className="group flex flex-col gap-3 border border-[#9fdd58]/6 bg-[#050a0f]/60 px-4 py-3 transition hover:border-[#9fdd58]/12 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-slate-300">{origin.origin}</p>
                    <p className="mt-1 font-mono text-[9px] text-slate-600">
                      Added {formatTimestamp(origin.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOrigin(origin.id)}
                    disabled={isSubmitting}
                    className="shrink-0 border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-red-500/25 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
