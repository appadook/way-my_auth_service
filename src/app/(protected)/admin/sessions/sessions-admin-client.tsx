"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type SessionStatus = "active" | "revoked" | "expired" | "rotated";

type AdminSession = {
  id: string;
  user: {
    id: string;
    email: string;
  };
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedBySessionId: string | null;
  status: SessionStatus;
};

type Props = {
  initialSessions: AdminSession[];
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  active: "Active",
  revoked: "Revoked",
  expired: "Expired",
  rotated: "Rotated",
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusStyles(status: SessionStatus): string {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "revoked":
      return "border-red-500/20 bg-red-500/10 text-red-200";
    case "expired":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "rotated":
      return "border-sky-500/20 bg-sky-500/10 text-sky-200";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-200";
  }
}

export default function SessionsAdminClient({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<AdminSession[]>(initialSessions);
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sessions.filter((session) => {
      if (statusFilter !== "all" && session.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        session.id.toLowerCase().includes(query) ||
        session.user.email.toLowerCase().includes(query) ||
        session.user.id.toLowerCase().includes(query)
      );
    });
  }, [sessions, searchQuery, statusFilter]);

  async function handleRevoke(sessionId: string) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const payloadText = await response.text();
      let payload: { session?: AdminSession; error?: { message?: string } } | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as { session?: AdminSession; error?: { message?: string } }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to revoke session.");
        return;
      }

      if (payload?.session) {
        setSessions((prev) => prev.map((item) => (item.id === sessionId ? payload.session! : item)));
      }

      setSuccessMessage("Session revoked.");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-8 text-slate-100 md:px-8 md:py-12">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <nav className="animate-fade-in-up glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={36} height={36} className="h-9 w-9" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Admin</p>
              <p className="font-display text-base tracking-wide">Sessions</p>
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
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              CORS Admin
            </Link>
            <Link
              href="/admin/sessions"
              className="rounded-lg border border-[#9fdd58]/25 bg-[#9fdd58]/8 px-3 py-2 text-xs font-semibold text-[#c8ef97]"
            >
              Sessions
            </Link>
          </div>
        </nav>

        <div className="animate-fade-in-up delay-100 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          <p className="text-sm leading-relaxed text-slate-300/90">
            Inspect active and historical refresh sessions. Use this page to revoke sessions for specific users or
            clean up compromised sessions.
          </p>
        </div>

        <section className="animate-fade-in-up delay-200 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | SessionStatus)}
                  className="mt-2 w-full rounded-lg border border-slate-600/30 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="rotated">Rotated</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Search
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by email or session id"
                  className="mt-2 w-full rounded-lg border border-slate-600/30 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
            <div className="text-xs text-slate-500">
              {filteredSessions.length} of {sessions.length} sessions
            </div>
          </div>

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

        <section className="animate-fade-in-up delay-300 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6">
          {filteredSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/30 bg-slate-950/20 p-8 text-center">
              <p className="text-sm text-slate-400">No sessions match the current filters.</p>
              <p className="mt-1 text-xs text-slate-500">Try clearing filters or searching with a user email.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-700/15 bg-slate-950/25 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${statusStyles(session.status)}`}>
                        {STATUS_LABELS[session.status]}
                      </span>
                      <span className="font-mono text-xs text-slate-400">{session.id}</span>
                    </div>
                    <p className="text-sm text-slate-200">
                      {session.user.email} <span className="text-xs text-slate-500">({session.user.id})</span>
                    </p>
                    <div className="grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                      <div>Created: {formatTimestamp(session.createdAt)}</div>
                      <div>Expires: {formatTimestamp(session.expiresAt)}</div>
                      <div>Revoked: {formatTimestamp(session.revokedAt)}</div>
                      <div>Rotated To: {session.replacedBySessionId ?? "-"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRevoke(session.id)}
                      disabled={isSubmitting || session.status !== "active"}
                      className="rounded-lg border border-slate-600/25 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
