/**
 * Bloom Tools - Remote Development
 *
 * Tools for interacting with GroveBloom remote development environment.
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";

/**
 * Register Bloom tools on the MCP server
 *
 * Tools:
 * - bloom_session_start: Start coding session
 * - bloom_session_status: Get session status
 * - bloom_session_stop: Stop session
 * - bloom_task_submit: Submit task to running session
 * - bloom_logs: Get session logs
 */
export function registerBloomTools(agent: Mycelium): void {
  // TODO: Implement bloom_session_start
  agent.server.tool(
    "bloom_session_start",
    {
      project: z.string().describe("Project name from R2"),
      region: z.enum(["eu", "us"]).default("eu").describe("EU is cheaper, US is faster"),
      task: z.string().optional().describe("Initial task for the agent"),
    },
    async ({ project, region, task }) => {
      // TODO: Implement
      // - Call Bloom API to start session
      // - Update session state with active project
      // - Track in task history
      return {
        content: [
          {
            type: "text",
            text: `[STUB] bloom_session_start called with project=${project}, region=${region}, task=${task}`,
          },
        ],
      };
    }
  );

  // TODO: Implement bloom_session_status
  agent.server.tool(
    "bloom_session_status",
    {
      sessionId: z.string().optional().describe("Session ID (optional, shows active session if omitted)"),
    },
    async ({ sessionId }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] bloom_session_status called with sessionId=${sessionId}`,
          },
        ],
      };
    }
  );

  // TODO: Implement bloom_session_stop
  agent.server.tool(
    "bloom_session_stop",
    {
      sessionId: z.string().describe("Session ID to stop"),
    },
    async ({ sessionId }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] bloom_session_stop called with sessionId=${sessionId}`,
          },
        ],
      };
    }
  );

  // TODO: Implement bloom_task_submit
  agent.server.tool(
    "bloom_task_submit",
    {
      sessionId: z.string().describe("Session ID"),
      task: z.string().describe("Task to submit to the agent"),
    },
    async ({ sessionId, task }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] bloom_task_submit called with sessionId=${sessionId}, task=${task}`,
          },
        ],
      };
    }
  );

  // TODO: Implement bloom_logs
  agent.server.tool(
    "bloom_logs",
    {
      sessionId: z.string().describe("Session ID"),
      lines: z.number().optional().default(100).describe("Number of log lines to return"),
    },
    async ({ sessionId, lines }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] bloom_logs called with sessionId=${sessionId}, lines=${lines}`,
          },
        ],
      };
    }
  );
}
