/**
 * Heartwood (auth) service client
 * Shared between CLI and MCP server
 */

import type {
  User,
  Session,
  DeviceCodeResponse,
  TokenResponse,
  DeviceCodeError,
} from '../types.js';

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

  /**
   * Request a device code for the device authorization grant flow (RFC 8628)
   * The user will need to visit the verification URL and enter the user_code
   */
  async requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
    const response = await fetch(`${this.baseUrl}/auth/device-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId }),
    });

    if (!response.ok) {
      throw new HeartWoodApiError(
        `Failed to request device code: ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<DeviceCodeResponse>;
  }

  /**
   * Poll for token after user has authorized the device code
   * Returns TokenResponse on success, or DeviceCodeError if still pending/failed
   */
  async pollDeviceCode(
    deviceCode: string,
    clientId: string
  ): Promise<TokenResponse | DeviceCodeError> {
    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: clientId,
      }),
    });

    const data = (await response.json()) as TokenResponse | DeviceCodeError;

    if (!response.ok) {
      // RFC 8628 errors come as 400 status with error field
      if ('error' in data) {
        return data;
      }
      throw new HeartWoodApiError(
        `Failed to poll device code: ${response.status}`,
        response.status
      );
    }

    return data as TokenResponse;
  }
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
