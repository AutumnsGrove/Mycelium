/**
 * Shared type definitions for Grove CLI and MCP
 */

// API Response types
export interface ApiError {
  error: string;
  message: string;
  status: number;
}

// Post types (Lattice)
export interface Post {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    email?: string;
  };
  tags?: string[];
}

export interface CreatePostData {
  title: string;
  content?: string;
  status?: 'draft' | 'published';
  tags?: string[];
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  status?: 'draft' | 'published' | 'scheduled';
  tags?: string[];
}

export interface ListPostsOptions {
  status?: 'draft' | 'published' | 'all';
  limit?: number;
  offset?: number;
}

// Storage types (Amber)
export interface StorageFile {
  id: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageQuota {
  used: number;
  limit: number;
  percentage: number;
}

// User/Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'user' | 'admin' | 'wayfinder' | 'pathfinder';
  tenant?: string;
}

export interface Session {
  user: User;
  expiresAt: string;
}

// Config types
export interface GroveConfig {
  tenant?: string;
  defaultRegion?: 'eu' | 'us';
  outputFormat?: 'human' | 'json';
}

// Service client base
export interface ServiceClientOptions {
  token: string;
  tenant: string;
  baseUrl?: string;
}

// ============================================
// Device Code Flow Types (RFC 8628)
// ============================================

/**
 * Response from the device authorization endpoint
 * Contains the codes and URLs the user needs to complete auth
 */
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

/**
 * Successful token response from the token endpoint
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Error response from token endpoint during device code polling
 * These specific error codes are defined in RFC 8628 section 3.5
 */
export interface DeviceCodeError {
  error:
    | 'authorization_pending'
    | 'slow_down'
    | 'access_denied'
    | 'expired_token'
    | 'invalid_grant';
  error_description: string;
  interval?: number; // Present on slow_down
}
