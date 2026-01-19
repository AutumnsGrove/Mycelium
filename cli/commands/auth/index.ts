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
import {
  getToken,
  saveToken,
  deleteToken,
  isAuthenticated,
  getTokenStorageLocation,
} from '../../utils/auth.js';
import { getTenant } from '../../utils/config.js';
import { HeartWoodClient } from '../../../core/services/heartwood.js';
import {
  output,
  error,
  warn,
  info,
  header,
  section,
  shouldOutputJson,
} from '../../utils/output.js';

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
      // Device code flow (not yet implemented in Heartwood)
      if (shouldOutputJson()) {
        output({
          error: 'device_code_not_available',
          message: 'Device code flow not yet implemented. Use --token flag.',
        });
        return;
      }

      header('Grove Login');
      warn('Device code flow coming soon!');
      console.log();
      info('For now, you can log in with a token:');
      console.log(`  ${chalk.cyan('grove login --token <your-token>')}`);
      console.log();
      info('To get a token:');
      console.log('  1. Log in to your Grove dashboard');
      console.log('  2. Go to Settings → API Tokens');
      console.log('  3. Create a new CLI token');
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
