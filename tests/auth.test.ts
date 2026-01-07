/**
 * Auth Flow Unit Tests
 *
 * Tests for Better Auth OAuth handlers and helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateSessionToken,
  getSessionFromCookie,
  isSessionExpired,
  signOut,
  getGoogleSignInUrl,
  getGitHubSignInUrl,
} from "../src/auth/heartwood";
import { handleAuthorize, handleCallback } from "../src/auth/oauth-handlers";
import type { Env } from "../src/types";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

// Mock environment
const mockEnv: Env = {
  MYCELIUM_DO: {} as DurableObjectNamespace,
  OAUTH_DB: {} as D1Database,
  OAUTH_KV: {} as KVNamespace,
  GROVEAUTH_CLIENT_ID: "mycelium",
  GROVEAUTH_CLIENT_SECRET: "test-secret",
  GROVEAUTH_REDIRECT_URI: "https://mycelium.grove.place/callback",
  COOKIE_ENCRYPTION_KEY: "test-encryption-key-32-chars-long!",
  ENVIRONMENT: "development",
};

describe("Better Auth Helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.clearAllMocks();
  });

  describe("validateSessionToken", () => {
    it("returns valid:true for valid session", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: "user-123", email: "test@example.com" },
            session: { id: "sess-123", token: "token-xyz" },
          }),
          { status: 200 }
        )
      );

      const result = await validateSessionToken("valid-token");

      expect(result.valid).toBe(true);
      expect(result.user?.id).toBe("user-123");
      expect(result.user?.email).toBe("test@example.com");
      expect(fetch).toHaveBeenCalledWith(
        "https://auth-api.grove.place/api/auth/session",
        expect.objectContaining({
          headers: expect.objectContaining({
            cookie: "better-auth.session_token=valid-token",
          }),
        })
      );
    });

    it("returns valid:false for invalid session", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: null, session: null }), {
          status: 200,
        })
      );

      const result = await validateSessionToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it("returns valid:false on network error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await validateSessionToken("any-token");

      expect(result.valid).toBe(false);
    });

    it("returns valid:false on 401 response", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      );

      const result = await validateSessionToken("expired-token");

      expect(result.valid).toBe(false);
    });
  });

  describe("getSessionFromCookie", () => {
    it("returns session data for valid cookie", async () => {
      const mockSession = {
        user: { id: "user-456", email: "user@example.com", name: "Test User" },
        session: { id: "sess-456", token: "token-abc", expiresAt: "2025-12-31" },
      };

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockSession), { status: 200 })
      );

      const result = await getSessionFromCookie(
        "better-auth.session_token=valid-cookie"
      );

      expect(result.user?.id).toBe("user-456");
      expect(result.session?.token).toBe("token-abc");
      expect(fetch).toHaveBeenCalledWith(
        "https://auth-api.grove.place/api/auth/session",
        expect.objectContaining({
          headers: { cookie: "better-auth.session_token=valid-cookie" },
        })
      );
    });

    it("returns null user/session for invalid cookie", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: null, session: null }), {
          status: 200,
        })
      );

      const result = await getSessionFromCookie("invalid-cookie");

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it("returns null user/session on error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await getSessionFromCookie("any-cookie");

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });
  });

  describe("isSessionExpired", () => {
    it("returns true for expired session", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      expect(isSessionExpired(pastDate)).toBe(true);
    });

    it("returns false for valid session", () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      expect(isSessionExpired(futureDate)).toBe(false);
    });
  });

  describe("signOut", () => {
    it("returns true on successful sign out", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

      const result = await signOut("session-token");

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://auth-api.grove.place/api/auth/sign-out",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            cookie: "better-auth.session_token=session-token",
          }),
        })
      );
    });

    it("returns false on failed sign out", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Error", { status: 500 })
      );

      const result = await signOut("session-token");

      expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await signOut("session-token");

      expect(result).toBe(false);
    });
  });
});

describe("Auth URL Builders", () => {
  describe("getGoogleSignInUrl", () => {
    it("builds correct Google sign-in URL", () => {
      const url = getGoogleSignInUrl("https://mycelium.grove.place/callback");

      expect(url).toBe(
        "https://auth-api.grove.place/api/auth/sign-in/google?callbackURL=https%3A%2F%2Fmycelium.grove.place%2Fcallback"
      );
    });

    it("includes state parameter when provided", () => {
      const url = getGoogleSignInUrl(
        "https://mycelium.grove.place/callback",
        "test-state"
      );

      expect(url).toContain("state=test-state");
    });
  });

  describe("getGitHubSignInUrl", () => {
    it("builds correct GitHub sign-in URL", () => {
      const url = getGitHubSignInUrl("https://mycelium.grove.place/callback");

      expect(url).toBe(
        "https://auth-api.grove.place/api/auth/sign-in/github?callbackURL=https%3A%2F%2Fmycelium.grove.place%2Fcallback"
      );
    });

    it("includes state parameter when provided", () => {
      const url = getGitHubSignInUrl(
        "https://mycelium.grove.place/callback",
        "test-state"
      );

      expect(url).toContain("state=test-state");
    });
  });
});

describe("OAuth Handlers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.clearAllMocks();
  });

  describe("handleAuthorize", () => {
    it("redirects to Better Auth Google sign-in", async () => {
      const request = new Request("https://mycelium.grove.place/authorize");
      const mockOauthReq = {
        clientId: "claude",
        redirectUri: "https://claude.ai/callback",
        scope: ["profile"],
      } as AuthRequest;

      const response = await handleAuthorize(request, mockEnv, mockOauthReq);

      expect(response.status).toBe(302);
      const location = response.headers.get("location")!;
      expect(location).toContain("auth-api.grove.place/api/auth/sign-in/google");
      expect(location).toContain("callbackURL=https%3A%2F%2Fmycelium.grove.place%2Fcallback");
      expect(location).toContain("state=");
    });

    it("encodes OAuth request in state parameter", async () => {
      const request = new Request("https://mycelium.grove.place/authorize");
      const mockOauthReq = {
        clientId: "claude",
        redirectUri: "https://claude.ai/callback",
      } as AuthRequest;

      const response = await handleAuthorize(request, mockEnv, mockOauthReq);

      const location = new URL(response.headers.get("location")!);
      const state = location.searchParams.get("state");

      // Decode and verify state contains OAuth request
      const decoded = JSON.parse(atob(state!));
      expect(decoded.oauthReq.clientId).toBe("claude");
    });
  });

  describe("handleCallback", () => {
    it("returns error when OAuth error is present", async () => {
      const request = new Request(
        "https://mycelium.grove.place/callback?error=access_denied&error_description=User%20denied"
      );
      const mockCompleteAuth = vi.fn();

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string; error_description: string };
      expect(body.error).toBe("access_denied");
      expect(body.error_description).toBe("User denied");
    });

    it("returns error when state is missing", async () => {
      const request = new Request("https://mycelium.grove.place/callback");
      const mockCompleteAuth = vi.fn();

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("missing_state");
    });

    it("returns error when state is invalid", async () => {
      const request = new Request(
        "https://mycelium.grove.place/callback?state=invalid-not-base64"
      );
      const mockCompleteAuth = vi.fn();

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("invalid_state");
    });

    it("returns error when session fetch fails", async () => {
      const stateData = btoa(JSON.stringify({ oauthReq: { clientId: "claude" } }));
      const request = new Request(
        `https://mycelium.grove.place/callback?state=${stateData}`,
        { headers: { cookie: "better-auth.session_token=test" } }
      );
      const mockCompleteAuth = vi.fn();

      vi.mocked(fetch).mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      );

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(401);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("session_invalid");
    });

    it("returns error when no session found", async () => {
      const stateData = btoa(JSON.stringify({ oauthReq: { clientId: "claude" } }));
      const request = new Request(
        `https://mycelium.grove.place/callback?state=${stateData}`,
        { headers: { cookie: "better-auth.session_token=test" } }
      );
      const mockCompleteAuth = vi.fn();

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ user: null, session: null }), { status: 200 })
      );

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(401);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("session_invalid");
    });

    it("completes OAuth flow on valid session", async () => {
      const mockOauthReq = { clientId: "claude", scope: ["profile"] };
      const stateData = btoa(JSON.stringify({ oauthReq: mockOauthReq }));
      const request = new Request(
        `https://mycelium.grove.place/callback?state=${stateData}`,
        { headers: { cookie: "better-auth.session_token=valid-token" } }
      );

      const mockCompleteAuth = vi.fn().mockResolvedValue({
        redirectTo: "https://claude.ai/callback?code=abc123",
      });

      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: "user-123", email: "test@example.com" },
            session: { id: "sess-123", token: "session-token-xyz", expiresAt: "2025-12-31" },
          }),
          { status: 200 }
        )
      );

      const response = await handleCallback(request, mockEnv, mockCompleteAuth);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("https://claude.ai/callback?code=abc123");
      expect(mockCompleteAuth).toHaveBeenCalledWith({
        request: mockOauthReq,
        userId: "user-123",
        metadata: { email: "test@example.com" },
        scope: ["profile"],
        props: {
          userId: "user-123",
          email: "test@example.com",
          tenants: [],
          sessionToken: "session-token-xyz",
        },
      });
    });
  });
});
