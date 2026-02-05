import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createWayAuthState } from "./state";
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
//# sourceMappingURL=react.js.map