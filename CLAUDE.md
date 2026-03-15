# CLAUDE.md — kin3o

> **kin3o** — AI-powered Lottie animation generator CLI

## What is kin3o?

kin3o generates Lottie JSON animations from natural language prompts using Claude/Codex as the AI backend. Named after kin3o (Greek: movement/motion).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + tsx (no build step) |
| Language | TypeScript (strict mode) |
| CLI | Commander.js |
| AI | Claude Code CLI, Codex CLI, Anthropic API |
| Packaging | @dotlottie/dotlottie-js (create/read .lottie files) |
| Preview | Standalone HTML + lottie-web / dotlottie-web |
| Tests | Node test runner (`node --test`) |

## Build Commands

```bash
npm install
npm run dev                    # Run CLI
npm run generate               # Generate animation
npm run typecheck              # Type check
npm run test                   # Run tests
npm run ci                     # typecheck + test
```

## CLI Usage

```bash
npx tsx src/index.ts generate "pulsing circle"                        # Static animation (.json)
npx tsx src/index.ts generate "toggle switch" --interactive           # Interactive state machine (.lottie)
npx tsx src/index.ts refine output/file.json "make it faster"         # Refine existing animation
npx tsx src/index.ts refine output/file.lottie "add bounce" -o out.lottie  # Refine with custom output
npx tsx src/index.ts preview output/file.json                        # Preview Lottie JSON
npx tsx src/index.ts preview output/file.lottie                      # Preview dotLottie
npx tsx src/index.ts validate output/file.json                       # Validate Lottie JSON
npx tsx src/index.ts validate output/file.lottie                     # Validate dotLottie
npx tsx src/index.ts providers                                        # List AI providers
```

## Architecture

```
src/
  index.ts                        — CLI entry point (Commander)
  packager.ts                     — dotLottie .lottie file create/read/write
  state-machine-validator.ts      — State machine structural validation
  validator.ts                    — Lottie JSON validation + auto-fix
  preview.ts                      — Browser preview (static + interactive)
  utils.ts                        — Shared helpers (JSON extraction, slugify, versioned paths)
  providers/
    registry.ts                   — Provider detection + selection
    claude.ts                     — Claude Code CLI provider
    codex.ts                      — Codex CLI provider
    anthropic.ts                  — Direct Anthropic API provider
  prompts/
    index.ts                      — Barrel: single import for all prompts/examples/tokens
    system.ts                     — Static system prompt (exports LOTTIE_FORMAT_REFERENCE)
    system-interactive.ts         — Interactive system prompt (state machines)
    examples.ts                   — Few-shot Lottie examples (pulsing circle, waveform)
    examples-interactive.ts       — Interactive button example (idle/hover/pressed)
    examples-mascot.ts            — kin3o mascot/logo animation (static + interactive)
    tokens.ts                     — Design token loader
preview/
  template.html                   — Static Lottie preview (lottie-web)
  template-interactive.html       — Interactive dotLottie preview (dotlottie-web)
examples/
  pulse.json                      — Example static animation
  waveform.json                   — Example static animation
  interactive-button.lottie       — Example interactive animation
  mascot.json                     — Static mascot/logo animation
  mascot.lottie                   — Interactive mascot (hover state)
```

## Engineering Patterns

- **Providers**: spawn CLI subprocesses (claude --print, codex exec) to use existing subscriptions
- **Detection**: two-gate check — binary exists AND auth file present
- **JSON extraction**: strip markdown fences, regex extract JSON object
- **Validation**: structural checks + auto-fix for common AI mistakes (0-255 colors, missing fields)
- **Interactive mode**: `--interactive` flag → multi-animation envelope + state machine → .lottie ZIP
- **State machine validation**: initial state, animation refs, transition targets, guard/input refs
- **dotLottie packaging**: @dotlottie/dotlottie-js for .lottie ZIP creation and reading
- **Refinement**: `refine` command reads existing output, sends current JSON + instruction to AI, writes versioned output (e.g. `anim-v2.json`)

## DO

- Use Node test runner for all tests
- Validate all generated Lottie JSON before writing
- Auto-fix common issues (missing version, 0-255 colors)
- Keep system prompt concise — token budget matters

## DON'T

- Add retry loops — user re-runs on failure
- Use jest/vitest — Node test runner only
- Import lottie-js — raw JSON generation is more reliable
- Build step — tsx runs TypeScript directly
