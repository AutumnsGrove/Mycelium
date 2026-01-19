#!/usr/bin/env node
/**
 * Grove CLI - Command line interface for the Grove ecosystem
 * @package @groveengine/cli
 */

import { Command } from 'commander';
import { setJsonOutput } from './utils/output.js';
import { configCommand } from './commands/config/index.js';
import { authCommand } from './commands/auth/index.js';
import { latticeCommand } from './commands/lattice/index.js';

const program = new Command();

program
  .name('grove')
  .description('CLI for the Grove ecosystem')
  .version('0.1.0')
  .option('--json', 'Output as JSON (also enabled by GROVE_AGENT=1)')
  .option('--tenant <name>', 'Override default tenant')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      setJsonOutput(true);
    }
  });

// Register subcommands
program.addCommand(configCommand);
program.addCommand(authCommand);
program.addCommand(latticeCommand);

// Parse and execute
program.parse();
