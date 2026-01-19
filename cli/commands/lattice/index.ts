/**
 * Lattice (blog) commands for Grove CLI
 * grove lattice posts list
 * grove lattice posts get <slug>
 * grove lattice posts create
 * grove lattice posts delete <slug>
 * grove lattice drafts
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getToken } from '../../utils/auth.js';
import { getTenant } from '../../utils/config.js';
import { LatticeClient, LatticeApiError } from '../../../core/services/lattice.js';
import type { Post } from '../../../core/types.js';
import {
  output,
  error,
  warn,
  table,
  header,
  shouldOutputJson,
  formatDate,
  truncate,
  statusBadge,
} from '../../utils/output.js';

export const latticeCommand = new Command('lattice')
  .description('Manage Lattice blog posts');

/**
 * Get an authenticated Lattice client
 */
async function getClient(tenantOverride?: string): Promise<LatticeClient | null> {
  const token = await getToken();
  if (!token) {
    error('Not authenticated. Use "grove login" first.');
    return null;
  }

  const tenant = tenantOverride || await getTenant();
  if (!tenant) {
    error('No tenant configured. Use "grove config tenant <name>" first.');
    return null;
  }

  return new LatticeClient({ token, tenant });
}

/**
 * Format posts for human-readable table output
 */
function formatPostsTable(posts: Post[]): void {
  if (posts.length === 0) {
    warn('No posts found');
    return;
  }

  table(
    ['Slug', 'Title', 'Status', 'Updated'],
    posts.map(p => [
      chalk.cyan(p.slug),
      truncate(p.title, 40),
      statusBadge(p.status),
      formatDate(p.updatedAt),
    ])
  );

  console.log();
  console.log(chalk.gray(`  ${posts.length} post${posts.length === 1 ? '' : 's'} total`));
}

// Posts subcommand group
const postsCommand = new Command('posts')
  .description('Manage blog posts');

// grove lattice posts list
postsCommand
  .command('list')
  .description('List posts')
  .option('-s, --status <status>', 'Filter by status (draft, published, all)', 'all')
  .option('-l, --limit <n>', 'Maximum number of posts', '25')
  .action(async (options: { status: string; limit: string }) => {
    const client = await getClient();
    if (!client) return;

    const spinner = ora('Fetching posts...').start();

    try {
      const posts = await client.listPosts({
        status: options.status as 'draft' | 'published' | 'all',
        limit: parseInt(options.limit, 10),
      });

      spinner.stop();

      if (shouldOutputJson()) {
        output(posts);
      } else {
        header('Posts');
        formatPostsTable(posts);
      }
    } catch (err) {
      spinner.fail('Failed to fetch posts');
      if (err instanceof LatticeApiError) {
        error(err.message);
      } else {
        error('Unknown error', err);
      }
    }
  });

// grove lattice posts get <slug>
postsCommand
  .command('get <slug>')
  .description('Get a single post by slug')
  .action(async (slug: string) => {
    const client = await getClient();
    if (!client) return;

    const spinner = ora(`Fetching post "${slug}"...`).start();

    try {
      const post = await client.getPost(slug);
      spinner.stop();

      if (shouldOutputJson()) {
        output(post);
      } else {
        header(post.title);
        console.log(`  ${chalk.gray('Slug:')}    ${chalk.cyan(post.slug)}`);
        console.log(`  ${chalk.gray('Status:')}  ${statusBadge(post.status)}`);
        console.log(`  ${chalk.gray('Created:')} ${formatDate(post.createdAt)}`);
        console.log(`  ${chalk.gray('Updated:')} ${formatDate(post.updatedAt)}`);

        if (post.tags && post.tags.length > 0) {
          console.log(`  ${chalk.gray('Tags:')}    ${post.tags.map(t => chalk.blue(t)).join(', ')}`);
        }

        if (post.excerpt) {
          console.log();
          console.log(chalk.gray('Excerpt:'));
          console.log(`  ${post.excerpt}`);
        }

        if (post.content) {
          console.log();
          console.log(chalk.gray('Content preview:'));
          console.log(`  ${truncate(post.content.replace(/\n/g, ' '), 200)}`);
        }
      }
    } catch (err) {
      spinner.fail('Failed to fetch post');
      if (err instanceof LatticeApiError) {
        if (err.status === 404) {
          error(`Post "${slug}" not found`);
        } else {
          error(err.message);
        }
      } else {
        error('Unknown error', err);
      }
    }
  });

// grove lattice posts create
postsCommand
  .command('create')
  .description('Create a new post')
  .requiredOption('-t, --title <title>', 'Post title')
  .option('-c, --content <content>', 'Post content (markdown)')
  .option('-s, --status <status>', 'Post status (draft, published)', 'draft')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options: {
    title: string;
    content?: string;
    status: string;
    tags?: string;
  }) => {
    const client = await getClient();
    if (!client) return;

    const spinner = ora('Creating post...').start();

    try {
      const post = await client.createPost({
        title: options.title,
        content: options.content,
        status: options.status as 'draft' | 'published',
        tags: options.tags?.split(',').map(t => t.trim()),
      });

      spinner.succeed('Post created');

      if (shouldOutputJson()) {
        output(post);
      } else {
        console.log();
        console.log(`  ${chalk.green('✓')} Created: ${chalk.cyan(post.slug)}`);
        console.log(`    Status: ${statusBadge(post.status)}`);
      }
    } catch (err) {
      spinner.fail('Failed to create post');
      if (err instanceof LatticeApiError) {
        error(err.message);
      } else {
        error('Unknown error', err);
      }
    }
  });

// grove lattice posts delete <slug>
postsCommand
  .command('delete <slug>')
  .description('Delete a post')
  .option('-f, --force', 'Skip confirmation')
  .action(async (slug: string, options: { force?: boolean }) => {
    const client = await getClient();
    if (!client) return;

    // TODO: Add confirmation prompt if not --force and not in JSON mode
    if (!options.force && !shouldOutputJson()) {
      warn(`This will permanently delete "${slug}"`);
      // For now, require --force. Interactive prompt can be added later.
      error('Use --force to confirm deletion');
      return;
    }

    const spinner = ora(`Deleting post "${slug}"...`).start();

    try {
      await client.deletePost(slug);
      spinner.succeed('Post deleted');

      if (shouldOutputJson()) {
        output({ success: true, slug });
      }
    } catch (err) {
      spinner.fail('Failed to delete post');
      if (err instanceof LatticeApiError) {
        if (err.status === 404) {
          error(`Post "${slug}" not found`);
        } else {
          error(err.message);
        }
      } else {
        error('Unknown error', err);
      }
    }
  });

latticeCommand.addCommand(postsCommand);

// grove lattice drafts (shortcut)
latticeCommand
  .command('drafts')
  .description('List draft posts')
  .action(async () => {
    const client = await getClient();
    if (!client) return;

    const spinner = ora('Fetching drafts...').start();

    try {
      const posts = await client.listDrafts();
      spinner.stop();

      if (shouldOutputJson()) {
        output(posts);
      } else {
        header('Drafts');
        formatPostsTable(posts);
      }
    } catch (err) {
      spinner.fail('Failed to fetch drafts');
      if (err instanceof LatticeApiError) {
        error(err.message);
      } else {
        error('Unknown error', err);
      }
    }
  });
