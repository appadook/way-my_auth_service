"use client";

import { useMemo, useState } from "react";
import TopNav from "@/components/top-nav";

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  initialUsers: AdminUser[];
  initialCurrentPage: number;
  initialPageSize: number;
  initialTotalCount: number;
  initialTotalPages: number;
};

type UsersPagePayload = {
  users: AdminUser[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  error?: { message?: string };
};

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function UsersAdminClient({
  initialUsers,
  initialCurrentPage,
  initialPageSize,
  initialTotalCount,
  initialTotalPages,
}: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [pageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => user.email.toLowerCase().includes(query) || user.id.toLowerCase().includes(query));
  }, [searchQuery, users]);

  function resetMessages() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function loadPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }

    setIsLoadingPage(true);
    resetMessages();

    try {
      const response = await fetch(`/api/v1/admin/users?page=${page}&pageSize=${pageSize}`, {
        method: "GET",
        credentials: "include",
      });

      const payloadText = await response.text();
      let payload: UsersPagePayload | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as UsersPagePayload) : null;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload) {
        setErrorMessage(payload?.error?.message ?? "Failed to load users.");
        return;
      }

      setUsers(payload.users);
      setCurrentPage(payload.currentPage);
      setTotalCount(payload.totalCount);
      setTotalPages(payload.totalPages);
      setEditingUserId(null);
      setEditEmail("");
      setEditPassword("");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsLoadingPage(false);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const response = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
        }),
      });

      const payloadText = await response.text();
      let payload: { user?: AdminUser; error?: { message?: string } } | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as { user?: AdminUser; error?: { message?: string } }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to create user.");
        return;
      }

      if (payload?.user) {
        setUsers((prev) => [payload.user!, ...prev]);
      }
      setCreateEmail("");
      setCreatePassword("");
      setTotalCount((prev) => prev + 1);
      setSuccessMessage("User created.");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(user: AdminUser) {
    setEditingUserId(user.id);
    setEditEmail(user.email);
    setEditPassword("");
    resetMessages();
  }

  function cancelEditing() {
    setEditingUserId(null);
    setEditEmail("");
    setEditPassword("");
  }

  async function handleUpdateUser(userId: string) {
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = editEmail.trim();
    const trimmedPassword = editPassword.trim();
    if (!trimmedEmail && !trimmedPassword) {
      setErrorMessage("Provide an updated email or password.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...(trimmedEmail ? { email: trimmedEmail } : {}),
          ...(trimmedPassword ? { password: trimmedPassword } : {}),
        }),
      });

      const payloadText = await response.text();
      let payload: { user?: AdminUser; error?: { message?: string } } | null = null;
      try {
        payload = payloadText ? (JSON.parse(payloadText) as { user?: AdminUser; error?: { message?: string } }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to update user.");
        return;
      }

      if (payload?.user) {
        setUsers((prev) => prev.map((user) => (user.id === userId ? payload.user! : user)));
      }
      cancelEditing();
      setSuccessMessage("User updated.");
    } catch {
      setErrorMessage("Unable to reach the service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to delete user.");
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (editingUserId === userId) {
        cancelEditing();
      }
      setSuccessMessage("User deleted.");
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

        <div className="animate-fade-in-up delay-100 border-l-2 border-[#9fdd58]/10 bg-[#0a1018]/90 py-2.5 pl-3 pr-3">
          <p className="text-xs text-slate-500">
            Manage enrolled users directly. You can create accounts, update email/password credentials, and remove users.
          </p>
        </div>

        <section className="animate-fade-in-up delay-200 hud-panel rounded-none p-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-px bg-[#9fdd58]/40" />
            <h2 className="font-display text-xs tracking-[0.2em] text-slate-300">Create User</h2>
          </div>

          <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="email"
              required
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
              placeholder="user@example.com"
              className="border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
            />
            <input
              type="password"
              required
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder="minimum 8 characters"
              className="border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="border border-[#9fdd58]/40 bg-[#9fdd58] px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#050a0f] transition hover:shadow-[0_0_20px_rgba(159,221,88,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </section>

        <section className="animate-fade-in-up delay-300 hud-panel rounded-none p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <label className="flex-1 space-y-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-500">Search</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by email or user id"
                className="w-full border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
              />
            </label>
            <div className="font-mono text-[9px] text-slate-600">
              Page {currentPage} of {totalPages} | Showing {filteredUsers.length} of {users.length} on this page | Total {totalCount}
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

          <div className="my-3 flex items-center justify-end gap-2">
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

          {filteredUsers.length === 0 ? (
            <div className="border border-dashed border-[#9fdd58]/10 bg-[#050a0f]/50 p-6 text-center">
              <p className="font-mono text-[10px] text-slate-500">No users match the current filters.</p>
            </div>
          ) : (
            <div className="space-y-px">
              {filteredUsers.map((user) => {
                const isEditing = editingUserId === user.id;
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 border border-[#9fdd58]/6 bg-[#050a0f]/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[10px] text-slate-600">{user.id}</span>
                      <span className="font-mono text-[9px] text-slate-700">
                        Created {formatTimestamp(user.createdAt)}
                      </span>
                      <span className="font-mono text-[9px] text-slate-700">
                        Updated {formatTimestamp(user.updatedAt)}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(event) => setEditEmail(event.target.value)}
                          className="border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
                          placeholder="Updated email"
                        />
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(event) => setEditPassword(event.target.value)}
                          className="border border-[#9fdd58]/10 bg-[#050a0f] px-3 py-2 font-mono text-xs text-slate-200 outline-none transition placeholder:text-slate-700 focus:border-[#9fdd58]/30"
                          placeholder="New password (optional)"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateUser(user.id)}
                          disabled={isSubmitting}
                          className="border border-[#9fdd58]/25 bg-[#9fdd58]/8 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#9fdd58] transition hover:bg-[#9fdd58]/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSubmitting}
                          className="border border-[#9fdd58]/10 bg-transparent px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">{user.email}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(user)}
                            disabled={isSubmitting}
                            className="border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-[#9fdd58]/30 hover:text-[#9fdd58] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isSubmitting}
                            className="border border-[#9fdd58]/10 bg-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 transition hover:border-red-500/25 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
