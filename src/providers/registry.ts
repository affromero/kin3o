import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { generateWithClaude } from './claude.js';
import { generateWithCodex } from './codex.js';
import { generateWithAnthropic } from './anthropic.js';

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
  generate: (model: string, systemPrompt: string, userPrompt: string) => Promise<GenerationResult>;
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
    models: ['codex'],
    defaultModel: 'codex',
    isAvailable: async () => {
      if (!hasBinary('codex')) return false;
      return existsSync(join(home, '.codex', 'auth.json'));
    },
    generate: generateWithCodex,
  },
  anthropic: {
    displayName: 'Anthropic API',
    models: ['claude-sonnet-4-6-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-6-20250514'],
    defaultModel: 'claude-sonnet-4-6-20250514',
    isAvailable: async () => {
      return !!process.env['ANTHROPIC_API_KEY'];
    },
    generate: generateWithAnthropic,
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
  const priority = ['claude-code', 'codex', 'anthropic'];
  for (const key of priority) {
    const config = PROVIDERS[key];
    if (config && await config.isAvailable()) {
      return key;
    }
  }
  return null;
}
