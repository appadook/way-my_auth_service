import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const endpoints = [
    { method: "POST", path: "/api/v1/signup", desc: "Create account", status: "operational" },
    { method: "POST", path: "/api/v1/login", desc: "Authenticate", status: "operational" },
    { method: "POST", path: "/api/v1/refresh", desc: "Rotate session", status: "operational" },
    { method: "POST", path: "/api/v1/logout", desc: "Revoke session", status: "operational" },
    { method: "GET", path: "/api/v1/me", desc: "Current user", status: "operational" },
    { method: "GET", path: "/api/v1/jwks", desc: "Public keys", status: "operational" },
    {
      method: "GET",
      path: "/.well-known/way-auth-configuration",
      desc: "Discovery config",
      status: "operational",
    },
  ];

  const specs = [
    { label: "Hashing", value: "Argon2id" },
    { label: "Signing", value: "RS256" },
    { label: "Access TTL", value: "15 min" },
    { label: "Refresh TTL", value: "30 days" },
    { label: "Key Format", value: "JWKS" },
    { label: "Cookie", value: "HttpOnly" },
  ];

  const integrations = [
    "Next.js",
    "React",
    "Convex",
    "Any JWKS consumer",
  ];

  return (
    <div className="grid-bg min-h-screen px-4 py-6 text-[#e0eaf3] md:px-6 md:py-8">
      {/* Ambient glow */}
      <div className="animate-glow-pulse pointer-events-none fixed left-0 top-0 h-[600px] w-[400px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#9fdd58]/6 blur-[150px]" />
      <div className="animate-glow-pulse delay-500 pointer-events-none fixed bottom-0 right-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-[#3a5f95]/10 blur-[120px]" />

      <main className="mx-auto w-full max-w-6xl space-y-4">
        {/* ── Top bar ── */}
        <nav className="animate-fade-in-up hud-panel flex items-center justify-between rounded-none px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={28} height={28} className="h-7 w-7" />
            <span className="font-display text-sm tracking-widest text-[#9fdd58]/80">WAY Auth</span>
            <div className="status-dot ml-2" role="status" aria-label="Operational">
              <span className="sr-only">Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/docs"
              className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400 transition hover:text-[#9fdd58]"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400 transition hover:text-[#9fdd58]"
            >
              Auth
            </Link>
            <Link
              href="/playground"
              className="ml-2 border border-[#9fdd58]/30 bg-[#9fdd58]/8 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#9fdd58] transition hover:bg-[#9fdd58]/15"
            >
              Playground
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="animate-fade-in-up delay-100 relative overflow-hidden">
          <div className="hud-panel grid-bg-dense rounded-none p-8 md:p-12">
            {/* Diagonal accent line */}
            <div className="pointer-events-none absolute -left-20 top-1/2 h-px w-[300px] -rotate-45 bg-gradient-to-r from-transparent via-[#9fdd58]/20 to-transparent" />
            <div className="pointer-events-none absolute -right-20 top-1/3 h-px w-[200px] rotate-45 bg-gradient-to-r from-transparent via-[#3a5f95]/30 to-transparent" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-px w-8 bg-[#9fdd58]/40" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9fdd58]/60">
                    Authentication Service v1
                  </span>
                </div>

                <h1 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
                  <span className="text-[#e0eaf3]">Standalone</span>
                  <br />
                  <span className="text-glow text-[#9fdd58]">Auth System</span>
                </h1>

                <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-400">
                  Secure email/password authentication with JWT access tokens,
                  refresh-session rotation, and JWKS publishing. Plug into any
                  frontend or backend.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/playground"
                    className="group border border-[#9fdd58]/40 bg-[#9fdd58] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#050a0f] transition hover:shadow-[0_0_30px_rgba(159,221,88,0.2)]"
                  >
                    Open Playground
                    <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                  </Link>
                  <Link
                    href="/docs"
                    className="border border-[#9fdd58]/15 bg-transparent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-[#9fdd58]/30 hover:text-[#9fdd58]"
                  >
                    API Docs
                  </Link>
                  <a
                    href="/api/v1/jwks"
                    className="border border-[#3a5f95]/30 bg-transparent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:border-[#3a5f95]/50 hover:text-slate-200"
                  >
                    JWKS
                  </a>
                </div>
              </div>

              {/* Right side: logo + specs grid */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="animate-float flex justify-center">
                    <Image
                      src="/way-asset-logo.png"
                      alt="WAY Auth shield logo"
                      width={405}
                      height={370}
                      className="w-32 opacity-90 drop-shadow-[0_0_40px_rgba(159,221,88,0.15)]"
                      priority
                    />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-px border border-[#9fdd58]/8 bg-[#9fdd58]/5">
                    {specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="bg-[#050a0f]/90 px-3 py-3 text-center"
                      >
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">{spec.label}</p>
                        <p className="mt-1 font-display text-sm text-[#9fdd58]/80">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Endpoints grid ── */}
        <section className="animate-fade-in-up delay-200">
          <div className="hud-panel rounded-none p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-px bg-[#9fdd58]/40" />
              <h2 className="font-display text-xs tracking-[0.2em] text-slate-400">API Surface</h2>
              <div className="h-px flex-1 bg-[#9fdd58]/8" />
              <span className="font-mono text-[10px] text-slate-600">{endpoints.length} endpoints</span>
            </div>

            <div className="grid gap-px bg-[#9fdd58]/5 sm:grid-cols-2 lg:grid-cols-3">
              {endpoints.map((ep) => (
                <div
                  key={ep.path}
                  className="group flex items-center gap-3 bg-[#050a0f]/90 px-4 py-3 transition hover:bg-[#0a1018]"
                >
                  <span
                    className={`w-12 text-center font-mono text-[10px] font-bold ${
                      ep.method === "GET"
                        ? "text-sky-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs text-slate-300 transition group-hover:text-[#9fdd58]">
                    {ep.path}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-600">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features + Integration ── */}
        <div className="animate-fade-in-up delay-300 grid gap-4 md:grid-cols-2">
          {/* Security */}
          <div className="hud-panel rounded-none p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-px bg-[#9fdd58]/40" />
              <h2 className="font-display text-xs tracking-[0.2em] text-slate-400">Security</h2>
            </div>
            <div className="space-y-0 border-l border-[#9fdd58]/10 pl-4">
              {[
                "Argon2id password hashing",
                "RS256 JWT signing with key rotation",
                "Hashed refresh tokens stored server-side",
                "Session rotation on every refresh",
                "Per-IP sliding window rate limits",
                "Secure, HttpOnly cookie defaults",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2 text-sm text-slate-400">
                  <span className="h-1 w-1 shrink-0 bg-[#9fdd58]/40" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Integration */}
          <div className="hud-panel rounded-none p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-px bg-[#3a5f95]/60" />
              <h2 className="font-display text-xs tracking-[0.2em] text-slate-400">Integration</h2>
            </div>
            <div className="space-y-0 border-l border-[#3a5f95]/15 pl-4">
              {[
                "Works with Next.js, React, Convex",
                "JWKS endpoint for any backend verifier",
                "Access tokens kept in memory only",
                "HttpOnly cookie for refresh persistence",
                "Centralized auth logic, no vendor lock-in",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2 text-sm text-slate-400">
                  <span className="h-1 w-1 shrink-0 bg-[#3a5f95]/50" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {integrations.map((name) => (
                <span
                  key={name}
                  className="border border-[#3a5f95]/20 bg-[#3a5f95]/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#3a5f95]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Marketing banner ── */}
        <section className="animate-fade-in-up delay-400 hud-panel overflow-hidden rounded-none p-2">
          <Image
            src="/way-asset-marketing-2.png"
            alt="WAY Auth Service banner"
            width={920}
            height={257}
            className="h-auto w-full opacity-90"
          />
        </section>

        {/* ── Footer ── */}
        <footer className="animate-fade-in-up delay-500 hud-panel flex items-center justify-between rounded-none px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY" width={20} height={20} className="h-5 w-5 opacity-50" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
              WAY Auth Service
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="status-dot" role="status" aria-label="Operational">
              <span className="sr-only">Operational</span>
            </div>
            <span className="font-mono text-[10px] text-slate-600">All systems operational</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
