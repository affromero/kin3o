# CLAUDE.md — kin3o

> **@afromero/kin3o** — AI-powered Lottie animation generator CLI

## What is kin3o?

kin3o generates Lottie JSON animations and interactive dotLottie state machines from natural language prompts using Claude/Codex as the AI backend. Named after kinesis (Greek: movement/motion).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + tsx (dev) / tsc → dist (npm) |
| Language | TypeScript (strict mode) |
| CLI | Commander.js |
| AI | Claude Code CLI, Codex CLI, Anthropic API |
| Packaging | @dotlottie/dotlottie-js (create/read .lottie files) |
| Preview | Standalone HTML + lottie-web / dotlottie-web |
| Tests | Node test runner (`node --test`) |
| CI/CD | GitHub Actions (CI, deploy, npm publish on tags) |

## npm Package

Published as `@afromero/kin3o`. Bin name is `kin3o`.

```bash
npm install -g @afromero/kin3o    # global install → kin3o command
npx @afromero/kin3o generate ...  # or run without installing
```

Versioning: bump version in package.json, tag, push — GitHub Actions publishes to npm.

```bash
npm version patch                 # bumps version + creates git tag
git push origin main --tags       # triggers .github/workflows/publish.yml
```

## Build Commands

```bash
npm install
npm run dev                    # Run CLI (tsx, no build)
npm run build                  # Compile to dist/ (tsconfig.build.json)
npm run typecheck              # Type check (all files incl. tests)
npm run test                   # Run tests
npm run ci                     # typecheck + test
```

## CLI Usage

```bash
kin3o generate "pulsing circle"                        # Static animation (.json)
kin3o generate "toggle switch" --interactive            # Interactive state machine (.lottie)
kin3o preview output/file.json                         # Preview Lottie JSON
kin3o preview output/file.lottie                       # Preview dotLottie
kin3o validate output/file.json                        # Validate Lottie JSON
kin3o validate output/file.lottie                      # Validate dotLottie
kin3o providers                                         # List AI providers
```

## Architecture

```
src/
  index.ts                        — CLI entry point (Commander, shebang for bin)
  packager.ts                     — dotLottie .lottie file create/read/write
  state-machine-validator.ts      — State machine structural validation
  validator.ts                    — Lottie JSON validation + auto-fix
  preview.ts                      — Browser preview (static + interactive)
  utils.ts                        — Shared helpers (JSON extraction, slugify)
  brand.ts                        — Brand tokens (colors, fonts, gradients)
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
landing/
  index.html                      — Landing page (kin3o.com)
examples/
  pulse.json                      — Example static animation
  waveform.json                   — Example static animation
  interactive-button.lottie       — Example interactive animation
  mascot.json                     — Static mascot/logo animation
  mascot.lottie                   — Interactive mascot (hover state)
.github/workflows/
  ci.yml                          — Typecheck + test on push/PR
  deploy.yml                      — Deploy landing page to production
  publish.yml                     — Publish to npm on v* tags
```

## Engineering Patterns

- **Providers**: spawn CLI subprocesses (claude --print, codex exec) to use existing subscriptions
- **Detection**: two-gate check — binary exists AND auth file present
- **JSON extraction**: strip markdown fences, regex extract JSON object
- **Validation**: structural checks + auto-fix for common AI mistakes (0-255 colors, missing fields)
- **Interactive mode**: `--interactive` flag → multi-animation envelope + state machine → .lottie ZIP
- **State machine validation**: initial state, animation refs, transition targets, guard/input refs
- **dotLottie packaging**: @dotlottie/dotlottie-js for .lottie ZIP creation and reading
- **Prompt barrel**: all prompts/examples/tokens imported via `src/prompts/index.ts`

## DO

- Use Node test runner for all tests
- Validate all generated Lottie JSON before writing
- Auto-fix common issues (missing version, 0-255 colors)
- Keep system prompt concise — token budget matters
- Build with `tsconfig.build.json` (excludes tests from dist)
- Tag releases — npm publish is automated via GitHub Actions

## DON'T

- Add retry loops — user re-runs on failure
- Use jest/vitest — Node test runner only
- Import lottie-js — raw JSON generation is more reliable
- Commit dist/ — it's gitignored, built on publish
