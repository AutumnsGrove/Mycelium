/**
 * Heartwood (auth) service client
 * Shared between CLI and MCP server
 */

import type { User, Session } from '../types.js';

export interface HeartWoodClientOptions {
  token?: string;
  baseUrl?: string;
}

export class HeartWoodClient {
  private token: string | undefined;
  private baseUrl: string;

  constructor(options: HeartWoodClientOptions = {}) {
    this.token = options.token;
    this.baseUrl = options.baseUrl || 'https://auth-api.grove.place';
  }

  /**
   * Get current session info
   */
  async getSession(): Promise<Session | null> {
    if (!this.token) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new HeartWoodApiError(
        `Failed to get session: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<Session>;
  }

  /**
   * Get current user info (legacy endpoint)
   */
  async getUserInfo(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new HeartWoodApiError(
        `Failed to get user info: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<User>;
  }

  /**
   * Revoke current session (logout)
   */
  async revokeSession(): Promise<void> {
    if (!this.token) {
      return;
    }

    const response = await fetch(`${this.baseUrl}/session/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok && response.status !== 401) {
      throw new HeartWoodApiError(
        `Failed to revoke session: ${response.status}`,
        response.status
      );
    }
  }

  // Device code flow methods will be added when Heartwood implements them
  // async requestDeviceCode(): Promise<DeviceCodeResponse>
  // async pollDeviceCode(deviceCode: string): Promise<TokenResponse | 'pending'>
}

export class HeartWoodApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'HeartWoodApiError';
  }
}
