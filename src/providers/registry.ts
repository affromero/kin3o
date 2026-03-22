import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { generateWithClaude } from './claude.js';
import { generateWithCodex } from './codex.js';

export interface GenerationResult {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
}

export interface ProviderConfig {
  displayName: string;
  models: string[];
  defaultModel: string;
  isAvailable: () => Promise<boolean>;
  generate: (model: string, systemPrompt: string, userPrompt: string, timeoutMs?: number) => Promise<GenerationResult>;
}

/** Default CLI subprocess timeout: 10 minutes */
const DEFAULT_TIMEOUT_MS = 600_000;

/** Get timeout with optional user override */
export function getTimeoutMs(userOverride?: number): number {
  return userOverride ?? DEFAULT_TIMEOUT_MS;
}

const home = homedir();

function hasBinary(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  'claude-code': {
    displayName: 'Claude Code (Max/Pro)',
    models: ['sonnet', 'opus', 'haiku'],
    defaultModel: 'sonnet',
    isAvailable: async () => {
      if (!hasBinary('claude')) return false;
      return existsSync(join(home, '.claude.json'))
        || existsSync(join(home, '.claude', 'credentials.json'));
    },
    generate: generateWithClaude,
  },
  codex: {
    displayName: 'OpenAI Codex (CLI)',
    models: ['gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'codex-mini-latest'],
    defaultModel: 'codex-mini-latest',
    isAvailable: async () => {
      if (!hasBinary('codex')) return false;
      return existsSync(join(home, '.codex', 'auth.json'));
    },
    generate: generateWithCodex,
  },
};

/** Detect which providers are available (binary + auth) */
export async function detectAvailableProviders(): Promise<string[]> {
  const available: string[] = [];
  for (const [key, config] of Object.entries(PROVIDERS)) {
    if (await config.isAvailable()) {
      available.push(key);
    }
  }
  return available;
}

/** Get default provider (first available in priority order) */
export async function getDefaultProvider(): Promise<string | null> {
  const priority = ['claude-code', 'codex'];
  for (const key of priority) {
    const config = PROVIDERS[key];
    if (config && await config.isAvailable()) {
      return key;
    }
  }
  return null;
}
