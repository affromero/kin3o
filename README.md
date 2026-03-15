<div align="center">

# kin3o

**Text to Motion. From your terminal.**

[![npm](https://img.shields.io/npm/v/kin3o)](https://www.npmjs.com/package/kin3o)
[![CI](https://github.com/affromero/kin3o/actions/workflows/ci.yml/badge.svg)](https://github.com/affromero/kin3o/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/affromero/kin3o/pulls)

AI-powered Lottie animation generator. Turns natural language prompts into valid, playable Lottie JSON and interactive dotLottie state machines using your existing Claude or Codex subscription.

</div>

## Why?

Every motion design tool (Rive, LottieFiles, Hera) sandboxes its AI inside a walled-garden editor, charges per-generation credits, and requires designs we don't have. kin3o spawns `claude --print` or `codex exec` as subprocesses to use existing Max/Pro subscriptions at zero marginal cost, with full context control via system prompts.

## Competitors

| Feature | **kin3o** | [LottieFiles](https://lottiefiles.com) | [LottieGen](https://lottiegenai.webflow.io/) | [Recraft](https://www.recraft.ai) | [Lottielab](https://www.lottielab.com) |
|---------|-----------|-----------------|---------------|-------------|---------------|
| Text → Lottie JSON | **Yes** | Yes (Motion Copilot) | Yes | Yes (via export) | No |
| Text → State machines | **Yes (dotLottie)** | No | No | No | No |
| CLI | **Yes** | No | No | No | No |
| Web editor | **CLI-first** | Yes | Yes | Yes | Yes |
| Open source | **Yes** | No | No | No | No |
| Uses your own AI sub | **Yes** | No | No | No | No |
| Custom design tokens | **Yes** | No | No | No | No |
| Animation library | **Compatible with [LottieFiles](https://lottiefiles.com)** | Yes (massive) | No | Yes | Yes |
| State machines | **Yes (dotLottie)** | Yes | No | No | Yes |
| Team collaboration | **Git-native** | Yes | No | Yes | Yes |
| Programmatic access | **Yes (CLI + stdout)** | Yes (REST API) | No | Yes (REST API) | Yes (REST API) |
| **Price** | **Free (OSS)** | Free / $19.99+/mo | Waitlist (TBD) | Free (50/day) / $10+/mo | Free / up to $99/mo |

> Prices as of March 2026.

## Quick Start

```bash
# Install globally
npm install -g kin3o

# Generate a static animation
kin3o generate "loading spinner with 3 dots"

# Generate an interactive state machine
kin3o generate "toggle switch with on/off states" --interactive
```

Or use without installing:

```bash
npx kin3o generate "pulsing circle"
```

## CLI Usage

```bash
# Static animations (.json)
kin3o generate "pulsing circle that breathes"
kin3o generate "5-bar audio waveform" --provider claude-code --model sonnet
kin3o generate "notification bell" --no-preview --output bell.json
kin3o generate "loading dots" --tokens sotto

# Interactive state machines (.lottie)
kin3o generate "toggle switch with on/off states" --interactive
kin3o generate "like button with hover and click" --interactive

# Preview
kin3o preview output/animation.json
kin3o preview output/animation.lottie

# Validate
kin3o validate output/animation.json
kin3o validate output/animation.lottie

# List available AI providers
kin3o providers
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

### Static animations (`.json`)

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

### Interactive state machines (`.lottie`)

```html
<!-- dotlottie-web — hover, click, and tap state transitions -->
<script type="module">
  import { DotLottie } from 'https://esm.sh/@lottiefiles/dotlottie-web';
  const dotLottie = new DotLottie({
    canvas: document.querySelector('canvas'),
    src: './toggle-switch.lottie',
    autoplay: true,
  });
</script>
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

Lottie covers ~90% of real-world animation needs. The 10% Rive wins on — skeletal animation, mesh deformation — requires an interactive editor to wire up, not something generatable from a text prompt. State machines are now covered by kin3o via dotLottie.

## Architecture

```
Static:      prompt → generate() → extractJson() → validateLottie() → autoFix() → .json → preview
Interactive: prompt → generate() → extractInteractiveJson() → validate animations + state machine → .lottie → preview
```

### Prompt System

All prompts live in `src/prompts/` with a barrel export at `src/prompts/index.ts`:

| Module | Purpose |
|--------|---------|
| `system.ts` | Static Lottie generation prompt + `LOTTIE_FORMAT_REFERENCE` |
| `system-interactive.ts` | Interactive state machine prompt (imports shared ref) |
| `examples.ts` | Few-shot: pulsing circle, waveform bars |
| `examples-interactive.ts` | Few-shot: interactive button (idle/hover/pressed) |
| `examples-mascot.ts` | kin3o mascot/logo (static + interactive) |
| `tokens.ts` | Design token loader (hex → Lottie RGBA) |

## Development

```bash
npm install
npm run typecheck    # Type check
npm run test         # Run tests (node --test)
npm run ci           # typecheck + test
npm run build        # Compile to dist/
```

## License

MIT
