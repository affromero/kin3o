// ── Types ──

export type MotionPersonality = 'playful' | 'premium' | 'corporate' | 'energetic';

export type EmotionHint =
  | 'joy'
  | 'calm'
  | 'urgency'
  | 'surprise'
  | 'elegance'
  | 'sadness'
  | 'playfulness';

export interface MotionDesignOptions {
  personality?: MotionPersonality;
  emotion?: EmotionHint;
}

// ── Keyword maps ──

const PERSONALITY_KEYWORDS: Record<MotionPersonality, string[]> = {
  playful: ['fun', 'whimsical', 'bouncy', 'cute', 'friendly', 'cartoon', 'playful', 'silly', 'cheerful'],
  premium: ['elegant', 'minimal', 'luxury', 'sophisticated', 'premium', 'sleek', 'refined', 'classy'],
  corporate: ['clean', 'professional', 'business', 'dashboard', 'corporate', 'enterprise', 'formal'],
  energetic: ['dynamic', 'energetic', 'bold', 'exciting', 'fast', 'intense', 'powerful', 'explosive'],
};

const EMOTION_KEYWORDS: Record<EmotionHint, string[]> = {
  joy: ['happy', 'joy', 'celebrate', 'celebration', 'party', 'confetti', 'success', 'win', 'delight'],
  calm: ['calm', 'peaceful', 'serene', 'zen', 'meditat', 'relax', 'gentle', 'soothing', 'breathing'],
  urgency: ['urgent', 'alert', 'warning', 'error', 'danger', 'emergency', 'critical', 'alarm'],
  surprise: ['surprise', 'wow', 'pop', 'burst', 'explod', 'impact', 'reveal', 'magic'],
  elegance: ['grace', 'flowing', 'silk', 'smooth', 'ballet'],
  sadness: ['sad', 'melanchol', 'weight', 'heavy', 'gravity', 'droop', 'wilt'],
  playfulness: ['bounce', 'wiggle', 'wobble', 'squish', 'jiggle', 'hop', 'skip', 'dance'],
};

// ── Keyword detection ──

export function detectPersonality(prompt: string): MotionPersonality | undefined {
  const lower = prompt.toLowerCase();
  for (const [personality, keywords] of Object.entries(PERSONALITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return personality as MotionPersonality;
    }
  }
  return undefined;
}

export function detectEmotion(prompt: string): EmotionHint | undefined {
  const lower = prompt.toLowerCase();
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return emotion as EmotionHint;
    }
  }
  return undefined;
}

// ── Section builders ──
// All timing translated to frame counts at 60fps.
// All easing translated to Lottie tangent values: "o" (out-tangent), "i" (in-tangent).

export function buildCorePrinciplesSection(): string {
  return `
MOTION DESIGN PRINCIPLES:

Three motion layers (flat animation = missing layers):
- PRIMARY: main action the viewer follows (100% amplitude)
- SECONDARY: supporting richness — shadows, related elements shifting (30-50% amplitude, offset 3-6 frames from primary, different easing)
- AMBIENT: background life — subtle pulses, gradient shifts (10-20% amplitude, continuous/slow, never demands attention)

Narrative structure for each animation:
- Setup (20-30% of duration): establish context, prepare viewer
- Action (30-40%): primary motion, hero moment
- Resolution (30-40%): settle, breathe, confirm completion

1/3 rules:
- DISTANCE: no motion travels >170px (1/3 of 512px canvas) without an intermediate keyframe
- DENSITY: with 3+ animated elements, max 1/3 actively moving at any moment

Disney principles for Lottie:
- Anticipation: 3-5% scale dip or small opposite-direction move before the main action (3-6 frames)
- Follow-through: child/secondary elements settle 3-9 frames after primary
- Squash-stretch on impacts: scale to [1.15, 0.87] on squash, [0.87, 1.15] on stretch, preserve area
- Arcs: add 10-20px perpendicular offset at midpoint for organic curved paths
- Staging: dim non-hero elements to 40-60% opacity, hero enters 6-12 frames after supporting elements`;
}

