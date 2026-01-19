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
