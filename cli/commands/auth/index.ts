/**
 * Auth commands for Grove CLI
 * grove login [--token]
 * grove logout
 * grove whoami
 * grove auth status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import {
  getToken,
  saveToken,
  deleteToken,
  isAuthenticated,
  getTokenStorageLocation,
} from '../../utils/auth.js';
import { getTenant } from '../../utils/config.js';
import {
  HeartWoodClient,
  HeartWoodApiError,
} from '../../../core/services/heartwood.js';
import type { DeviceCodeError, TokenResponse } from '../../../core/types.js';
import {
  output,
  error,
  warn,
  info,
  header,
  section,
  shouldOutputJson,
} from '../../utils/output.js';

// Device code flow constants
const CLIENT_ID = 'grove-cli';
const DEFAULT_POLL_INTERVAL = 5; // seconds
const MAX_POLL_TIME = 900; // 15 minutes

/**
 * Type guard to check if response is a DeviceCodeError
 */
function isDeviceCodeError(
  response: TokenResponse | DeviceCodeError
): response is DeviceCodeError {
  return 'error' in response;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authCommand = new Command('auth')
  .description('Manage authentication');

// grove login
authCommand
  .command('login')
  .description('Log in to Grove')
  .option('--token <token>', 'Use a specific token (bypasses device code flow)')
  .action(async (options: { token?: string }) => {
    if (options.token) {
      // Manual token entry mode
      const spinner = ora('Validating token...').start();

      try {
        // Validate the token by fetching user info
        const client = new HeartWoodClient({ token: options.token });
        const user = await client.getUserInfo();

        if (!user) {
          spinner.fail('Invalid token');
          error('Could not validate token. Please check it and try again.');
          return;
        }

        spinner.text = 'Saving token...';
        const location = await saveToken(options.token);
        spinner.succeed('Logged in successfully');

        if (shouldOutputJson()) {
          output({
            success: true,
            user: {
              email: user.email,
              name: user.name,
              role: user.role,
            },
            storage: location,
          });
        } else {
          console.log();
          console.log(`  ${chalk.green('✓')} Logged in as ${chalk.cyan(user.email)}`);
          if (user.name) {
            console.log(`    Name: ${user.name}`);
          }
          console.log(`    Role: ${user.role}`);
          console.log(`    Token saved to ${location}`);
        }
      } catch (err) {
        spinner.fail('Login failed');
        error('Failed to validate token', err instanceof Error ? err.message : err);
      }
    } else {
      // Device code flow (RFC 8628)
      const client = new HeartWoodClient();

      // Step 1: Request device code
      let deviceCodeResponse;
      try {
        deviceCodeResponse = await client.requestDeviceCode(CLIENT_ID);
      } catch (err) {
        if (shouldOutputJson()) {
          output({
            error: 'device_code_request_failed',
            message:
              err instanceof Error ? err.message : 'Failed to initiate login',
          });
        } else {
          error(
            'Failed to initiate login',
            err instanceof Error ? err.message : undefined
          );
          if (err instanceof HeartWoodApiError && err.status >= 500) {
            info('The auth service may be temporarily unavailable. Try again later.');
          }
        }
        return;
      }

      const { device_code, user_code, verification_uri, interval, expires_in } =
        deviceCodeResponse;

      // Step 2: Display instructions and open browser
      if (shouldOutputJson()) {
        output({
          status: 'awaiting_authorization',
          user_code,
          verification_uri,
          expires_in,
        });
      } else {
        header('Grove Login');
        console.log();
        console.log('  Opening browser...');
        console.log(`  Or visit: ${chalk.cyan(verification_uri)}`);
        console.log();
        console.log(`  Enter code: ${chalk.bold.yellow(user_code)}`);
        console.log();
      }

      // Open browser (non-blocking, we don't wait for it)
      try {
        await open(verification_uri);
      } catch {
        // Browser open failed, user can still manually visit the URL
        if (!shouldOutputJson()) {
          warn('Could not open browser automatically');
        }
      }

      // Step 3: Poll for authorization
      const spinner = shouldOutputJson()
        ? null
        : ora('Waiting for authorization...').start();
      let pollInterval = interval || DEFAULT_POLL_INTERVAL;
      const startTime = Date.now();
      const maxTime = Math.min(expires_in * 1000, MAX_POLL_TIME * 1000);

      while (Date.now() - startTime < maxTime) {
        await sleep(pollInterval * 1000);

        try {
          const result = await client.pollDeviceCode(device_code, CLIENT_ID);

          if (isDeviceCodeError(result)) {
            switch (result.error) {
              case 'authorization_pending':
                // Keep polling
                continue;

              case 'slow_down':
                // Increase interval as requested
                pollInterval = result.interval || pollInterval + 5;
                continue;

              case 'access_denied':
                spinner?.fail('Authorization denied');
                if (shouldOutputJson()) {
                  output({
                    error: 'access_denied',
                    message: 'Authorization denied. Please try again.',
                  });
                } else {
                  error('Authorization denied. Please try again.');
                }
                return;

              case 'expired_token':
                spinner?.fail('Authorization timed out');
                if (shouldOutputJson()) {
                  output({
                    error: 'expired_token',
                    message:
                      'Authorization timed out. Please run `grove login` again.',
                  });
                } else {
                  error(
                    'Authorization timed out. Please run `grove login` again.'
                  );
                }
                return;

              case 'invalid_grant':
                spinner?.fail('Invalid authorization code');
                if (shouldOutputJson()) {
                  output({
                    error: 'invalid_grant',
                    message: 'Invalid authorization code. Please try again.',
                  });
                } else {
                  error('Invalid authorization code. Please try again.');
                }
                return;
            }
          } else {
            // Success! We got tokens
            if (spinner) {
              spinner.text = 'Saving token...';
            }

            // Save the access token (and refresh token if present)
            const location = await saveToken(
              result.access_token,
              result.refresh_token
            );

            // Fetch user info to display
            const authClient = new HeartWoodClient({
              token: result.access_token,
            });
            const user = await authClient.getUserInfo();

            spinner?.succeed('Logged in successfully');

            if (shouldOutputJson()) {
              output({
                success: true,
                user: user
                  ? {
                      email: user.email,
                      name: user.name,
                      role: user.role,
                    }
                  : null,
                storage: location,
              });
            } else {
              console.log();
              if (user) {
                console.log(
                  `  ${chalk.green('✓')} Logged in as ${chalk.cyan(user.email)}`
                );
              } else {
                console.log(`  ${chalk.green('✓')} Logged in`);
              }
              console.log(`    Token saved to ${location}`);
            }
            return;
          }
        } catch (err) {
          // Network error during polling
          spinner?.fail('Network error');
          if (shouldOutputJson()) {
            output({
              error: 'network_error',
              message: 'Network error. Check your connection.',
            });
          } else {
            error(
              'Network error. Check your connection.',
              err instanceof Error ? err.message : undefined
            );
          }
          return;
        }
      }

      // Timeout (shouldn't normally reach here as server handles expiry)
      spinner?.fail('Authorization timed out');
      if (shouldOutputJson()) {
        output({
          error: 'timeout',
          message: 'Authorization timed out. Please run `grove login` again.',
        });
      } else {
        error('Authorization timed out. Please run `grove login` again.');
      }
    }
  });

// grove logout
authCommand
  .command('logout')
  .description('Log out of Grove')
  .action(async () => {
    const token = await getToken();

    if (!token) {
      if (shouldOutputJson()) {
        output({ success: true, message: 'Already logged out' });
      } else {
        info('Already logged out');
      }
      return;
    }

    const spinner = ora('Logging out...').start();

    try {
      // Revoke session on server
      const client = new HeartWoodClient({ token });
      await client.revokeSession();
    } catch {
      // Ignore server errors, still delete local token
    }

    // Delete local token
    await deleteToken();
    spinner.succeed('Logged out');

    if (shouldOutputJson()) {
      output({ success: true });
    }
  });

// grove whoami
const whoamiCommand = new Command('whoami')
  .description('Show current user')
  .action(async () => {
    const token = await getToken();

    if (!token) {
      if (shouldOutputJson()) {
        output({ authenticated: false });
      } else {
        warn('Not logged in');
        info('Use "grove login" to authenticate');
      }
      return;
    }

    const spinner = ora('Fetching user info...').start();

    try {
      const client = new HeartWoodClient({ token });
      const user = await client.getUserInfo();

      spinner.stop();

      if (!user) {
        if (shouldOutputJson()) {
          output({ authenticated: false, error: 'invalid_token' });
        } else {
          error('Token is invalid or expired');
          info('Use "grove login" to re-authenticate');
        }
        return;
      }

      const tenant = await getTenant();

      if (shouldOutputJson()) {
        output({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tenant,
        });
      } else {
        console.log(`${chalk.green('✓')} Logged in as ${chalk.cyan(user.email)}`);
        if (user.name) {
          console.log(`  Name:   ${user.name}`);
        }
        console.log(`  Role:   ${user.role}`);
        if (tenant) {
          console.log(`  Tenant: ${chalk.cyan(tenant)}`);
        }
      }
    } catch (err) {
      spinner.fail('Failed to fetch user info');
      error('Could not verify authentication', err instanceof Error ? err.message : err);
    }
  });

// Add whoami as both subcommand and alias
authCommand.addCommand(whoamiCommand);

// grove auth status
authCommand
  .command('status')
  .description('Show authentication status')
  .action(async () => {
    const authenticated = await isAuthenticated();
    const storage = await getTokenStorageLocation();
    const tenant = await getTenant();

    if (shouldOutputJson()) {
      output({
        authenticated,
        tokenStorage: storage,
        tenant,
      });
      return;
    }

    header('Authentication Status');

    section('Status');
    if (authenticated) {
      console.log(`  ${chalk.green('✓')} Authenticated`);
    } else {
      console.log(`  ${chalk.yellow('○')} Not authenticated`);
    }

    section('Storage');
    const storageLabels: Record<string, string> = {
      keychain: 'System Keychain',
      env: 'Environment Variable (GROVE_TOKEN)',
      file: 'Credentials File (~/.grove/credentials.json)',
      none: 'No token stored',
    };
    console.log(`  Token location: ${storageLabels[storage]}`);

    section('Configuration');
    console.log(`  Tenant: ${tenant ? chalk.cyan(tenant) : chalk.gray('(not set)')}`);

    if (!authenticated) {
      console.log();
      info('Use "grove login" to authenticate');
    }
  });

// Also expose whoami at top level (grove whoami)
export { whoamiCommand };
