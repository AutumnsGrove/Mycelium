/**
 * Mycelium - Main Entry Point
 *
 * The wood wide web of the Grove ecosystem.
 * MCP server connecting Claude to Grove services.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Env, SessionState, AuthProps } from "./types";
import { HeartwoodHandler } from "./auth/heartwood";
import { registerLatticeTools } from "./tools/lattice";
import { registerBloomTools } from "./tools/bloom";
import { registerAmberTools } from "./tools/amber";
import { registerRingsTools } from "./tools/rings";
import { registerMeadowTools } from "./tools/meadow";
import { registerScoutTools } from "./tools/scout";
import { registerContextTools } from "./tools/context";
import { runMigrations } from "./state/migrations";

// =============================================================================
// Mycelium MCP Agent
// =============================================================================

class Mycelium extends McpAgent<Env, SessionState, AuthProps> {
  server = new McpServer({
    name: "Mycelium",
    version: "1.0.0",
    description: "The wood wide web of the Grove ecosystem",
  });

  /**
   * Initial state for new sessions
   */
  initialState: SessionState = {
    activeTenant: null,
    activeProject: null,
    preferences: {
      defaultRegion: "eu",
      defaultTenant: null,
      notifyOnTaskComplete: false,
    },
    taskHistory: [],
    cache: {},
  };

  /**
   * Initialize the MCP server and register all tools
   */
  async init(): Promise<void> {
    // Run database migrations for Durable Object SQLite
    runMigrations(this.sql);

    // Register tool groups
    registerLatticeTools(this);
    registerBloomTools(this);
    registerAmberTools(this);
    registerRingsTools(this);
    registerMeadowTools(this);
    registerScoutTools(this);
    registerContextTools(this);
  }
}

// =============================================================================
// Request Handler
// =============================================================================

const heartwoodHandler = new HeartwoodHandler();

/**
 * Main fetch handler for Cloudflare Workers
 *
 * Routes:
 * - /authorize, /callback, /token - OAuth flow (Heartwood)
 * - /mcp, /sse - MCP endpoints (Mycelium)
 */
async function handleFetch(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  // OAuth endpoints
  if (
    url.pathname === "/authorize" ||
    url.pathname === "/callback" ||
    url.pathname === "/token"
  ) {
    return heartwoodHandler.fetch(request, env);
  }

  // MCP endpoints - route to Durable Object
  if (url.pathname === "/mcp" || url.pathname === "/sse") {
    const id = env.MYCELIUM_DO.idFromName("default");
    const stub = env.MYCELIUM_DO.get(id);
    return stub.fetch(request);
  }

  // Health check
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok", service: "mycelium" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

// Export the fetch handler
export default {
  fetch: handleFetch,
};

// Export Mycelium class for Durable Object binding
export { Mycelium };
