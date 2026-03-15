import { mkdirSync, readdirSync } from 'node:fs';
import { join, parse as parsePath } from 'node:path';

/** Strip benign CLI warnings (e.g. PATH update failures) from stderr */
export function filterCliStderr(stderr: string): string {
  return stderr
    .split('\n')
    .filter(line => !line.includes('could not update PATH'))
    .join('\n')
    .trim();
}

/** Extract a JSON object from LLM output (strips markdown fences, surrounding text) */
export function extractJson(raw: string): string {
  // Strip markdown code fences
  let cleaned = raw.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '');

  // Try to extract a JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in output');
  }

  const jsonStr = match[0];
  // Validate it parses
  JSON.parse(jsonStr);
  return jsonStr;
}

export interface InteractiveEnvelope {
  animations: Record<string, object>;
  stateMachine: {
    initial: string;
    states: unknown[];
    [key: string]: unknown;
  };
}

/** Extract an interactive envelope JSON (animations + stateMachine) from LLM output */
export function extractInteractiveJson(raw: string): InteractiveEnvelope {
  const jsonStr = extractJson(raw);
  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

  if (typeof parsed['animations'] !== 'object' || parsed['animations'] === null || Array.isArray(parsed['animations'])) {
    throw new Error('Interactive envelope missing "animations" object');
  }

  const animations = parsed['animations'] as Record<string, unknown>;
  const animKeys = Object.keys(animations);
  if (animKeys.length === 0) {
    throw new Error('Interactive envelope "animations" is empty');
  }

  for (const key of animKeys) {
    if (typeof animations[key] !== 'object' || animations[key] === null) {
      throw new Error(`Animation "${key}" is not a valid object`);
    }
  }

  if (typeof parsed['stateMachine'] !== 'object' || parsed['stateMachine'] === null || Array.isArray(parsed['stateMachine'])) {
    throw new Error('Interactive envelope missing "stateMachine" object');
  }

  const sm = parsed['stateMachine'] as Record<string, unknown>;
  if (typeof sm['initial'] !== 'string') {
    throw new Error('State machine missing "initial" string');
  }
  if (!Array.isArray(sm['states'])) {
    throw new Error('State machine missing "states" array');
  }

  return {
    animations: animations as Record<string, object>,
    stateMachine: sm as InteractiveEnvelope['stateMachine'],
  };
}

/** Convert hex color string to Lottie [r, g, b, 1] array (0-1 floats) */
export function hexToLottieColor(hex: string): [number, number, number, number] {
  let h = hex.replace(/^#/, '');

  // Expand 3-char hex
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  return [
    Math.round(r * 1000) / 1000,
    Math.round(g * 1000) / 1000,
    Math.round(b * 1000) / 1000,
    1,
  ];
}

/** Convert a prompt string to a filename-safe slug */
export function slugify(text: string, maxLength = 40): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

/** Ensure the output directory exists */
export function ensureOutputDir(dir = 'output'): string {
  const outputPath = join(process.cwd(), dir);
  mkdirSync(outputPath, { recursive: true });
  return outputPath;
}

/** Compute the next versioned output path for a refinement */
export function nextVersionedPath(inputPath: string, outputDir: string): string {
  const { name, ext } = parsePath(inputPath);

  // Strip existing -vN suffix to get base name
  const baseName = name.replace(/-v\d+$/, '');

  // Scan output dir for existing versioned files
  const versionPattern = new RegExp(`^${escapeRegex(baseName)}-v(\\d+)\\${ext}$`);
  let maxVersion = 1;

  try {
    for (const file of readdirSync(outputDir)) {
      const match = file.match(versionPattern);
      if (match) {
        maxVersion = Math.max(maxVersion, parseInt(match[1]!, 10));
      }
    }
  } catch {
    // Output dir may not exist yet — that's fine, start at v2
  }

  const nextVersion = maxVersion + 1;
  return join(outputDir, `${baseName}-v${nextVersion}${ext}`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
