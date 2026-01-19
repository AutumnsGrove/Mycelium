/**
 * Device Code Flow Tests
 *
 * Tests for RFC 8628 Device Authorization Grant implementation.
 * Tests the HeartWoodClient device code methods and CLI flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeartWoodClient } from '../core/services/heartwood.js';
import {
  resetMockState,
  createHeartWoodFetchMock,
  authorizeDeviceCode,
  denyDeviceCode,
  expireDeviceCode,
  MOCK_CLIENT_ID,
  MOCK_DEVICE_CODE,
  MOCK_USER_CODE,
  MOCK_ACCESS_TOKEN,
  MOCK_VERIFICATION_URI,
} from './mocks/heartwood-mock.js';

describe('Device Code Flow', () => {
  let client: HeartWoodClient;
  let mockFetch: ReturnType<typeof createHeartWoodFetchMock>;

  beforeEach(() => {
    resetMockState();
    mockFetch = createHeartWoodFetchMock();
    vi.stubGlobal('fetch', mockFetch);
    client = new HeartWoodClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestDeviceCode', () => {
    it('returns device code response for valid client', async () => {
      const response = await client.requestDeviceCode(MOCK_CLIENT_ID);

      expect(response).toMatchObject({
        device_code: MOCK_DEVICE_CODE,
        user_code: MOCK_USER_CODE,
        verification_uri: MOCK_VERIFICATION_URI,
        expires_in: 900,
        interval: 5,
      });
      expect(response.verification_uri_complete).toContain(MOCK_USER_CODE);
    });

    it('throws error for invalid client', async () => {
      await expect(client.requestDeviceCode('invalid-client')).rejects.toThrow(
        'Failed to request device code: 401'
      );
    });
  });

  describe('pollDeviceCode', () => {
    it('returns authorization_pending while waiting', async () => {
      // First request a device code
      await client.requestDeviceCode(MOCK_CLIENT_ID);

      // Poll before authorization
      const result = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);

      expect(result).toMatchObject({
        error: 'authorization_pending',
        error_description: expect.any(String),
      });
    });

    it('returns tokens when user authorizes', async () => {
      // Request device code
      await client.requestDeviceCode(MOCK_CLIENT_ID);

      // Simulate user authorization
      authorizeDeviceCode(MOCK_DEVICE_CODE);

      // Poll after authorization
      const result = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);

      expect(result).toMatchObject({
        access_token: MOCK_ACCESS_TOKEN,
        token_type: 'Bearer',
        expires_in: 3600,
      });
      expect('refresh_token' in result).toBe(true);
    });

    it('returns access_denied when user denies', async () => {
      // Request device code
      await client.requestDeviceCode(MOCK_CLIENT_ID);

      // Simulate user denial
      denyDeviceCode(MOCK_DEVICE_CODE);

      // Poll after denial
      const result = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);

      expect(result).toMatchObject({
        error: 'access_denied',
      });
    });

    it('returns expired_token when code expires', async () => {
      // Request device code
      await client.requestDeviceCode(MOCK_CLIENT_ID);

      // Simulate expiration
      expireDeviceCode(MOCK_DEVICE_CODE);

      // Poll after expiration
      const result = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);

      expect(result).toMatchObject({
        error: 'expired_token',
      });
    });

    it('returns invalid_grant for unknown device code', async () => {
      const result = await client.pollDeviceCode('unknown-code', MOCK_CLIENT_ID);

      expect(result).toMatchObject({
        error: 'invalid_grant',
      });
    });
  });

  describe('getUserInfo with device code token', () => {
    it('returns user info with valid token from device flow', async () => {
      // Request device code
      await client.requestDeviceCode(MOCK_CLIENT_ID);

      // Authorize
      authorizeDeviceCode(MOCK_DEVICE_CODE);

      // Get token
      const tokenResult = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);

      if ('access_token' in tokenResult) {
        // Create new client with token
        const authClient = new HeartWoodClient({ token: tokenResult.access_token });
        const user = await authClient.getUserInfo();

        expect(user).toMatchObject({
          id: 'user-123',
          email: 'test@grove.place',
          name: 'Test User',
        });
      } else {
        throw new Error('Expected token response');
      }
    });
  });
});

describe('Device Code Flow - Edge Cases', () => {
  let client: HeartWoodClient;

  beforeEach(() => {
    resetMockState();
    vi.stubGlobal('fetch', createHeartWoodFetchMock());
    client = new HeartWoodClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles multiple poll attempts correctly', async () => {
    await client.requestDeviceCode(MOCK_CLIENT_ID);

    // Poll multiple times while pending
    const results = await Promise.all([
      client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID),
      client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID),
      client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID),
    ]);

    // All should return authorization_pending
    results.forEach((result) => {
      expect('error' in result && result.error).toBe('authorization_pending');
    });
  });

  it('transitions correctly from pending to authorized', async () => {
    await client.requestDeviceCode(MOCK_CLIENT_ID);

    // First poll - pending
    const pendingResult = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);
    expect('error' in pendingResult && pendingResult.error).toBe('authorization_pending');

    // User authorizes
    authorizeDeviceCode(MOCK_DEVICE_CODE);

    // Second poll - authorized
    const authorizedResult = await client.pollDeviceCode(MOCK_DEVICE_CODE, MOCK_CLIENT_ID);
    expect('access_token' in authorizedResult).toBe(true);
  });
});
