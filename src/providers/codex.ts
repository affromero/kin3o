import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GenerationResult } from './registry.js';
import { getTimeoutMs } from './registry.js';
import { filterCliStderr } from '../utils.js';

export async function generateWithCodex(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs?: number,
): Promise<GenerationResult> {
  const start = Date.now();
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const tmpFile = join(mkdtempSync(join(tmpdir(), 'codex-')), 'output.txt');
  const timeout = getTimeoutMs(timeoutMs);

  const args = [
    'exec', '-',
    '--skip-git-repo-check',
    '--ephemeral',
    '-o', tmpFile,
    '--model', model,
  ];

  const content = await new Promise<string>((resolve, reject) => {
    const proc = spawn('codex', args, {
      timeout,
      env: { ...process.env },
    });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      const filtered = filterCliStderr(stderr);
      const hint = filtered.includes('401') || filtered.includes('Unauthorized')
        ? ' (ensure codex is authenticated via `codex auth`)'
        : code === 143
          ? ` (timed out after ${Math.round(timeout / 1000)}s — try --timeout <ms> or a faster model)`
          : '';
      try {
        const output = readFileSync(tmpFile, 'utf-8').trim();
        unlinkSync(tmpFile);
        if (code !== 0) reject(new Error(`codex CLI exited ${code}: ${filtered}${hint}`));
        else resolve(output);
      } catch {
        reject(new Error(`codex CLI exited ${code}: ${filtered}${hint}`));
      }
    });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error('codex CLI not found. Install Codex first.'));
      } else {
        reject(err);
      }
    });
    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });

  return {
    content,
    provider: 'codex',
    model,
    durationMs: Date.now() - start,
  };
}
