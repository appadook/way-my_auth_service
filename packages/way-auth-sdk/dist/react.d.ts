import type { WayAuthClient } from "./client";
import { type WayAuthStateController, type WayAuthStateOptions } from "./state";
export declare function useWayAuthState(controller: WayAuthStateController): import("./state").WayAuthState;
export declare function useWayAuthBootstrap(controller: WayAuthStateController, enabled?: boolean): void;
export declare function useCreateWayAuthState(client: WayAuthClient, options?: WayAuthStateOptions): {
    getState: () => import("./state").WayAuthState;
    subscribe: (listener: () => void) => () => void;
    bootstrap: () => Promise<import("./state").WayAuthState>;
    signup: (input: import("./types").WayAuthCredentialInput) => Promise<import("./state").WayAuthState>;
    login: (input: import("./types").WayAuthCredentialInput) => Promise<import("./state").WayAuthState>;
    refresh: () => Promise<import("./state").WayAuthState>;
    me: () => Promise<import("./state").WayAuthState>;
    logout: () => Promise<import("./state").WayAuthState>;
    fetchWithAuth: (input: string | URL, init?: RequestInit) => Promise<Response>;
    clearError: () => void;
};
//# sourceMappingURL=react.d.ts.map