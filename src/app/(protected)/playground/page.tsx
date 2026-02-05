"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type CredentialsMode = "same-origin" | "include" | "omit";

type RequestPreset = {
  id: string;
  label: string;
  method: HttpMethod;
  path: string;
  body: string;
};

type ValidationErrors = {
  path?: string;
  headers?: string;
  body?: string;
};

type RequestSnapshot = {
  method: HttpMethod;
  path: string;
  headersText: string;
  bodyText: string;
  credentials: CredentialsMode;
};

type ResponseSnapshot = {
  status: number;
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  rawBody: string;
  parsedBody: unknown | null;
  parseError: string | null;
  timestamp: string;
  networkError: string | null;
};

type HistoryEntry = {
  id: string;
  request: RequestSnapshot;
  response: ResponseSnapshot;
};

type CookieProbePayload = {
  cookieName: string;
  present: boolean;
  checkedAt: string;
};

type CookieProbeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; payload: CookieProbePayload }
  | { status: "error"; message: string };

type ScenarioLogEntry = {
  id: string;
  name: string;
  status: "pass" | "fail";
  detail: string;
  timestamp: string;
};

const CUSTOM_PRESET_ID = "__custom__";
const SIGNUP_SECRET_HEADER = "x-way-signup-secret";

const REQUEST_PRESETS: RequestPreset[] = [
  {
    id: "signup",
    label: "POST /api/v1/signup",
    method: "POST",
    path: "/api/v1/signup",
    body: JSON.stringify({ email: "you@example.com", password: "StrongPass123!" }, null, 2),
  },
  {
    id: "login",
    label: "POST /api/v1/login",
    method: "POST",
    path: "/api/v1/login",
    body: JSON.stringify({ email: "you@example.com", password: "StrongPass123!" }, null, 2),
  },
  {
    id: "refresh",
    label: "POST /api/v1/refresh",
    method: "POST",
    path: "/api/v1/refresh",
    body: "",
  },
  {
    id: "logout",
    label: "POST /api/v1/logout",
    method: "POST",
    path: "/api/v1/logout",
    body: "",
  },
  {
    id: "me",
    label: "GET /api/v1/me",
    method: "GET",
    path: "/api/v1/me",
    body: "",
  },
  {
    id: "jwks",
    label: "GET /api/v1/jwks",
    method: "GET",
    path: "/api/v1/jwks",
    body: "",
  },
];

function methodSupportsBody(method: HttpMethod): boolean {
  return method !== "GET";
}

function parseJson(text: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text), error: null };
  } catch {
    return { value: null, error: "Invalid JSON." };
  }
}

function parseHeaders(text: string): { value: Record<string, string>; error: string | null } {
  if (!text.trim()) {
    return { value: {}, error: null };
  }

  const parsed = parseJson(text);
  if (parsed.error) {
    return { value: {}, error: "Headers must be valid JSON object." };
  }

  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return { value: {}, error: "Headers must be a JSON object like {\"content-type\":\"application/json\"}." };
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.value)) {
    headers[key] = String(value);
  }

  return { value: headers, error: null };
}

function isMeRequest(method: HttpMethod, path: string): boolean {
  const normalizedPath = path.split("?")[0]?.trim() ?? "";
  return method === "GET" && normalizedPath.endsWith("/api/v1/me");
}

function extractAccessTokenFromResponse(response: ResponseSnapshot): string | null {
  if (!response.parsedBody || typeof response.parsedBody !== "object") {
    return null;
  }

  const parsed = response.parsedBody as Record<string, unknown>;
  return typeof parsed.accessToken === "string" ? parsed.accessToken : null;
}