export function buildTimingEasingSection(): string {
  return `
TIMING TABLE (at 60fps):
| Element Type        | Frames | Duration |
|---------------------|--------|----------|
| Micro-feedback      | 5-7    | 80-120ms |
| Button/toggle       | 7-11   | 120-180ms|
| Icon transition     | 9-15   | 150-250ms|
| Card enter/exit     | 12-21  | 200-350ms|
| Modal/dialog        | 18-24  | 300-400ms|
| Dramatic reveal     | 36-72  | 600-1200ms|
| Ambient/breathing   | 120-1200| 2-20s   |

DIRECTIONAL EASING (Lottie tangent values):
| Context                | "o" (out-tangent)           | "i" (in-tangent)            |
|------------------------|-----------------------------|-----------------------------|
| Entrance (ease-out)    | {"x":[0.0],"y":[0.0]}      | {"x":[0.58],"y":[1.0]}     |
| Exit (ease-in)         | {"x":[0.42],"y":[0.0]}     | {"x":[1.0],"y":[1.0]}      |
| On-screen (ease-in-out)| {"x":[0.42],"y":[0.0]}     | {"x":[0.58],"y":[1.0]}     |
| Looping/ambient (sine) | {"x":[0.37],"y":[0.0]}     | {"x":[0.63],"y":[1.0]}     |
| Spinner/progress       | {"x":[0.0],"y":[0.0]}      | {"x":[1.0],"y":[1.0]}      |

Entrance duration >= exit duration. Exits = 65-75% of entrance timing.
Distance scales duration: 50px=0.8x, 100px=1.0x, 200px=1.3x, 400px=1.6x.`;
}

const PERSONALITY_CONTENT: Record<MotionPersonality, string> = {
  playful: `
MOTION PERSONALITY: PLAYFUL
- Duration: 9-18 frames (150-300ms) standard
- Signature easing (ease-out-back): "o":{"x":[0.175],"y":[0.885]}, "i":{"x":[0.32],"y":[1.275]}
- Overshoot: 10-20% beyond target, then settle
- Paths: always curved — arcs with 15-25px perpendicular offset, never straight lines
- Squash-stretch on all impacts and landings
- Bounce settle on entrances: overshoot → undershoot → target (spring feel)
- Stagger: varied timing (40-80ms between elements) for organic feel
- Keywords: fun, whimsical, bouncy, cute, friendly`,

  premium: `
MOTION PERSONALITY: PREMIUM
- Duration: 21-36 frames (350-600ms) standard
- Signature easing: "o":{"x":[0.4],"y":[0.0]}, "i":{"x":[0.2],"y":[1.0]}
- Overshoot: 0% — never overshoot, motion is perfectly controlled
- Paths: smooth gentle curves, subtle parallax
- Scale changes: minimal — 98%→100% for entrances, never dramatic
- Prefer opacity + one other property (position or scale), never three
- Generous pauses between motion beats (6-12 frames of stillness)
- Keywords: elegant, minimal, luxury, sophisticated`,

  corporate: `
MOTION PERSONALITY: CORPORATE
- Duration: 12-24 frames (200-400ms) standard
- Signature easing: "o":{"x":[0.2],"y":[0.0]}, "i":{"x":[0.0],"y":[1.0]}
- Overshoot: 0-3% — subtle at most
- Paths: mostly straight, small arcs (5-10px offset) only for emphasis
- Clear, predictable state transitions — same interaction = same motion
- Uniform stagger timing (3-6 frames between elements)
- No squash-stretch, no bounce
- Keywords: clean, professional, business, dashboard`,

  energetic: `
MOTION PERSONALITY: ENERGETIC
- Duration: 6-15 frames (100-250ms) standard
- Signature easing (ease-out-expo): "o":{"x":[0.0],"y":[0.0]}, "i":{"x":[0.0],"y":[1.0]}
- Overshoot: 15-30% — dramatic overshoot, fast snap to target
- Paths: dramatic arcs with 25-40px offset, large displacement, diagonal movement
- Scale changes: large (50-150% range), fast color transitions
- Squash-stretch: exaggerated on impacts
- Stagger: accelerating (each element faster than the last)
- Keywords: dynamic, energetic, bold, exciting`,
};

export function buildPersonalitySection(personality: MotionPersonality): string {
  return PERSONALITY_CONTENT[personality];
}

