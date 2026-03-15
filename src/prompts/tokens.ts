import { readFileSync } from 'node:fs';
import { hexToLottieColor } from '../utils.js';

export interface DesignTokens {
  colors: Record<string, [number, number, number, number]>;
}

export const SOTTO_TOKENS: DesignTokens = {
  colors: {
    primary: hexToLottieColor('#D97706'),
    accent: hexToLottieColor('#1E3A5F'),
    background: hexToLottieColor('#FEFCF8'),
    surface: hexToLottieColor('#FFFFFF'),
    text: hexToLottieColor('#1A1A1A'),
    muted: hexToLottieColor('#6B7280'),
  },
};

interface TokenFileSchema {
  colors?: Record<string, string>;
}

/** Load design tokens from a JSON file, converting hex colors to Lottie RGBA */
export function loadDesignTokens(path?: string): DesignTokens | undefined {
  if (!path) return undefined;

  if (path === 'sotto') return SOTTO_TOKENS;

  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as TokenFileSchema;

  if (!data.colors) return undefined;

  const colors: Record<string, [number, number, number, number]> = {};
  for (const [name, hex] of Object.entries(data.colors)) {
    colors[name] = hexToLottieColor(hex);
  }

  return { colors };
}
