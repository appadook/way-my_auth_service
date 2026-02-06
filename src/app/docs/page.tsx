import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API Docs",
  description: "Public API documentation for the WAY Auth Service.",
};

type Endpoint = {
  id: string;
  name: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  summary: string;
  auth: string;
  rateLimit?: string;
  request?: {
    headers?: string[];
    body?: string;
  };
  response?: string;
  errors?: string[];
  example?: {
    request: string;
    response: string;
  };
};

type EndpointGroup = {
  id: string;
  title: string;
  description: string;
  endpoints: Endpoint[];
};

const navSections = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "auth", label: "Authentication" },
  { id: "tokens", label: "Tokens" },
  { id: "cookies", label: "Cookies" },
  { id: "cors", label: "CORS" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "errors", label: "Errors" },
  { id: "endpoints", label: "Endpoints" },
  { id: "admin", label: "Admin" },
  { id: "debug", label: "Debug" },
];

const endpointGroups: EndpointGroup[] = [
  {
    id: "auth-group",
    title: "Auth Endpoints",
    description: "Core email/password auth and JWT issuance.",
    endpoints: [
      {
        id: "signup",
        name: "Create account",
        method: "POST",
        path: "/api/v1/signup",
        summary: "Create a user and issue access + refresh tokens.",
        auth: "Required signup secret header.",
        rateLimit: "5 requests / 10 minutes / IP",
        request: {
          headers: ["content-type: application/json", "x-way-signup-secret: <secret>"],
          body: JSON.stringify(
            {
              email: "you@example.com",
              password: "strong-password",
            },
            null,
            2,
          ),
        },
        response: JSON.stringify(
          {
            user: { id: "user_123", email: "you@example.com" },
            accessToken: "<jwt>",
            tokenType: "Bearer",
            expiresIn: 900,
          },
          null,
          2,
        ),
        errors: ["invalid_signup_secret", "invalid_input", "invalid_json", "email_taken", "rate_limited"],
        example: {
          request: [
            "curl -X POST https://way-my-auth-service.vercel.app/api/v1/signup \\",
            "  -H 'content-type: application/json' \\",
            "  -H 'x-way-signup-secret: <secret>' \\",
            "  -d '{\"email\":\"you@example.com\",\"password\":\"strong-password\"}'",
          ].join("\n"),
          response: JSON.stringify(
            {
              user: { id: "user_123", email: "you@example.com" },
              accessToken: "<jwt>",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            null,
            2,
          ),
        },
      },
      {
        id: "login",
        name: "Log in",
        method: "POST",
        path: "/api/v1/login",
        summary: "Authenticate credentials and issue access + refresh tokens.",
        auth: "Email/password.",
        rateLimit: "10 requests / 10 minutes / IP",
        request: {
          headers: ["content-type: application/json"],
          body: JSON.stringify(
            {
              email: "you@example.com",
              password: "strong-password",
            },
            null,
            2,
          ),
        },
        response: JSON.stringify(
          {
            user: { id: "user_123", email: "you@example.com" },
            accessToken: "<jwt>",
            tokenType: "Bearer",
            expiresIn: 900,
          },
          null,
          2,
        ),
        errors: ["invalid_credentials", "invalid_input", "invalid_json", "rate_limited"],
        example: {
          request: [
            "curl -X POST https://way-my-auth-service.vercel.app/api/v1/login \\",
            "  -H 'content-type: application/json' \\",
            "  -d '{\"email\":\"you@example.com\",\"password\":\"strong-password\"}'",
          ].join("\n"),
          response: JSON.stringify(
            {
              user: { id: "user_123", email: "you@example.com" },
              accessToken: "<jwt>",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            null,
            2,
          ),
        },
      },
      {
        id: "refresh",
        name: "Refresh access token",
        method: "POST",
        path: "/api/v1/refresh",
        summary: "Rotate the refresh session and issue a new access token.",
        auth: "Refresh token cookie.",
        rateLimit: "20 requests / 10 minutes / IP",
        request: {
          headers: ["cookie: <refresh cookie>", "content-type: application/json (optional)"],
        },
        response: JSON.stringify(
          {
            accessToken: "<jwt>",
            tokenType: "Bearer",
            expiresIn: 900,
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "rate_limited"],
        example: {
          request: [
            "curl -X POST https://way-my-auth-service.vercel.app/api/v1/refresh \\",
            "  --cookie 'way_refresh=<refresh-token>'",
          ].join("\n"),
          response: JSON.stringify(
            {
              accessToken: "<jwt>",
              tokenType: "Bearer",
              expiresIn: 900,
            },
            null,
            2,
          ),
        },
      },
      {
        id: "logout",
        name: "Log out",
        method: "POST",
        path: "/api/v1/logout",
        summary: "Revoke the refresh session and clear the refresh cookie.",
        auth: "Refresh token cookie (if present).",
        request: {
          headers: ["cookie: <refresh cookie>"],
        },
        response: JSON.stringify(
          {
            success: true,
          },
          null,
          2,
        ),
        errors: [],
        example: {
          request: "curl -X POST https://way-my-auth-service.vercel.app/api/v1/logout",
          response: JSON.stringify({ success: true }, null, 2),
        },
      },
      {
        id: "me",
        name: "Get current user",
        method: "GET",
        path: "/api/v1/me",
        summary: "Resolve the current user from the access token.",
        auth: "Bearer access token.",
        request: {
          headers: ["authorization: Bearer <access-token>"],
        },
        response: JSON.stringify(
          {
            user: { id: "user_123", email: "you@example.com" },
            sessionId: "session_123",
          },
          null,
          2,
        ),
        errors: ["missing_bearer_token", "invalid_token"],
        example: {
          request: [
            "curl https://way-my-auth-service.vercel.app/api/v1/me \\",
            "  -H 'authorization: Bearer <access-token>'",
          ].join("\n"),
          response: JSON.stringify(
            {
              user: { id: "user_123", email: "you@example.com" },
              sessionId: "session_123",
            },
            null,
            2,
          ),
        },
      },
      {
        id: "jwks",
        name: "JWKS",
        method: "GET",
        path: "/api/v1/jwks",
        summary: "Fetch public keys used to verify access tokens.",
        auth: "None.",
        response: JSON.stringify(
          {
            keys: [
              {
                kty: "RSA",
                alg: "RS256",
                use: "sig",
                kid: "<kid>",
                n: "<modulus>",
                e: "AQAB",
              },
            ],
          },
          null,
          2,
        ),
        errors: ["internal_error"],
        example: {
          request: "curl https://way-my-auth-service.vercel.app/api/v1/jwks",
          response: JSON.stringify(
            {
              keys: [
                {
                  kty: "RSA",
                  alg: "RS256",
                  use: "sig",
                  kid: "<kid>",
                  n: "<modulus>",
                  e: "AQAB",
                },
              ],
            },
            null,
            2,
          ),
        },
      },
    ],
  },
  {
    id: "admin-group",
    title: "Admin: CORS Origins",
    description: "Manage allowed cross-origin apps via admin-only routes.",
    endpoints: [
      {
        id: "cors-list",
        name: "List CORS origins",
        method: "GET",
        path: "/api/v1/admin/cors",
        summary: "List allowed origins.",
        auth: "Admin refresh session cookie.",
        request: {
          headers: ["cookie: <refresh cookie>"],
        },
        response: JSON.stringify(
          {
            origins: [
              {
                id: "origin_123",
                origin: "https://app.example.com",
                createdAt: "2025-01-01T12:00:00.000Z",
                updatedAt: "2025-01-01T12:00:00.000Z",
              },
            ],
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "forbidden"],
        example: {
          request: "curl https://way-my-auth-service.vercel.app/api/v1/admin/cors",
          response: JSON.stringify(
            {
              origins: [
                {
                  id: "origin_123",
                  origin: "https://app.example.com",
                  createdAt: "2025-01-01T12:00:00.000Z",
                  updatedAt: "2025-01-01T12:00:00.000Z",
                },
              ],
            },
            null,
            2,
          ),
        },
      },
      {
        id: "cors-add",
        name: "Add CORS origin",
        method: "POST",
        path: "/api/v1/admin/cors",
        summary: "Add an allowed origin (http/https).",
        auth: "Admin refresh session cookie.",
        request: {
          headers: ["content-type: application/json", "cookie: <refresh cookie>"],
          body: JSON.stringify(
            {
              origin: "https://app.example.com",
            },
            null,
            2,
          ),
        },
        response: JSON.stringify(
          {
            origin: {
              id: "origin_123",
              origin: "https://app.example.com",
              createdAt: "2025-01-01T12:00:00.000Z",
              updatedAt: "2025-01-01T12:00:00.000Z",
            },
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "forbidden", "invalid_input", "invalid_origin"],
        example: {
          request: [
            "curl -X POST https://way-my-auth-service.vercel.app/api/v1/admin/cors \\",
            "  -H 'content-type: application/json' \\",
            "  -d '{\"origin\":\"https://app.example.com\"}'",
          ].join("\n"),
          response: JSON.stringify(
            {
              origin: {
                id: "origin_123",
                origin: "https://app.example.com",
                createdAt: "2025-01-01T12:00:00.000Z",
                updatedAt: "2025-01-01T12:00:00.000Z",
              },
            },
            null,
            2,
          ),
        },
      },
      {
        id: "cors-remove",
        name: "Remove CORS origin",
        method: "DELETE",
        path: "/api/v1/admin/cors/:id",
        summary: "Remove an allowed origin by id.",
        auth: "Admin refresh session cookie.",
        request: {
          headers: ["cookie: <refresh cookie>"],
        },
        response: JSON.stringify(
          {
            success: true,
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "forbidden", "invalid_origin"],
        example: {
          request: "curl -X DELETE https://way-my-auth-service.vercel.app/api/v1/admin/cors/origin_123",
          response: JSON.stringify({ success: true }, null, 2),
        },
      },
      {
        id: "sessions-list",
        name: "List sessions",
        method: "GET",
        path: "/api/v1/admin/sessions",
        summary: "List refresh sessions with user metadata.",
        auth: "Admin refresh session cookie.",
        response: JSON.stringify(
          {
            sessions: [
              {
                id: "session_123",
                user: { id: "user_123", email: "you@example.com" },
                createdAt: "2025-01-01T12:00:00.000Z",
                expiresAt: "2025-02-01T12:00:00.000Z",
                revokedAt: null,
                replacedBySessionId: null,
                status: "active",
              },
            ],
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "forbidden"],
        example: {
          request: "curl https://way-my-auth-service.vercel.app/api/v1/admin/sessions",
          response: JSON.stringify(
            {
              sessions: [
                {
                  id: "session_123",
                  user: { id: "user_123", email: "you@example.com" },
                  createdAt: "2025-01-01T12:00:00.000Z",
                  expiresAt: "2025-02-01T12:00:00.000Z",
                  revokedAt: null,
                  replacedBySessionId: null,
                  status: "active",
                },
              ],
            },
            null,
            2,
          ),
        },
      },
      {
        id: "sessions-revoke",
        name: "Revoke session",
        method: "DELETE",
        path: "/api/v1/admin/sessions/:id",
        summary: "Revoke a refresh session by id.",
        auth: "Admin refresh session cookie.",
        response: JSON.stringify(
          {
            session: {
              id: "session_123",
              user: { id: "user_123", email: "you@example.com" },
              createdAt: "2025-01-01T12:00:00.000Z",
              expiresAt: "2025-02-01T12:00:00.000Z",
              revokedAt: "2025-01-05T12:00:00.000Z",
              replacedBySessionId: null,
              status: "revoked",
            },
          },
          null,
          2,
        ),
        errors: ["missing_refresh_token", "invalid_refresh_token", "forbidden", "invalid_session_id", "session_not_found"],
        example: {
          request: "curl -X DELETE https://way-my-auth-service.vercel.app/api/v1/admin/sessions/session_123",
          response: JSON.stringify(
            {
              session: {
                id: "session_123",
                user: { id: "user_123", email: "you@example.com" },
                createdAt: "2025-01-01T12:00:00.000Z",
                expiresAt: "2025-02-01T12:00:00.000Z",
                revokedAt: "2025-01-05T12:00:00.000Z",
                replacedBySessionId: null,
                status: "revoked",
              },
            },
            null,
            2,
          ),
        },
      },
    ],
  },
];

const quickstartSteps = [
  {
    title: "Create a user",
    detail: "Call /api/v1/signup with email + password and x-way-signup-secret.",
  },
  {
    title: "Log in",
    detail: "Call /api/v1/login to set the refresh cookie and receive an access token.",
  },
  {
    title: "Use the access token",
    detail: "Send Authorization: Bearer <token> to /api/v1/me or your own APIs.",
  },
  {
    title: "Refresh when needed",
    detail: "Call /api/v1/refresh with credentials included to rotate sessions and get a new access token.",
  },
];

function MethodBadge({ method }: { method: Endpoint["method"] }) {
  const styles =
    method === "GET"
      ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
      : method === "POST"
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        : "bg-rose-500/10 text-rose-300 border-rose-500/20";

  return (
    <span className={`rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide ${styles}`}>
      {method}
    </span>
  );
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      )}
      <pre className="code-block">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function SectionCard({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-8 rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6 md:p-7"
    >
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display flex items-center gap-3 text-2xl tracking-wide text-[#c8ef97]">
      <span className="h-5 w-1 rounded-full bg-[#9fdd58]/50" />
      {children}
    </h2>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 grid gap-3 md:grid-cols-2">{children}</div>;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/20 bg-slate-950/30 p-4 text-sm">
      <p className="font-medium text-slate-200">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen px-5 py-8 text-slate-100 md:px-8 md:py-12">
      <main className="mx-auto w-full max-w-6xl space-y-8">
        {/* ── Header ── */}
        <header className="animate-fade-in-up relative overflow-hidden rounded-3xl border border-slate-600/20 bg-[linear-gradient(145deg,rgba(10,20,33,0.96),rgba(18,30,52,0.88))] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.45)] md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#9fdd58]/8 blur-[80px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/way-asset-logo.png"
                  alt="WAY Auth logo"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9fdd58]/70">
                    WAY Auth Service
                  </p>
                  <h1 className="font-display text-3xl tracking-tight md:text-4xl">API Documentation</h1>
                </div>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300/80">
                Endpoints, auth flows, examples, and operational details for the v1 API.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/"
                className="rounded-lg px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
              >
                Home
              </Link>
              <Link
                href="/playground"
                className="rounded-lg bg-[#9fdd58] px-4 py-2.5 text-xs font-semibold text-[#07101c] transition hover:bg-[#8ed14c]"
              >
                Open Playground
              </Link>
            </div>
          </div>
        </header>

        {/* ── Content grid ── */}
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="animate-fade-in-up delay-100 h-fit rounded-2xl border border-slate-600/15 bg-[linear-gradient(180deg,rgba(15,23,41,0.7),rgba(15,23,41,0.5))] p-5 lg:sticky lg:top-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">On this page</p>
            <nav className="mt-4 space-y-0.5 text-sm">
              {navSections.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-5 rounded-xl border border-slate-700/20 bg-slate-950/30 p-3.5 text-xs">
              <p className="font-medium text-slate-300">Base URL</p>
              <p className="mt-1.5 font-mono text-[11px] text-slate-400">https://way-my-auth-service.vercel.app</p>
              <p className="mt-2 text-slate-500">All endpoints under /api/v1</p>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            {/* Overview */}
            <SectionCard id="overview">
              <SectionTitle>Overview</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                WAY Auth is a standalone JWT authentication service for email/password logins. It issues short-lived
                access tokens, maintains refresh sessions via HttpOnly cookies, and publishes a JWKS endpoint so your
                backends can verify tokens without storing private keys.
              </p>
              <div className="mt-5 grid gap-2.5 md:grid-cols-2">
                {[
                  "Email + password login with password hashing",
                  "RS256 JWT access tokens with JWKS publishing",
                  "Refresh token rotation with server-side revocation",
                  "Admin-managed CORS allowlist",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-700/20 bg-slate-950/30 px-4 py-3 text-sm text-slate-300/90"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9fdd58]/50" />
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Quickstart */}
            <SectionCard id="quickstart">
              <SectionTitle>Quickstart Flow</SectionTitle>
              <div className="mt-5 grid gap-3">
                {quickstartSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-4 rounded-xl border border-slate-700/20 bg-slate-950/30 px-5 py-4"
                  >
                    <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#9fdd58]/10 text-sm font-bold text-[#9fdd58]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{step.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <CodeBlock
                  label="Client login example"
                  value={[
                    "const response = await fetch('https://way-my-auth-service.vercel.app/api/v1/login', {",
                    "  method: 'POST',",
                    "  headers: { 'content-type': 'application/json' },",
                    "  credentials: 'include',",
                    "  body: JSON.stringify({ email, password }),",
                    "});",
                    "const payload = await response.json();",
                    "// payload.accessToken contains the JWT",
                  ].join("\n")}
                />
                <CodeBlock
                  label="Refresh example"
                  value={[
                    "const refreshed = await fetch('https://way-my-auth-service.vercel.app/api/v1/refresh', {",
                    "  method: 'POST',",
                    "  credentials: 'include',",
                    "});",
                    "const data = await refreshed.json();",
                    "// data.accessToken is a new JWT",
                  ].join("\n")}
                />
              </div>
            </SectionCard>

            {/* Authentication */}
            <SectionCard id="auth">
              <SectionTitle>Authentication Model</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                The service returns access tokens in JSON responses and stores refresh tokens in an HttpOnly cookie. Keep
                access tokens in memory and refresh them when they expire. Use the JWKS endpoint to verify tokens on your
                backend.
              </p>
              <InfoGrid>
                <InfoCard title="Signup secret">
                  Include the header <span className="rounded bg-slate-800/50 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">x-way-signup-secret</span> on
                  all /api/v1/signup requests. Signups are rejected when the secret is missing or invalid.
                </InfoCard>
                <InfoCard title="Bearer access tokens">
                  Send <span className="rounded bg-slate-800/50 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">Authorization: Bearer &lt;token&gt;</span> to
                  /api/v1/me and your downstream APIs.
                </InfoCard>
              </InfoGrid>
            </SectionCard>

            {/* Tokens */}
            <SectionCard id="tokens">
              <SectionTitle>Token Details</SectionTitle>
              <InfoGrid>
                {[
                  {
                    title: "Access token TTL",
                    value: "15 minutes",
                    detail: "Signed with RS256 using JWT_ISSUER and JWT_AUDIENCE.",
                  },
                  {
                    title: "Refresh token TTL",
                    value: "30 days",
                    detail: "Rotated on every refresh to prevent replay.",
                  },
                  {
                    title: "JWT claims",
                    value: "sub (user id), sid (session id)",
                    detail: "Standard claims include iss, aud, iat, exp, jti.",
                  },
                  {
                    title: "JWKS",
                    value: "GET /api/v1/jwks",
                    detail: "Use the published key set to verify JWTs server-side.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-700/20 bg-slate-950/30 px-4 py-4 text-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{item.title}</p>
                    <p className="mt-2 font-display text-lg text-slate-100">{item.value}</p>
                    <p className="mt-1.5 text-sm text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </InfoGrid>
            </SectionCard>

            {/* Cookies */}
            <SectionCard id="cookies">
              <SectionTitle>Refresh Cookie</SectionTitle>
              <InfoGrid>
                <InfoCard title="Cookie attributes">
                  <ul className="mt-1 space-y-1 text-sm text-slate-400">
                    <li>HttpOnly, SameSite=Lax, Path=/</li>
                    <li>Secure in production</li>
                    <li>Max-Age = 30 days</li>
                    <li>Name set by REFRESH_COOKIE_NAME</li>
                  </ul>
                </InfoCard>
                <InfoCard title="Client requirement">
                  Browser clients must send <span className="rounded bg-slate-800/50 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">credentials: &apos;include&apos;</span> so
                  the refresh cookie is set and sent with requests.
                </InfoCard>
              </InfoGrid>
            </SectionCard>

            {/* CORS */}
            <SectionCard id="cors">
              <SectionTitle>CORS</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                CORS is enforced against a server-managed allowlist. Same-origin requests are always allowed. If you need
                a browser app from another origin, add it via the admin CORS endpoints.
              </p>
              <InfoGrid>
                <InfoCard title="Allowed headers">
                  <p className="font-mono text-slate-300">content-type, authorization</p>
                </InfoCard>
                <InfoCard title="Allowed methods">
                  <p className="font-mono text-slate-300">GET, POST, OPTIONS</p>
                </InfoCard>
              </InfoGrid>
            </SectionCard>

            {/* Rate limits */}
            <SectionCard id="rate-limits">
              <SectionTitle>Rate Limits</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                Sliding-window limits are enforced per IP. When exceeded, the API returns 429 with error code
                <span className="font-mono"> rate_limited</span>.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { route: "/api/v1/signup", limit: "5 / 10 min" },
                  { route: "/api/v1/login", limit: "10 / 10 min" },
                  { route: "/api/v1/refresh", limit: "20 / 10 min" },
                ].map((item) => (
                  <div
                    key={item.route}
                    className="rounded-xl border border-slate-700/20 bg-slate-950/30 p-4 text-sm"
                  >
                    <p className="font-mono text-xs text-slate-300">{item.route}</p>
                    <p className="font-display mt-2 text-lg text-slate-100">{item.limit}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Errors */}
            <SectionCard id="errors">
              <SectionTitle>Error Format</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                All error responses are JSON with a consistent <span className="font-mono">error.code</span> and
                <span className="font-mono"> error.message</span>.
              </p>
              <div className="mt-4">
                <CodeBlock
                  value={JSON.stringify(
                    {
                      error: {
                        code: "invalid_input",
                        message: "Request payload is invalid.",
                      },
                    },
                    null,
                    2,
                  )}
                />
              </div>
            </SectionCard>

            {/* Endpoints */}
            <section id="endpoints" className="space-y-5">
              <div className="rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6 md:p-7">
                <SectionTitle>Endpoints</SectionTitle>
                <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                  Each endpoint below includes required auth, payloads, and examples.
                </p>
              </div>

              {endpointGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-2xl border border-slate-600/15 bg-[linear-gradient(165deg,rgba(15,23,41,0.7),rgba(21,36,61,0.4))] p-6 md:p-7"
                >
                  <h3 className="font-display text-xl text-slate-100">{group.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-400">{group.description}</p>

                  <div className="mt-6 space-y-5">
                    {group.endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="rounded-2xl border border-slate-700/15 bg-slate-950/25 p-5"
                      >
                        {/* Method + path */}
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={endpoint.method} />
                          <span className="font-mono text-sm text-slate-200">{endpoint.path}</span>
                        </div>

                        {/* Name + summary */}
                        <div className="mt-3">
                          <p className="text-sm font-medium text-slate-200">{endpoint.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{endpoint.summary}</p>
                        </div>

                        {/* Auth + rate limit */}
                        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                          <div className="rounded-lg border border-slate-700/15 bg-slate-950/30 p-3 text-xs">
                            <p className="font-medium text-slate-300">Auth</p>
                            <p className="mt-1 text-slate-400">{endpoint.auth}</p>
                          </div>
                          {endpoint.rateLimit ? (
                            <div className="rounded-lg border border-slate-700/15 bg-slate-950/30 p-3 text-xs">
                              <p className="font-medium text-slate-300">Rate limit</p>
                              <p className="mt-1 text-slate-400">{endpoint.rateLimit}</p>
                            </div>
                          ) : null}
                        </div>

                        {/* Request/Response */}
                        {endpoint.request ? (
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="space-y-3">
                              {endpoint.request.headers ? (
                                <div className="rounded-lg border border-slate-700/15 bg-slate-950/30 p-3 text-xs">
                                  <p className="font-medium text-slate-300">Headers</p>
                                  <ul className="mt-2 space-y-1">
                                    {endpoint.request.headers.map((header) => (
                                      <li key={header} className="font-mono text-slate-400">
                                        {header}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {endpoint.request.body ? <CodeBlock label="Request body" value={endpoint.request.body} /> : null}
                            </div>
                            <div>
                              {endpoint.response ? <CodeBlock label="Response" value={endpoint.response} /> : null}
                            </div>
                          </div>
                        ) : null}

                        {/* Errors */}
                        {endpoint.errors && endpoint.errors.length > 0 ? (
                          <div className="mt-4 rounded-lg border border-slate-700/15 bg-slate-950/30 p-3 text-xs">
                            <p className="font-medium text-slate-300">Common errors</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {endpoint.errors.map((err) => (
                                <span
                                  key={err}
                                  className="rounded-md border border-slate-700/20 bg-slate-900/50 px-2 py-0.5 font-mono text-[11px] text-slate-400"
                                >
                                  {err}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Example */}
                        {endpoint.example ? (
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <CodeBlock label="Example request" value={endpoint.example.request} />
                            <CodeBlock label="Example response" value={endpoint.example.response} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Admin */}
            <SectionCard id="admin">
              <SectionTitle>Admin Access</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                Admin endpoints require a valid refresh session cookie and an email present in the ADMIN_EMAILS
                allowlist. These routes are intended for managing CORS origins and reviewing active refresh sessions.
              </p>
              <div className="mt-4">
                <InfoCard title="Admin emails">
                  ADMIN_EMAILS is a comma-separated list. Only those users may call /api/v1/admin/* routes.
                </InfoCard>
              </div>
            </SectionCard>

            {/* Debug */}
            <SectionCard id="debug">
              <SectionTitle>Debug Endpoint</SectionTitle>
              <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
                Use <span className="rounded bg-slate-800/50 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">GET /api/v1/_debug/cookie</span> in
                development to confirm the refresh cookie is present. Returns 404 outside of development.
              </p>
              <div className="mt-4">
                <CodeBlock
                  value={JSON.stringify(
                    {
                      cookieName: "way_refresh",
                      present: true,
                      checkedAt: "2025-01-01T12:00:00.000Z",
                    },
                    null,
                    2,
                  )}
                />
              </div>
            </SectionCard>

            {/* Footer */}
            <footer className="glass flex flex-col items-start justify-between gap-3 rounded-xl px-5 py-4 text-xs text-slate-400 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <Image src="/way-asset-logo.png" alt="WAY shield logo" width={24} height={24} className="h-6 w-6 opacity-60" />
                <span>WAY Auth Service &middot; v1 API Docs</span>
              </div>
              <span>Reflects current API behavior.</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
