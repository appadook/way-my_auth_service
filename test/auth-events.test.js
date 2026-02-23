import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { getCookieDebugContext } from "../src/server/observability/auth-events";

describe("getCookieDebugContext", () => {
  it("includes host/origin/protocol and cookie presence metadata", () => {
    const request = new NextRequest("https://way-my-auth-service.vercel.app/api/v1/refresh", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        referer: "https://app.example.com/admin",
        host: "way-my-auth-service.vercel.app",
        "x-forwarded-host": "way-my-auth-service.vercel.app",
        "x-forwarded-proto": "https",
        cookie: "way_refresh=token_1",
      },
    });

    const context = getCookieDebugContext(request, "way_refresh");
    expect(context).toEqual({
      method: "POST",
      pathname: "/api/v1/refresh",
      origin: "https://app.example.com",
      referer: "https://app.example.com/admin",
      host: "way-my-auth-service.vercel.app",
      forwardedHost: "way-my-auth-service.vercel.app",
      forwardedProto: "https",
      protocol: "https",
      hasCookieHeader: true,
      hasRefreshCookie: true,
    });
  });
});
