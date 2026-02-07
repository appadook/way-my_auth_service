import { getWayAuthErrorMessage } from "./errors";
import { validatePasswordConfirmation } from "./validation";
function nowIso() {
    return new Date().toISOString();
}
function toErrorMessage(error) {
    return getWayAuthErrorMessage(error, "Unexpected authentication error.");
}
function getDefaultState() {
    return {
        status: "idle",
        user: null,
        errorMessage: null,
        initialized: false,
        lastUpdatedAt: null,
    };
}
export function createWayAuthState(client, options = {}) {
    let state = {
        ...getDefaultState(),
        ...options.initialState,
    };
    const listeners = new Set();
    let callbacks = options.callbacks ?? {};
    function emit() {
        for (const listener of listeners) {
            listener();
        }
    }
    function patchState(patch) {
        state = {
            ...state,
            ...patch,
            lastUpdatedAt: nowIso(),
        };
        emit();
    }
    function setAuthenticated(user) {
        patchState({
            status: "authenticated",
            user,
            errorMessage: null,
            initialized: true,
        });
    }
    function setUnauthenticated() {
        patchState({
            status: "unauthenticated",
            user: null,
            errorMessage: null,
            initialized: true,
        });
    }
    async function bootstrap() {
        patchState({ status: "loading", errorMessage: null });
        try {
            await client.refresh();
            const me = await client.me();
            setAuthenticated(me.user);
            return state;
        }
        catch (error) {
            setUnauthenticated();
            callbacks.onAuthError?.(error, "bootstrap");
            return state;
        }
    }
    async function signup(input) {
        patchState({ status: "loading", errorMessage: null });
        try {
            const result = await client.signup(input);
            setAuthenticated(result.user);
            callbacks.onSignupSuccess?.(state, result.user);
            return state;
        }
        catch (error) {
            patchState({
                status: "error",
                errorMessage: toErrorMessage(error),
                user: null,
                initialized: true,
            });
            callbacks.onAuthError?.(error, "signup");
            throw error;
        }
    }
    async function signupWithConfirm(input) {
        const validation = validatePasswordConfirmation(input);
        if (!validation.ok) {
            const error = new Error(validation.message);
            patchState({
                status: "error",
                errorMessage: validation.message,
                user: null,
                initialized: true,
            });
            callbacks.onAuthError?.(error, "signup");
            throw error;
        }
        const { confirmPassword: _confirmPassword, ...payload } = input;
        return signup(payload);
    }
    async function login(input) {
        patchState({ status: "loading", errorMessage: null });
        try {
            const result = await client.login(input);
            setAuthenticated(result.user);
            callbacks.onLoginSuccess?.(state, result.user);
            return state;
        }
        catch (error) {
            patchState({
                status: "error",
                errorMessage: toErrorMessage(error),
                user: null,
                initialized: true,
            });
            callbacks.onAuthError?.(error, "login");
            throw error;
        }
    }
    async function refresh() {
        patchState({ status: "loading", errorMessage: null });
        try {
            await client.refresh();
            const me = await client.me();
            setAuthenticated(me.user);
            return state;
        }
        catch (error) {
            setUnauthenticated();
            patchState({
                errorMessage: toErrorMessage(error),
            });
            callbacks.onAuthError?.(error, "refresh");
            throw error;
        }
    }
    async function me() {
        patchState({ status: "loading", errorMessage: null });
        try {
            const result = await client.me();
            setAuthenticated(result.user);
            return state;
        }
        catch (error) {
            patchState({
                status: "error",
                user: null,
                initialized: true,
                errorMessage: toErrorMessage(error),
            });
            callbacks.onAuthError?.(error, "me");
            throw error;
        }
    }
    async function logout() {
        patchState({ status: "loading", errorMessage: null });
        try {
            await client.logout();
        }
        finally {
            setUnauthenticated();
            callbacks.onLogout?.(state);
        }
        return state;
    }
    async function fetchWithAuth(input, init) {
        return client.fetchWithAuth(input, init);
    }
    function clearError() {
        patchState({ errorMessage: null });
    }
    function getState() {
        return state;
    }
    function setCallbacks(nextCallbacks = {}) {
        callbacks = nextCallbacks;
    }
    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
    return {
        getState,
        subscribe,
        setCallbacks,
        bootstrap,
        signup,
        signupWithConfirm,
        login,
        refresh,
        me,
        logout,
        fetchWithAuth,
        clearError,
    };
}
//# sourceMappingURL=state.js.map