const DEFAULT_ENDPOINTS = {
    signup: "/api/v1/signup",
    login: "/api/v1/login",
    refresh: "/api/v1/refresh",
    logout: "/api/v1/logout",
    me: "/api/v1/me",
    jwks: "/api/v1/jwks",
};
export class WayAuthApiError extends Error {
    status;
    code;
    details;
    constructor(message, options) {
        super(message);
        this.name = "WayAuthApiError";
        this.status = options.status;
        this.code = options.code;
        this.details = options.details;
    }
}
export function createInMemoryTokenStore(initialToken = null) {
    let token = initialToken;
    return {
        getAccessToken() {
            return token;
        },
        setAccessToken(nextToken) {
            token = nextToken;
        },
    };
}
function isAbsoluteUrl(value) {
    return value.startsWith("http://") || value.startsWith("https://");
}
function joinUrl(baseUrl, path) {
    if (isAbsoluteUrl(path)) {
        return path;
    }
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
}
function normalizeComparableUrl(value) {
    const parsed = new URL(value);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${normalizedPath}`;
}
function resolveRequestUrl(baseUrl, input) {
    const value = typeof input === "string" ? input : input.toString();
    return joinUrl(baseUrl, value);
}
async function readErrorResponse(response) {
    const rawBody = await response.text();
    if (!rawBody) {
        return new WayAuthApiError(`Request failed with status ${response.status}.`, {
            status: response.status,
            code: null,
            details: null,
        });
    }
    try {
        const parsed = JSON.parse(rawBody);
        const code = parsed?.error?.code ?? null;
        const message = parsed?.error?.message ?? `Request failed with status ${response.status}.`;
        return new WayAuthApiError(message, {
            status: response.status,
            code,
            details: parsed,
        });
    }
    catch {
        return new WayAuthApiError(`Request failed with status ${response.status}.`, {
            status: response.status,
            code: null,
            details: rawBody,
        });
    }
}
async function readJsonResponse(response) {
    const rawBody = await response.text();
    if (!rawBody) {
        if (response.status === 204 || response.status === 205) {
            return undefined;
        }
        throw new WayAuthApiError("Expected JSON response body.", {
            status: response.status,
            code: null,
            details: {
                contentType: response.headers.get("content-type"),
                bodyPreview: "",
            },
        });
    }
    try {
        return JSON.parse(rawBody);
    }
    catch {
        throw new WayAuthApiError("Response body was not valid JSON.", {
            status: response.status,
            code: null,
            details: {
                contentType: response.headers.get("content-type"),
                bodyPreview: rawBody.slice(0, 300),
            },
        });
    }
}
export function createWayAuthClient(options) {
    const fetchImpl = options.fetch ?? fetch;
    const credentials = options.credentials ?? "include";
    const autoRefresh = options.autoRefresh ?? true;
    const tokenStore = options.tokenStore ?? createInMemoryTokenStore();
    const endpoints = {
        ...DEFAULT_ENDPOINTS,
        ...options.endpoints,
    };
    async function getAccessToken() {
        return tokenStore.getAccessToken();
    }
    async function setAccessToken(token) {
        await tokenStore.setAccessToken(token);
    }
    async function requestAuthJson(method, path, body) {
        const response = await fetchImpl(joinUrl(options.baseUrl, path), {
            method,
            credentials,
            headers: body === undefined ? undefined : { "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!response.ok) {
            throw await readErrorResponse(response);
        }
        return readJsonResponse(response);
    }
    async function signup(input) {
        const result = await requestAuthJson("POST", endpoints.signup, input);
        await setAccessToken(result.accessToken);
        return result;
    }
    async function login(input) {
        const result = await requestAuthJson("POST", endpoints.login, input);
        await setAccessToken(result.accessToken);
        return result;
    }
    async function refresh() {
        const result = await requestAuthJson("POST", endpoints.refresh);
        await setAccessToken(result.accessToken);
        return result;
    }
    async function logout() {
        try {
            return await requestAuthJson("POST", endpoints.logout);
        }
        finally {
            await setAccessToken(null);
        }
    }
    async function me() {
        const response = await fetchWithAuth(endpoints.me, {
            method: "GET",
        });
        if (!response.ok) {
            throw await readErrorResponse(response);
        }
        return readJsonResponse(response);
    }
    async function fetchWithAuth(input, init = {}, requestOptions = {}) {
        const url = resolveRequestUrl(options.baseUrl, input);
        const refreshUrl = joinUrl(options.baseUrl, endpoints.refresh);
        const isRefreshRequest = normalizeComparableUrl(url) === normalizeComparableUrl(refreshUrl);
        const headers = new Headers(init.headers);
        const token = await getAccessToken();
        if (token) {
            headers.set("authorization", `Bearer ${token}`);
        }
        const response = await fetchImpl(url, {
            ...init,
            headers,
            credentials: init.credentials ?? credentials,
        });
        const canRetry = autoRefresh &&
            requestOptions.retryOn401 !== false &&
            response.status === 401 &&
            !isRefreshRequest;
        if (!canRetry) {
            return response;
        }
        try {
            await refresh();
        }
        catch {
            await setAccessToken(null);
            return response;
        }
        const retryHeaders = new Headers(init.headers);
        const retryToken = await getAccessToken();
        if (retryToken) {
            retryHeaders.set("authorization", `Bearer ${retryToken}`);
        }
        return fetchImpl(url, {
            ...init,
            headers: retryHeaders,
            credentials: init.credentials ?? credentials,
        });
    }
    return {
        endpoints,
        signup,
        login,
        refresh,
        logout,
        me,
        fetchWithAuth,
        getAccessToken,
        setAccessToken,
        clearAccessToken: async () => setAccessToken(null),
    };
}
//# sourceMappingURL=client.js.map