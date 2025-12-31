/**
 * Heartwood OAuth Handler
 *
 * Handles OAuth 2.0 + PKCE flow with Heartwood (Grove's auth service).
 *
 * @see docs/SPEC.md for full authentication specifications
 */

import type { Env, AuthProps } from "../types";

/**
 * OAuth handler that redirects to Heartwood for authentication
 */
export class HeartwoodHandler {
  /**
   * Handle OAuth flow requests
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ==========================================================================
    // Authorization endpoint - redirect to Heartwood
    // ==========================================================================
    if (url.pathname === "/authorize") {
      return this.handleAuthorize(url, env);
    }

    // ==========================================================================
    // Callback endpoint - exchange code for tokens
    // ==========================================================================
    if (url.pathname === "/callback") {
      return this.handleCallback(url, env);
    }

    // ==========================================================================
    // Token endpoint - token refresh
    // ==========================================================================
    if (url.pathname === "/token") {
      return this.handleToken(request, env);
    }

    return new Response("Not Found", { status: 404 });
  }

  /**
   * Redirect to Heartwood OAuth authorization
   */
  private handleAuthorize(url: URL, env: Env): Response {
    // TODO: Implement OAuth authorization redirect
    // - Build Heartwood authorize URL with:
    //   - client_id from env
    //   - redirect_uri to /callback
    //   - response_type: code
    //   - scope: profile tenants:read tenants:write bloom:read bloom:write amber:read amber:write meadow:read meadow:write
    //   - state from request
    //   - code_challenge for PKCE
    //   - code_challenge_method: S256

    const heartwoodUrl = new URL("https://heartwood.grove.place/oauth/authorize");
    heartwoodUrl.searchParams.set("client_id", env.GROVEAUTH_CLIENT_ID);
    heartwoodUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
    heartwoodUrl.searchParams.set("response_type", "code");
    heartwoodUrl.searchParams.set("scope", "profile tenants:read tenants:write");
    heartwoodUrl.searchParams.set("state", url.searchParams.get("state") || "");
    heartwoodUrl.searchParams.set(
      "code_challenge",
      url.searchParams.get("code_challenge") || ""
    );
    heartwoodUrl.searchParams.set("code_challenge_method", "S256");

    // TODO: Actually redirect when Heartwood is ready
    return new Response(
      `[STUB] Would redirect to: ${heartwoodUrl.toString()}`,
      { status: 200 }
    );
  }

  /**
   * Handle OAuth callback with authorization code
   */
  private async handleCallback(url: URL, _env: Env): Promise<Response> {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(`OAuth Error: ${error}`, { status: 400 });
    }

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    // TODO: Implement token exchange
    // - POST to Heartwood /oauth/token with:
    //   - grant_type: authorization_code
    //   - code
    //   - client_id
    //   - client_secret
    //   - redirect_uri
    //   - code_verifier (for PKCE)

    // TODO: Fetch user info from Heartwood /oauth/userinfo

    // TODO: Store session in KV

    // TODO: Redirect back to MCP client

    return new Response(
      `[STUB] Would exchange code=${code} for tokens and redirect with state=${state}`,
      { status: 200 }
    );
  }

  /**
   * Handle token refresh
   */
  private async handleToken(_request: Request, _env: Env): Promise<Response> {
    // TODO: Implement token refresh
    // - Parse refresh_token from request body
    // - POST to Heartwood /oauth/token with:
    //   - grant_type: refresh_token
    //   - refresh_token
    //   - client_id
    //   - client_secret

    return new Response(
      JSON.stringify({ error: "not_implemented", error_description: "Token refresh not yet implemented" }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract auth props from stored session
 */
export async function getAuthPropsFromSession(
  sessionId: string,
  kv: KVNamespace
): Promise<AuthProps | null> {
  // TODO: Implement session retrieval
  const session = await kv.get(`session:${sessionId}`, "json");
  if (!session) return null;

  return session as AuthProps;
}

/**
 * Verify access token is still valid
 */
export async function verifyAccessToken(_accessToken: string): Promise<boolean> {
  // TODO: Implement token verification
  // - Call Heartwood /oauth/introspect
  // - Check if token is active
  return true; // Stub: always valid
}
