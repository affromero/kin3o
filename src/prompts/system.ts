import type { DesignTokens } from './tokens.js';
import { PULSING_CIRCLE, WAVEFORM_BARS } from './examples.js';

export const LOTTIE_FORMAT_REFERENCE = `
LOTTIE FORMAT REFERENCE:

Top-level required fields:
- "v": string (use "5.5.2")
- "fr": number (use 60 for 60fps)
- "ip": 0 (in-point, always 0)
- "op": number (out-point, end frame — e.g. 120 for 2s at 60fps)
- "w": number (width in pixels)
- "h": number (height in pixels)
- "ddd": 0 (no 3D)
- "assets": [] (empty array)
- "layers": array of layer objects

Layer (shape layer, ty=4):
- "ty": 4 (shape layer)
- "ind": number (unique index)
- "nm": string (layer name)
- "ip": 0, "op": same as top-level op
- "st": 0 (start time)
- "ddd": 0
- "ks": transform object
- "shapes": array of shape objects
- "bm": 0 (blend mode, normal)

Transform "ks" object:
- "a": anchor point (VECTOR property)
- "p": position (VECTOR property)
- "s": scale (VECTOR property, [100,100] = 100%)
- "r": rotation (SCALAR property, degrees)
- "o": opacity (SCALAR property, 0-100)

PROPERTY TYPES — this distinction is critical:
- VECTOR property (position, scale, anchor, size): {"a":0,"k":[x,y]} or animated {"a":1,"k":[keyframes]}
- SCALAR property (rotation, opacity, roundness, stroke width): {"a":0,"k":0} or animated {"a":1,"k":[keyframes]}
- COLOR property: {"a":0,"k":[r,g,b,1]} with 0-1 floats (NOT 0-255)

Keyframe format:
{"t":frame,"s":[values],"o":{"x":[n],"y":[n]},"i":{"x":[n],"y":[n]}}
- "t": frame number
- "s": start values (array for vector, array with single value for scalar)
- "o": out-tangent (ease out), "i": in-tangent (ease in)
- Last keyframe needs only "t" and "s" (no tangents)

Easing (ease-in-out): "o":{"x":[0.42],"y":[0]}, "i":{"x":[0.58],"y":[1]}

Shape types:
- "el": ellipse — "p" (center, vector), "s" (size, vector)
- "rc": rectangle — "p" (center, vector), "s" (size, vector), "r" (roundness, scalar)
- "sh": path — "ks" with bezier {"c":bool, "v":[[x,y],...], "i":[[dx,dy],...], "o":[[dx,dy],...]}
- "fl": fill — "c" (color), "o" (opacity, scalar), "r" (fill rule, 1=nonzero)
- "st": stroke — "c" (color), "o" (opacity), "w" (width, scalar), "lc" (line cap, 2=round), "lj" (line join, 2=round)
- "gr": group — "it" array of shapes + MUST end with "tr" (group transform)
- "tr": group transform — same fields as layer transform "ks"
- "tm": trim path — "s" (start%, scalar), "e" (end%, scalar), "o" (offset, scalar)

CRITICAL: Groups MUST have "tr" (transform) as the LAST item in their "it" array.`;

/** Build the user prompt for a refinement request (static mode) */
export function buildRefinementUserPrompt(currentJson: string, instruction: string): string {
  return `Here is the current Lottie animation JSON:

${currentJson}

Refine this animation according to the following instruction: ${instruction}

Output ONLY the complete updated Lottie JSON. Preserve the overall structure and only modify what the instruction requires. Do not add explanation or commentary.`;
}

export function buildSystemPrompt(tokens?: DesignTokens): string {
  const sections: string[] = [];

  // 1. Role + output rules
  sections.push(`You are a Lottie animation generator. Output ONLY valid JSON. No markdown fences, no explanation, no commentary. Your output must be directly parseable by JSON.parse().`);

  // 2. Lottie format spec
  sections.push(LOTTIE_FORMAT_REFERENCE);

  // 3. Design rules
  sections.push(`
DESIGN RULES:
- Frame rate: 60fps
- Duration: 120-180 frames (2-3 seconds)
- Canvas: 512x512 pixels, center at [256, 256]
- Loopable: last keyframe values must match first keyframe values
- Use ease-in-out easing by default
- Shape layers only (ty=4)
- Always include "ddd": 0 and "assets": []
- Keep animations smooth and proportional
- Use distinct colors for different elements`);

  // 4. Design tokens (conditional)
  if (tokens) {
    const colorLines = Object.entries(tokens.colors)
      .map(([name, rgba]) => `  ${name}: [${rgba.join(', ')}]`)
      .join('\n');
    sections.push(`
DESIGN TOKENS — use these colors when appropriate:
${colorLines}`);
  }

  // 5. Few-shot examples
  sections.push(`
EXAMPLE 1 — Pulsing circle (scale animation):
${JSON.stringify(PULSING_CIRCLE)}

EXAMPLE 2 — 3-bar waveform (staggered position animation):
${JSON.stringify(WAVEFORM_BARS)}`);

  return sections.join('\n');
}
