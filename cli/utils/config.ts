/**
 * Configuration management for Grove CLI
 * Config stored at ~/.grove/config.json
 */

import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { GroveConfig } from '../../core/types.js';

const CONFIG_DIR = join(homedir(), '.grove');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load configuration from disk
 */
export async function getConfig(): Promise<GroveConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return {};
    }
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content) as GroveConfig;
  } catch {
    return {};
  }
}

/**
 * Save configuration to disk
 */
export async function setConfig(updates: Partial<GroveConfig>): Promise<void> {
  await ensureConfigDir();
  const current = await getConfig();
  const merged = { ...current, ...updates };
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
}

/**
 * Get the current tenant (from config or environment)
 */
export async function getTenant(): Promise<string | undefined> {
  // Environment variable takes precedence
  if (process.env.GROVE_TENANT) {
    return process.env.GROVE_TENANT;
  }

  const config = await getConfig();
  return config.tenant;
}

/**
 * Set the current tenant
 */
export async function setTenant(tenant: string): Promise<void> {
  await setConfig({ tenant });
}

/**
 * Get config file path (for display purposes)
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
