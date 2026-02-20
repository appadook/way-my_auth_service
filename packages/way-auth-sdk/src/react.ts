import { useEffect, useMemo, useSyncExternalStore } from "react";
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
  useEffect(() => {
    controller.setCallbacks(callbacks);

    return () => {
      controller.setCallbacks({});
    };
  }, [controller, callbacks]);
}
