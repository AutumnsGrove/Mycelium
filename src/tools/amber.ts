/**
 * Amber Tools - Storage
 *
 * Tools for interacting with Amber R2 storage.
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";

/**
 * Register Amber tools on the MCP server
 *
 * Tools:
 * - amber_upload: Upload file to R2
 * - amber_download: Download file
 * - amber_list: List files in path
 * - amber_delete: Delete file
 * - amber_presign: Get presigned URL
 */
export function registerAmberTools(agent: Mycelium): void {
  // TODO: Implement amber_upload
  agent.server.tool(
    "amber_upload",
    {
      path: z.string().describe("File path in R2 bucket"),
      content: z.string().describe("File content (base64 encoded for binary)"),
      contentType: z.string().optional().describe("MIME type"),
    },
    async ({ path, content: fileContent, contentType }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] amber_upload called with path=${path}, contentSize=${fileContent.length}, contentType=${contentType}`,
          },
        ],
      };
    }
  );

  // TODO: Implement amber_download
  agent.server.tool(
    "amber_download",
    {
      path: z.string().describe("File path in R2 bucket"),
    },
    async ({ path }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] amber_download called with path=${path}`,
          },
        ],
      };
    }
  );

  // TODO: Implement amber_list
  agent.server.tool(
    "amber_list",
    {
      prefix: z.string().optional().describe("Path prefix to filter"),
      limit: z.number().optional().default(100).describe("Max files to return"),
    },
    async ({ prefix, limit }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] amber_list called with prefix=${prefix}, limit=${limit}`,
          },
        ],
      };
    }
  );

  // TODO: Implement amber_delete
  agent.server.tool(
    "amber_delete",
    {
      path: z.string().describe("File path in R2 bucket"),
    },
    async ({ path }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] amber_delete called with path=${path}`,
          },
        ],
      };
    }
  );

  // TODO: Implement amber_presign
  agent.server.tool(
    "amber_presign",
    {
      path: z.string().describe("File path in R2 bucket"),
      expiresIn: z.number().optional().default(3600).describe("URL expiry in seconds"),
    },
    async ({ path, expiresIn }) => {
      // TODO: Implement
      return {
        content: [
          {
            type: "text",
            text: `[STUB] amber_presign called with path=${path}, expiresIn=${expiresIn}`,
          },
        ],
      };
    }
  );
}
