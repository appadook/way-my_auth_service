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

    const scenarioHeaders = JSON.stringify({ "content-type": "application/json" }, null, 2);

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(159,221,88,0.18)_0%,_rgba(58,95,149,0.28)_40%,_#08101a_88%)] p-6 text-slate-100">
      <main className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-500/45 bg-[linear-gradient(150deg,rgba(10,20,33,0.95),rgba(20,34,58,0.86))] p-6 shadow-[0_18px_48px_rgba(2,6,23,0.42)] backdrop-blur">
          <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-slate-300/25 bg-slate-900/40 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-[#9fdd58]/55"
              >
                Back To Service Home
              </Link>
              <Image
                src="/way-asset-logo.png"
                alt="WAY Auth shield logo"
                width={405}
                height={370}
                className="mt-4 h-auto w-24 md:w-28"
                priority
              />
              <h1 className="font-display mt-4 text-2xl tracking-tight md:text-3xl">API Playground</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200/90">
                Same-origin browser tester for auth routes. Use this to validate real browser cookie behavior, request
                payloads, and response contracts before wiring client apps.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-400/25 bg-slate-900/45 p-3">
              <Image
                src="/way-asset-marketing-1.png"
                alt="JWT security visual"
                width={607}
                height={313}
                className="h-auto w-full"
              />
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-amber-200/30 bg-amber-100/90 p-3 text-sm text-amber-950">
            `Set-Cookie` headers and HttpOnly cookie values are intentionally hidden from browser JavaScript. Use the
            cookie probe to verify whether the refresh cookie is present.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-300/60 bg-white/90 p-5 text-slate-900 shadow-sm lg:col-span-7">
            <h2 className="font-display text-lg font-semibold">Request Composer</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Preset</span>
                <select
                  value={selectedPresetId}
                  onChange={(event) => applyPreset(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                >
                  {REQUEST_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                  <option value={CUSTOM_PRESET_ID}>Custom</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Credentials</span>
                <select
                  value={credentialsMode}
                  onChange={(event) => setCredentialsMode(event.target.value as CredentialsMode)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                >
                  <option value="same-origin">same-origin</option>
                  <option value="include">include</option>
                  <option value="omit">omit</option>
                </select>
              </label>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={useLatestAccessTokenForMe}
                  onChange={(event) => setUseLatestAccessTokenForMe(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Use latest access token for <span className="font-mono">GET /api/v1/me</span> requests
                </span>
              </label>
              <p className="mt-2 font-mono text-[11px] text-slate-600">
                {latestAccessToken ? `Latest token: ${maskToken(latestAccessToken)}` : "Latest token: (none yet)"}
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[170px_1fr]">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Method</span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as HttpMethod)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Path</span>
                <input
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  placeholder="/api/v1/signup"
                />
                {validationErrors.path && <p className="text-xs text-red-700">{validationErrors.path}</p>}
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-medium">Headers (JSON object)</span>
              <textarea
                value={headersText}
                onChange={(event) => setHeadersText(event.target.value)}
                className="h-36 w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-100"
                spellCheck={false}
              />
              {validationErrors.headers && <p className="text-xs text-red-700">{validationErrors.headers}</p>}
            </label>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-medium">Body (JSON)</span>
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                className="h-44 w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-100"
                spellCheck={false}
                placeholder={methodSupportsBody(method) ? "{\n  \"key\": \"value\"\n}" : "Method does not use body"}
              />
              {validationErrors.body && <p className="text-xs text-red-700">{validationErrors.body}</p>}
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={isSending || isRunningScenario}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send Request"}
              </button>
              <button
                type="button"
                onClick={checkCookiePresence}
                disabled={isRunningScenario}
                className="rounded-lg border border-slate-400 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Check Refresh Cookie Presence
              </button>
              <button
                type="button"
                onClick={runFullAuthScenario}
                disabled={isSending || isRunningScenario}
                className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunningScenario ? "Running Scenario..." : "Run Full Auth Scenario"}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-display font-semibold">Cookie Probe</p>
              {cookieProbe.status === "idle" && <p className="mt-1">No probe run yet.</p>}
              {cookieProbe.status === "loading" && <p className="mt-1">Checking cookie presence...</p>}
              {cookieProbe.status === "error" && <p className="mt-1 text-red-700">{cookieProbe.message}</p>}
              {cookieProbe.status === "success" && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
                  {JSON.stringify(cookieProbe.payload, null, 2)}
                </pre>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-display font-semibold">One-Click Full Scenario</p>
              <p className="mt-1">
                Runs signup, cookie check, refresh x2, logout, cookie check, refresh fail, login, and cookie check.
              </p>
              <p className="mt-1">Uses a generated test email and `same-origin` credentials.</p>
              {scenarioLog.length === 0 && <p className="mt-2">No scenario run yet.</p>}
              {scenarioLog.length > 0 && (
                <div className="mt-2 space-y-2">
                  {scenarioLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-md border p-2 ${
                        entry.status === "pass" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <p className="font-semibold">
                        {entry.status === "pass" ? "PASS" : "FAIL"} - {entry.name}
                      </p>
                      <p className="mt-1">{entry.detail}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6 lg:col-span-5">
            <article className="rounded-2xl border border-slate-300/60 bg-white/90 p-5 text-slate-900 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Latest Response</h2>
              {!currentResponse && <p className="mt-3 text-sm text-slate-600">No response yet.</p>}
              {currentResponse && (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-slate-500">Status</p>
                      <p className="font-semibold">{currentResponse.status}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-slate-500">OK</p>
                      <p className="font-semibold">{String(currentResponse.ok)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-slate-500">Duration</p>
                      <p className="font-semibold">{currentResponse.durationMs} ms</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-slate-500">Timestamp</p>
                      <p className="font-semibold">{new Date(currentResponse.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  {currentResponse.networkError && (
                    <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
                      Network error: {currentResponse.networkError}
                    </p>
                  )}

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Response Headers</p>
                    <pre className="max-h-44 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                      {JSON.stringify(currentResponse.headers, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Response JSON</p>
                    <pre className="max-h-44 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                      {currentResponse.parsedBody !== null
                        ? JSON.stringify(currentResponse.parsedBody, null, 2)
                        : "No JSON body parsed."}
                    </pre>
                    {currentResponse.parseError && <p className="mt-1 text-xs text-amber-700">{currentResponse.parseError}</p>}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Raw Body</p>
                    <pre className="max-h-44 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                      {currentResponse.rawBody || "(empty)"}
                    </pre>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-300/60 bg-white/90 p-5 text-slate-900 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Request History</h2>
              {requestHistory.length === 0 && <p className="mt-3 text-sm text-slate-600">No requests yet.</p>}
              <div className="mt-3 space-y-3">
                {requestHistory.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold">
                        {item.request.method} {item.request.path}
                      </p>
                      <button
                        type="button"
                        onClick={() => loadHistoryItem(item)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        Load Into Editor
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Status {item.response.status} | {item.response.durationMs} ms |{" "}
                      {new Date(item.response.timestamp).toLocaleTimeString()}
                    </p>
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-medium text-slate-700">View snapshots</summary>
                      <div className="mt-2 grid gap-2">
                        <pre className="max-h-36 overflow-auto rounded-md bg-slate-900 p-2 font-mono text-[11px] text-slate-100">
                          {JSON.stringify(item.request, null, 2)}
                        </pre>
                        <pre className="max-h-36 overflow-auto rounded-md bg-slate-900 p-2 font-mono text-[11px] text-slate-100">
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
