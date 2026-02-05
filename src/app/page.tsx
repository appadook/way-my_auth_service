import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const endpoints = [
    { method: "POST", path: "/api/v1/signup", desc: "Create account" },
    { method: "POST", path: "/api/v1/login", desc: "Authenticate" },
    { method: "POST", path: "/api/v1/refresh", desc: "Rotate session" },
    { method: "POST", path: "/api/v1/logout", desc: "Revoke session" },
    { method: "GET", path: "/api/v1/me", desc: "Current user" },
    { method: "GET", path: "/api/v1/jwks", desc: "Public keys" },
  ];

  const features = [
    {
      title: "Built-In Security",
      items: [
        "Argon2id password hashing",
        "RS256 JWT signing",
        "Hashed refresh tokens",
        "Session rotation",
        "Rate limiting",
        "Secure cookie defaults",
      ],
    },
    {
      title: "Integration Ready",
      items: [
        "Works with Next.js, Convex, React",
        "JWKS endpoint for any backend",
        "Access tokens in memory",
        "HttpOnly cookie refresh",
        "Centralized auth logic",
      ],
    },
  ];

  return (
    <div className="min-h-screen px-5 py-8 text-slate-100 md:px-8 md:py-12">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        {/* ── Navigation ── */}
        <nav className="animate-fade-in-up glass flex items-center justify-between rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={36} height={36} className="h-9 w-9" />
            <span className="font-display text-base tracking-wide text-slate-200">WAY Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/docs"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/playground"
              className="rounded-lg bg-[#9fdd58] px-4 py-2 text-xs font-semibold text-[#07101c] transition hover:bg-[#8ed14c]"
            >
              Playground
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="animate-fade-in-up delay-100 relative overflow-hidden rounded-3xl border border-slate-600/20 bg-[linear-gradient(145deg,rgba(10,20,33,0.96),rgba(18,30,52,0.88),rgba(12,26,46,0.92))] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.5)] md:p-12">
          {/* Ambient glow orbs */}
          <div className="animate-glow-pulse pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#9fdd58]/15 blur-[100px]" />
          <div className="animate-glow-pulse delay-500 pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-[#3a5f95]/25 blur-[80px]" />

          {/* Grid pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(159,221,88,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(159,221,88,0.3) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_0.9fr]">
            <div>
              <div className="animate-float inline-block">
                <Image
                  src="/way-asset-logo.png"
                  alt="WAY Auth shield logo"
                  width={405}
                  height={370}
                  className="w-24 drop-shadow-[0_0_30px_rgba(159,221,88,0.2)] md:w-28"
                  priority
                />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#9fdd58]/80">
                Authentication Service
              </p>
              <h1 className="font-display mt-3 text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-[3.4rem]">
                Standalone Auth
                <br />
                <span className="text-[#9fdd58]">For Modern Apps</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-300/90">
                Secure email/password authentication, JWT access tokens, refresh-session rotation,
                and JWKS publishing. Your frontend and backend plug in and go.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/playground"
                  className="group relative rounded-xl bg-[#9fdd58] px-6 py-3.5 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] hover:shadow-[0_0_30px_rgba(159,221,88,0.25)]"
                >
                  Open Playground
                  <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </Link>
                <Link
                  href="/docs"
                  className="rounded-xl border border-slate-400/20 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400/35 hover:bg-white/[0.07]"
                >
                  API Docs
                </Link>
                <a
                  href="/api/v1/jwks"
                  className="rounded-xl border border-slate-400/20 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400/35 hover:bg-white/[0.07]"
                >
                  JWKS
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-2xl border border-slate-500/15 bg-slate-900/40 p-2 shadow-[0_16px_64px_rgba(0,0,0,0.3)]">
                <Image
                  src="/way-asset-marketing-1.png"
                  alt="JWT security illustration"
                  width={607}
                  height={313}
                  className="h-auto w-full rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Endpoints strip ── */}
        <section className="animate-fade-in-up delay-200">
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-[#9fdd58]/30 to-transparent" />
              <h2 className="font-display shrink-0 text-lg tracking-wide text-slate-200">API Surface</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-[#9fdd58]/30 to-transparent" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {endpoints.map((ep, i) => (
                <div
                  key={ep.path}
                  className="animate-fade-in-up group flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-950/30 px-4 py-3 transition hover:border-[#9fdd58]/20 hover:bg-slate-950/50"
                  style={{ animationDelay: `${0.3 + i * 0.06}s` }}
                >
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                      ep.method === "GET"
                        ? "bg-sky-500/10 text-sky-300"
                        : "bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs text-slate-300 transition group-hover:text-slate-100">
                    {ep.path}
                  </span>
                  <span className="ml-auto text-[11px] text-slate-500">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature cards ── */}
        <section className="animate-fade-in-up delay-300 grid gap-5 md:grid-cols-2">
          {features.map((feature, fi) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-600/15 bg-[linear-gradient(160deg,rgba(15,23,41,0.75),rgba(21,36,61,0.45))] p-7 transition hover:border-[#9fdd58]/15"
              style={{ animationDelay: `${0.4 + fi * 0.1}s` }}
            >
              {/* Corner accent */}
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#9fdd58]/[0.04] blur-2xl transition group-hover:bg-[#9fdd58]/[0.08]" />

              <h2 className="font-display relative text-xl tracking-wide text-[#c8ef97]">
                {feature.title}
              </h2>
              <ul className="relative mt-4 space-y-2.5">
                {feature.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9fdd58]/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {/* ── Marketing banner ── */}
        <section className="animate-fade-in-up delay-400 overflow-hidden rounded-2xl border border-slate-600/15 bg-slate-900/30 p-3">
          <Image
            src="/way-asset-marketing-2.png"
            alt="WAY Auth Service banner"
            width={920}
            height={257}
            className="h-auto w-full rounded-xl"
          />
        </section>

        {/* ── Footer ── */}
        <footer className="animate-fade-in-up delay-500 glass flex items-center justify-between rounded-xl px-5 py-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY shield logo" width={24} height={24} className="h-6 w-6 opacity-60" />
            <span>WAY Auth Service</span>
          </div>
          <span className="hidden sm:inline">Secure &middot; Simple &middot; JWT Auth</span>
        </footer>
      </main>
    </div>
  );
}
