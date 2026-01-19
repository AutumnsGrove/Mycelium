/**
 * Output utilities for Grove CLI
 * Supports both human-friendly and agent-friendly (JSON) output modes
 */

import chalk from 'chalk';
import Table from 'cli-table3';

// Check if we're in agent mode
export function isAgentMode(): boolean {
  return process.env.GROVE_AGENT === '1';
}

// Global JSON flag (set by commander)
let jsonOutputEnabled = false;

export function setJsonOutput(enabled: boolean): void {
  jsonOutputEnabled = enabled;
}

export function shouldOutputJson(): boolean {
  return jsonOutputEnabled || isAgentMode();
}

/**
 * Output data in appropriate format (JSON or human-readable)
 */
export function output<T>(data: T, humanFormatter?: (data: T) => string): void {
  if (shouldOutputJson()) {
    console.log(JSON.stringify(data, null, 2));
  } else if (humanFormatter) {
    console.log(humanFormatter(data));
  } else {
    console.log(data);
  }
}

/**
 * Print a success message
 */
export function success(message: string): void {
  if (shouldOutputJson()) {
    console.log(JSON.stringify({ success: true, message }));
  } else {
    console.log(chalk.green('✓') + ' ' + message);
  }
}

/**
 * Print an error message
 */
export function error(message: string, details?: unknown): void {
  if (shouldOutputJson()) {
    console.error(JSON.stringify({ error: true, message, details }));
  } else {
    console.error(chalk.red('✗') + ' ' + message);
    if (details) {
      console.error(chalk.gray(String(details)));
    }
  }
}

/**
 * Print a warning message
 */
export function warn(message: string): void {
  if (shouldOutputJson()) {
    console.log(JSON.stringify({ warning: true, message }));
  } else {
    console.log(chalk.yellow('⚠') + ' ' + message);
  }
}

/**
 * Print an info message
 */
export function info(message: string): void {
  if (shouldOutputJson()) {
    // Info messages are suppressed in JSON mode
    return;
  }
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Print a header (grove-find style decorated box)
 */
export function header(title: string): void {
  if (shouldOutputJson()) return;

  const width = 60;
  const padding = Math.max(0, width - title.length - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  console.log(chalk.cyan('╔' + '═'.repeat(width) + '╗'));
  console.log(chalk.cyan('║') + ' '.repeat(leftPad) + chalk.bold(title) + ' '.repeat(rightPad) + chalk.cyan('║'));
  console.log(chalk.cyan('╚' + '═'.repeat(width) + '╝'));
  console.log();
}

/**
 * Print a section header
 */
export function section(title: string): void {
  if (shouldOutputJson()) return;
  console.log(chalk.magenta('═══ ' + title + ' ═══'));
}

/**
 * Create a simple table from data
 */
export function table(
  headers: string[],
  rows: string[][],
  options?: { compact?: boolean }
): void {
  if (shouldOutputJson()) {
    // Convert to array of objects for JSON output
    const data = rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h.toLowerCase()] = row[i] || '';
      });
      return obj;
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const t = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
      compact: options?.compact ?? false,
    },
  });

  rows.forEach(row => t.push(row));
  console.log(t.toString());
}

/**
 * Format a date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Status badge formatting
 */
export function statusBadge(status: string): string {
  if (shouldOutputJson()) return status;

  switch (status.toLowerCase()) {
    case 'published':
      return chalk.green('● published');
    case 'draft':
      return chalk.yellow('○ draft');
    case 'scheduled':
      return chalk.blue('◐ scheduled');
    default:
      return chalk.gray(status);
  }
}
