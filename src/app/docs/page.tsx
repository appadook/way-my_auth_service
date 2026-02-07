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
        request: {
          headers: ["cookie: way_refresh=<admin_refresh_session_cookie>"],
        },
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
        request: {
          headers: ["cookie: way_refresh=<admin_refresh_session_cookie>"],
        },
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
      ? "text-sky-400 border-sky-500/20"
      : method === "POST"
        ? "text-emerald-400 border-emerald-500/20"
        : "text-rose-400 border-rose-500/20";

  return (
    <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${styles}`}>
      {method}
    </span>
  );
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div>
      {label && (
        <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      )}
      <pre className="code-block">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function SectionPanel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      className="hud-panel-clean scroll-mt-8 rounded-none p-5 md:p-6"
    >
      {children}
    </section>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3">
      <span className="h-3 w-px bg-[#9fdd58]/40" />
      <span className="font-display text-sm tracking-[0.2em] text-[#9fdd58]/80">{children}</span>
      <span className="h-px flex-1 bg-[#9fdd58]/8" />
    </h2>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#9fdd58]/6 bg-[#050a0f]/80 p-3.5 text-sm">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-slate-400">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="grid-bg min-h-screen px-4 py-6 text-[#e0eaf3] md:px-6 md:py-8">
      <main className="mx-auto w-full max-w-6xl space-y-4">
        {/* ── Header ── */}
        <header className="animate-fade-in-up hud-panel grid-bg-dense rounded-none p-6 md:p-8">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/way-asset-logo.png"
                alt="WAY Auth logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#9fdd58]/50">
                  WAY Auth Service
                </p>
                <h1 className="font-display text-xl tracking-[0.1em] text-[#e0eaf3] md:text-2xl">
                  API Documentation
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-[#9fdd58]"
              >
                Home
              </Link>
              <Link
                href="/playground"
                className="border border-[#9fdd58]/30 bg-[#9fdd58]/8 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#9fdd58] transition hover:bg-[#9fdd58]/15"
              >
                Playground
              </Link>
            </div>
          </div>
        </header>

        {/* ── Content grid ── */}
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <aside className="animate-fade-in-up delay-100 hud-panel-clean h-fit rounded-none p-4 lg:sticky lg:top-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">Navigation</p>
            <nav className="mt-3 space-y-0.5 text-xs">
              {navSections.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block border-l border-transparent py-1.5 pl-3 font-mono text-[11px] text-slate-500 transition hover:border-[#9fdd58]/30 hover:text-[#9fdd58]"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 border-t border-[#9fdd58]/8 pt-3">
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Base URL</p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">https://way-my-auth-service.vercel.app</p>
              <p className="mt-1 font-mono text-[9px] text-slate-700">All endpoints under /api/v1</p>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-4">
            {/* Overview */}
            <SectionPanel id="overview">
              <SectionHeader>Overview</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                WAY Auth is a standalone JWT authentication service for email/password logins. It issues short-lived
                access tokens, maintains refresh sessions via HttpOnly cookies, and publishes a JWKS endpoint so your
                backends can verify tokens without storing private keys.
              </p>
              <div className="mt-4 grid gap-px bg-[#9fdd58]/5 md:grid-cols-2">
                {[
                  "Email + password login with password hashing",
                  "RS256 JWT access tokens with JWKS publishing",
                  "Refresh token rotation with server-side revocation",
                  "Admin-managed CORS allowlist",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 bg-[#050a0f]/90 px-4 py-3 text-sm text-slate-400"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-[#9fdd58]/40" />
                    {item}
                  </div>
                ))}
              </div>
            </SectionPanel>

            {/* Quickstart */}
            <SectionPanel id="quickstart">
              <SectionHeader>Quickstart Flow</SectionHeader>
              <div className="mt-4 space-y-px">
                {quickstartSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex gap-4 border-l-2 border-[#9fdd58]/10 bg-[#050a0f]/60 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#9fdd58]/20 font-mono text-[10px] font-bold text-[#9fdd58]/70">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-300">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
            </SectionPanel>

            {/* Authentication */}
            <SectionPanel id="auth">
              <SectionHeader>Authentication Model</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                The service returns access tokens in JSON responses and stores refresh tokens in an HttpOnly cookie. Keep
                access tokens in memory and refresh them when they expire. Use the JWKS endpoint to verify tokens on your
                backend.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DataCard title="Signup secret">
                  Include the header <span className="font-mono text-[11px] text-slate-300">x-way-signup-secret</span> on
                  all /api/v1/signup requests. Signups are rejected when the secret is missing or invalid.
                </DataCard>
                <DataCard title="Bearer access tokens">
                  Send <span className="font-mono text-[11px] text-slate-300">Authorization: Bearer &lt;token&gt;</span> to
                  /api/v1/me and your downstream APIs.
                </DataCard>
              </div>
            </SectionPanel>

            {/* Tokens */}
            <SectionPanel id="tokens">
              <SectionHeader>Token Details</SectionHeader>
              <div className="mt-4 grid gap-px bg-[#9fdd58]/5 md:grid-cols-2">
                {[
                  {
                    title: "Access Token TTL",
                    value: "15 min",
                    detail: "Signed with RS256 using JWT_ISSUER and JWT_AUDIENCE.",
                  },
                  {
                    title: "Refresh Token TTL",
                    value: "30 days",
                    detail: "Rotated on every refresh to prevent replay.",
                  },
                  {
                    title: "JWT Claims",
                    value: "sub, sid",
                    detail: "Standard claims include iss, aud, iat, exp, jti.",
                  },
                  {
                    title: "JWKS",
                    value: "/api/v1/jwks",
                    detail: "Use the published key set to verify JWTs server-side.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-[#050a0f]/90 px-4 py-3"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">{item.title}</p>
                    <p className="mt-1.5 font-display text-base text-[#9fdd58]/70">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>

            {/* Cookies */}
            <SectionPanel id="cookies">
              <SectionHeader>Refresh Cookie</SectionHeader>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DataCard title="Cookie attributes">
                  <ul className="mt-1 space-y-1 text-xs text-slate-500">
                    <li>HttpOnly, SameSite=Lax, Path=/</li>
                    <li>Secure in production</li>
                    <li>Max-Age = 30 days</li>
                    <li>Name set by REFRESH_COOKIE_NAME</li>
                  </ul>
                </DataCard>
                <DataCard title="Client requirement">
                  Browser clients must send <span className="font-mono text-[11px] text-slate-300">credentials: &apos;include&apos;</span> so
                  the refresh cookie is set and sent with requests.
                </DataCard>
              </div>
            </SectionPanel>

            {/* CORS */}
            <SectionPanel id="cors">
              <SectionHeader>CORS</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                CORS is enforced against a server-managed allowlist. Same-origin requests are always allowed. If you need
                a browser app from another origin, add it via the admin CORS endpoints.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DataCard title="Allowed headers">
                  <p className="font-mono text-xs text-slate-300">content-type, authorization</p>
                </DataCard>
                <DataCard title="Allowed methods">
                  <p className="font-mono text-xs text-slate-300">GET, POST, OPTIONS</p>
                </DataCard>
              </div>
            </SectionPanel>

            {/* Rate limits */}
            <SectionPanel id="rate-limits">
              <SectionHeader>Rate Limits</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Sliding-window limits are enforced per IP. When exceeded, the API returns 429 with error code
                <span className="font-mono"> rate_limited</span>.
              </p>
              <div className="mt-4 grid gap-px bg-[#9fdd58]/5 md:grid-cols-3">
                {[
                  { route: "/api/v1/signup", limit: "5 / 10 min" },
                  { route: "/api/v1/login", limit: "10 / 10 min" },
                  { route: "/api/v1/refresh", limit: "20 / 10 min" },
                ].map((item) => (
                  <div
                    key={item.route}
                    className="bg-[#050a0f]/90 px-4 py-3"
                  >
                    <p className="font-mono text-[10px] text-slate-500">{item.route}</p>
                    <p className="mt-1.5 font-display text-base text-[#e0eaf3]">{item.limit}</p>
                  </div>
                ))}
              </div>
            </SectionPanel>

            {/* Errors */}
            <SectionPanel id="errors">
              <SectionHeader>Error Format</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
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
            </SectionPanel>

            {/* Endpoints */}
            <section id="endpoints" className="space-y-4">
              <div className="hud-panel-clean rounded-none p-5 md:p-6">
                <SectionHeader>Endpoints</SectionHeader>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Each endpoint below includes required auth, payloads, and examples.
                </p>
              </div>

              {endpointGroups.map((group) => (
                <div
                  key={group.id}
                  className="hud-panel-clean rounded-none p-5 md:p-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-px bg-[#9fdd58]/30" />
                    <h3 className="font-display text-xs tracking-[0.15em] text-slate-300">{group.title}</h3>
                  </div>
                  <p className="mt-1.5 pl-[19px] text-xs text-slate-500">{group.description}</p>

                  <div className="mt-5 space-y-4">
                    {group.endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="border border-[#9fdd58]/6 bg-[#050a0f]/60 p-4"
                      >
                        {/* Method + path */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <MethodBadge method={endpoint.method} />
                          <span className="font-mono text-xs text-slate-300">{endpoint.path}</span>
                        </div>

                        {/* Name + summary */}
                        <div className="mt-3 pl-0.5">
                          <p className="text-sm font-medium text-slate-300">{endpoint.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{endpoint.summary}</p>
                        </div>

                        {/* Auth + rate limit */}
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="border-l-2 border-[#9fdd58]/10 bg-[#050a0f]/60 py-2 pl-3 text-xs">
                            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Auth</p>
                            <p className="mt-1 text-slate-400">{endpoint.auth}</p>
                          </div>
                          {endpoint.rateLimit ? (
                            <div className="border-l-2 border-amber-500/10 bg-[#050a0f]/60 py-2 pl-3 text-xs">
                              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Rate Limit</p>
                              <p className="mt-1 text-slate-400">{endpoint.rateLimit}</p>
                            </div>
                          ) : null}
                        </div>

                        {/* Request/Response */}
                        {endpoint.request ? (
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div className="space-y-3">
                              {endpoint.request.headers ? (
                                <div className="border-l-2 border-[#3a5f95]/15 bg-[#050a0f]/60 py-2 pl-3 text-xs">
                                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Headers</p>
                                  <ul className="mt-1.5 space-y-0.5">
                                    {endpoint.request.headers.map((header) => (
                                      <li key={header} className="font-mono text-[11px] text-slate-500">
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
                          <div className="mt-3 border-l-2 border-red-500/10 bg-[#050a0f]/60 py-2 pl-3 text-xs">
                            <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">Errors</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {endpoint.errors.map((err) => (
                                <span
                                  key={err}
                                  className="border border-slate-700/20 bg-[#050a0f] px-2 py-0.5 font-mono text-[10px] text-slate-500"
                                >
                                  {err}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Example */}
                        {endpoint.example ? (
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
            <SectionPanel id="admin">
              <SectionHeader>Admin Access</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Admin endpoints require a valid refresh session cookie and an email present in the ADMIN_EMAILS
                allowlist. These routes are intended for managing CORS origins and reviewing active refresh sessions.
              </p>
              <div className="mt-4">
                <DataCard title="Admin emails">
                  ADMIN_EMAILS is a comma-separated list. Only those users may call /api/v1/admin/* routes.
                </DataCard>
              </div>
            </SectionPanel>

            {/* Debug */}
            <SectionPanel id="debug">
              <SectionHeader>Debug Endpoint</SectionHeader>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Use <span className="font-mono text-[11px] text-slate-300">GET /api/v1/_debug/cookie</span> in
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
            </SectionPanel>

            {/* Footer */}
            <footer className="hud-panel-clean flex flex-col items-start justify-between gap-3 rounded-none px-5 py-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <Image src="/way-asset-logo.png" alt="WAY" width={20} height={20} className="h-5 w-5 opacity-40" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                  WAY Auth Service &middot; v1 API Docs
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">Reflects current API behavior.</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
