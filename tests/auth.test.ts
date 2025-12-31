/**
 * Auth Flow Unit Tests
 *
 * Tests for Heartwood OAuth handler and helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HeartwoodHandler,
  getAuthPropsFromSession,
  verifyAccessToken,
  cleanupExpiredSessions,
} from "../src/auth/heartwood";
import type { Env } from "../src/types";

// Mock environment
const mockEnv: Env = {
  MYCELIUM_DO: {} as DurableObjectNamespace,
  OAUTH_DB: {
    prepare: vi.fn(),
  } as unknown as D1Database,
  GROVEAUTH_CLIENT_ID: "mycelium",
  GROVEAUTH_CLIENT_SECRET: "test-secret",
  GROVEAUTH_REDIRECT_URI: "https://mycelium.grove.place/callback",
  COOKIE_ENCRYPTION_KEY: "test-encryption-key-32-chars-long!",
  ENVIRONMENT: "development",
};

describe("HeartwoodHandler", () => {
  let handler: HeartwoodHandler;

  beforeEach(() => {
    handler = new HeartwoodHandler();
    vi.clearAllMocks();
  });

  describe("fetch routing", () => {
    it("routes /authorize to handleAuthorize", async () => {
      const request = new Request("https://mycelium.grove.place/authorize");
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain(
        "heartwood.grove.place/oauth/authorize"
      );
    });

    it("routes /callback to handleCallback", async () => {
      const request = new Request(
        "https://mycelium.grove.place/callback?error=access_denied"
      );
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty("error", "access_denied");
    });

    it("routes /token to handleToken", async () => {
      const request = new Request("https://mycelium.grove.place/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty("error", "missing_refresh_token");
    });

    it("returns 404 for unknown paths", async () => {
      const request = new Request("https://mycelium.grove.place/unknown");
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(404);
    });
  });

  describe("handleAuthorize", () => {
    it("redirects to Heartwood with correct params", async () => {
      const request = new Request("https://mycelium.grove.place/authorize");
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location")!);

      expect(location.origin).toBe("https://heartwood.grove.place");
      expect(location.pathname).toBe("/oauth/authorize");
      expect(location.searchParams.get("client_id")).toBe("mycelium");
      expect(location.searchParams.get("redirect_uri")).toBe(
        "https://mycelium.grove.place/callback"
      );
      expect(location.searchParams.get("response_type")).toBe("code");
      expect(location.searchParams.get("scope")).toContain("profile");
    });

    it("passes through state parameter", async () => {
      const request = new Request(
        "https://mycelium.grove.place/authorize?state=test-state-123"
      );
      const response = await handler.fetch(request, mockEnv);

      const location = new URL(response.headers.get("location")!);
      expect(location.searchParams.get("state")).toBe("test-state-123");
    });

    it("passes through PKCE code_challenge", async () => {
      const request = new Request(
        "https://mycelium.grove.place/authorize?code_challenge=abc123&code_challenge_method=S256"
      );
      const response = await handler.fetch(request, mockEnv);

      const location = new URL(response.headers.get("location")!);
      expect(location.searchParams.get("code_challenge")).toBe("abc123");
      expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    });
  });

  describe("handleCallback", () => {
    it("returns error when OAuth error is present", async () => {
      const request = new Request(
        "https://mycelium.grove.place/callback?error=access_denied&error_description=User%20denied%20access"
      );
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("access_denied");
      expect(body.error_description).toBe("User denied access");
    });

    it("returns error when code is missing", async () => {
      const request = new Request("https://mycelium.grove.place/callback");
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("missing_code");
    });
  });

  describe("handleToken", () => {
    it("returns error when no refresh token provided", async () => {
      const request = new Request("https://mycelium.grove.place/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await handler.fetch(request, mockEnv);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("missing_refresh_token");
    });

    it("looks up refresh token from session_id", async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
      const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

      const envWithDb = {
        ...mockEnv,
        OAUTH_DB: { prepare: mockPrepare } as unknown as D1Database,
      };

      const request = new Request("https://mycelium.grove.place/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "test-session" }),
      });

      const response = await handler.fetch(request, envWithDb);

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT refresh_token")
      );
      expect(mockBind).toHaveBeenCalledWith("test-session");
    });
  });
});

describe("getAuthPropsFromSession", () => {
  it("returns null when session not found", async () => {
    const mockFirst = vi.fn().mockResolvedValue(null);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await getAuthPropsFromSession("non-existent", mockDb);

    expect(result).toBeNull();
  });

  it("returns null when session is expired", async () => {
    const expiredSession = {
      user_id: "user-123",
      email: "test@example.com",
      tenants: "[]",
      scopes: "[]",
      access_token: "token",
      refresh_token: null,
      expires_at: Date.now() - 1000, // Expired
    };

    const mockFirst = vi.fn().mockResolvedValue(expiredSession);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await getAuthPropsFromSession("expired-session", mockDb);

    expect(result).toBeNull();
  });

  it("returns auth props for valid session", async () => {
    const validSession = {
      user_id: "user-123",
      email: "test@example.com",
      tenants: '["tenant1", "tenant2"]',
      scopes: '["profile", "tenants:read"]',
      access_token: "valid-token",
      refresh_token: "refresh-token",
      expires_at: Date.now() + 3600000, // 1 hour from now
    };

    const mockFirst = vi.fn().mockResolvedValue(validSession);
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await getAuthPropsFromSession("valid-session", mockDb);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.email).toBe("test@example.com");
    expect(result?.tenants).toEqual(["tenant1", "tenant2"]);
    expect(result?.scopes).toEqual(["profile", "tenants:read"]);
    expect(result?.accessToken).toBe("valid-token");
    expect(result?.refreshToken).toBe("refresh-token");
  });
});

describe("verifyAccessToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns true for valid token", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ valid: true }), { status: 200 })
    );

    const result = await verifyAccessToken("valid-token");

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://auth-api.grove.place/session/validate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token",
        }),
      })
    );
  });

  it("returns false for invalid token", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 401 })
    );

    const result = await verifyAccessToken("invalid-token");

    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    const result = await verifyAccessToken("any-token");

    expect(result).toBe(false);
  });
});

describe("cleanupExpiredSessions", () => {
  it("deletes expired sessions and returns count", async () => {
    const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 5 } });
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await cleanupExpiredSessions(mockDb);

    expect(result).toBe(5);
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM oauth_sessions")
    );
  });

  it("returns 0 when no sessions deleted", async () => {
    const mockRun = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const mockDb = { prepare: mockPrepare } as unknown as D1Database;

    const result = await cleanupExpiredSessions(mockDb);

    expect(result).toBe(0);
  });
});
