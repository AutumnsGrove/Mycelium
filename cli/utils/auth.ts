/**
 * Authentication utilities for Grove CLI
 * Token storage priority: keychain → env var → config file
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Lazy-load keytar (optional native dependency)
let keytar: typeof import('keytar') | null = null;
async function getKeytar(): Promise<typeof import('keytar') | null> {
  if (keytar === null) {
    try {
      keytar = await import('keytar');
    } catch {
      // Keytar not available (native bindings not built)
      keytar = null;
    }
  }
  return keytar;
}

const SERVICE_NAME = 'grove-cli';
const ACCOUNT_NAME = 'default';
const CREDENTIALS_FILE = join(homedir(), '.grove', 'credentials.json');

interface Credentials {
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Get authentication token using priority: keychain → env → file
 */
export async function getToken(): Promise<string | null> {
  // 1. Try system keychain (if available)
  const kt = await getKeytar();
  if (kt) {
    try {
      const keychainToken = await kt.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (keychainToken) {
        return keychainToken;
      }
    } catch {
      // Keychain error - continue to fallbacks
    }
  }

  // 2. Try environment variable
  if (process.env.GROVE_TOKEN) {
    return process.env.GROVE_TOKEN;
  }

  // 3. Try credentials file
  try {
    const creds = await loadCredentials();
    if (creds?.token) {
      return creds.token;
    }
  } catch {
    // No credentials file or error
  }

  return null;
}

/**
 * Save authentication token (prefers keychain, falls back to file)
 */
export async function saveToken(token: string, refreshToken?: string): Promise<'keychain' | 'file'> {
  // Try to save to keychain first (if available)
  const kt = await getKeytar();
  if (kt) {
    try {
      await kt.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
      return 'keychain';
    } catch {
      // Keychain not available - fall back to file
    }
  }

  // Fall back to credentials file
  await saveCredentials({ token, refreshToken });
  return 'file';
}

/**
 * Delete authentication token from all storage locations
 */
export async function deleteToken(): Promise<void> {
  // Delete from keychain (if available)
  const kt = await getKeytar();
  if (kt) {
    try {
      await kt.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch {
      // Ignore keychain errors
    }
  }

  // Delete credentials file
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      await writeFile(CREDENTIALS_FILE, '{}', 'utf-8');
    }
  } catch {
    // Ignore file errors
  }
}

/**
 * Check if user is authenticated (has valid token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

/**
 * Load credentials from file
 */
async function loadCredentials(): Promise<Credentials | null> {
  if (!existsSync(CREDENTIALS_FILE)) {
    return null;
  }
  const content = await readFile(CREDENTIALS_FILE, 'utf-8');
  return JSON.parse(content) as Credentials;
}

/**
 * Save credentials to file
 */
async function saveCredentials(creds: Credentials): Promise<void> {
  const dir = join(homedir(), '.grove');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
}

/**
 * Get the storage location being used for the token
 */
export async function getTokenStorageLocation(): Promise<'keychain' | 'env' | 'file' | 'none'> {
  const kt = await getKeytar();
  if (kt) {
    try {
      const keychainToken = await kt.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (keychainToken) return 'keychain';
    } catch {
      // Keychain not available
    }
  }

  if (process.env.GROVE_TOKEN) return 'env';

  try {
    const creds = await loadCredentials();
    if (creds?.token) return 'file';
  } catch {
    // No file
  }

  return 'none';
}
