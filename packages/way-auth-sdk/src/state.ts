import type { WayAuthClient } from "./client";
import { getWayAuthErrorMessage } from "./errors";
import type { WayAuthCredentialInput, WayAuthSignupInputWithConfirm, WayAuthUser } from "./types";
import { validatePasswordConfirmation } from "./validation";

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

function nowIso(): string {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown): string {
  return getWayAuthErrorMessage(error, "Unexpected authentication error.");
}

function getDefaultState(): WayAuthState {
  return {
    status: "idle",
    user: null,
    errorMessage: null,
    initialized: false,
    lastUpdatedAt: null,
  };
}

export function createWayAuthState(client: WayAuthClient, options: WayAuthStateOptions = {}) {
  let state: WayAuthState = {
    ...getDefaultState(),
    ...options.initialState,
  };

  const listeners = new Set<Listener>();
  let callbacks = options.callbacks ?? {};

  function emit() {
    for (const listener of listeners) {
      listener();
    }
  }

  function patchState(patch: Partial<WayAuthState>) {
    state = {
      ...state,
      ...patch,
      lastUpdatedAt: nowIso(),
    };
    emit();
  }

  function setAuthenticated(user: WayAuthUser) {
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

  async function bootstrap(): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      await client.refresh();
      const me = await client.me();
      setAuthenticated(me.user);
      return state;
    } catch (error) {
      setUnauthenticated();
      callbacks.onAuthError?.(error, "bootstrap");
      return state;
    }
  }

  async function signup(input: WayAuthCredentialInput): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      const result = await client.signup(input);
      setAuthenticated(result.user);
      callbacks.onSignupSuccess?.(state, result.user);
      return state;
    } catch (error) {
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

  async function signupWithConfirm(input: WayAuthSignupInputWithConfirm): Promise<WayAuthState> {
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

  async function login(input: WayAuthCredentialInput): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      const result = await client.login(input);
      setAuthenticated(result.user);
      callbacks.onLoginSuccess?.(state, result.user);
      return state;
    } catch (error) {
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

  async function refresh(): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      await client.refresh();
      const me = await client.me();
      setAuthenticated(me.user);
      return state;
    } catch (error) {
      setUnauthenticated();
      patchState({
        errorMessage: toErrorMessage(error),
      });
      callbacks.onAuthError?.(error, "refresh");
      throw error;
    }
  }

  async function me(): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      const result = await client.me();
      setAuthenticated(result.user);
      return state;
    } catch (error) {
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

  async function logout(): Promise<WayAuthState> {
    patchState({ status: "loading", errorMessage: null });

    try {
      await client.logout();
    } finally {
      setUnauthenticated();
      callbacks.onLogout?.(state);
    }

    return state;
  }

  async function fetchWithAuth(input: string | URL, init?: RequestInit): Promise<Response> {
    return client.fetchWithAuth(input, init);
  }

  function clearError() {
    patchState({ errorMessage: null });
  }

  function getState() {
    return state;
  }

  function setCallbacks(nextCallbacks: WayAuthStateCallbacks = {}) {
    callbacks = nextCallbacks;
  }

  function subscribe(listener: Listener): () => void {
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

export type WayAuthStateController = ReturnType<typeof createWayAuthState>;
