/**
 * Better Auth Helpers
 *
 * Helper functions for working with Better Auth sessions.
 *
 * API Endpoint: https://auth-api.grove.place
 *
 * Better Auth uses cookie-based sessions with cross-subdomain SSO on .grove.place.
 * The session cookie is httpOnly, so validation must be done server-side via the
 * /api/auth/session endpoint.
 */

// Better Auth API base URL
const BETTER_AUTH_API = "https://auth-api.grove.place";

// =============================================================================
// Session Types
// =============================================================================

export interface BetterAuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BetterAuthSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionResponse {
  user: BetterAuthUser | null;
  session: BetterAuthSession | null;
}

// =============================================================================
// Session Helpers
// =============================================================================

/**
 * Get session from Better Auth using a cookie header
 *
 * This is used during the OAuth callback when we have the user's cookie.
 */
export async function getSessionFromCookie(
  cookieHeader: string
): Promise<SessionResponse> {
  try {
    const response = await fetch(`${BETTER_AUTH_API}/api/auth/session`, {
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return { user: null, session: null };
    }

    const data = (await response.json()) as SessionResponse;
    return data;
  } catch {
    return { user: null, session: null };
  }
}

/**
 * Validate a session token with Better Auth
 *
 * Used to verify that a session token is still valid.
 * This is useful for tools that need to check session validity.
 */
export async function validateSessionToken(
  sessionToken: string
): Promise<{ valid: boolean; user?: BetterAuthUser }> {
  try {
    const response = await fetch(`${BETTER_AUTH_API}/api/auth/session`, {
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = (await response.json()) as SessionResponse;

    if (!data.user || !data.session) {
      return { valid: false };
    }

    return { valid: true, user: data.user };
  } catch {
    return { valid: false };
  }
}

/**
 * Check if a session token is expired
 *
 * Parses the expiresAt from the session and checks against current time.
 */
export function isSessionExpired(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  return Date.now() > expiryTime;
}

// =============================================================================
// Sign Out Helper
// =============================================================================

/**
 * Sign out from Better Auth
 *
 * Invalidates the session on the server side.
 */
export async function signOut(sessionToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${BETTER_AUTH_API}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// Auth URL Builders
// =============================================================================

/**
 * Build a sign-in URL for Google OAuth
 */
export function getGoogleSignInUrl(callbackUrl: string, state?: string): string {
  const url = new URL(`${BETTER_AUTH_API}/api/auth/sign-in/google`);
  url.searchParams.set("callbackURL", callbackUrl);
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

/**
 * Build a sign-in URL for GitHub OAuth
 */
export function getGitHubSignInUrl(callbackUrl: string, state?: string): string {
  const url = new URL(`${BETTER_AUTH_API}/api/auth/sign-in/github`);
  url.searchParams.set("callbackURL", callbackUrl);
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}
