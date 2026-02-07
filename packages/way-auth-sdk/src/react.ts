import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { WayAuthClient } from "./client";
import {
  createWayAuthState,
  type WayAuthStateCallbacks,
  type WayAuthStateController,
  type WayAuthStateOptions,
} from "./state";

export function useWayAuthState(controller: WayAuthStateController) {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}

export function useWayAuthBootstrap(controller: WayAuthStateController, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void controller.bootstrap();
  }, [controller, enabled]);
}

export function useCreateWayAuthState(client: WayAuthClient, options?: WayAuthStateOptions) {
  return useMemo(() => createWayAuthState(client, options), [client, options]);
}

export function useWayAuthCallbacks(controller: WayAuthStateController, callbacks: WayAuthStateCallbacks) {
  const callbacksRef = useRef<WayAuthStateCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    controller.setCallbacks({
      onSignupSuccess: (state, user) => callbacksRef.current.onSignupSuccess?.(state, user),
      onLoginSuccess: (state, user) => callbacksRef.current.onLoginSuccess?.(state, user),
      onLogout: (state) => callbacksRef.current.onLogout?.(state),
      onAuthError: (error, context) => callbacksRef.current.onAuthError?.(error, context),
    });

    return () => {
      controller.setCallbacks({});
    };
  }, [controller]);
}
