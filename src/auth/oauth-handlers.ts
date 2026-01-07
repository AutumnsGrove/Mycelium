/**
 * OAuth Handlers
 *
 * Handles the OAuth authorization flow with Better Auth integration.
 * Mycelium acts as an OAuth provider for Claude.ai,
 * delegating user authentication to Better Auth (GroveAuth).
 *
 * Better Auth uses cookie-based sessions with cross-subdomain SSO on .grove.place
 */

import type { Env } from "../types";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

// Better Auth API base URL
const BETTER_AUTH_API = "https://auth-api.grove.place";

// =============================================================================
// Authorization Handler
// =============================================================================

/**
 * Handle OAuth authorization request from Claude.ai
 *
 * Redirects to Better Auth for user authentication, storing Claude's
 * original OAuth request in the state parameter for the callback.
 *
 * Better Auth handles Google/GitHub OAuth and sets session cookies automatically.
 */
export async function handleAuthorize(
  _request: Request,
  _env: Env,
  oauthReq: AuthRequest
): Promise<Response> {
  // Default to Google, could be extended to support provider selection
  const provider = "google";

  // Build Better Auth sign-in URL
  const authUrl = new URL(`${BETTER_AUTH_API}/api/auth/sign-in/${provider}`);

  // Set callback URL to our /callback endpoint
  authUrl.searchParams.set(
    "callbackURL",
    "https://mycelium.grove.place/callback"
  );

  // Store Claude's OAuth request in state for the callback
  // We encode it as base64 to avoid URL encoding issues
  const stateData = JSON.stringify({ oauthReq });
  const encodedState = btoa(stateData);
  authUrl.searchParams.set("state", encodedState);

  return Response.redirect(authUrl.toString(), 302);
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
 * Handle callback from Better Auth after user authentication
 *
 * Better Auth sets a session cookie on .grove.place domain.
 * We validate the session by calling /api/auth/session with the cookie,
 * then complete the OAuth grant for Claude.ai.
 */
export async function handleCallback(
  request: Request,
  _env: Env,
  completeAuth: CompleteAuthFn
): Promise<Response> {
  const url = new URL(request.url);

  // Check for errors from Better Auth
  const error = url.searchParams.get("error");
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

  // Get state parameter (contains Claude's OAuth request)
  const stateParam = url.searchParams.get("state");
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
    const stateData = atob(stateParam);
    state = JSON.parse(stateData);
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

  // Get session from Better Auth using the cookie
  // Better Auth sets the session cookie on .grove.place domain
  const cookieHeader = request.headers.get("cookie") || "";

  const sessionRes = await fetch(`${BETTER_AUTH_API}/api/auth/session`, {
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!sessionRes.ok) {
    console.error("[OAuth] Session fetch failed:", await sessionRes.text());
    return new Response(
      JSON.stringify({
        error: "session_invalid",
        error_description: "Failed to retrieve session from Better Auth",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const sessionData = (await sessionRes.json()) as {
    user?: {
      id: string;
      email: string;
      name?: string;
    };
    session?: {
      id: string;
      token: string;
      expiresAt: string;
    };
  };

  // Validate that we have user data
  if (!sessionData.user || !sessionData.session) {
    return new Response(
      JSON.stringify({
        error: "session_invalid",
        error_description: "No active session found",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { user, session } = sessionData;

  // Complete OAuth grant for Claude.ai
  const { redirectTo } = await completeAuth({
    request: state.oauthReq,
    userId: user.id,
    metadata: { email: user.email },
    scope: state.oauthReq?.scope,
    props: {
      userId: user.id,
      email: user.email,
      tenants: [], // Better Auth doesn't include tenants in session - fetch separately if needed
      sessionToken: session.token,
    },
  });

  // Redirect back to Claude with authorization code
  return Response.redirect(redirectTo, 302);
}

// =============================================================================
// Session Validation Helper
// =============================================================================

/**
 * Validate a session token with Better Auth
 *
 * Used by tools to verify the session is still valid before making API calls.
 */
export async function validateSession(
  sessionToken: string
): Promise<{ valid: boolean; user?: { id: string; email: string } }> {
  try {
    // For Better Auth, we can validate by fetching the session endpoint
    // with the session token as a cookie
    const res = await fetch(`${BETTER_AUTH_API}/api/auth/session`, {
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!res.ok) {
      return { valid: false };
    }

    const data = (await res.json()) as {
      user?: { id: string; email: string };
      session?: { id: string };
    };

    if (!data.user || !data.session) {
      return { valid: false };
    }

    return { valid: true, user: data.user };
  } catch {
    return { valid: false };
  }
}
