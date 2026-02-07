import type { WayAuthSignupInputWithConfirm } from "./types";
export type PasswordConfirmationResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare function validatePasswordConfirmation(input: WayAuthSignupInputWithConfirm): PasswordConfirmationResult;
//# sourceMappingURL=validation.d.ts.map