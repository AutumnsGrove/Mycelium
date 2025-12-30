/**
 * Meadow Tools - Social
 *
 * Tools for interacting with Meadow social platform.
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";

/**
 * Register Meadow tools on the MCP server
 *
 * Tools:
 * - meadow_post: Create social post
 * - meadow_feed: Get user's feed
 * - meadow_following: List following
 * - meadow_followers: List followers
 */
export function registerMeadowTools(agent: Mycelium): void {
  // TODO: Implement meadow_post
  agent.server.tool(
    "meadow_post",
    {
      content: z.string().describe("Post content"),
      visibility: z
        .enum(["public", "followers", "private"])
        .optional()
        .default("public")
        .describe("Post visibility"),
    },
    async ({ content, visibility }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] meadow_post called with content=${content.substring(0, 50)}..., visibility=${visibility}`,
          },
        ],
      };
    }
  );

  // TODO: Implement meadow_feed
  agent.server.tool(
    "meadow_feed",
    {
      limit: z.number().optional().default(20).describe("Number of posts to return"),
      before: z.string().optional().describe("Cursor for pagination"),
    },
    async ({ limit, before }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] meadow_feed called with limit=${limit}, before=${before}`,
          },
        ],
      };
    }
  );

  // TODO: Implement meadow_following
  agent.server.tool("meadow_following", {}, async () => {
    // TODO: Implement
    return {
      content: [
        {
          type: "text",
          text: `[STUB] meadow_following called`,
        },
      ],
    };
  });

  // TODO: Implement meadow_followers
  agent.server.tool("meadow_followers", {}, async () => {
    // TODO: Implement
    return {
      content: [
        {
          type: "text",
          text: `[STUB] meadow_followers called`,
        },
      ],
    };
  });
}
