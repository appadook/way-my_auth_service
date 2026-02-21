"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/top-nav";

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
  initialCurrentPage: number;
  initialPageSize: number;
  initialTotalCount: number;
  initialTotalPages: number;
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
      return "border-emerald-500/20 text-emerald-400";
    case "revoked":
      return "border-red-500/20 text-red-400";
    case "expired":
      return "border-amber-500/20 text-amber-400";
    case "rotated":
      return "border-sky-500/20 text-sky-400";
    default:
      return "border-slate-500/20 text-slate-400";
  }
}

type SessionsPagePayload = {
  sessions: AdminSession[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  error?: { message?: string };
};

export default function SessionsAdminClient({
  initialSessions,
  initialCurrentPage,
  initialPageSize,
  initialTotalCount,
  initialTotalPages,
}: Props) {
  const [sessions, setSessions] = useState<AdminSession[]>(initialSessions);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [pageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [statusFilter, setStatusFilter] = useState<"all" | SessionStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
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

  async function loadPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    setIsLoadingPage(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/sessions?page=${page}&pageSize=${pageSize}`, {
        method: "GET",
        credentials: "include",
      });

      const payloadText = await response.text();
      let payload: SessionsPagePayload | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as SessionsPagePayload) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload) {
        setErrorMessage(payload?.error?.message ?? "Failed to load sessions.");
        return;
      }

      setSessions(payload.sessions);
      setCurrentPage(payload.currentPage);
      setTotalCount(payload.totalCount);
      setTotalPages(payload.totalPages);
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsLoadingPage(false);
    }
  }

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
    <div className="grid-bg min-h-screen px-4 py-6 text-[#e0eaf3] md:px-6 md:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <TopNav className="animate-fade-in-up" />

        {/* ── Description ── */}
        <div className="animate-fade-in-up delay-100 border-l-2 border-[#9fdd58]/10 bg-[#0a1018]/90 py-2.5 pl-3 pr-3">
          <p className="text-xs text-slate-500">
            Inspect active and historical refresh sessions. Use this page to revoke sessions for specific users or
            clean up compromised sessions.
          </p>
        </div>

        {/* ── Filters ── */}
        <section className="animate-fade-in-up delay-200 hud-panel rounded-none p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row">
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | SessionStatus)}
                  className="w-full border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition focus:border-[#9fdd58]/30"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="rotated">Rotated</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label className="flex-1 space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">Search</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by email or session id"
                  className="w-full border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
                />
              </label>
            </div>
            <div className="font-mono text-[9px] text-slate-600">
              Page {currentPage} of {totalPages} | Showing {filteredSessions.length} of {sessions.length} on this page | Total {totalCount}
            </div>
          </div>

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

        {/* ── Sessions list ── */}
        <section className="animate-fade-in-up delay-300 hud-panel rounded-none p-5">
          <div className="mb-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => loadPage(currentPage - 1)}
              disabled={isLoadingPage || currentPage <= 1}
              className="border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-[#9fdd58]/30 hover:text-[#9fdd58] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => loadPage(currentPage + 1)}
              disabled={isLoadingPage || currentPage >= totalPages}
              className="border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-[#9fdd58]/30 hover:text-[#9fdd58] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>

          {isLoadingPage ? (
            <div className="mb-3 border border-[#9fdd58]/10 bg-[#050a0f]/50 p-3 font-mono text-[10px] text-slate-500">
              Loading page...
            </div>
          ) : null}

          {filteredSessions.length === 0 ? (
            <div className="border border-dashed border-[#9fdd58]/10 bg-[#050a0f]/50 p-6 text-center">
              <p className="font-mono text-[10px] text-slate-500">No sessions match the current filters.</p>
              <p className="mt-1 font-mono text-[9px] text-slate-600">Try clearing filters or searching with a user email.</p>
            </div>
          ) : (
            <div className="space-y-px">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-4 border border-[#9fdd58]/6 bg-[#050a0f]/60 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold ${statusStyles(session.status)}`}>
                        {STATUS_LABELS[session.status]}
                      </span>
                      <span className="font-mono text-[10px] text-slate-600">{session.id}</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {session.user.email} <span className="font-mono text-[10px] text-slate-600">({session.user.id})</span>
                    </p>
                    <div className="grid gap-1 font-mono text-[9px] text-slate-600 md:grid-cols-2">
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
                      className="border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-red-500/25 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
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
