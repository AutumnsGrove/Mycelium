/**
 * Heartwood OAuth Handler
 *
 * Handles OAuth 2.0 + PKCE flow with Heartwood (Grove's auth service).
 *
 * API Endpoint: https://auth-api.grove.place
 * Frontend: https://heartwood.grove.place
 *
 * @see docs/SPEC.md for full authentication specifications
 */

import type { Env, AuthProps } from "../types";

// GroveAuth API base URL
const GROVEAUTH_API = "https://auth-api.grove.place";
const GROVEAUTH_FRONTEND = "https://heartwood.grove.place";

/**
 * OAuth handler that redirects to Heartwood for authentication
 */
export class HeartwoodHandler {
  /**
   * Handle OAuth flow requests
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Authorization endpoint - redirect to Heartwood
    if (url.pathname === "/authorize") {
      return this.handleAuthorize(url, env);
    }

    // Callback endpoint - exchange code for tokens
    if (url.pathname === "/callback") {
      return this.handleCallback(url, env);
    }

    // Token endpoint - token refresh
    if (url.pathname === "/token") {
      return this.handleToken(request, env);
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * Redirect to Heartwood OAuth authorization
   */
  private handleAuthorize(url: URL, env: Env): Response {
    const heartwoodUrl = new URL(`${GROVEAUTH_FRONTEND}/oauth/authorize`);
    heartwoodUrl.searchParams.set("client_id", env.GROVEAUTH_CLIENT_ID);
    heartwoodUrl.searchParams.set("redirect_uri", env.GROVEAUTH_REDIRECT_URI);
    heartwoodUrl.searchParams.set("response_type", "code");
    heartwoodUrl.searchParams.set(
      "scope",
      "profile tenants:read tenants:write bloom:read bloom:write amber:read amber:write meadow:read meadow:write"
    );

    // Pass through state and PKCE parameters
    const state = url.searchParams.get("state");
    if (state) {
      heartwoodUrl.searchParams.set("state", state);
    }

    const codeChallenge = url.searchParams.get("code_challenge");
    if (codeChallenge) {
      heartwoodUrl.searchParams.set("code_challenge", codeChallenge);
      heartwoodUrl.searchParams.set("code_challenge_method", "S256");
    }

    // Redirect to Heartwood
    return Response.redirect(heartwoodUrl.toString(), 302);
  }

  /**
   * Handle OAuth callback with authorization code
   */
  private async handleCallback(url: URL, env: Env): Promise<Response> {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      return new Response(
        JSON.stringify({
          error,
          error_description: errorDescription || "OAuth authorization failed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "missing_code", error_description: "Missing authorization code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(`${GROVEAUTH_API}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: env.GROVEAUTH_CLIENT_ID,
          client_secret: env.GROVEAUTH_CLIENT_SECRET,
          redirect_uri: env.GROVEAUTH_REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        console.error("[OAuth] Token exchange failed:", errorBody);
        return new Response(
          JSON.stringify({
            error: "token_exchange_failed",
            error_description: "Failed to exchange authorization code for tokens",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      // Validate session and get user info
      const userResponse = await fetch(`${GROVEAUTH_API}/session/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!userResponse.ok) {
        console.error("[OAuth] Session validation failed");
        return new Response(
          JSON.stringify({
            error: "session_validation_failed",
            error_description: "Failed to validate user session",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const user = (await userResponse.json()) as {
        id: string;
        email: string;
        tenants?: string[];
      };

      // Generate session ID
      const sessionId = crypto.randomUUID();
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      // Store session in D1
      await env.OAUTH_DB.prepare(
        `INSERT INTO oauth_sessions (id, user_id, email, tenants, scopes, access_token, refresh_token, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          sessionId,
          user.id,
          user.email,
          JSON.stringify(user.tenants || []),
          JSON.stringify([
            "profile",
            "tenants:read",
            "tenants:write",
            "bloom:read",
            "bloom:write",
            "amber:read",
            "amber:write",
            "meadow:read",
            "meadow:write",
          ]),
          tokens.access_token,
          tokens.refresh_token || null,
          expiresAt
        )
        .run();

      // Build redirect URL back to MCP client
      const redirectUrl = new URL(url.origin);
      redirectUrl.searchParams.set("session_id", sessionId);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      return Response.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      console.error("[OAuth] Callback error:", error);
      return new Response(
        JSON.stringify({
          error: "internal_error",
          error_description: "An internal error occurred during authentication",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  /**
   * Handle token refresh
   */
  private async handleToken(request: Request, env: Env): Promise<Response> {
    try {
      const body = await request.json() as { refresh_token?: string; session_id?: string };

      // Get refresh token from request or session
      let refreshToken = body.refresh_token;

      if (!refreshToken && body.session_id) {
        // Look up refresh token from session
        const session = await env.OAUTH_DB.prepare(
          `SELECT refresh_token FROM oauth_sessions WHERE id = ?`
        )
          .bind(body.session_id)
          .first<{ refresh_token: string | null }>();

        if (session?.refresh_token) {
          refreshToken = session.refresh_token;
        }
      }

      if (!refreshToken) {
        return new Response(
          JSON.stringify({
            error: "missing_refresh_token",
            error_description: "No refresh token provided",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Exchange refresh token for new tokens
      const tokenResponse = await fetch(`${GROVEAUTH_API}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.GROVEAUTH_CLIENT_ID,
          client_secret: env.GROVEAUTH_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        console.error("[OAuth] Token refresh failed:", errorBody);
        return new Response(
          JSON.stringify({
            error: "refresh_failed",
            error_description: "Failed to refresh token",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      };

      // Update session in D1 if session_id provided
      if (body.session_id) {
        const expiresAt = Date.now() + tokens.expires_in * 1000;
        await env.OAUTH_DB.prepare(
          `UPDATE oauth_sessions SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?`
        )
          .bind(
            tokens.access_token,
            tokens.refresh_token || refreshToken,
            expiresAt,
            body.session_id
          )
          .run();
      }

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("[OAuth] Token refresh error:", error);
      return new Response(
        JSON.stringify({
          error: "internal_error",
          error_description: "An internal error occurred during token refresh",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract auth props from stored session in D1
 */
export async function getAuthPropsFromSession(
  sessionId: string,
  db: D1Database
): Promise<AuthProps | null> {
  const session = await db
    .prepare(
      `SELECT user_id, email, tenants, scopes, access_token, refresh_token, expires_at
       FROM oauth_sessions WHERE id = ?`
    )
    .bind(sessionId)
    .first<{
      user_id: string;
      email: string;
      tenants: string;
      scopes: string;
      access_token: string;
      refresh_token: string | null;
      expires_at: number;
    }>();

  if (!session) return null;

  // Check if session is expired
  if (session.expires_at < Date.now()) {
    // Session expired, could trigger refresh here
    return null;
  }

  return {
    userId: session.user_id,
    email: session.email,
    tenants: JSON.parse(session.tenants),
    scopes: JSON.parse(session.scopes),
    accessToken: session.access_token,
    refreshToken: session.refresh_token || undefined,
  };
}

/**
 * Verify access token is still valid
 */
export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${GROVEAUTH_API}/session/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Clean up expired sessions from D1
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<number> {
  const result = await db
    .prepare(`DELETE FROM oauth_sessions WHERE expires_at < ?`)
    .bind(Date.now())
    .run();

  return result.meta.changes || 0;
}
