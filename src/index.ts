/**
 * Mycelium - Main Entry Point
 *
 * The wood wide web of the Grove ecosystem.
 * MCP server connecting Claude to Grove services.
 *
 * Uses @cloudflare/workers-oauth-provider to act as an OAuth provider
 * for Claude.ai connectors, delegating user auth to Heartwood.
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";

import type { Env } from "./types";
import { Mycelium } from "./agent";
import { handleAuthorize, handleCallback } from "./auth/oauth-handlers";

// =============================================================================
// Default Handler (OAuth Flow + Public Endpoints)
// =============================================================================

/**
 * Handler for public endpoints and OAuth flow.
 * Handles authorization redirects and callbacks with Heartwood.
 */
const defaultHandler: ExportedHandler<Env> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Authorization endpoint - redirects to Heartwood
    if (url.pathname === "/authorize") {
      try {
        // OAuthProvider injects helpers into env.OAUTH_PROVIDER
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oauthHelpers = (env as any).OAUTH_PROVIDER;
        if (!oauthHelpers) {
          throw new Error("OAuth helpers not available");
        }

        const oauthReq = await oauthHelpers.parseAuthRequest(request);

        if (!oauthReq.clientId) {
          return new Response(
            JSON.stringify({
              error: "invalid_request",
              error_description: "Missing client_id",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Store the oauthReq and completeAuthorization function for the callback
        return handleAuthorize(request, env, oauthReq);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[OAuth] Parse auth request failed:", errorMessage);
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: `Could not parse OAuth request: ${errorMessage}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Callback endpoint - completes OAuth flow after Heartwood auth
    if (url.pathname === "/callback") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oauthHelpers = (env as any).OAUTH_PROVIDER;
      return handleCallback(
        request,
        env,
        oauthHelpers.completeAuthorization.bind(oauthHelpers)
      );
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "mycelium" }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};

// =============================================================================
// OAuth Provider Export
// =============================================================================

/**
 * Main export - OAuthProvider wraps our handlers and provides:
 * - /.well-known/oauth-authorization-server (RFC 8414 metadata)
 * - /oauth/token (token endpoint)
 * - /oauth/register (dynamic client registration)
 * - Bearer token validation for MCP routes
 * - MCP connection via Mycelium.mount()
 */
export default new OAuthProvider({
  // Use mount() to create the fetch handler for MCP connections
  // This handles both SSE and streamable HTTP transports
  apiRoute: "/sse",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiHandler: Mycelium.mount("/sse") as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultHandler: defaultHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  scopesSupported: ["profile", "tenants:read", "tenants:write"],
  accessTokenTTL: 3600,
});

// Export Mycelium class for Durable Object binding
export { Mycelium } from "./agent";
