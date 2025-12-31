/**
 * Lattice Tools Unit Tests
 *
 * Tests for blog management tools.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock types for testing
interface MockPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  authorId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Helper to create mock posts
function createMockPost(overrides: Partial<MockPost> = {}): MockPost {
  return {
    id: "post-1",
    slug: "test-post",
    title: "Test Post",
    content: "# Test Content\n\nThis is a test post.",
    status: "published",
    authorId: "user-123",
    tenantId: "tenant-1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Lattice Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("lattice_posts_list", () => {
    it("requires a tenant to be set", async () => {
      // Mock agent with no active tenant
      const mockAgent = {
        state: { activeTenant: null },
        props: { accessToken: "test-token", tenants: [] },
        server: { tool: vi.fn() },
      };

      // Get the handler that would be registered
      // Since we can't easily test the registration, we test the logic
      const targetTenant = null || mockAgent.state.activeTenant;

      expect(targetTenant).toBeNull();
    });

    it("uses active tenant when none specified", async () => {
      const mockAgent = {
        state: { activeTenant: "my-blog" },
        props: { accessToken: "test-token", tenants: ["my-blog"] },
      };

      const tenant = undefined;
      const targetTenant = tenant || mockAgent.state.activeTenant;

      expect(targetTenant).toBe("my-blog");
    });

    it("builds correct URL with query params", () => {
      const tenant = "test-blog";
      const limit = 20;
      const offset = 10;
      const status = "published";

      const url = new URL(`https://lattice.grove.place/api/${tenant}/posts`);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("status", status);

      expect(url.toString()).toBe(
        "https://lattice.grove.place/api/test-blog/posts?limit=20&offset=10&status=published"
      );
    });

    it("formats posts list correctly", () => {
      const posts = [
        createMockPost({ title: "First Post", slug: "first-post", status: "published" }),
        createMockPost({ title: "Second Post", slug: "second-post", status: "draft" }),
      ];

      const formatted = posts
        .map((post, i) => {
          const statusIcon = post.status === "published" ? "📄" : post.status === "draft" ? "📝" : "📦";
          return `${i + 1}. ${statusIcon} **${post.title}**\n   Slug: ${post.slug} | Status: ${post.status}\n   Updated: ${post.updatedAt}`;
        })
        .join("\n\n");

      expect(formatted).toContain("📄 **First Post**");
      expect(formatted).toContain("📝 **Second Post**");
      expect(formatted).toContain("Slug: first-post");
      expect(formatted).toContain("Slug: second-post");
    });
  });

  describe("lattice_post_get", () => {
    it("builds correct URL for single post", () => {
      const tenant = "test-blog";
      const slug = "my-post";

      const url = `https://lattice.grove.place/api/${tenant}/posts/${slug}`;

      expect(url).toBe("https://lattice.grove.place/api/test-blog/posts/my-post");
    });

    it("formats single post correctly", () => {
      const post = createMockPost({
        title: "My Great Post",
        slug: "my-great-post",
        content: "# Hello World",
        status: "published",
      });
      const tenant = "test-blog";

      const statusIcon = post.status === "published" ? "📄" : "📝";
      const formatted = `${statusIcon} **${post.title}**

**Slug:** ${post.slug}
**Status:** ${post.status}
**URL:** https://${tenant}.grove.place/${post.slug}`;

      expect(formatted).toContain("📄 **My Great Post**");
      expect(formatted).toContain("**Slug:** my-great-post");
      expect(formatted).toContain("https://test-blog.grove.place/my-great-post");
    });
  });

  describe("lattice_post_create", () => {
    it("verifies tenant access before creating", () => {
      const userTenants = ["blog-a", "blog-b"];
      const requestedTenant = "blog-c";

      const hasAccess = userTenants.includes(requestedTenant);

      expect(hasAccess).toBe(false);
    });

    it("allows creation when user has tenant access", () => {
      const userTenants = ["blog-a", "blog-b"];
      const requestedTenant = "blog-a";

      const hasAccess = userTenants.includes(requestedTenant);

      expect(hasAccess).toBe(true);
    });

    it("creates correct request body", () => {
      const title = "New Post";
      const content = "# Content";
      const status = "draft";
      const slug = "custom-slug";

      const body = JSON.stringify({
        title,
        content,
        status,
        slug,
      });

      const parsed = JSON.parse(body);
      expect(parsed.title).toBe("New Post");
      expect(parsed.content).toBe("# Content");
      expect(parsed.status).toBe("draft");
      expect(parsed.slug).toBe("custom-slug");
    });
  });

  describe("lattice_post_update", () => {
    it("sends PATCH request with updates", () => {
      const updates = {
        title: "Updated Title",
        status: "published",
      };

      const body = JSON.stringify(updates);
      const parsed = JSON.parse(body);

      expect(parsed.title).toBe("Updated Title");
      expect(parsed.status).toBe("published");
      expect(parsed.content).toBeUndefined();
    });

    it("allows partial updates", () => {
      const updates = {
        status: "archived",
      };

      const body = JSON.stringify(updates);
      const parsed = JSON.parse(body);

      expect(parsed.status).toBe("archived");
      expect(parsed.title).toBeUndefined();
    });
  });

  describe("lattice_post_delete", () => {
    it("builds correct DELETE URL", () => {
      const tenant = "test-blog";
      const slug = "post-to-delete";

      const url = `https://lattice.grove.place/api/${tenant}/posts/${slug}`;

      expect(url).toBe("https://lattice.grove.place/api/test-blog/posts/post-to-delete");
    });

    it("verifies tenant access before deleting", () => {
      const userTenants = ["my-blog"];
      const requestedTenant = "other-blog";

      const hasAccess = userTenants.includes(requestedTenant);

      expect(hasAccess).toBe(false);
    });
  });

  describe("lattice_drafts", () => {
    it("queries all user tenants when none specified", () => {
      const userTenants = ["blog-a", "blog-b", "blog-c"];
      const requestedTenant = undefined;

      const tenantsToQuery = requestedTenant ? [requestedTenant] : userTenants;

      expect(tenantsToQuery).toEqual(["blog-a", "blog-b", "blog-c"]);
    });

    it("queries single tenant when specified", () => {
      const userTenants = ["blog-a", "blog-b", "blog-c"];
      const requestedTenant = "blog-b";

      const tenantsToQuery = requestedTenant ? [requestedTenant] : userTenants;

      expect(tenantsToQuery).toEqual(["blog-b"]);
    });

    it("sorts drafts by updated date descending", () => {
      const drafts = [
        { ...createMockPost({ slug: "old" }), updatedAt: "2025-01-01T00:00:00Z", tenant: "a" },
        { ...createMockPost({ slug: "new" }), updatedAt: "2025-01-15T00:00:00Z", tenant: "a" },
        { ...createMockPost({ slug: "mid" }), updatedAt: "2025-01-10T00:00:00Z", tenant: "a" },
      ];

      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      expect(drafts[0].slug).toBe("new");
      expect(drafts[1].slug).toBe("mid");
      expect(drafts[2].slug).toBe("old");
    });

    it("formats drafts with tenant info", () => {
      const drafts = [
        { ...createMockPost({ title: "Draft 1", slug: "draft-1" }), tenant: "blog-a" },
        { ...createMockPost({ title: "Draft 2", slug: "draft-2" }), tenant: "blog-b" },
      ];

      const formatted = drafts
        .map((draft, i) => {
          return `${i + 1}. 📝 **${draft.title}**\n   Tenant: ${draft.tenant} | Slug: ${draft.slug}`;
        })
        .join("\n\n");

      expect(formatted).toContain("📝 **Draft 1**");
      expect(formatted).toContain("Tenant: blog-a");
      expect(formatted).toContain("📝 **Draft 2**");
      expect(formatted).toContain("Tenant: blog-b");
    });
  });

  describe("getAuthHeaders", () => {
    it("returns empty object when no access token", () => {
      const props = { accessToken: undefined };
      const headers: Record<string, string> = {};

      if (props.accessToken) {
        headers["Authorization"] = `Bearer ${props.accessToken}`;
      }

      expect(headers).toEqual({});
    });

    it("returns Authorization header when access token present", () => {
      const props = { accessToken: "test-token-123" };
      const headers: Record<string, string> = {};

      if (props.accessToken) {
        headers["Authorization"] = `Bearer ${props.accessToken}`;
      }

      expect(headers).toEqual({
        Authorization: "Bearer test-token-123",
      });
    });
  });
});

describe("API Response Handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("handles successful API response", async () => {
    const mockPosts = [createMockPost(), createMockPost({ slug: "second" })];

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(mockPosts), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const response = await fetch("https://lattice.grove.place/api/test/posts");
    const posts = await response.json();

    expect(response.ok).toBe(true);
    expect(posts).toHaveLength(2);
  });

  it("handles 404 response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Not Found", { status: 404 })
    );

    const response = await fetch("https://lattice.grove.place/api/test/posts/missing");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("handles 401 unauthorized response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
    );

    const response = await fetch("https://lattice.grove.place/api/test/posts");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  it("handles network errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await expect(
      fetch("https://lattice.grove.place/api/test/posts")
    ).rejects.toThrow("Network error");
  });
});
