import type { WayAuthClient } from "./client";
import type { WayAuthCredentialInput, WayAuthSignupInputWithConfirm, WayAuthUser } from "./types";
export type WayAuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
export type WayAuthState = {
    status: WayAuthStatus;
    user: WayAuthUser | null;
    errorMessage: string | null;
    initialized: boolean;
    lastUpdatedAt: string | null;
};
export type WayAuthAuthContext = "bootstrap" | "signup" | "login" | "refresh" | "me" | "logout";
export type WayAuthStateCallbacks = {
    onSignupSuccess?: (state: WayAuthState, user: WayAuthUser) => void;
    onLoginSuccess?: (state: WayAuthState, user: WayAuthUser) => void;
    onLogout?: (state: WayAuthState) => void;
    onAuthError?: (error: unknown, context: WayAuthAuthContext) => void;
};
export type WayAuthStateOptions = {
    initialState?: Partial<WayAuthState>;
    callbacks?: WayAuthStateCallbacks;
};
type Listener = () => void;
export declare function createWayAuthState(client: WayAuthClient, options?: WayAuthStateOptions): {
    getState: () => WayAuthState;
    subscribe: (listener: Listener) => () => void;
    setCallbacks: (nextCallbacks?: WayAuthStateCallbacks) => void;
    bootstrap: () => Promise<WayAuthState>;
    signup: (input: WayAuthCredentialInput) => Promise<WayAuthState>;
    signupWithConfirm: (input: WayAuthSignupInputWithConfirm) => Promise<WayAuthState>;
    login: (input: WayAuthCredentialInput) => Promise<WayAuthState>;
    refresh: () => Promise<WayAuthState>;
    me: () => Promise<WayAuthState>;
    logout: () => Promise<WayAuthState>;
    fetchWithAuth: (input: string | URL, init?: RequestInit) => Promise<Response>;
    clearError: () => void;
};
export type WayAuthStateController = ReturnType<typeof createWayAuthState>;
export {};
//# sourceMappingURL=state.d.ts.map