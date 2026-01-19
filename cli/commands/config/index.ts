/**
 * Config commands for Grove CLI
 * grove config tenant [name]
 * grove config list
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getConfig,
  setTenant,
  getTenant,
  getConfigPath,
} from '../../utils/config.js';
import {
  output,
  success,
  info,
  header,
  section,
  shouldOutputJson,
} from '../../utils/output.js';

export const configCommand = new Command('config')
  .description('Manage CLI configuration');

// grove config tenant [name]
configCommand
  .command('tenant [name]')
  .description('Get or set the current tenant')
  .action(async (name?: string) => {
    if (name) {
      // Set tenant
      await setTenant(name);
      success(`Tenant set to ${chalk.cyan(name)}`);
    } else {
      // Get tenant
      const tenant = await getTenant();
      if (tenant) {
        output({ tenant }, () => `Current tenant: ${chalk.cyan(tenant)}`);
      } else {
        output({ tenant: null }, () => chalk.yellow('No tenant configured. Use: grove config tenant <name>'));
      }
    }
  });

// grove config list
configCommand
  .command('list')
  .description('Show all configuration settings')
  .action(async () => {
    const config = await getConfig();
    const configPath = getConfigPath();

    if (shouldOutputJson()) {
      output({ ...config, configPath });
      return;
    }

    header('Grove Configuration');

    section('Settings');
    console.log(`  Tenant:         ${config.tenant ? chalk.cyan(config.tenant) : chalk.gray('(not set)')}`);
    console.log(`  Default Region: ${config.defaultRegion ? chalk.cyan(config.defaultRegion) : chalk.gray('(not set)')}`);
    console.log(`  Output Format:  ${config.outputFormat ? chalk.cyan(config.outputFormat) : chalk.gray('human')}`);

    console.log();
    section('Paths');
    console.log(`  Config file:    ${chalk.gray(configPath)}`);

    console.log();
    info('Use "grove config tenant <name>" to set your tenant');
  });

// grove config init (interactive setup - future)
configCommand
  .command('init')
  .description('Interactive configuration setup')
  .action(async () => {
    if (shouldOutputJson()) {
      output({ error: 'Interactive mode not available in JSON output mode' });
      return;
    }

    header('Grove CLI Setup');
    info('Interactive setup coming soon!');
    info('For now, use:');
    console.log('  grove config tenant <your-tenant-name>');
    console.log('  grove login --token <your-token>');
  });
