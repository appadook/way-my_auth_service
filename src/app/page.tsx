import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const endpoints = [
    "POST /api/v1/signup",
    "POST /api/v1/login",
    "POST /api/v1/refresh",
    "POST /api/v1/logout",
    "GET /api/v1/jwks",
  ];

  return (
    <div className="min-h-screen px-6 py-10 text-slate-100">
      <main className="mx-auto w-full max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-slate-600/40 bg-[linear-gradient(140deg,rgba(10,20,33,0.95),rgba(20,34,58,0.84))] p-7 shadow-[0_22px_65px_rgba(2,6,23,0.45)] md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#9fdd58]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#3a5f95]/30 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Image
                src="/way-asset-logo.png"
                alt="WAY Auth shield logo"
                width={405}
                height={370}
                className="w-28 md:w-32"
                priority
              />
              <h1 className="font-display mt-6 text-3xl leading-tight md:text-4xl">
                Standalone Authentication For Modern Apps
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200/90 md:text-base">
                WAY Auth gives you secure email/password authentication, JWT access tokens, refresh-session rotation,
                and JWKS publishing so your frontend and backend projects can plug in quickly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/playground"
                  className="rounded-xl bg-[#9fdd58] px-5 py-3 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c]"
                >
                  Open API Playground
                </Link>
                <a
                  href="/api/v1/jwks"
                  className="rounded-xl border border-slate-300/30 bg-slate-900/55 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#9fdd58]/55"
                >
                  View JWKS Endpoint
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-400/25 bg-slate-900/55 p-3">
              <Image
                src="/way-asset-marketing-1.png"
                alt="JWT security illustration"
                width={607}
                height={313}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-500/35 bg-slate-900/55 p-6">
            <h2 className="font-display text-xl text-[#c8ef97]">Core API Endpoints</h2>
            <ul className="mt-4 space-y-2 font-mono text-sm text-slate-100/90">
              {endpoints.map((endpoint) => (
                <li key={endpoint} className="rounded-lg border border-slate-700/60 bg-slate-950/45 px-3 py-2">
                  {endpoint}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-500/35 bg-slate-900/55 p-6">
            <h2 className="font-display text-xl text-[#c8ef97]">Built-In Security</h2>
            <p className="mt-4 text-sm text-slate-100/90">
              Password hashing (argon2id), JWT signing (RS256), hashed refresh tokens, session rotation, rate limits,
              and secure cookie defaults are already wired in.
            </p>
            <p className="mt-4 text-sm text-slate-100/90">
              Use the browser playground to validate real cookie behavior and auth flows before integrating in client
              apps.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-500/35 bg-slate-900/55 p-6">
            <h2 className="font-display text-xl text-[#c8ef97]">Integration Ready</h2>
            <p className="mt-4 text-sm text-slate-100/90">
              Works with Next.js, Convex, React, and any backend that can verify JWTs against the published JWKS.
            </p>
            <p className="mt-4 text-sm text-slate-100/90">
              Keep access tokens in memory, refresh through HttpOnly cookies, and centralize auth logic in one service.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-500/35 bg-slate-900/55 p-4">
          <Image
            src="/way-asset-marketing-2.png"
            alt="WAY Auth Service banner"
            width={920}
            height={257}
            className="h-auto w-full"
          />
        </section>

        <footer className="flex items-center gap-3 rounded-xl border border-slate-600/35 bg-slate-900/40 px-5 py-4 text-xs text-slate-200/80">
          <Image src="/way-asset-logo.png" alt="WAY shield logo" width={32} height={32} className="h-8 w-8" />
          <span>WAY Auth Service • Secure • Simple • JWT Auth</span>
        </footer>
      </main>
    </div>
  );
}
