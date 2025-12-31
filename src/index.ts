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
import { handleAuthorize, handleCallback } from "./auth/oauth-handlers";

// =============================================================================
// API Handler (Protected MCP Routes)
// =============================================================================

/**
 * Handler for authenticated MCP endpoints.
 * Routes are protected by OAuthProvider - only requests with valid Bearer tokens reach here.
 */
const apiHandler: ExportedHandler<Env> = {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Route MCP/SSE requests to the Durable Object
    if (url.pathname === "/mcp" || url.pathname === "/sse") {
      const id = env.MYCELIUM_DO.idFromName("default");
      const stub = env.MYCELIUM_DO.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

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
        const oauthReq = await ctx.parseAuthRequest(request);
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
        return handleAuthorize(request, env, oauthReq);
      } catch (error) {
        console.error("[OAuth] Parse auth request failed:", error);
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Could not parse OAuth request",
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
      return handleCallback(
        request,
        env,
        ctx.completeAuthorization.bind(ctx)
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
 * - Bearer token validation for apiHandler routes
 */
export default new OAuthProvider({
  apiRoute: ["/mcp", "/sse"],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiHandler: apiHandler as any,
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
