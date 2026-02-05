import type { WayAuthClient } from "./client";
import type { WayAuthCredentialInput, WayAuthUser } from "./types";
export type WayAuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
export type WayAuthState = {
    status: WayAuthStatus;
    user: WayAuthUser | null;
    errorMessage: string | null;
    initialized: boolean;
    lastUpdatedAt: string | null;
};
export type WayAuthStateOptions = {
    initialState?: Partial<WayAuthState>;
};
type Listener = () => void;
export declare function createWayAuthState(client: WayAuthClient, options?: WayAuthStateOptions): {
    getState: () => WayAuthState;
    subscribe: (listener: Listener) => () => void;
    bootstrap: () => Promise<WayAuthState>;
    signup: (input: WayAuthCredentialInput) => Promise<WayAuthState>;
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