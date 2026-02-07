export function validatePasswordConfirmation(input) {
    if (!input.password || !input.confirmPassword) {
        return { ok: false, message: "Password and confirmation are required." };
    }
    if (input.password !== input.confirmPassword) {
        return { ok: false, message: "Passwords do not match." };
    }
    return { ok: true };
}
//# sourceMappingURL=validation.js.map