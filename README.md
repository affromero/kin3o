# kin3o

AI-powered Lottie animation generator. Turns natural language prompts into valid, playable Lottie JSON animations using Claude or Codex as the AI backend.

Named after *kinesis* (Greek: movement/motion).

## Why?

Every motion design tool (Rive, LottieFiles, Hera) sandboxes its AI inside a walled-garden editor, charges per-generation credits, and requires designs we don't have. kin3o spawns `claude --print` or `codex exec` as subprocesses to use existing Max/Pro subscriptions at zero marginal cost, with full context control via system prompts.

## Competitors

| Feature | **kin3o** | **LottieFiles** | **LottieGen** | **Recraft** | **Lottielab** |
|---------|-----------|-----------------|---------------|-------------|---------------|
| Text → Lottie JSON | Yes | Yes (Motion Copilot) | Yes | Yes (via export) | No |
| CLI | Yes | No | No | No | No |
| Web editor | No | Yes | Yes | Yes | Yes |
| Open source | Yes | No | No | No | No |
| Uses your own AI sub | Yes | No | No | No | No |
| Custom design tokens | Yes | No | No | No | No |
| Animation library | No | Yes (massive) | No | Yes | Yes |
| State machines | Yes (dotLottie) | Yes | No | No | Yes |
| Team collaboration | No | Yes | No | Yes | Yes |
| API access | No | Yes | No | Yes | Yes |
| **Price** | **Free (OSS)** | **Free / $19.99+/mo** | **Waitlist (TBD)** | **Free (50/day) / $10+/mo** | **Free / up to $99/mo** |

> Sources: [LottieFiles](https://lottiefiles.com/pricing) · [LottieGen](https://lottiegenai.webflow.io/) · [Recraft](https://www.recraft.ai/pricing) · [Lottielab](https://www.lottielab.com/pricing) — prices as of March 2025.

## Quick Start

```bash
npm install
npx tsx src/index.ts generate "loading spinner with 3 dots"
```

## CLI Usage

```bash
# Generate animation from prompt
npx tsx src/index.ts generate "pulsing circle that breathes"
npx tsx src/index.ts generate "5-bar audio waveform" --provider claude-code --model sonnet
npx tsx src/index.ts generate "notification bell" --no-preview --output bell.json
npx tsx src/index.ts generate "loading dots" --tokens sotto  # use Sotto design tokens

# Generate interactive state machine (.lottie output)
npx tsx src/index.ts generate "toggle switch with on/off states" --interactive

# Preview existing Lottie file
npx tsx src/index.ts preview output/animation.json
npx tsx src/index.ts preview output/animation.lottie  # interactive dotLottie

# Validate Lottie JSON or dotLottie
npx tsx src/index.ts validate output/animation.json
npx tsx src/index.ts validate output/animation.lottie

# List available AI providers
npx tsx src/index.ts providers
```

### Options

| Flag | Description |
|------|-------------|
| `-p, --provider <name>` | AI provider (`claude-code`, `codex`, `anthropic`) |
| `-m, --model <name>` | Model (`sonnet`, `opus`, `haiku`, `codex`) |
| `-o, --output <path>` | Output filename |
| `--no-preview` | Skip browser preview |
| `-i, --interactive` | Generate interactive state machine (`.lottie` output) |
| `-t, --tokens <path>` | Design tokens JSON or `sotto` preset |

## Using Generated Animations

kin3o outputs standard `.json` Lottie files — no compilation, no binary encoding, no special tooling. Drop them into any project:

```tsx
// React (lottie-react)
import Lottie from 'lottie-react';
import animationData from './pulsing-circle.json';

<Lottie animationData={animationData} loop autoplay />
```

```html
<!-- Vanilla JS (lottie-web) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<div id="anim"></div>
<script>
  lottie.loadAnimation({
    container: document.getElementById('anim'),
    path: './pulsing-circle.json',
    loop: true,
    autoplay: true,
  });
</script>
```

```swift
// iOS (lottie-ios)
let animationView = LottieAnimationView(name: "pulsing-circle")
animationView.loopMode = .loop
animationView.play()
```

## Why Lottie over Rive?

### For AI generation

| Criteria | Lottie | Rive |
|----------|--------|------|
| Format | JSON (text, diffable) | Binary (.riv) |
| LLM can generate? | Yes (structured JSON) | No (binary, no public writer) |
| Web runtime | lottie-web (165KB) | @rive-app/canvas (200KB+) |
| React integration | lottie-react | @rive-app/react-canvas |
| Ecosystem | Massive (LottieFiles, AE) | Growing (Rive editor) |
| **Verdict for AI gen** | **Winner** | Binary format = blocker |

### Animation capabilities

| Capability | Lottie | Rive |
|-----------|--------|------|
| Shape animation (scale, rotate, position, opacity) | ✓ | ✓ |
| Path morphing, trim paths | ✓ | ✓ |
| Color transitions | ✓ | ✓ |
| Multi-layer compositions | ✓ | ✓ |
| Masking, mattes | ✓ | ✓ |
| Easing curves | ✓ | ✓ |
| State machines (hover, click, drag → states) | ✓ (dotLottie) | ✓ |
| Skeletal/bone animation | ✗ | ✓ |
| Mesh deformation | ✗ | ✓ |
| Runtime input (eyes follow cursor, sliders) | ✗ | ✓ |

Lottie covers ~90% of real-world animation needs (loading spinners, icon animations, waveforms, transitions, micro-interactions). The 10% Rive wins on — interactivity, skeletal animation, mesh deformation — requires an interactive editor to wire up, not something generatable from a text prompt.

## Architecture

```
Static:   prompt → provider.generate() → extractJson() → validateLottie() → autoFix() → write .json → openPreview()
Interactive: prompt → provider.generate() → extractInteractiveJson() → validate each animation + state machine → writeDotLottie() → openDotLottiePreview()
```

Providers spawn CLI subprocesses (`claude --print`, `codex exec`) to leverage existing subscriptions. The system prompt includes a concise Lottie format spec + hand-crafted few-shot examples. Interactive mode generates a multi-animation envelope with a dotLottie state machine.

## Development

```bash
npm run typecheck    # Type check
npm run test         # Run tests (node --test)
npm run ci           # typecheck + test
```

## Test Results

_Run test prompts and record results here._

| Prompt | Valid? | Plays? | Quality | Fidelity |
|--------|--------|--------|---------|----------|
| | | | | |
