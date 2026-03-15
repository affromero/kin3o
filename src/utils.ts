import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

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
