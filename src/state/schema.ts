/**
 * State Schema
 *
 * Type definitions and validation for Mycelium session state.
 *
 * @see docs/SPEC.md for full state specifications
 */

import { z } from "zod";

// =============================================================================
// Zod Schemas for Runtime Validation
// =============================================================================

export const UserPreferencesSchema = z.object({
  defaultRegion: z.enum(["eu", "us"]),
  defaultTenant: z.string().nullable(),
  notifyOnTaskComplete: z.boolean(),
});

export const TaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  params: z.record(z.unknown()),
  result: z.enum(["success", "error"]),
  errorMessage: z.string().optional(),
  timestamp: z.number(),
  duration: z.number(),
});

export const CacheEntrySchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    expiry: z.number(),
  });

export const SessionStateSchema = z.object({
  activeTenant: z.string().nullable(),
  activeProject: z.string().nullable(),
  preferences: UserPreferencesSchema,
  taskHistory: z.array(TaskSchema),
  cache: z.object({
    tenantList: CacheEntrySchema(z.array(z.any())).optional(),
    recentPosts: CacheEntrySchema(z.array(z.any())).optional(),
  }),
});

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_PREFERENCES = {
  defaultRegion: "eu" as const,
  defaultTenant: null,
  notifyOnTaskComplete: false,
};

export const DEFAULT_SESSION_STATE = {
  activeTenant: null,
  activeProject: null,
  preferences: DEFAULT_PREFERENCES,
  taskHistory: [],
  cache: {},
};

// =============================================================================
// State Helpers
// =============================================================================

/**
 * Create a new task entry
 */
export function createTask(
  type: string,
  params: Record<string, unknown>,
  result: "success" | "error",
  duration: number,
  errorMessage?: string
): z.infer<typeof TaskSchema> {
  return {
    id: crypto.randomUUID(),
    type,
    params,
    result,
    errorMessage,
    timestamp: Date.now(),
    duration,
  };
}

/**
 * Check if a cache entry is expired
 */
export function isCacheExpired<T>(entry: { data: T; expiry: number } | undefined): boolean {
  if (!entry) return true;
  return Date.now() > entry.expiry;
}

/**
 * Create a cache entry with expiry
 */
export function createCacheEntry<T>(data: T, ttlMs: number): { data: T; expiry: number } {
  return {
    data,
    expiry: Date.now() + ttlMs,
  };
}
