/**
 * Prompt Registry — single entry point for all system prompts.
 *
 * Static mode:  buildSystemPrompt()        → single Lottie JSON animation
 * Interactive:  buildInteractiveSystemPrompt() → multi-animation envelope + state machine
 *
 * Both share LOTTIE_FORMAT_REFERENCE for consistent Lottie spec knowledge.
 * Each mode has its own few-shot examples tuned for that output format.
 */

// ── Shared ──
export { LOTTIE_FORMAT_REFERENCE } from './system.js';

// ── Static mode ──
export { buildSystemPrompt, buildRefinementUserPrompt } from './system.js';
export { PULSING_CIRCLE, WAVEFORM_BARS } from './examples.js';

// ── Interactive mode ──
export { buildInteractiveSystemPrompt, buildInteractiveRefinementUserPrompt } from './system-interactive.js';
export { INTERACTIVE_BUTTON } from './examples-interactive.js';

// ── Mascot ──
export { MASCOT_STATIC, MASCOT_INTERACTIVE } from './examples-mascot.js';

// ── Design tokens ──
export { loadDesignTokens, SOTTO_TOKENS } from './tokens.js';
export type { DesignTokens } from './tokens.js';
