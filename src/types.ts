/**
 * Mycelium - Shared Types
 *
 * Type definitions used across the Mycelium MCP server.
 */

// =============================================================================
// Environment Bindings
// =============================================================================

export interface Env {
  // Durable Object binding
  MYCELIUM_DO: DurableObjectNamespace;

  // D1 database for OAuth sessions
  OAUTH_DB: D1Database;

  // KV namespace for OAuth provider token storage
  OAUTH_KV: KVNamespace;

  // Secrets (set via wrangler secret put)
  GROVEAUTH_CLIENT_ID: string;
  GROVEAUTH_CLIENT_SECRET: string;
  GROVEAUTH_REDIRECT_URI: string;
  COOKIE_ENCRYPTION_KEY: string;

  // Environment variables
  ENVIRONMENT: "development" | "staging" | "production";
}

// =============================================================================
// Session State
// =============================================================================

export interface UserPreferences {
  defaultRegion: "eu" | "us";
  defaultTenant: string | null;
  notifyOnTaskComplete: boolean;
}

export interface Task {
  id: string;
  type: string;
  params: Record<string, unknown>;
  result: "success" | "error";
  errorMessage?: string;
  timestamp: number;
  duration: number;
}

export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export interface SessionState {
  // Active context (survives reconnects within session)
  activeTenant: string | null;
  activeProject: string | null;

  // User preferences (persisted to DO storage)
  preferences: UserPreferences;

  // Task history (queryable via SQL)
  taskHistory: Task[];

  // Cached data (reduces API calls)
  cache: {
    tenantList?: CacheEntry<Tenant[]>;
    recentPosts?: CacheEntry<Post[]>;
  };
}

// =============================================================================
// Auth Props
// =============================================================================

export interface AuthProps {
  userId: string;
  email: string;
  tenants: string[];
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
}

// =============================================================================
// Grove Ecosystem Types
// =============================================================================

// Lattice (Blogging)
export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published" | "archived";
  authorId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Bloom (Remote Development)
export interface BloomSession {
  id: string;
  project: string;
  region: "eu" | "us";
  status: "provisioning" | "running" | "stopping" | "terminated";
  terminalUrl?: string;
  userId: string;
  createdAt: string;
  stoppedAt?: string;
}

// Amber (Storage)
export interface AmberFile {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
}

// Rings (Analytics)
export interface AnalyticsEvent {
  id: string;
  tenant: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Meadow (Social)
export interface MeadowPost {
  id: string;
  content: string;
  authorId: string;
  visibility: "public" | "followers" | "private";
  createdAt: string;
  likes: number;
  reposts: number;
}

// Scout (Deal Finding)
export interface Deal {
  id: string;
  title: string;
  url: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  category: string;
  source: string;
  expiresAt?: string;
}

export interface PriceAlert {
  id: string;
  url: string;
  targetPrice: number;
  currentPrice: number;
  status: "watching" | "triggered" | "expired";
  createdAt: string;
}
