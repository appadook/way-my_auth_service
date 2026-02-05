"use client";

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
    <div className="min-h-screen px-6 py-10 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-600/40 bg-slate-900/60 px-6 py-4">
          <div>
            <p className="text-xs uppercase text-slate-300">Admin</p>
            <h1 className="font-display text-2xl">CORS Origins</h1>
            <p className="mt-1 text-sm text-slate-300">
              Manage which external origins are allowed to call this auth service with credentials.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-500/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#9fdd58]/60"
            >
              Landing
            </Link>
            <Link
              href="/playground"
              className="rounded-lg border border-slate-500/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#9fdd58]/60"
            >
              Playground
            </Link>
            <Link
              href="/admin/cors"
              className="rounded-lg border border-[#9fdd58]/55 bg-[#9fdd58]/15 px-4 py-2 text-xs font-semibold text-slate-100"
            >
              CORS Admin
            </Link>
          </nav>
        </header>

        <section className="rounded-3xl border border-slate-600/40 bg-slate-900/55 p-6">
          <h2 className="font-display text-xl text-[#c8ef97]">Add Origin</h2>
          <p className="mt-2 text-sm text-slate-300">
            Use full origins only, such as <span className="font-mono">https://app.example.com</span>.
          </p>

          <form onSubmit={handleAddOrigin} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={originInput}
              onChange={(event) => setOriginInput(event.target.value)}
              placeholder="https://app.example.com"
              className="flex-1 rounded-xl border border-slate-600/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#9fdd58]/60"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#9fdd58] px-5 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Add origin
            </button>
          </form>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-600/40 bg-slate-900/55 p-6">
          <h2 className="font-display text-xl text-[#c8ef97]">Allowed Origins</h2>
          {sortedOrigins.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">
              No origins added yet. Same-origin requests still work; add external origins for cross-origin clients.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-100/90">
              {sortedOrigins.map((origin) => (
                <li
                  key={origin.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm text-slate-100">{origin.origin}</p>
                    <p className="text-xs text-slate-400">
                      Added {formatTimestamp(origin.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOrigin(origin.id)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-slate-500/40 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-red-400/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