const EMOTION_CONTENT: Record<EmotionHint, string> = {
  joy: 'Joy: bouncy arcs, curved upward paths, ease-out-back easing, 12-24 frames, 10-20% overshoot',
  calm: 'Calm: smooth flowing, gentle curves, sine ease-in-out, 30-60 frames, 0% overshoot',
  urgency: 'Urgency: sharp fast direct, straight lines, ease-out, 6-12 frames, 0% overshoot',
  surprise: 'Surprise: sudden expanding, radial outward, ease-out-expo, 9-18 frames, 15% overshoot',
  elegance: 'Elegance: slow controlled, long smooth arcs, premium easing, 24-42 frames, 0% overshoot',
  sadness: 'Sadness: slow downward, drooping curves, ease-in-out, 36-72 frames, 0% overshoot',
  playfulness: 'Playfulness: bouncy irregular, arcs and wiggles, ease-out-back, 12-21 frames, 10-15% overshoot',
};

export function buildEmotionSection(emotion: EmotionHint): string {
  return `\nEMOTION TARGET: ${EMOTION_CONTENT[emotion]}
Match easing, timing, and path character to this emotional intent.`;
}

export function buildQualityRulesSection(): string {
  return `
QUALITY RULES (never break):
- NEVER use linear easing for spatial movement (position, scale). Linear only for rotation spinners and progress bars.
- NEVER use opacity-only for important state changes — always combine opacity with position or scale.
- NEVER move an element >170px (1/3 of 512px canvas) without an intermediate keyframe.
- ALWAYS include at least 2 motion layers (primary + secondary). Add ambient for polish.
- Entrance easing = ease-out. Exit easing = ease-in. Looping = sine. Do not mix.
- Entrance duration >= exit duration. Exits should be 65-75% of entrance timing.
- Stagger delay between elements: 1-4 frames. Total stagger must stay under 30 frames (500ms).
- Follow-through: child/secondary elements should settle 3-9 frames after the primary.`;
}

export function buildChoreographySection(): string {
  return `
CHOREOGRAPHY:
- Hero element: enters first or most prominently — largest displacement, attention-grabbing easing
- Spatial consistency: all elements enter from the same direction or shared origin
- Counter-motion: when hero moves right, ambient moves left at 20-30% speed/distance
- Stagger patterns:
  - Micro cascade: 1-2 frames apart (list items, grid cells)
  - Standard: 3-6 frames apart (cards, panels, nav items)
  - Dramatic: 6-12 frames apart (hero sections, reveals)
- With 3+ elements, max 1/3 actively animating at any moment — stagger so element 1 settles as element 3 starts
- Depth through speed: foreground moves fastest (1.0x), midground 0.5x, background 0.2x`;
}

export function buildPatternRecipesSection(): string {
  return `
COMMON PATTERNS (Lottie keyframe recipes):
- Pulsing/breathing: scale oscillates [98,98]↔[102,102], sine easing, 120-240 frames/cycle, loop
- Bounce entrance: start 30px below + opacity 0 + scale [90,90], ease-out-back to final pos + opacity 100 + scale [100,100], 12-18 frames, 5-15% overshoot
- Error shake: position.x oscillates ±10px, 3 cycles with decreasing amplitude, ease-in-out, 18-24 frames total
- Success pop: scale from [90,90] to [110,110] (6 frames, ease-out), settle to [100,100] (9 frames), optional trim path stroke draw for checkmark
- Fade entrance: opacity 0 + position offset 20px below, to final pos + opacity 100, ease-out, 12-21 frames
- Spinner: rotation 0→360, linear easing (only valid use of linear), 60-90 frames/revolution
- Staggered bars/list: each element delays 2-4 frames, same easing and duration, total stagger <30 frames`;
}

// ── Orchestrator ──

export function buildMotionDesignSection(options?: MotionDesignOptions): string {
  const sections: string[] = [];
  sections.push(buildCorePrinciplesSection());
  sections.push(buildTimingEasingSection());
  if (options?.personality) {
    sections.push(buildPersonalitySection(options.personality));
  }
  if (options?.emotion) {
    sections.push(buildEmotionSection(options.emotion));
  }
  sections.push(buildQualityRulesSection());
  sections.push(buildChoreographySection());
  sections.push(buildPatternRecipesSection());
  return sections.join('\n');
}
