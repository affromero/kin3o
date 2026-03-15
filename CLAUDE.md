# CLAUDE.md — Kineo

> **Kineo** — AI-powered Lottie animation generator CLI

## What is Kineo?

Kineo generates Lottie JSON animations from natural language prompts using Claude/Codex as the AI backend. Named after Kineo (Greek: movement/motion).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + tsx (no build step) |
| Language | TypeScript (strict mode) |
| CLI | Commander.js |
| AI | Claude Code CLI, Codex CLI, Anthropic API |
| Preview | Standalone HTML + lottie-web |
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
npx tsx src/index.ts generate "pulsing circle"    # Generate animation
npx tsx src/index.ts preview output/file.json     # Preview existing
npx tsx src/index.ts validate output/file.json    # Validate Lottie
npx tsx src/index.ts providers                     # List AI providers
```

## Architecture

```
src/
  index.ts              — CLI entry point (Commander)
  providers/
    registry.ts         — Provider detection + selection
    claude.ts           — Claude Code CLI provider
    codex.ts            — Codex CLI provider
    anthropic.ts        — Direct Anthropic API provider
  prompts/
    system.ts           — System prompt builder
    examples.ts         — Few-shot Lottie examples
    tokens.ts           — Design token loader
  validator.ts          — Lottie JSON validation + auto-fix
  preview.ts            — Browser preview generator
  utils.ts              — Shared helpers
```

## Engineering Patterns

- **Providers**: spawn CLI subprocesses (claude --print, codex exec) to use existing subscriptions
- **Detection**: two-gate check — binary exists AND auth file present
- **JSON extraction**: strip markdown fences, regex extract JSON object
- **Validation**: structural checks + auto-fix for common AI mistakes (0-255 colors, missing fields)

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
