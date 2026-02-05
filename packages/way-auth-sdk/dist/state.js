function nowIso() {
    return new Date().toISOString();
}
function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected authentication error.";
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
        catch {
            setUnauthenticated();
            return state;
        }
    }
    async function signup(input) {
        patchState({ status: "loading", errorMessage: null });
        try {
            const result = await client.signup(input);
            setAuthenticated(result.user);
            return state;
        }
        catch (error) {
            patchState({
                status: "error",
                errorMessage: toErrorMessage(error),
                user: null,
                initialized: true,
            });
            throw error;
        }
    }
    async function login(input) {
        patchState({ status: "loading", errorMessage: null });
        try {
            const result = await client.login(input);
            setAuthenticated(result.user);
            return state;
        }
        catch (error) {
            patchState({
                status: "error",
                errorMessage: toErrorMessage(error),
                user: null,
                initialized: true,
            });
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
    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
    return {
        getState,
        subscribe,
        bootstrap,
        signup,
        login,
        refresh,
        me,
        logout,
        fetchWithAuth,
        clearError,
    };
}
//# sourceMappingURL=state.js.map