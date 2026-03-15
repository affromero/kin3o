# Kineo

AI-powered Lottie animation generator. Turns natural language prompts into valid, playable Lottie JSON animations using Claude or Codex as the AI backend.

Named after *kinesis* (Greek: movement/motion).

## Why?

Every motion design tool (Rive, LottieFiles, Hera) sandboxes its AI inside a walled-garden editor, charges per-generation credits, and requires designs we don't have. Kineo spawns `claude --print` or `codex exec` as subprocesses to use existing Max/Pro subscriptions at zero marginal cost, with full context control via system prompts.

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

## Lottie vs Rive for AI Generation

| Criteria | Lottie | Rive |
|----------|--------|------|
| Format | JSON (text, diffable) | Binary (.riv) |
| LLM can generate? | Yes (structured JSON) | No (binary, no public writer) |
| Web runtime | lottie-web (165KB) | @rive-app/canvas (200KB+) |
| React integration | lottie-react | @rive-app/react-canvas |
| Interactivity | Play/pause/seek | State machines + inputs |
| Ecosystem | Massive (LottieFiles, AE) | Growing (Rive editor) |
| **Verdict for AI gen** | **Winner** | Binary format = blocker |

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

## Test Results

_Run test prompts and record results here._

| Prompt | Valid? | Plays? | Quality | Fidelity |
|--------|--------|--------|---------|----------|
| | | | | |
