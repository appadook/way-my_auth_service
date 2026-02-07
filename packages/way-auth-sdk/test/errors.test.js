import { describe, expect, it } from "bun:test";
import { WayAuthApiError } from "../src/client.ts";
import { WAY_AUTH_ERROR_MESSAGES, getWayAuthErrorMessage } from "../src/errors.ts";

describe("getWayAuthErrorMessage", () => {
  it("returns mapped message for WayAuthApiError codes", () => {
    const error = new WayAuthApiError("Invalid credentials.", {
      status: 401,
      code: "invalid_credentials",
      details: null,
    });

    expect(getWayAuthErrorMessage(error)).toBe(WAY_AUTH_ERROR_MESSAGES.invalid_credentials);
  });

  it("returns error message when no map entry exists", () => {
    const error = new WayAuthApiError("Custom message", {
      status: 400,
      code: null,
      details: null,
    });

    expect(getWayAuthErrorMessage(error)).toBe("Custom message");
  });

  it("falls back when error is unknown", () => {
    expect(getWayAuthErrorMessage("oops", "fallback")).toBe("fallback");
  });
});
