/**
 * OAuth Handlers
 *
 * Handles the OAuth authorization flow with Heartwood integration.
 * Mycelium acts as an OAuth provider for Claude.ai,
 * delegating user authentication to Heartwood (GroveAuth).
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
  // Note: GroveAuth uses PKCE, pass through code_challenge if provided
  if (oauthReq.codeChallenge) {
    heartwoodUrl.searchParams.set("code_challenge", oauthReq.codeChallenge);
    heartwoodUrl.searchParams.set(
      "code_challenge_method",
      oauthReq.codeChallengeMethod || "S256"
    );
  }

  // Store Claude's OAuth request in state for the callback
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
    heartwoodToken: string;
  };
}

type CompleteAuthFn = (
  params: CompleteAuthParams
) => Promise<{ redirectTo: string }>;

/**
 * Handle callback from Heartwood after user authentication
 *
 * Exchanges the authorization code with Heartwood for tokens,
 * then completes the OAuth grant for Claude.ai.
 */
export async function handleCallback(
  request: Request,
  env: Env,
  completeAuth: CompleteAuthFn
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
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

  // Validate required parameters
  if (!code) {
    return new Response(
      JSON.stringify({ error: "missing_code", error_description: "No authorization code provided" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!stateParam) {
    return new Response(
      JSON.stringify({ error: "missing_state", error_description: "No state parameter provided" }),
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
      JSON.stringify({ error: "invalid_state", error_description: "Could not parse state parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Exchange code with Heartwood for tokens
  const tokenRes = await fetch("https://auth-api.grove.place/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: env.GROVEAUTH_CLIENT_ID,
      client_secret: env.GROVEAUTH_CLIENT_SECRET,
      redirect_uri: "https://mycelium.grove.place/callback",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    console.error("[OAuth] Token exchange failed:", errorBody);
    return new Response(
      JSON.stringify({
        error: "token_exchange_failed",
        error_description: "Failed to exchange code for tokens",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // Get user info from Heartwood
  const userRes = await fetch("https://auth-api.grove.place/session/validate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!userRes.ok) {
    console.error("[OAuth] User info fetch failed:", await userRes.text());
    return new Response(
      JSON.stringify({
        error: "user_info_failed",
        error_description: "Failed to fetch user information",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const user = (await userRes.json()) as {
    id: string;
    email: string;
    tenants?: string[];
  };

  // Complete OAuth grant in OAuthProvider
  const { redirectTo } = await completeAuth({
    request: state.oauthReq,
    userId: user.id,
    metadata: { email: user.email },
    scope: state.oauthReq?.scope,
    props: {
      userId: user.id,
      email: user.email,
      tenants: user.tenants || [],
      heartwoodToken: tokens.access_token,
    },
  });

  // Redirect back to Claude with authorization code
  return Response.redirect(redirectTo, 302);
}
