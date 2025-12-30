/**
 * Context Tools - Session Management
 *
 * Tools for managing Mycelium session state and context.
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";

/**
 * Register Context tools on the MCP server
 *
 * Tools:
 * - mycelium_context: Get current session context
 * - mycelium_set_tenant: Set active tenant
 * - mycelium_set_project: Set active project
 * - mycelium_preferences: Update preferences
 * - mycelium_history: Get task history
 */
export function registerContextTools(agent: Mycelium): void {
  // TODO: Implement mycelium_context
  agent.server.tool("mycelium_context", {}, async () => {
    // TODO: Implement - return current session context
    // Should include: user info, active tenant/project, preferences, task count
    return {
      content: [
        {
          type: "text",
          text: `[STUB] mycelium_context called - would return session state`,
        },
      ],
    };
  });

  // TODO: Implement mycelium_set_tenant
  agent.server.tool(
    "mycelium_set_tenant",
    {
      tenant: z.string().describe("Tenant subdomain to set as active"),
    },
    async ({ tenant }) => {
      // TODO: Implement
      // - Verify user has access to tenant
      // - Update session state
      return {
        content: [
          {
            type: "text",
            text: `[STUB] mycelium_set_tenant called with tenant=${tenant}`,
          },
        ],
      };
    }
  );

  // TODO: Implement mycelium_set_project
  agent.server.tool(
    "mycelium_set_project",
    {
      project: z.string().describe("Project name to set as active"),
    },
    async ({ project }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] mycelium_set_project called with project=${project}`,
          },
        ],
      };
    }
  );

  // TODO: Implement mycelium_preferences
  agent.server.tool(
    "mycelium_preferences",
    {
      preferences: z
        .object({
          defaultRegion: z.enum(["eu", "us"]).optional(),
          defaultTenant: z.string().nullable().optional(),
          notifyOnTaskComplete: z.boolean().optional(),
        })
        .describe("Preferences to update"),
    },
    async ({ preferences }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] mycelium_preferences called with preferences=${JSON.stringify(preferences)}`,
          },
        ],
      };
    }
  );

  // TODO: Implement mycelium_history
  agent.server.tool(
    "mycelium_history",
    {
      limit: z.number().optional().default(10).describe("Number of history entries to return"),
    },
    async ({ limit }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] mycelium_history called with limit=${limit}`,
          },
        ],
      };
    }
  );
}