function maskToken(token: string): string {
  if (token.length <= 20) {
    return token;
  }

  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

function StatusBadge({ status, ok }: { status: number; ok: boolean }) {
  const color = ok
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
    : "bg-red-500/10 text-red-300 border-red-500/20";
  return (
    <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${color}`}>
      {status}
    </span>
  );
}

export default function PlaygroundPage() {
  const initialPreset = REQUEST_PRESETS[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPreset.id);
  const [method, setMethod] = useState<HttpMethod>(initialPreset.method);
  const [path, setPath] = useState<string>(initialPreset.path);
  const [headersText, setHeadersText] = useState<string>(JSON.stringify({}, null, 2));
  const [bodyText, setBodyText] = useState<string>(initialPreset.body);
  const [credentialsMode, setCredentialsMode] = useState<CredentialsMode>("same-origin");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [currentResponse, setCurrentResponse] = useState<ResponseSnapshot | null>(null);
  const [requestHistory, setRequestHistory] = useState<HistoryEntry[]>([]);
  const [cookieProbe, setCookieProbe] = useState<CookieProbeState>({ status: "idle" });
  const [isRunningScenario, setIsRunningScenario] = useState<boolean>(false);
  const [scenarioLog, setScenarioLog] = useState<ScenarioLogEntry[]>([]);
  const [latestAccessToken, setLatestAccessToken] = useState<string | null>(null);
  const [useLatestAccessTokenForMe, setUseLatestAccessTokenForMe] = useState<boolean>(true);

  function pushScenarioLog(entry: Omit<ScenarioLogEntry, "id" | "timestamp">) {
    setScenarioLog((previous) => [
      ...previous,
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function recordRequest(request: RequestSnapshot, response: ResponseSnapshot) {
    setCurrentResponse(response);
    setRequestHistory((previous) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        request,
        response,
      },
      ...previous,
    ]);

    const latestToken = extractAccessTokenFromResponse(response);
    if (latestToken) {
      setLatestAccessToken(latestToken);
    }

    const normalizedPath = request.path.split("?")[0]?.trim() ?? "";
    if (normalizedPath.endsWith("/api/v1/logout") && response.ok) {
      setLatestAccessToken(null);
    }
  }

  async function executeRequest(requestSnapshot: RequestSnapshot): Promise<ResponseSnapshot> {
    const parsedHeaders = parseHeaders(requestSnapshot.headersText);
    if (parsedHeaders.error) {
      return {
        status: 0,
        ok: false,
        durationMs: 0,
        headers: {},
        rawBody: "",
        parsedBody: null,
        parseError: parsedHeaders.error,
        timestamp: new Date().toISOString(),
        networkError: "Unable to parse request headers.",
      };
    }

    let parsedBody: unknown = null;
    if (methodSupportsBody(requestSnapshot.method) && requestSnapshot.bodyText.trim()) {
      const parsed = parseJson(requestSnapshot.bodyText);
      if (parsed.error) {
        return {
          status: 0,
          ok: false,
          durationMs: 0,
          headers: {},
          rawBody: "",
          parsedBody: null,
          parseError: "Body must be valid JSON.",
          timestamp: new Date().toISOString(),
          networkError: "Unable to parse request body.",
        };
      }
      parsedBody = parsed.value;
    }

    const normalizedHeaders = { ...parsedHeaders.value };
    if (methodSupportsBody(requestSnapshot.method) && requestSnapshot.bodyText.trim()) {
      const hasContentType = Object.keys(normalizedHeaders).some(
        (key) => key.toLowerCase() === "content-type",
      );
      if (!hasContentType) {
        normalizedHeaders["content-type"] = "application/json";
      }
    }

    const startedAt = performance.now();

    try {
      const response = await fetch(requestSnapshot.path, {
        method: requestSnapshot.method,
        credentials: requestSnapshot.credentials,
        headers: Object.keys(normalizedHeaders).length > 0 ? normalizedHeaders : undefined,
        body:
          methodSupportsBody(requestSnapshot.method) && requestSnapshot.bodyText.trim()
            ? JSON.stringify(parsedBody)
            : undefined,
      });

      const rawBody = await response.text();
      let parsedResponseBody: unknown | null = null;
      let parseError: string | null = null;

      if (rawBody.trim()) {
        try {
          parsedResponseBody = JSON.parse(rawBody);
        } catch {
          parseError = "Response is not valid JSON.";
        }
      }

      const headerMap: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerMap[key] = value;
      });

      return {
        status: response.status,
        ok: response.ok,
        durationMs: Math.round(performance.now() - startedAt),
        headers: headerMap,
        rawBody,
        parsedBody: parsedResponseBody,
        parseError,
        timestamp: new Date().toISOString(),
        networkError: null,
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        headers: {},
        rawBody: "",
        parsedBody: null,
        parseError: null,
        timestamp: new Date().toISOString(),
        networkError: error instanceof Error ? error.message : "Unknown network error.",
      };
    }
  }

  function applyPreset(presetId: string) {
    const preset = REQUEST_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      setSelectedPresetId(CUSTOM_PRESET_ID);
      return;
    }

    setSelectedPresetId(preset.id);
    setMethod(preset.method);
    setPath(preset.path);
    setBodyText(preset.body);
    setValidationErrors({});
  }

  async function handleSendRequest() {
    const nextErrors: ValidationErrors = {};

    if (!path.trim()) {
      nextErrors.path = "Path is required.";
    }

    const parsedHeaders = parseHeaders(headersText);
    if (parsedHeaders.error) {
      nextErrors.headers = parsedHeaders.error;
    }

    if (methodSupportsBody(method) && bodyText.trim()) {
      const bodyParse = parseJson(bodyText);
      if (bodyParse.error) {
        nextErrors.body = "Body must be valid JSON.";
      }
    }

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    let nextHeadersText = headersText;
    if (useLatestAccessTokenForMe && latestAccessToken && isMeRequest(method, path.trim())) {
      const headersObject = { ...parsedHeaders.value, authorization: `Bearer ${latestAccessToken}` };
      nextHeadersText = JSON.stringify(headersObject, null, 2);
      if (nextHeadersText !== headersText) {
        setHeadersText(nextHeadersText);
      }
    }

    const requestSnapshot: RequestSnapshot = {
      method,
      path: path.trim(),
      headersText: nextHeadersText,
      bodyText,
      credentials: credentialsMode,
    };

    setIsSending(true);
    try {
      const responseSnapshot = await executeRequest(requestSnapshot);
      recordRequest(requestSnapshot, responseSnapshot);
    } finally {
      setIsSending(false);
    }
  }

  function loadHistoryItem(item: HistoryEntry) {
    setSelectedPresetId(CUSTOM_PRESET_ID);
    setMethod(item.request.method);
    setPath(item.request.path);
    setHeadersText(item.request.headersText);
    setBodyText(item.request.bodyText);
    setCredentialsMode(item.request.credentials);
    setValidationErrors({});
  }

  async function fetchCookieProbe(): Promise<
    { ok: true; payload: CookieProbePayload } | { ok: false; message: string }
  > {
    try {
      const response = await fetch("/api/v1/_debug/cookie", {
        method: "GET",
        credentials: "same-origin",
      });

      const text = await response.text();
      const parsed = text ? parseJson(text).value : null;

      if (!response.ok) {
        let errorMessage = `Probe failed with status ${response.status}.`;
        if (
          parsed &&
          typeof parsed === "object" &&
          "error" in parsed &&
          parsed.error &&
          typeof parsed.error === "object" &&
          "message" in parsed.error &&
          typeof parsed.error.message === "string"
        ) {
          errorMessage = parsed.error.message;
        }

        setCookieProbe({
          status: "error",
          message: errorMessage,
        });
        return { ok: false, message: errorMessage };
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("cookieName" in parsed) ||
        !("present" in parsed) ||
        !("checkedAt" in parsed)
      ) {
        setCookieProbe({
          status: "error",
          message: "Probe response shape was unexpected.",
        });
        return { ok: false, message: "Probe response shape was unexpected." };
      }

      return {
        ok: true,
        payload: {
          cookieName: String(parsed.cookieName),
          present: Boolean(parsed.present),
          checkedAt: String(parsed.checkedAt),
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Cookie probe failed.",
      };
    }
  }

  async function checkCookiePresence() {
    setCookieProbe({ status: "loading" });
    const result = await fetchCookieProbe();
    if (result.ok) {
      setCookieProbe({ status: "success", payload: result.payload });
      return;
    }

    setCookieProbe({ status: "error", message: result.message });
  }

  async function runFullAuthScenario() {
    if (isRunningScenario || isSending) {
      return;
    }

    setIsRunningScenario(true);
    setScenarioLog([]);
    setCookieProbe({ status: "idle" });

    const scenarioEmail = `playground+${Date.now()}@example.com`;
    const scenarioPassword = "StrongPass123!";

    const scenarioHeaderParse = parseHeaders(headersText);
    if (scenarioHeaderParse.error) {
      pushScenarioLog({
        name: "Scenario setup",
        status: "fail",
        detail: scenarioHeaderParse.error,
      });
      setIsRunningScenario(false);
      return;
    }

    const scenarioSignupSecret = scenarioHeaderParse.value[SIGNUP_SECRET_HEADER];
    const scenarioHeaders = JSON.stringify(
      scenarioSignupSecret
        ? { "content-type": "application/json", [SIGNUP_SECRET_HEADER]: scenarioSignupSecret }
        : { "content-type": "application/json" },
      null,
      2,
    );

    const runRequestStep = async (
      name: string,
      request: RequestSnapshot,
      expectedStatus: number,
    ): Promise<ResponseSnapshot> => {
      const response = await executeRequest(request);
      recordRequest(request, response);

      if (response.status !== expectedStatus) {
        pushScenarioLog({
          name,
          status: "fail",
          detail: `Expected ${expectedStatus}, got ${response.status}.`,
        });
        throw new Error(name);
      }

      pushScenarioLog({
        name,
        status: "pass",
        detail: `Received expected status ${expectedStatus}.`,
      });
      return response;
    };

    const runCookieStep = async (name: string, expectedPresent: boolean) => {
      setCookieProbe({ status: "loading" });
      const result = await fetchCookieProbe();

      if (!result.ok) {
        setCookieProbe({ status: "error", message: result.message });
        pushScenarioLog({
          name,
          status: "fail",
          detail: result.message,
        });
        throw new Error(name);
      }

      setCookieProbe({ status: "success", payload: result.payload });

      if (result.payload.present !== expectedPresent) {
        pushScenarioLog({
          name,
          status: "fail",
          detail: `Expected present=${expectedPresent}, got present=${result.payload.present}.`,
        });
        throw new Error(name);
      }

      pushScenarioLog({
        name,
        status: "pass",
        detail: `Cookie present=${result.payload.present} as expected.`,
      });
    };

    try {
      await runRequestStep(
        "1) Signup new user",
        {
          method: "POST",
          path: "/api/v1/signup",
          headersText: scenarioHeaders,
          bodyText: JSON.stringify({ email: scenarioEmail, password: scenarioPassword }, null, 2),
          credentials: "same-origin",
        },
        200,
      );

      await runCookieStep("2) Cookie probe after signup", true);

      await runRequestStep(
        "3) Refresh session token",
        {
          method: "POST",
          path: "/api/v1/refresh",
          headersText: JSON.stringify({}, null, 2),
          bodyText: "",
          credentials: "same-origin",
        },
        200,
      );

      await runRequestStep(
        "4) Refresh again",
        {
          method: "POST",
          path: "/api/v1/refresh",
          headersText: JSON.stringify({}, null, 2),
          bodyText: "",
          credentials: "same-origin",
        },
        200,
      );

      await runRequestStep(
        "5) Logout",
        {
          method: "POST",
          path: "/api/v1/logout",
          headersText: JSON.stringify({}, null, 2),
          bodyText: "",
          credentials: "same-origin",
        },
        200,
      );

      await runCookieStep("6) Cookie probe after logout", false);

      await runRequestStep(
        "7) Refresh after logout (should fail)",
        {
          method: "POST",
          path: "/api/v1/refresh",
          headersText: JSON.stringify({}, null, 2),
          bodyText: "",
          credentials: "same-origin",
        },
        401,
      );

      await runRequestStep(
        "8) Login existing user",
        {
          method: "POST",
          path: "/api/v1/login",
          headersText: scenarioHeaders,
          bodyText: JSON.stringify({ email: scenarioEmail, password: scenarioPassword }, null, 2),
          credentials: "same-origin",
        },
        200,
      );

      await runCookieStep("9) Cookie probe after login", true);
    } catch {
      pushScenarioLog({
        name: "Scenario",
        status: "fail",
        detail: "Scenario stopped at first failing step.",
      });
    } finally {
      setIsRunningScenario(false);
    }
  }

  const selectClass =
    "w-full rounded-lg border border-slate-600/30 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-[#9fdd58]/40";
  const inputClass =
    "w-full rounded-lg border border-slate-600/30 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#9fdd58]/40";
  const textareaClass =
    "w-full rounded-lg border border-slate-600/30 bg-slate-950/60 p-3 font-mono text-xs text-slate-200 outline-none transition focus:border-[#9fdd58]/40";

  return (
    <div className="min-h-screen px-5 py-8 text-slate-100 md:px-8 md:py-10">
      <main className="mx-auto max-w-7xl space-y-5">
        {/* ── Nav ── */}
        <nav className="animate-fade-in-up glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Image src="/way-asset-logo.png" alt="WAY Auth" width={36} height={36} className="h-9 w-9" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">WAY Auth</p>
              <p className="font-display text-base tracking-wide">API Playground</p>
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
              href="/docs"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Docs
            </Link>
            <Link
              href="/playground"
              className="rounded-lg border border-[#9fdd58]/25 bg-[#9fdd58]/8 px-3 py-2 text-xs font-semibold text-[#c8ef97]"
            >
              Playground
            </Link>
            <Link
              href="/admin/cors"
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              CORS Admin
            </Link>
          </div>
        </nav>

        {/* ── Notice bar ── */}
        <div className="animate-fade-in-up delay-100 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/80">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">
            <span className="font-mono">Set-Cookie</span> headers and HttpOnly cookie values are hidden from JavaScript.
            Use the cookie probe below to verify refresh cookie presence.
          </span>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* ── Request composer ── */}
          <section className="animate-fade-in-up delay-200 rounded-2xl border border-slate-600/15 bg-[linear-gradient(160deg,rgba(15,23,41,0.75),rgba(21,36,61,0.45))] p-5 lg:col-span-7">
            <h2 className="font-display text-lg tracking-wide text-slate-100">Request Composer</h2>

            {/* Preset + credentials row */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs">
                <span className="font-medium uppercase tracking-wider text-slate-400">Preset</span>
                <select
                  value={selectedPresetId}
                  onChange={(event) => applyPreset(event.target.value)}
                  className={selectClass}
                >
                  {REQUEST_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                  <option value={CUSTOM_PRESET_ID}>Custom</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-medium uppercase tracking-wider text-slate-400">Credentials</span>
                <select
                  value={credentialsMode}
                  onChange={(event) => setCredentialsMode(event.target.value as CredentialsMode)}
                  className={selectClass}
                >
                  <option value="same-origin">same-origin</option>
                  <option value="include">include</option>
                  <option value="omit">omit</option>
                </select>
              </label>
            </div>

            {/* Auto token injection */}
            <div className="mt-3 rounded-lg border border-slate-700/20 bg-slate-950/30 p-3 text-xs text-slate-400">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={useLatestAccessTokenForMe}
                  onChange={(event) => setUseLatestAccessTokenForMe(event.target.checked)}
                  className="mt-0.5 accent-[#9fdd58]"
                />
                <span>
                  Auto-inject latest access token for <span className="font-mono text-slate-300">GET /api/v1/me</span>
                </span>
              </label>
              <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                {latestAccessToken ? `Token: ${maskToken(latestAccessToken)}` : "No token captured yet"}
              </p>
            </div>

            {/* Method + path */}
            <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
              <label className="space-y-1.5 text-xs">
                <span className="font-medium uppercase tracking-wider text-slate-400">Method</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as HttpMethod)}
                  className={selectClass}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs">
                <span className="font-medium uppercase tracking-wider text-slate-400">Path</span>
                <input
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  className={inputClass}
                  placeholder="/api/v1/signup"
                />
                {validationErrors.path && <p className="text-red-400">{validationErrors.path}</p>}
              </label>
            </div>

            {/* Headers */}
            <label className="mt-4 block space-y-1.5 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400">Headers (JSON)</span>
              <textarea
                value={headersText}
                onChange={(event) => setHeadersText(event.target.value)}
                className={`h-32 ${textareaClass}`}
                spellCheck={false}
              />
              {validationErrors.headers && <p className="text-red-400">{validationErrors.headers}</p>}
              {selectedPresetId === "signup" && (
                <p className="text-slate-500">
                  Include <span className="font-mono text-slate-400">{`"${SIGNUP_SECRET_HEADER}": "your-secret"`}</span> if signup is restricted.
                </p>
              )}
            </label>

            {/* Body */}
            <label className="mt-4 block space-y-1.5 text-xs">
              <span className="font-medium uppercase tracking-wider text-slate-400">Body (JSON)</span>
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                className={`h-40 ${textareaClass}`}
                spellCheck={false}
                placeholder={methodSupportsBody(method) ? '{\n  "key": "value"\n}' : "Method does not use body"}
              />
              {validationErrors.body && <p className="text-red-400">{validationErrors.body}</p>}
            </label>

            {/* Action buttons */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={isSending || isRunningScenario}
                className="rounded-lg bg-[#9fdd58] px-5 py-2.5 text-sm font-semibold text-[#07101c] transition hover:bg-[#8ed14c] hover:shadow-[0_0_20px_rgba(159,221,88,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send Request"}
              </button>
              <button
                type="button"
                onClick={checkCookiePresence}
                disabled={isRunningScenario}
                className="rounded-lg border border-slate-500/30 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-400/40 hover:bg-white/[0.07]"
              >
                Check Cookie
              </button>
              <button
                type="button"
                onClick={runFullAuthScenario}
                disabled={isSending || isRunningScenario}
                className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunningScenario ? "Running..." : "Full Auth Scenario"}
              </button>
            </div>

            {/* Cookie probe result */}
            <div className="mt-4 rounded-lg border border-slate-700/20 bg-slate-950/30 p-3 text-xs">
              <p className="font-medium text-slate-300">Cookie Probe</p>
              {cookieProbe.status === "idle" && <p className="mt-1 text-slate-500">No probe run yet.</p>}
              {cookieProbe.status === "loading" && (
                <p className="mt-1 text-slate-400">Checking...</p>
              )}
              {cookieProbe.status === "error" && <p className="mt-1 text-red-400">{cookieProbe.message}</p>}
              {cookieProbe.status === "success" && (
                <pre className="code-block mt-2 !p-2 !text-[11px]">
                  {JSON.stringify(cookieProbe.payload, null, 2)}
                </pre>
              )}
            </div>

            {/* Scenario runner */}
            <div className="mt-4 rounded-lg border border-slate-700/20 bg-slate-950/30 p-3 text-xs">
              <p className="font-medium text-slate-300">Full Scenario</p>
              <p className="mt-1 text-slate-500">
                Signup, cookie check, refresh x2, logout, cookie check, refresh fail, login, cookie check.
              </p>
              {scenarioLog.length === 0 && <p className="mt-2 text-slate-500">No scenario run yet.</p>}
              {scenarioLog.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {scenarioLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-lg border p-2.5 ${
                        entry.status === "pass"
                          ? "border-emerald-500/15 bg-emerald-500/5"
                          : "border-red-500/15 bg-red-500/5"
                      }`}
                    >
                      <p className="font-medium">
                        <span
                          className={`mr-1.5 font-mono text-[11px] font-bold ${
                            entry.status === "pass" ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {entry.status === "pass" ? "PASS" : "FAIL"}
                        </span>
                        <span className="text-slate-300">{entry.name}</span>
                      </p>
                      <p className="mt-1 text-slate-400">{entry.detail}</p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Response + History ── */}
          <section className="space-y-5 lg:col-span-5">
            {/* Latest response */}
            <article className="animate-fade-in-up delay-300 rounded-2xl border border-slate-600/15 bg-[linear-gradient(160deg,rgba(15,23,41,0.75),rgba(21,36,61,0.45))] p-5">
              <h2 className="font-display text-lg tracking-wide text-slate-100">Response</h2>
              {!currentResponse && <p className="mt-3 text-sm text-slate-500">No response yet.</p>}
              {currentResponse && (
                <div className="mt-3 space-y-3 text-sm">
                  {/* Status grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-lg border border-slate-700/20 bg-slate-950/30 p-2.5">
                      <p className="text-[11px] text-slate-500">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={currentResponse.status} ok={currentResponse.ok} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-700/20 bg-slate-950/30 p-2.5">
                      <p className="text-[11px] text-slate-500">Duration</p>
                      <p className="mt-1 font-mono font-semibold text-slate-200">{currentResponse.durationMs} ms</p>
                    </div>
                  </div>

                  {currentResponse.networkError && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-300">
                      Network error: {currentResponse.networkError}
                    </div>
                  )}

                  {/* Response headers */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Headers</p>
                    <pre className="code-block max-h-36 !text-[11px]">
                      {JSON.stringify(currentResponse.headers, null, 2)}
                    </pre>
                  </div>

                  {/* Response body */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Body</p>
                    <pre className="code-block max-h-44 !text-[11px]">
                      {currentResponse.parsedBody !== null
                        ? JSON.stringify(currentResponse.parsedBody, null, 2)
                        : currentResponse.rawBody || "(empty)"}
                    </pre>
                    {currentResponse.parseError && (
                      <p className="mt-1 text-[11px] text-amber-400">{currentResponse.parseError}</p>
                    )}
                  </div>
                </div>
              )}
            </article>

            {/* Request history */}
            <article className="animate-fade-in-up delay-400 rounded-2xl border border-slate-600/15 bg-[linear-gradient(160deg,rgba(15,23,41,0.75),rgba(21,36,61,0.45))] p-5">
              <h2 className="font-display text-lg tracking-wide text-slate-100">History</h2>
              {requestHistory.length === 0 && <p className="mt-3 text-sm text-slate-500">No requests yet.</p>}
              <div className="mt-3 space-y-2">
                {requestHistory.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-700/15 bg-slate-950/25 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.response.status} ok={item.response.ok} />
                        <span className="font-mono text-xs text-slate-300">
                          {item.request.method} {item.request.path}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadHistoryItem(item)}
                        className="rounded-md border border-slate-600/25 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
                      >
                        Load
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      {item.response.durationMs} ms &middot; {new Date(item.response.timestamp).toLocaleTimeString()}
                    </p>
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-medium text-slate-400 transition hover:text-slate-200">
                        View details
                      </summary>
                      <div className="mt-2 grid gap-2">
                        <pre className="code-block max-h-32 !text-[11px]">
                          {JSON.stringify(item.request, null, 2)}
                        </pre>
                        <pre className="code-block max-h-32 !text-[11px]">
                          {JSON.stringify(item.response, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
