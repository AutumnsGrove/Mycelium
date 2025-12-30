/**
 * Mycelium - Main Entry Point
 *
 * The wood wide web of the Grove ecosystem.
 * MCP server connecting Claude to Grove services.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

import type { Env, SessionState, AuthProps } from "./types";
import { HeartwoodHandler } from "./auth/heartwood";
import { registerLatticeTools } from "./tools/lattice";
import { registerBloomTools } from "./tools/bloom";
import { registerAmberTools } from "./tools/amber";
import { registerRingsTools } from "./tools/rings";
import { registerMeadowTools } from "./tools/meadow";
import { registerScoutTools } from "./tools/scout";
import { registerContextTools } from "./tools/context";

// =============================================================================
// Mycelium MCP Agent
// =============================================================================

export class Mycelium extends McpAgent<Env, SessionState, AuthProps> {
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
// Export OAuth-wrapped server
// =============================================================================

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: Mycelium.Router,
  defaultHandler: HeartwoodHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

// Also export for SSE endpoint support
export { Mycelium };
