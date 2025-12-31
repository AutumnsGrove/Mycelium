/**
 * Context Tools - Session Management
 *
 * Tools for managing Mycelium session state and context.
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";
import { UserPreferencesSchema, createTask } from "../state/schema";
import type { Task } from "../types";

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
  // =========================================================================
  // mycelium_context - Get current session context
  // =========================================================================
  agent.server.tool("mycelium_context", {}, async () => {
    const context = {
      user: {
        id: agent.props?.userId ?? "anonymous",
        email: agent.props?.email ?? null,
        tenants: agent.props?.tenants ?? [],
      },
      session: {
        activeTenant: agent.state.activeTenant,
        activeProject: agent.state.activeProject,
        preferences: agent.state.preferences,
        taskCount: agent.state.taskHistory.length,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  });

  // =========================================================================
  // mycelium_set_tenant - Set active tenant
  // =========================================================================
  agent.server.tool(
    "mycelium_set_tenant",
    {
      tenant: z.string().describe("Tenant subdomain to set as active"),
    },
    async ({ tenant }) => {
      const startTime = Date.now();

      // Verify user has access to tenant (if auth is available)
      const userTenants = agent.props?.tenants ?? [];

      // In development mode (no auth), allow any tenant
      // In production, verify access
      if (userTenants.length > 0 && !userTenants.includes(tenant)) {
        logTask(agent, "mycelium_set_tenant", { tenant }, "error", Date.now() - startTime, "Access denied");
        return {
          content: [
            {
              type: "text",
              text: `Error: No access to tenant "${tenant}". Available tenants: ${userTenants.join(", ")}`,
            },
          ],
        };
      }

      // Update session state
      agent.setState({
        ...agent.state,
        activeTenant: tenant,
      });

      logTask(agent, "mycelium_set_tenant", { tenant }, "success", Date.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: `Active tenant set to: ${tenant}`,
          },
        ],
      };
    }
  );

  // =========================================================================
  // mycelium_set_project - Set active project
  // =========================================================================
  agent.server.tool(
    "mycelium_set_project",
    {
      project: z.string().describe("Project name to set as active"),
    },
    async ({ project }) => {
      const startTime = Date.now();

      // Update session state
      agent.setState({
        ...agent.state,
        activeProject: project,
      });

      logTask(agent, "mycelium_set_project", { project }, "success", Date.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: `Active project set to: ${project}`,
          },
        ],
      };
    }
  );

  // =========================================================================
  // mycelium_preferences - Update preferences
  // =========================================================================
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
      const startTime = Date.now();

      // Merge with existing preferences
      const updatedPreferences = {
        ...agent.state.preferences,
        ...preferences,
      };

      // Validate with Zod schema
      const validated = UserPreferencesSchema.parse(updatedPreferences);

      // Update session state
      agent.setState({
        ...agent.state,
        preferences: validated,
      });

      // Persist to SQLite for durability across sessions
      try {
        agent.sql.exec(`
          UPDATE preferences SET
            default_region = '${validated.defaultRegion}',
            default_tenant = ${validated.defaultTenant ? `'${validated.defaultTenant}'` : "NULL"},
            notify_on_complete = ${validated.notifyOnTaskComplete ? 1 : 0},
            updated_at = ${Date.now()}
          WHERE id = 1
        `);
      } catch (error) {
        // If update fails (row doesn't exist), insert
        agent.sql.exec(`
          INSERT OR REPLACE INTO preferences (id, default_region, default_tenant, notify_on_complete, updated_at)
          VALUES (1, '${validated.defaultRegion}', ${validated.defaultTenant ? `'${validated.defaultTenant}'` : "NULL"}, ${validated.notifyOnTaskComplete ? 1 : 0}, ${Date.now()})
        `);
      }

      logTask(agent, "mycelium_preferences", preferences, "success", Date.now() - startTime);

      return {
        content: [
          {
            type: "text",
            text: `Preferences updated:\n${JSON.stringify(validated, null, 2)}`,
          },
        ],
      };
    }
  );

  // =========================================================================
  // mycelium_history - Get task history
  // =========================================================================
  agent.server.tool(
    "mycelium_history",
    {
      limit: z.number().optional().default(10).describe("Number of history entries to return"),
      type: z.string().optional().describe("Filter by task type"),
    },
    async ({ limit, type }) => {
      // Query from SQLite for persistent history
      let tasks: Task[] = [];

      try {
        let query = `
          SELECT id, type, params, result, error_message, created_at, duration_ms
          FROM tasks
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

        if (type) {
          query = `
            SELECT id, type, params, result, error_message, created_at, duration_ms
            FROM tasks
            WHERE type = '${type}'
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
        }

        const cursor = agent.sql.exec(query);
        tasks = [...cursor].map((row) => ({
          id: row.id as string,
          type: row.type as string,
          params: row.params ? JSON.parse(row.params as string) : {},
          result: row.result as "success" | "error",
          errorMessage: row.error_message as string | undefined,
          timestamp: row.created_at as number,
          duration: row.duration_ms as number,
        }));
      } catch {
        // If SQL query fails, fall back to in-memory history
        tasks = agent.state.taskHistory
          .filter((t) => !type || t.type === type)
          .slice(-limit)
          .reverse();
      }

      return {
        content: [
          {
            type: "text",
            text:
              tasks.length > 0
                ? `Task History (${tasks.length} entries):\n${JSON.stringify(tasks, null, 2)}`
                : "No task history found.",
          },
        ],
      };
    }
  );
}

// =============================================================================
// Helper: Log task to state and SQLite
// =============================================================================

/**
 * Log a task execution to both in-memory state and SQLite storage
 */
function logTask(
  agent: Mycelium,
  type: string,
  params: Record<string, unknown>,
  result: "success" | "error",
  duration: number,
  errorMessage?: string
): void {
  const task = createTask(type, params, result, duration, errorMessage);

  // Add to in-memory state (keep last 100)
  agent.setState({
    ...agent.state,
    taskHistory: [...agent.state.taskHistory.slice(-99), task],
  });

  // Persist to SQLite
  try {
    agent.sql.exec(`
      INSERT INTO tasks (id, type, params, result, error_message, created_at, duration_ms)
      VALUES (
        '${task.id}',
        '${task.type}',
        '${JSON.stringify(task.params).replace(/'/g, "''")}',
        '${task.result}',
        ${task.errorMessage ? `'${task.errorMessage.replace(/'/g, "''")}'` : "NULL"},
        ${task.timestamp},
        ${task.duration}
      )
    `);
  } catch (error) {
    console.error("[Context] Failed to persist task to SQLite:", error);
  }
}

/**
 * Export logTask for use by other tools
 */
export { logTask };
