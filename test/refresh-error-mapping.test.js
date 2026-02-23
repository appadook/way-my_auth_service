import { describe, expect, it } from "bun:test";
import { getRefreshErrorMessage } from "../src/server/auth/refresh-errors";

describe("refresh error mapping", () => {
  it("returns stable missing refresh-token message", () => {
    expect(getRefreshErrorMessage("missing_refresh_token")).toBe("Refresh token is required.");
  });

  it("returns stable expired refresh-token message", () => {
    expect(getRefreshErrorMessage("expired_refresh_token")).toBe("Refresh token has expired.");
  });

  it("returns stable invalid refresh-token message", () => {
    expect(getRefreshErrorMessage("invalid_refresh_token")).toBe("Refresh token is invalid.");
  });
});
