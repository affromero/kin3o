<div align="center">

# kin3o

**Text to Motion. From your terminal.**

[![CI](https://github.com/affromero/kin3o/actions/workflows/ci.yml/badge.svg)](https://github.com/affromero/kin3o/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/affromero/kin3o/pulls)

AI-powered Lottie animation generator. Turns natural language prompts into valid, playable Lottie JSON using your existing Claude or Codex subscription.

</div>

## Why?

Every motion design tool (Rive, LottieFiles, Hera) sandboxes its AI inside a walled-garden editor, charges per-generation credits, and requires designs we don't have. kin3o spawns `claude --print` or `codex exec` as subprocesses to use existing Max/Pro subscriptions at zero marginal cost, with full context control via system prompts.

## Competitors

| Feature | **kin3o** | [LottieFiles](https://lottiefiles.com) | [LottieGen](https://lottiegenai.webflow.io/) | [Recraft](https://www.recraft.ai) | [Lottielab](https://www.lottielab.com) |
|---------|-----------|-----------------|---------------|-------------|---------------|
| Text → Lottie JSON | **Yes** | Yes (Motion Copilot) | Yes | Yes (via export) | No |
| CLI | **Yes** | No | No | No | No |
| Web editor | **CLI-first** | Yes | Yes | Yes | Yes |
| Open source | **Yes** | No | No | No | No |
| Uses your own AI sub | **Yes** | No | No | No | No |
| Custom design tokens | **Yes** | No | No | No | No |
| Animation library | **Compatible with [LottieFiles](https://lottiefiles.com)** | Yes (massive) | No | Yes | Yes |
| State machines | **Not yet** | Yes | No | No | Yes |
| Team collaboration | **Git-native** | Yes | No | Yes | Yes |
| Programmatic access | **Yes (CLI + stdout)** | Yes (REST API) | No | Yes (REST API) | Yes (REST API) |
| **Price** | **Free (OSS)** | Free / $19.99+/mo | Waitlist (TBD) | Free (50/day) / $10+/mo | Free / up to $99/mo |

> Prices as of March 2025.

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

# Preview existing Lottie file
npx tsx src/index.ts preview output/animation.json

# Validate Lottie JSON
npx tsx src/index.ts validate output/animation.json

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
| State machines (hover, click, drag → states) | ✗ | ✓ |
| Skeletal/bone animation | ✗ | ✓ |
| Mesh deformation | ✗ | ✓ |
| Runtime input (eyes follow cursor, sliders) | ✗ | ✓ |

Lottie covers ~90% of real-world animation needs (loading spinners, icon animations, waveforms, transitions, micro-interactions). The 10% Rive wins on — interactivity, skeletal animation, mesh deformation — requires an interactive editor to wire up, not something generatable from a text prompt.

## Architecture

```
prompt → provider.generate() → extractJson() → validateLottie() → autoFix() → write JSON → openPreview()
```

Providers spawn CLI subprocesses (`claude --print`, `codex exec`) to leverage existing subscriptions. The system prompt includes a concise Lottie format spec + two hand-crafted few-shot examples.

## Development

```bash
npm run typecheck    # Type check
npm run test         # Run tests (node --test)
npm run ci           # typecheck + test
```
