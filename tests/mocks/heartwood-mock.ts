/**
 * Mock Heartwood Auth Server
 *
 * Provides mock responses for device code flow testing.
 * Simulates RFC 8628 Device Authorization Grant endpoints.
 */

import type {
  DeviceCodeResponse,
  TokenResponse,
  DeviceCodeError,
} from '../../core/types.js';

// Mock state storage
interface MockDeviceCode {
  device_code: string;
  user_code: string;
  client_id: string;
  status: 'pending' | 'authorized' | 'denied' | 'expired';
  user_id?: string;
  poll_count: number;
  created_at: number;
}

const mockDeviceCodes = new Map<string, MockDeviceCode>();

// Test constants
export const MOCK_CLIENT_ID = 'grove-cli';
export const MOCK_VERIFICATION_URI = 'https://auth.grove.place/auth/device';
export const MOCK_DEVICE_CODE = 'mock-device-code-123';
export const MOCK_USER_CODE = 'ABCD-EFGH';
export const MOCK_ACCESS_TOKEN = 'mock-access-token-xyz';
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token-abc';

/**
 * Reset mock state between tests
 */
export function resetMockState(): void {
  mockDeviceCodes.clear();
}

/**
 * Create mock device code response
 */
export function createMockDeviceCodeResponse(
  overrides: Partial<DeviceCodeResponse> = {}
): DeviceCodeResponse {
  const response: DeviceCodeResponse = {
    device_code: MOCK_DEVICE_CODE,
    user_code: MOCK_USER_CODE,
    verification_uri: MOCK_VERIFICATION_URI,
    verification_uri_complete: `${MOCK_VERIFICATION_URI}?user_code=${MOCK_USER_CODE}`,
    expires_in: 900,
    interval: 5,
    ...overrides,
  };

  // Store in mock state
  mockDeviceCodes.set(response.device_code, {
    device_code: response.device_code,
    user_code: response.user_code,
    client_id: MOCK_CLIENT_ID,
    status: 'pending',
    poll_count: 0,
    created_at: Date.now(),
  });

  return response;
}

/**
 * Create mock token response (successful authorization)
 */
export function createMockTokenResponse(
  overrides: Partial<TokenResponse> = {}
): TokenResponse {
  return {
    access_token: MOCK_ACCESS_TOKEN,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: MOCK_REFRESH_TOKEN,
    scope: 'openid email profile',
    ...overrides,
  };
}

/**
 * Create mock device code error response
 */
export function createMockDeviceCodeError(
  error: DeviceCodeError['error'],
  description?: string
): DeviceCodeError {
  const descriptions: Record<DeviceCodeError['error'], string> = {
    authorization_pending: 'User has not yet authorized',
    slow_down: 'Polling too frequently',
    access_denied: 'User denied authorization',
    expired_token: 'Device code expired',
    invalid_grant: 'Invalid device code',
  };

  return {
    error,
    error_description: description || descriptions[error],
    ...(error === 'slow_down' ? { interval: 10 } : {}),
  };
}

/**
 * Simulate user authorizing the device code
 */
export function authorizeDeviceCode(deviceCode: string, userId = 'user-123'): void {
  const code = mockDeviceCodes.get(deviceCode);
  if (code) {
    code.status = 'authorized';
    code.user_id = userId;
  }
}

/**
 * Simulate user denying the device code
 */
export function denyDeviceCode(deviceCode: string): void {
  const code = mockDeviceCodes.get(deviceCode);
  if (code) {
    code.status = 'denied';
  }
}

/**
 * Simulate device code expiration
 */
export function expireDeviceCode(deviceCode: string): void {
  const code = mockDeviceCodes.get(deviceCode);
  if (code) {
    code.status = 'expired';
  }
}

/**
 * Get mock poll response based on device code state
 */
export function getMockPollResponse(
  deviceCode: string
): TokenResponse | DeviceCodeError {
  const code = mockDeviceCodes.get(deviceCode);

  if (!code) {
    return createMockDeviceCodeError('invalid_grant', 'Device code not found');
  }

  code.poll_count++;

  switch (code.status) {
    case 'authorized':
      return createMockTokenResponse();
    case 'denied':
      return createMockDeviceCodeError('access_denied');
    case 'expired':
      return createMockDeviceCodeError('expired_token');
    case 'pending':
    default:
      return createMockDeviceCodeError('authorization_pending');
  }
}

/**
 * Create a fetch mock that simulates Heartwood endpoints
 */
export function createHeartWoodFetchMock() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();

    // POST /auth/device-code - Request device code
    if (url.includes('/auth/device-code') && init?.method === 'POST') {
      const body = init.body ? JSON.parse(init.body.toString()) : {};

      if (body.client_id !== MOCK_CLIENT_ID) {
        return new Response(
          JSON.stringify({ error: 'invalid_client', error_description: 'Client not found' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(createMockDeviceCodeResponse()),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // POST /token - Poll for token
    if (url.includes('/token') && init?.method === 'POST') {
      const body = init.body?.toString() || '';
      const params = new URLSearchParams(body);
      const grantType = params.get('grant_type');
      const deviceCode = params.get('device_code');

      if (grantType === 'urn:ietf:params:oauth:grant-type:device_code' && deviceCode) {
        const response = getMockPollResponse(deviceCode);
        const isError = 'error' in response;

        return new Response(
          JSON.stringify(response),
          {
            status: isError ? 400 : 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'unsupported_grant_type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // GET /userinfo - Get user info
    if (url.includes('/userinfo')) {
      const authHeader = init?.headers
        ? (init.headers as Record<string, string>)['Authorization']
        : undefined;

      if (authHeader === `Bearer ${MOCK_ACCESS_TOKEN}`) {
        return new Response(
          JSON.stringify({
            id: 'user-123',
            email: 'test@grove.place',
            name: 'Test User',
            role: 'user',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Unauthorized', { status: 401 });
    }

    // Default: not found
    return new Response('Not Found', { status: 404 });
  };
}
