/**
 * Kineo brand tokens — single source of truth for colors, fonts, and styling.
 * Used by landing page generator, preview template, and design token presets.
 */

export const brand = {
  name: 'Kineo',
  tagline: 'Text to Motion',
  description: 'AI-powered Lottie animation generator',

  colors: {
    accent: '#A78BFA',        // Soft violet — primary brand color
    accentBright: '#C4B5FD',  // Lighter violet — hover states, highlights
    accentDeep: '#7C3AED',    // Deep violet — buttons, CTAs
    warm: '#E2B96F',          // Champagne gold — secondary accent
    warmMuted: 'rgba(226, 185, 111, 0.7)',

    bg: '#08080A',            // Near-black background
    bgElevated: '#0E0E12',    // Slightly raised surfaces
    bgCard: '#131318',        // Card backgrounds
    bgCardHover: '#1A1A21',   // Card hover state

    border: 'rgba(255, 255, 255, 0.05)',
    borderHover: 'rgba(255, 255, 255, 0.1)',
    borderAccent: 'rgba(167, 139, 250, 0.15)',

    text: '#EDEDF0',          // Primary text
    textSecondary: '#9494A0', // Secondary/body text
    textMuted: '#4E4E5A',     // Muted/disabled text

    success: '#34D399',       // Validation passed
    error: '#EF4444',         // Validation failed
  },

  gradients: {
    text: 'linear-gradient(135deg, #C4B5FD 0%, #E2B96F 100%)',
    glow: 'radial-gradient(circle, rgba(124, 58, 237, 0.07) 0%, rgba(167, 139, 250, 0.03) 40%, transparent 70%)',
  },

  fonts: {
    heading: "'DM Serif Display', serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },

  /** Generate CSS custom properties block from brand tokens */
  toCssVars(): string {
    return `
  :root {
    --accent: ${this.colors.accent};
    --accent-bright: ${this.colors.accentBright};
    --accent-deep: ${this.colors.accentDeep};
    --accent-glow: rgba(167, 139, 250, 0.12);
    --accent-glow-strong: rgba(167, 139, 250, 0.25);
    --warm: ${this.colors.warm};
    --warm-muted: ${this.colors.warmMuted};
    --bg: ${this.colors.bg};
    --bg-elevated: ${this.colors.bgElevated};
    --bg-card: ${this.colors.bgCard};
    --bg-card-hover: ${this.colors.bgCardHover};
    --border: ${this.colors.border};
    --border-hover: ${this.colors.borderHover};
    --border-accent: ${this.colors.borderAccent};
    --text: ${this.colors.text};
    --text-secondary: ${this.colors.textSecondary};
    --text-muted: ${this.colors.textMuted};
    --code-bg: #111116;
    --success: ${this.colors.success};
    --gradient-text: ${this.gradients.text};
  }`.trim();
  },
} as const;
