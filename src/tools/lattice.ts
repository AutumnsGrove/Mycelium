/**
 * Lattice Tools - Blog Management
 *
 * Tools for interacting with Lattice blogging platform.
 *
 * API Endpoint: https://lattice.grove.place/api
 *
 * @see docs/SPEC.md for full tool specifications
 */

import { z } from "zod";
import type { Mycelium } from "../index";
import type { Post } from "../types";
import { logTask } from "./context";

// Lattice API base URL
const LATTICE_API = "https://lattice.grove.place/api";

/**
 * Register Lattice tools on the MCP server
 *
 * Tools:
 * - lattice_posts_list: List blog posts
 * - lattice_post_get: Get single post
 * - lattice_post_create: Create new post
 * - lattice_post_update: Update existing post
 * - lattice_post_delete: Delete post
 * - lattice_drafts: List user's drafts
 */
export function registerLatticeTools(agent: Mycelium): void {
  // =========================================================================
  // lattice_posts_list - List blog posts
  // =========================================================================
  agent.server.tool(
    "lattice_posts_list",
    {
      tenant: z.string().optional().describe("Blog tenant subdomain (uses active tenant if omitted)"),
      limit: z.number().optional().default(10).describe("Number of posts to return"),
      status: z.enum(["draft", "published", "archived"]).optional().describe("Filter by status"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    },
    async ({ tenant, limit, status, offset }) => {
      const startTime = Date.now();

      // Use active tenant if not specified
      const targetTenant = tenant || agent.state.activeTenant;

      if (!targetTenant) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No tenant specified. Use mycelium_set_tenant first or provide a tenant parameter.",
            },
          ],
        };
      }

      try {
        // Build query URL
        const url = new URL(`${LATTICE_API}/${targetTenant}/posts`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));
        if (status) {
          url.searchParams.set("status", status);
        }

        // Make API request
        const response = await fetch(url.toString(), {
          headers: getAuthHeaders(agent),
        });

        if (!response.ok) {
          const error = await response.text();
          logTask(agent, "lattice_posts_list", { tenant: targetTenant, limit, status }, "error", Date.now() - startTime, error);
          return {
            content: [
              {
                type: "text",
                text: `Error fetching posts: ${response.status} ${response.statusText}\n${error}`,
              },
            ],
          };
        }

        const posts = (await response.json()) as Post[];

        logTask(agent, "lattice_posts_list", { tenant: targetTenant, limit, status }, "success", Date.now() - startTime);

        return {
          content: [
            {
              type: "text",
              text: `Found ${posts.length} posts in ${targetTenant}:\n\n${formatPostsList(posts)}`,
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_posts_list", { tenant: targetTenant, limit, status }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // =========================================================================
  // lattice_post_get - Get single post
  // =========================================================================
  agent.server.tool(
    "lattice_post_get",
    {
      tenant: z.string().describe("Blog tenant subdomain"),
      slug: z.string().describe("Post slug"),
    },
    async ({ tenant, slug }) => {
      const startTime = Date.now();

      try {
        const response = await fetch(`${LATTICE_API}/${tenant}/posts/${slug}`, {
          headers: getAuthHeaders(agent),
        });

        if (!response.ok) {
          const error = await response.text();
          logTask(agent, "lattice_post_get", { tenant, slug }, "error", Date.now() - startTime, error);

          if (response.status === 404) {
            return {
              content: [
                {
                  type: "text",
                  text: `Post not found: ${slug} in ${tenant}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Error fetching post: ${response.status} ${response.statusText}\n${error}`,
              },
            ],
          };
        }

        const post = (await response.json()) as Post;

        logTask(agent, "lattice_post_get", { tenant, slug }, "success", Date.now() - startTime);

        return {
          content: [
            {
              type: "text",
              text: formatPost(post, tenant),
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_post_get", { tenant, slug }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // =========================================================================
  // lattice_post_create - Create new post
  // =========================================================================
  agent.server.tool(
    "lattice_post_create",
    {
      tenant: z.string().describe("Blog tenant subdomain"),
      title: z.string().describe("Post title"),
      content: z.string().describe("Markdown content"),
      status: z.enum(["draft", "published"]).default("draft").describe("Post status"),
      slug: z.string().optional().describe("Custom slug (auto-generated from title if omitted)"),
    },
    async ({ tenant, title, content: postContent, status, slug }) => {
      const startTime = Date.now();

      // Verify user has write access to tenant
      const userTenants = agent.props?.tenants ?? [];
      if (userTenants.length > 0 && !userTenants.includes(tenant)) {
        logTask(agent, "lattice_post_create", { tenant, title }, "error", Date.now() - startTime, "Access denied");
        return {
          content: [
            {
              type: "text",
              text: `Error: No write access to tenant "${tenant}". Available tenants: ${userTenants.join(", ")}`,
            },
          ],
        };
      }

      try {
        const response = await fetch(`${LATTICE_API}/${tenant}/posts`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(agent),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            content: postContent,
            status,
            slug,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          logTask(agent, "lattice_post_create", { tenant, title, status }, "error", Date.now() - startTime, error);
          return {
            content: [
              {
                type: "text",
                text: `Error creating post: ${response.status} ${response.statusText}\n${error}`,
              },
            ],
          };
        }

        const post = (await response.json()) as Post;

        logTask(agent, "lattice_post_create", { tenant, title, slug: post.slug, status }, "success", Date.now() - startTime);

        return {
          content: [
            {
              type: "text",
              text: `✨ Post created!\n\nTitle: ${post.title}\nSlug: ${post.slug}\nStatus: ${post.status}\nURL: https://${tenant}.grove.place/${post.slug}`,
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_post_create", { tenant, title, status }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // =========================================================================
  // lattice_post_update - Update existing post
  // =========================================================================
  agent.server.tool(
    "lattice_post_update",
    {
      tenant: z.string().describe("Blog tenant subdomain"),
      slug: z.string().describe("Post slug"),
      updates: z
        .object({
          title: z.string().optional(),
          content: z.string().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
        })
        .describe("Fields to update"),
    },
    async ({ tenant, slug, updates }) => {
      const startTime = Date.now();

      // Verify user has write access
      const userTenants = agent.props?.tenants ?? [];
      if (userTenants.length > 0 && !userTenants.includes(tenant)) {
        logTask(agent, "lattice_post_update", { tenant, slug }, "error", Date.now() - startTime, "Access denied");
        return {
          content: [
            {
              type: "text",
              text: `Error: No write access to tenant "${tenant}".`,
            },
          ],
        };
      }

      try {
        const response = await fetch(`${LATTICE_API}/${tenant}/posts/${slug}`, {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(agent),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.text();
          logTask(agent, "lattice_post_update", { tenant, slug, updates }, "error", Date.now() - startTime, error);

          if (response.status === 404) {
            return {
              content: [
                {
                  type: "text",
                  text: `Post not found: ${slug} in ${tenant}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Error updating post: ${response.status} ${response.statusText}\n${error}`,
              },
            ],
          };
        }

        const post = (await response.json()) as Post;

        logTask(agent, "lattice_post_update", { tenant, slug, updates }, "success", Date.now() - startTime);

        return {
          content: [
            {
              type: "text",
              text: `✅ Post updated!\n\nTitle: ${post.title}\nSlug: ${post.slug}\nStatus: ${post.status}\nUpdated: ${post.updatedAt}`,
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_post_update", { tenant, slug, updates }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // =========================================================================
  // lattice_post_delete - Delete post
  // =========================================================================
  agent.server.tool(
    "lattice_post_delete",
    {
      tenant: z.string().describe("Blog tenant subdomain"),
      slug: z.string().describe("Post slug"),
    },
    async ({ tenant, slug }) => {
      const startTime = Date.now();

      // Verify user has write access
      const userTenants = agent.props?.tenants ?? [];
      if (userTenants.length > 0 && !userTenants.includes(tenant)) {
        logTask(agent, "lattice_post_delete", { tenant, slug }, "error", Date.now() - startTime, "Access denied");
        return {
          content: [
            {
              type: "text",
              text: `Error: No write access to tenant "${tenant}".`,
            },
          ],
        };
      }

      try {
        const response = await fetch(`${LATTICE_API}/${tenant}/posts/${slug}`, {
          method: "DELETE",
          headers: getAuthHeaders(agent),
        });

        if (!response.ok) {
          const error = await response.text();
          logTask(agent, "lattice_post_delete", { tenant, slug }, "error", Date.now() - startTime, error);

          if (response.status === 404) {
            return {
              content: [
                {
                  type: "text",
                  text: `Post not found: ${slug} in ${tenant}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Error deleting post: ${response.status} ${response.statusText}\n${error}`,
              },
            ],
          };
        }

        logTask(agent, "lattice_post_delete", { tenant, slug }, "success", Date.now() - startTime);

        return {
          content: [
            {
              type: "text",
              text: `🗑️ Post deleted: ${slug} from ${tenant}`,
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_post_delete", { tenant, slug }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // =========================================================================
  // lattice_drafts - List user's drafts
  // =========================================================================
  agent.server.tool(
    "lattice_drafts",
    {
      tenant: z.string().optional().describe("Blog tenant subdomain (lists all tenants if omitted)"),
      limit: z.number().optional().default(20).describe("Number of drafts to return"),
    },
    async ({ tenant, limit }) => {
      const startTime = Date.now();

      try {
        // If tenant specified, get drafts from that tenant
        // Otherwise, get drafts from all user's tenants
        const tenantsToQuery = tenant
          ? [tenant]
          : agent.props?.tenants ?? [agent.state.activeTenant].filter(Boolean) as string[];

        if (tenantsToQuery.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Error: No tenants available. Please specify a tenant or authenticate first.",
              },
            ],
          };
        }

        const allDrafts: Array<Post & { tenant: string }> = [];

        for (const t of tenantsToQuery) {
          try {
            const url = new URL(`${LATTICE_API}/${t}/posts`);
            url.searchParams.set("status", "draft");
            url.searchParams.set("limit", String(limit));
            url.searchParams.set("author", agent.props?.userId || "");

            const response = await fetch(url.toString(), {
              headers: getAuthHeaders(agent),
            });

            if (response.ok) {
              const posts = (await response.json()) as Post[];
              allDrafts.push(...posts.map((p) => ({ ...p, tenant: t })));
            }
          } catch {
            // Skip this tenant on error
          }
        }

        logTask(agent, "lattice_drafts", { tenant, count: allDrafts.length }, "success", Date.now() - startTime);

        if (allDrafts.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No drafts found.",
              },
            ],
          };
        }

        // Sort by updated date
        allDrafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return {
          content: [
            {
              type: "text",
              text: `Found ${allDrafts.length} drafts:\n\n${formatDraftsList(allDrafts)}`,
            },
          ],
        };
      } catch (error) {
        logTask(agent, "lattice_drafts", { tenant }, "error", Date.now() - startTime, String(error));
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get authorization headers for API requests
 */
function getAuthHeaders(agent: Mycelium): Record<string, string> {
  const headers: Record<string, string> = {};

  if (agent.props?.accessToken) {
    headers["Authorization"] = `Bearer ${agent.props.accessToken}`;
  }

  return headers;
}

/**
 * Format a list of posts for display
 */
function formatPostsList(posts: Post[]): string {
  if (posts.length === 0) return "No posts found.";

  return posts
    .map((post, i) => {
      const statusIcon = post.status === "published" ? "📄" : post.status === "draft" ? "📝" : "📦";
      return `${i + 1}. ${statusIcon} **${post.title}**\n   Slug: ${post.slug} | Status: ${post.status}\n   Updated: ${post.updatedAt}`;
    })
    .join("\n\n");
}

/**
 * Format a single post for display
 */
function formatPost(post: Post, tenant: string): string {
  const statusIcon = post.status === "published" ? "📄" : post.status === "draft" ? "📝" : "📦";

  return `${statusIcon} **${post.title}**

**Slug:** ${post.slug}
**Status:** ${post.status}
**URL:** https://${tenant}.grove.place/${post.slug}
**Created:** ${post.createdAt}
**Updated:** ${post.updatedAt}
${post.publishedAt ? `**Published:** ${post.publishedAt}` : ""}

---

${post.content}`;
}

/**
 * Format drafts list with tenant info
 */
function formatDraftsList(drafts: Array<Post & { tenant: string }>): string {
  return drafts
    .map((draft, i) => {
      return `${i + 1}. 📝 **${draft.title}**\n   Tenant: ${draft.tenant} | Slug: ${draft.slug}\n   Updated: ${draft.updatedAt}`;
    })
    .join("\n\n");
}
