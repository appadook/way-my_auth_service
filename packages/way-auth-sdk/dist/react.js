import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createWayAuthState, } from "./state";
export function useWayAuthState(controller) {
    return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}
export function useWayAuthBootstrap(controller, enabled = true) {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        void controller.bootstrap();
    }, [controller, enabled]);
}
export function useCreateWayAuthState(client, options) {
    return useMemo(() => createWayAuthState(client, options), [client, options]);
}
export function useWayAuthCallbacks(controller, callbacks) {
    useEffect(() => {
        controller.setCallbacks(callbacks);
        return () => {
            controller.setCallbacks({});
        };
    }, [controller, callbacks]);
}
//# sourceMappingURL=react.js.map