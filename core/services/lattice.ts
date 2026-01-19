/**
 * Lattice (blog) service client
 * Shared between CLI and MCP server
 */

import type {
  Post,
  CreatePostData,
  UpdatePostData,
  ListPostsOptions,
  ServiceClientOptions,
} from '../types.js';

export class LatticeClient {
  private token: string;
  private tenant: string;
  private baseUrl: string;

  constructor(options: ServiceClientOptions) {
    this.token = options.token;
    this.tenant = options.tenant;
    this.baseUrl = options.baseUrl || 'https://grove.place';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = new URL(`/api/${this.tenant}${path}`, this.baseUrl);

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new LatticeApiError(
        (error as { message?: string }).message || `API error: ${response.status}`,
        response.status,
        error
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * List posts with optional filters
   */
  async listPosts(options?: ListPostsOptions): Promise<Post[]> {
    const params = new URLSearchParams();
    if (options?.status && options.status !== 'all') {
      params.set('status', options.status);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    if (options?.offset) {
      params.set('offset', String(options.offset));
    }

    const query = params.toString();
    const path = `/posts${query ? `?${query}` : ''}`;

    return this.request<Post[]>('GET', path);
  }

  /**
   * Get a single post by slug
   */
  async getPost(slug: string): Promise<Post> {
    return this.request<Post>('GET', `/posts/${slug}`);
  }

  /**
   * Create a new post
   */
  async createPost(data: CreatePostData): Promise<Post> {
    return this.request<Post>('POST', '/posts', data);
  }

  /**
   * Update an existing post
   */
  async updatePost(slug: string, data: UpdatePostData): Promise<Post> {
    return this.request<Post>('PUT', `/posts/${slug}`, data);
  }

  /**
   * Delete a post
   */
  async deletePost(slug: string): Promise<void> {
    await this.request<void>('DELETE', `/posts/${slug}`);
  }

  /**
   * List drafts only
   */
  async listDrafts(): Promise<Post[]> {
    return this.request<Post[]>('GET', '/drafts');
  }
}

/**
 * Custom error class for Lattice API errors
 */
export class LatticeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'LatticeApiError';
  }
}
