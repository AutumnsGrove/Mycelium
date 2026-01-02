/**
 * OAuth Handlers
 *
 * Handles the OAuth authorization flow with Heartwood integration.
 * Mycelium acts as an OAuth provider for Claude.ai,
 * delegating user authentication to Heartwood (GroveAuth).
 *
 * Uses SessionDO-based auth: GroveAuth returns session tokens directly
 * to internal services instead of auth codes (bypasses PKCE requirements).
 */

import type { Env } from "../types";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

// =============================================================================
// Authorization Handler
// =============================================================================

/**
 * Handle OAuth authorization request from Claude.ai
 *
 * Redirects to Heartwood for user authentication, storing Claude's
 * original OAuth request in the state parameter for the callback.
 *
 * Note: We don't forward PKCE params because as an internal service,
 * GroveAuth returns session tokens directly (no code exchange needed).
 */
export async function handleAuthorize(
  _request: Request,
  env: Env,
  oauthReq: AuthRequest
): Promise<Response> {
  // Build Heartwood authorization URL - uses /login as the authorize endpoint
  const heartwoodUrl = new URL("https://heartwood.grove.place/login");
  heartwoodUrl.searchParams.set("client_id", env.GROVEAUTH_CLIENT_ID);
  heartwoodUrl.searchParams.set(
    "redirect_uri",
    "https://mycelium.grove.place/callback"
  );

  // Store Claude's OAuth request in state for the callback
  // No PKCE forwarding - we use session-based auth for internal services
  heartwoodUrl.searchParams.set("state", JSON.stringify({ oauthReq }));

  return Response.redirect(heartwoodUrl.toString(), 302);
}

// =============================================================================
// Callback Handler
// =============================================================================

interface CompleteAuthParams {
  request: AuthRequest;
  userId: string;
  metadata: { email: string };
  scope: AuthRequest["scope"];
  props: {
    userId: string;
    email: string;
    tenants: string[];
    sessionToken: string;
  };
}

type CompleteAuthFn = (
  params: CompleteAuthParams
) => Promise<{ redirectTo: string }>;

/**
 * Handle callback from Heartwood after user authentication
 *
 * For internal services (like Mycelium), Heartwood returns session tokens
 * directly instead of auth codes. We validate the session and complete
 * the OAuth grant for Claude.ai.
 */
export async function handleCallback(
  request: Request,
  env: Env,
  completeAuth: CompleteAuthFn
): Promise<Response> {
  const url = new URL(request.url);

  // Session token flow (internal service) - check these first
  const sessionToken = url.searchParams.get("session_token");
  const userId = url.searchParams.get("user_id");
  const email = url.searchParams.get("email");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors from Heartwood
  if (error) {
    const errorDesc = url.searchParams.get("error_description") || error;
    return new Response(
      JSON.stringify({ error, error_description: errorDesc }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate state parameter
  if (!stateParam) {
    return new Response(
      JSON.stringify({
        error: "missing_state",
        error_description: "No state parameter provided",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Parse state to get Claude's original OAuth request
  let state: { oauthReq: AuthRequest };
  try {
    state = JSON.parse(stateParam);
  } catch {
    return new Response(
      JSON.stringify({
        error: "invalid_state",
        error_description: "Could not parse state parameter",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Session token flow (internal service)
  if (sessionToken && userId && email) {
    // Validate session with GroveAuth
    const validationRes = await fetch(
      "https://auth-api.grove.place/session/validate-service",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken }),
      }
    );

    if (!validationRes.ok) {
      const errorBody = await validationRes.text();
      console.error("[OAuth] Session validation failed:", errorBody);
      return new Response(
        JSON.stringify({
          error: "session_invalid",
          error_description: "Session validation failed",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validationData = (await validationRes.json()) as {
      valid: boolean;
      user?: { id: string; email: string; name?: string };
      error?: string;
    };

    if (!validationData.valid) {
      return new Response(
        JSON.stringify({
          error: "session_invalid",
          error_description: validationData.error || "Session is not valid",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Complete OAuth grant for Claude.ai
    const { redirectTo } = await completeAuth({
      request: state.oauthReq,
      userId,
      metadata: { email },
      scope: state.oauthReq?.scope,
      props: {
        userId,
        email,
        tenants: [], // TODO: Get tenants from user data if needed
        sessionToken,
      },
    });

    // Redirect back to Claude with authorization code
    return Response.redirect(redirectTo, 302);
  }

  // If we get here without session_token, something went wrong
  // This could be an old auth code flow attempt
  const code = url.searchParams.get("code");
  if (code) {
    return new Response(
      JSON.stringify({
        error: "unsupported_flow",
        error_description:
          "Auth code flow is not supported. Mycelium requires session-based auth.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: "invalid_callback",
      error_description: "Missing required callback parameters",
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}
