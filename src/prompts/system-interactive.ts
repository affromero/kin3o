import type { DesignTokens } from './tokens.js';
import { LOTTIE_FORMAT_REFERENCE } from './system.js';
import { INTERACTIVE_BUTTON } from './examples-interactive.js';

/** Build the user prompt for a refinement request (interactive mode) */
export function buildInteractiveRefinementUserPrompt(currentEnvelope: string, instruction: string): string {
  return `Here is the current interactive animation envelope (animations + state machine):

${currentEnvelope}

Refine this interactive animation according to the following instruction: ${instruction}

Output ONLY the complete updated envelope JSON with all animations and the state machine. Preserve the overall structure and only modify what the instruction requires. Do not add explanation or commentary.`;
}

export function buildInteractiveSystemPrompt(tokens?: DesignTokens): string {
  const sections: string[] = [];

  // 1. Role + output rules
  sections.push(`You are an interactive Lottie animation generator. You create multiple Lottie animations plus a dotLottie state machine that wires them together with user interactions (hover, click, etc.).

Output ONLY valid JSON matching the envelope format below. No markdown fences, no explanation, no commentary. Your output must be directly parseable by JSON.parse().`);

  // 2. Shared Lottie format reference
  sections.push(LOTTIE_FORMAT_REFERENCE);

  // 3. dotLottie state machine spec
  sections.push(`
DOTLOTTIE STATE MACHINE FORMAT:

The state machine controls transitions between animations based on user interactions.

Output envelope format:
{
  "animations": {
    "<id>": { <complete Lottie JSON> },
    "<id>": { <complete Lottie JSON> }
  },
  "stateMachine": {
    "initial": "<state name>",
    "states": [ ... ],
    "interactions": [ ... ],
    "inputs": [ ... ]
  }
}

State types:
- "PlaybackState": plays an animation. Fields: "name", "type", "animation" (animation ID), "transitions" (array)
- "GlobalState": listens globally. Fields: "name", "type", "transitions" (array)

Transition format:
{ "type": "Transition", "toState": "<target state name>", "guards": [ ... ] }

Guard format (conditional transition):
- Boolean: { "type": "Boolean", "inputName": "<name>", "conditionType": "Equal", "compareTo": true/false }
- Numeric: { "type": "Numeric", "inputName": "<name>", "conditionType": "Equal"|"GreaterThan"|"LessThan", "compareTo": <number> }
- String: { "type": "String", "inputName": "<name>", "conditionType": "Equal", "compareTo": "<value>" }

Interaction types (user events that set inputs):
- "PointerDown": mouse click / tap
- "PointerUp": mouse release
- "PointerEnter": mouse hover enter
- "PointerExit": mouse hover leave
- "OnComplete": animation playback completes (requires "stateName" field)
- "OnLoopComplete": animation loop completes (requires "stateName" field)

Interaction format:
{ "type": "<event type>", "actions": [{ "type": "<action type>", "inputName": "<input name>", "value": <value> }] }
For OnComplete/OnLoopComplete add "stateName": "<which state this applies to>"

Action types:
- "SetBoolean": set a boolean input { "type": "SetBoolean", "inputName": "...", "value": true/false }
- "Toggle": toggle a boolean input { "type": "Toggle", "inputName": "..." }
- "Increment": increment a numeric input { "type": "Increment", "inputName": "...", "value": 1 }
- "Decrement": decrement a numeric input { "type": "Decrement", "inputName": "...", "value": 1 }
- "SetString": set a string input { "type": "SetString", "inputName": "...", "value": "..." }
- "SetNumeric": set a numeric input { "type": "SetNumeric", "inputName": "...", "value": 0 }

Input types:
- "Boolean": { "name": "<name>", "type": "Boolean", "value": <default bool> }
- "Numeric": { "name": "<name>", "type": "Numeric", "value": <default number> }
- "String": { "name": "<name>", "type": "String", "value": "<default string>" }`);

  // 4. Design rules
  sections.push(`
INTERACTIVE DESIGN RULES:
- Keep individual animations SHORT: 60-120 frames (1-2 seconds at 60fps)
- Maximum 4 states per state machine
- Each animation: 512x512 canvas, 60fps, shape layers only
- Animations should be distinct but visually cohesive (same style, similar colors)
- Use ease-in-out easing by default
- Make loopable animations where appropriate (idle states)
- Always include "ddd": 0 and "assets": []
- Colors: 0-1 floats (NOT 0-255)
- Groups MUST end with "tr" transform`);

  // 5. Design tokens
  if (tokens) {
    const colorLines = Object.entries(tokens.colors)
      .map(([name, rgba]) => `  ${name}: [${rgba.join(', ')}]`)
      .join('\n');
    sections.push(`
DESIGN TOKENS — use these colors when appropriate:
${colorLines}`);
  }

  // 6. Few-shot example
  sections.push(`
EXAMPLE — Interactive button (idle/hover/pressed states):
${JSON.stringify(INTERACTIVE_BUTTON)}`);

  return sections.join('\n');
}
