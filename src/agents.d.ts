/**
 * Type declarations for the Cloudflare Agents MCP package
 *
 * @see https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/
 */

declare module "agents/mcp" {
  import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

  /**
   * SQL Storage interface for Durable Object SQLite
   */
  interface SqlStorage {
    exec(query: string): SqlStorageCursor;
  }

  interface SqlStorageCursor extends Iterable<Record<string, unknown>> {
    [Symbol.iterator](): Iterator<Record<string, unknown>>;
    toArray(): Record<string, unknown>[];
    one(): Record<string, unknown> | null;
    columnNames: string[];
    rowsRead: number;
    rowsWritten: number;
  }

  /**
   * McpAgent base class for Cloudflare Workers Durable Objects
   *
   * @template E - Environment bindings type
   * @template S - Session state type
   * @template P - Auth props type
   */
  export class McpAgent<E = unknown, S = unknown, P = unknown> {
    /** MCP Server instance */
    server: McpServer;

    /** Initial state for new sessions */
    initialState: S;

    /** Current session state */
    state: S;

    /** Auth props from OAuth flow */
    props: P | undefined;

    /** Environment bindings */
    env: E;

    /** SQL storage for Durable Object */
    sql: SqlStorage;

    /** Update session state */
    setState(newState: S): void;

    /** Initialize the MCP agent */
    init(): Promise<void>;

    /** Static router for handling requests */
    static Router: ExportedHandler;
  }
}
