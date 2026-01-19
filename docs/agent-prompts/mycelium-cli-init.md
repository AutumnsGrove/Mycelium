# Mycelium: Initialize @groveengine/cli

## Context

Mycelium is being refactored from MCP-first to CLI-first architecture. The CLI will be published as `@groveengine/cli` on npm with the command `grove`.

This prompt initializes the CLI framework and core structure. Auth endpoints may not be ready yet, so implement with mock/bypass capability.

## Phase 1 Audit Reference

See `docs/PHASE1-CLI-REFACTOR-AUDIT.md` for full context including:
- Service catalog and API audit
- Target architecture
- All locked-in decisions

## Locked-In Decisions

- **Package**: `@groveengine/cli`
- **CLI command**: `grove`
- **Language**: TypeScript
- **Auth storage**: Keychain (1st) → env var (2nd) → config file (3rd)
- **Default tenant**: CLI remembers last-used
- **Agent mode**: `--json` flag or `GROVE_AGENT=1` env var

## Target Structure

```
mycelium/
├── cli/
│   ├── commands/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   └── whoami.ts
│   │   ├── config/
│   │   │   ├── init.ts
│   │   │   ├── tenant.ts
│   │   │   └── list.ts
│   │   ├── lattice/
│   │   │   ├── posts.ts
│   │   │   └── index.ts
│   │   ├── amber/
│   │   │   └── index.ts
│   │   ├── bloom/
│   │   │   └── index.ts
│   │   └── foliage/
│   │       └── index.ts
│   ├── utils/
│   │   ├── output.ts        # JSON/table formatting
│   │   ├── auth.ts          # Keychain + token handling
│   │   └── config.ts        # Config file management
│   └── index.ts             # CLI entry point
├── core/
│   ├── services/
│   │   ├── heartwood.ts     # Auth client
│   │   ├── lattice.ts       # Blog client
│   │   ├── amber.ts         # Storage client
│   │   ├── bloom.ts         # VPS client
│   │   └── foliage.ts       # Theme client
│   └── types.ts             # Shared type definitions
├── mcp/                     # Existing MCP server (refactor later)
└── package.json
```

## Implementation Tasks

### 1. Package Setup

```json
{
  "name": "@groveengine/cli",
  "version": "0.1.0",
  "bin": {
    "grove": "./dist/cli/index.js"
  },
  "type": "module"
}
```

Dependencies:
- `commander` - CLI framework
- `keytar` - System keychain access
- `chalk` - Terminal colors
- `ora` - Spinners
- `cli-table3` - Table output

### 2. CLI Framework (Commander.js)

```typescript
// cli/index.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('grove')
  .description('CLI for the Grove ecosystem')
  .version('0.1.0');

// Global options
program
  .option('--json', 'Output as JSON')
  .option('--tenant <name>', 'Override default tenant');

// Register subcommands
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(latticeCommand);
program.addCommand(amberCommand);

program.parse();
```

### 3. Agent Mode Support

```typescript
// cli/utils/output.ts
export function isAgentMode(): boolean {
  return process.env.GROVE_AGENT === '1' || program.opts().json;
}

export function output(data: unknown, humanFormatter?: () => string) {
  if (isAgentMode()) {
    console.log(JSON.stringify(data));
  } else if (humanFormatter) {
    console.log(humanFormatter());
  } else {
    console.log(data);
  }
}
```

### 4. Auth Token Storage

Priority order:
1. System keychain (via keytar)
2. Environment variable (`GROVE_TOKEN`)
3. Config file (`~/.grove/credentials.json`)

```typescript
// cli/utils/auth.ts
import keytar from 'keytar';

const SERVICE_NAME = 'grove-cli';
const ACCOUNT_NAME = 'default';

export async function getToken(): Promise<string | null> {
  // 1. Try keychain
  const keychainToken = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  if (keychainToken) return keychainToken;

  // 2. Try env var
  if (process.env.GROVE_TOKEN) return process.env.GROVE_TOKEN;

  // 3. Try config file
  const config = await loadConfig();
  return config?.token ?? null;
}

export async function saveToken(token: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, token);
}
```

### 5. Config Management

```typescript
// cli/utils/config.ts
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.grove');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface GroveConfig {
  tenant?: string;
  defaultRegion?: 'eu' | 'us';
}

export async function getConfig(): Promise<GroveConfig> { ... }
export async function setConfig(updates: Partial<GroveConfig>): Promise<void> { ... }
export function getTenant(): string { ... }
```

### 6. Implement Core Commands

**grove login** (stub until Heartwood ready):
```typescript
// For now, accept token directly or show "coming soon"
grove login --token <token>  // Manual token entry
grove login                   // Opens browser (when ready)
```

**grove whoami**:
```typescript
// Call /api/auth/session and display user info
```

**grove config tenant**:
```typescript
grove config tenant           // Show current
grove config tenant autumn    // Set tenant
```

**grove lattice posts list**:
```typescript
grove lattice posts list
grove lattice posts list --status draft
grove lattice posts list --json
```

### 7. Service Clients

```typescript
// core/services/lattice.ts
export class LatticeClient {
  constructor(
    private token: string,
    private tenant: string,
    private baseUrl = 'https://grove.place'
  ) {}

  async listPosts(options?: { status?: string; limit?: number }): Promise<Post[]> {
    const url = new URL(`/api/${this.tenant}/posts`, this.baseUrl);
    if (options?.status) url.searchParams.set('status', options.status);
    if (options?.limit) url.searchParams.set('limit', String(options.limit));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });

    if (!res.ok) throw new ApiError(res);
    return res.json();
  }

  // ... other methods
}
```

## Success Criteria

- [ ] `grove --help` shows all commands
- [ ] `grove --version` works
- [ ] `grove config tenant <name>` persists to config file
- [ ] `grove lattice posts list` calls API and displays results
- [ ] `grove lattice posts list --json` outputs JSON
- [ ] `GROVE_AGENT=1 grove lattice posts list` outputs JSON
- [ ] Token storage works (keychain or env var)
- [ ] Shared service clients usable by both CLI and MCP

## Notes

- Start with Lattice commands as proof of concept
- Auth can be mocked initially (accept `--token` flag)
- Keep MCP server working during refactor (don't break existing functionality)
- Tests can come after initial structure is working
