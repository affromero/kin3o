import { spawn } from 'node:child_process';
import type { GenerationResult } from './registry.js';
import { getTimeoutMs } from './registry.js';
import { filterCliStderr } from '../utils.js';

export async function generateWithClaude(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs?: number,
): Promise<GenerationResult> {
  const start = Date.now();
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const timeout = getTimeoutMs(timeoutMs);

  const content = await new Promise<string>((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const proc = spawn('claude', ['--print', '--model', model], {
      timeout,
      env,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        const filtered = filterCliStderr(stderr);
        const hint = code === 143 ? ` (timed out after ${Math.round(timeout / 1000)}s — try --timeout <ms> or a faster model)` : '';
        reject(new Error(`claude CLI exited ${code}: ${filtered}${hint}`));
      } else {
        resolve(stdout.trim());
      }
    });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error('claude CLI not found. Install Claude Code first.'));
      } else {
        reject(err);
      }
    });
    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });

  return {
    content,
    provider: 'claude-code',
    model,
    durationMs: Date.now() - start,
  };
}
