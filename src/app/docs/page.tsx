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
            "curl -X POST https://auth.example.com/api/v1/signup \\",
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
            "curl -X POST https://auth.example.com/api/v1/login \\",
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
            "curl -X POST https://auth.example.com/api/v1/refresh \\",
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
          request: "curl -X POST https://auth.example.com/api/v1/logout",
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
            "curl https://auth.example.com/api/v1/me \\",
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
          request: "curl https://auth.example.com/api/v1/jwks",
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
          request: "curl https://auth.example.com/api/v1/admin/cors",
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
            "curl -X POST https://auth.example.com/api/v1/admin/cors \\",
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
          request: "curl -X DELETE https://auth.example.com/api/v1/admin/cors/origin_123",
          response: JSON.stringify({ success: true }, null, 2),
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
  const color =
    method === "GET"
      ? "bg-sky-500/15 text-sky-200 border-sky-400/40"
      : method === "POST"
        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/40"
        : "bg-rose-500/15 text-rose-200 border-rose-400/40";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>{method}</span>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-xs text-slate-100">
      <code>{value}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen px-6 py-10 text-slate-100">
      <main className="mx-auto w-full max-w-6xl space-y-10">
        <header className="rounded-3xl border border-slate-600/45 bg-[linear-gradient(135deg,rgba(10,20,33,0.96),rgba(22,36,60,0.86))] p-8 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/way-asset-logo.png"
                  alt="WAY Auth logo"
                  width={44}
                  height={44}
                  className="h-11 w-11"
                />
                <div>
                  <p className="text-xs uppercase text-slate-300">WAY Auth Service</p>
                  <h1 className="font-display text-3xl">API Documentation</h1>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-slate-200/90 md:text-base">
                Everything you need to integrate with the WAY Auth Service: endpoints, auth flows, examples, and
                operational details. This page reflects the current v1 API.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl border border-slate-500/40 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#9fdd58]/60"
              >
                Back to landing
              </Link>
              <Link
                href="/playground"
                className="rounded-xl bg-[#9fdd58] px-4 py-2 text-xs font-semibold text-[#07101c] transition hover:bg-[#8ed14c]"
              >
                Open API Playground
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-600/40 bg-slate-900/55 p-5 lg:sticky lg:top-6">
            <p className="text-xs font-semibold uppercase text-slate-300">On this page</p>
            <nav className="mt-4 space-y-2 text-sm">
              {navSections.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg border border-transparent px-3 py-2 text-slate-200 transition hover:border-slate-600/60 hover:bg-slate-950/40"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-xl border border-slate-600/40 bg-slate-950/50 p-4 text-xs text-slate-200/90">
              <p className="font-semibold text-slate-100">Base URL</p>
              <p className="mt-2">https://auth.example.com</p>
              <p className="mt-3 text-slate-300">All endpoints are under /api/v1.</p>
            </div>
          </aside>

          <div className="space-y-10">
            <section id="overview" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Overview</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                WAY Auth is a standalone JWT authentication service for email/password logins. It issues short-lived
                access tokens, maintains refresh sessions via HttpOnly cookies, and publishes a JWKS endpoint so your
                backends can verify tokens without storing private keys.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  "Email + password login with password hashing",
                  "RS256 JWT access tokens with JWKS publishing",
                  "Refresh token rotation with server-side revocation",
                  "Admin-managed CORS allowlist",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-slate-600/40 bg-slate-950/40 px-4 py-3 text-sm text-slate-100/90"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section id="quickstart" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Quickstart Flow</h2>
              <div className="mt-6 grid gap-4">
                {quickstartSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex flex-col gap-2 rounded-xl border border-slate-600/40 bg-slate-950/40 px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase text-slate-300">Step {index + 1}</p>
                    <p className="text-sm font-semibold text-slate-100">{step.title}</p>
                    <p className="text-sm text-slate-200/90">{step.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-300">Client login example</p>
                  <CodeBlock
                    value={[
                      "const response = await fetch('https://auth.example.com/api/v1/login', {",
                      "  method: 'POST',",
                      "  headers: { 'content-type': 'application/json' },",
                      "  credentials: 'include',",
                      "  body: JSON.stringify({ email, password }),",
                      "});",
                      "const payload = await response.json();",
                      "// payload.accessToken contains the JWT",
                    ].join("\n")}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-300">Refresh example</p>
                  <CodeBlock
                    value={[
                      "const refreshed = await fetch('https://auth.example.com/api/v1/refresh', {",
                      "  method: 'POST',",
                      "  credentials: 'include',",
                      "});",
                      "const data = await refreshed.json();",
                      "// data.accessToken is a new JWT",
                    ].join("\n")}
                  />
                </div>
              </div>
            </section>

            <section id="auth" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Authentication Model</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                The service returns access tokens in JSON responses and stores refresh tokens in an HttpOnly cookie. Keep
                access tokens in memory and refresh them when they expire. Use the JWKS endpoint to verify tokens on your
                backend.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Signup secret</p>
                  <p className="mt-2">
                    Include the header <span className="font-mono">x-way-signup-secret</span> on all /api/v1/signup
                    requests. Signups are rejected when the secret is missing or invalid.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Bearer access tokens</p>
                  <p className="mt-2">
                    Send <span className="font-mono">Authorization: Bearer &lt;token&gt;</span> to /api/v1/me and your
                    downstream APIs.
                  </p>
                </div>
              </div>
            </section>

            <section id="tokens" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Token Details</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                    className="rounded-xl border border-slate-600/40 bg-slate-950/40 px-4 py-4 text-sm text-slate-200/90"
                  >
                    <p className="text-xs font-semibold uppercase text-slate-300">{item.title}</p>
                    <p className="mt-2 text-base font-semibold text-slate-100">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-200/90">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="cookies" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Refresh Cookie</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Cookie attributes</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-200/90">
                    <li>HttpOnly, SameSite=Lax, Path=/</li>
                    <li>Secure in production</li>
                    <li>Max-Age = 30 days</li>
                    <li>Name set by REFRESH_COOKIE_NAME</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Client requirement</p>
                  <p className="mt-2">
                    Browser clients must send <span className="font-mono">credentials: 'include'</span> so the refresh
                    cookie is set and sent with requests.
                  </p>
                </div>
              </div>
            </section>

            <section id="cors" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">CORS</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                CORS is enforced against a server-managed allowlist. Same-origin requests are always allowed. If you need
                a browser app from another origin, add it via the admin CORS endpoints.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Allowed headers</p>
                  <p className="mt-2 font-mono">content-type, authorization</p>
                </div>
                <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                  <p className="font-semibold text-slate-100">Allowed methods</p>
                  <p className="mt-2 font-mono">GET, POST, OPTIONS</p>
                </div>
              </div>
            </section>

            <section id="rate-limits" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Rate Limits</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                Sliding-window limits are enforced per IP. When exceeded, the API returns 429 with error code
                <span className="font-mono"> rate_limited</span>.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { route: "/api/v1/signup", limit: "5 / 10 minutes" },
                  { route: "/api/v1/login", limit: "10 / 10 minutes" },
                  { route: "/api/v1/refresh", limit: "20 / 10 minutes" },
                ].map((limit) => (
                  <div
                    key={limit.route}
                    className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90"
                  >
                    <p className="font-semibold text-slate-100">{limit.route}</p>
                    <p className="mt-2">{limit.limit}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="errors" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Error Format</h2>
              <p className="mt-4 text-sm text-slate-200/90">
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
            </section>

            <section id="endpoints" className="space-y-6">
              <div className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
                <h2 className="font-display text-2xl text-[#c8ef97]">Endpoints</h2>
                <p className="mt-4 text-sm text-slate-200/90">
                  Each endpoint below includes required auth, payloads, and examples. Expand the list as new routes are
                  added.
                </p>
              </div>

              {endpointGroups.map((group) => (
                <div key={group.id} className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
                  <h3 className="font-display text-xl text-slate-100">{group.title}</h3>
                  <p className="mt-2 text-sm text-slate-200/90">{group.description}</p>
                  <div className="mt-6 space-y-6">
                    {group.endpoints.map((endpoint) => (
                      <div key={endpoint.id} className="rounded-2xl border border-slate-600/40 bg-slate-950/40 p-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={endpoint.method} />
                          <span className="font-mono text-sm text-slate-200">{endpoint.path}</span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-slate-100">{endpoint.name}</p>
                          <p className="mt-2 text-sm text-slate-200/90">{endpoint.summary}</p>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-xs text-slate-200/90">
                            <p className="font-semibold text-slate-100">Auth</p>
                            <p className="mt-1">{endpoint.auth}</p>
                          </div>
                          {endpoint.rateLimit ? (
                            <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-xs text-slate-200/90">
                              <p className="font-semibold text-slate-100">Rate limit</p>
                              <p className="mt-1">{endpoint.rateLimit}</p>
                            </div>
                          ) : null}
                        </div>

                        {endpoint.request ? (
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-slate-300">Request</p>
                              {endpoint.request.headers ? (
                                <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-xs text-slate-200/90">
                                  <p className="font-semibold text-slate-100">Headers</p>
                                  <ul className="mt-2 space-y-1">
                                    {endpoint.request.headers.map((header) => (
                                      <li key={header} className="font-mono">
                                        {header}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {endpoint.request.body ? <CodeBlock value={endpoint.request.body} /> : null}
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-slate-300">Response</p>
                              {endpoint.response ? <CodeBlock value={endpoint.response} /> : null}
                            </div>
                          </div>
                        ) : null}

                        {endpoint.errors && endpoint.errors.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 text-xs text-slate-200/90">
                            <p className="font-semibold text-slate-100">Common errors</p>
                            <p className="mt-2 font-mono">{endpoint.errors.join(", ")}</p>
                          </div>
                        ) : null}

                        {endpoint.example ? (
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-slate-300">Example request</p>
                              <CodeBlock value={endpoint.example.request} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase text-slate-300">Example response</p>
                              <CodeBlock value={endpoint.example.response} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section id="admin" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Admin Access</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                Admin endpoints require a valid refresh session cookie and an email present in the ADMIN_EMAILS
                allowlist. These routes are intended for managing CORS origins and other operational tasks.
              </p>
              <div className="mt-4 rounded-xl border border-slate-600/40 bg-slate-950/40 p-4 text-sm text-slate-200/90">
                <p className="font-semibold text-slate-100">Admin emails</p>
                <p className="mt-2">
                  ADMIN_EMAILS is a comma-separated list. Only those users may call /api/v1/admin/* routes.
                </p>
              </div>
            </section>

            <section id="debug" className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-6">
              <h2 className="font-display text-2xl text-[#c8ef97]">Debug Endpoint (Development Only)</h2>
              <p className="mt-4 text-sm text-slate-200/90">
                Use <span className="font-mono">GET /api/v1/_debug/cookie</span> in development to confirm the refresh
                cookie is present. The endpoint returns 404 outside of development.
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
            </section>

            <footer className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-600/35 bg-slate-900/40 px-5 py-4 text-xs text-slate-200/80 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <Image src="/way-asset-logo.png" alt="WAY shield logo" width={28} height={28} className="h-7 w-7" />
                <span>WAY Auth Service • v1 API Docs</span>
              </div>
              <span>Last updated with current API behavior.</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
