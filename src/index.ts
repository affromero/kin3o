#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { PROVIDERS, detectAvailableProviders, getDefaultProvider } from './providers/registry.js';
import { buildSystemPrompt, buildInteractiveSystemPrompt, loadDesignTokens } from './prompts/index.js';
import { validateLottie, autoFix } from './validator.js';
import { validateStateMachine } from './state-machine-validator.js';
import { openPreview, openDotLottiePreview } from './preview.js';
import { writeDotLottie, readDotLottie } from './packager.js';
import { extractJson, extractInteractiveJson, slugify, ensureOutputDir } from './utils.js';

const program = new Command();

program
  .name('kin3o')
  .description('AI-powered Lottie animation generator')
  .version('0.1.0');

interface GenerateOptions {
  provider?: string;
  model?: string;
  output?: string;
  preview: boolean;
  tokens?: string;
  interactive: boolean;
}

program
  .command('generate <prompt>')
  .description('Generate a Lottie animation from a natural language prompt')
  .option('-p, --provider <provider>', 'AI provider to use')
  .option('-m, --model <model>', 'Model to use')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-preview', 'Skip opening preview in browser')
  .option('-t, --tokens <path>', 'Path to design tokens JSON (or "sotto" for built-in)')
  .option('-i, --interactive', 'Generate interactive state machine (.lottie output)', false)
  .action(async (prompt: string, options: GenerateOptions) => {
    const mode = options.interactive ? 'interactive' : 'static';
    console.log(`\nkin3o — Generating ${mode} animation...`);

    // 1. Detect provider
    let providerKey = options.provider;
    if (!providerKey) {
      providerKey = await getDefaultProvider() ?? undefined;
      if (!providerKey) {
        console.error('  ✗ No AI providers available. Install Claude Code, Codex, or set ANTHROPIC_API_KEY.');
        process.exit(1);
      }
    }

    const provider = PROVIDERS[providerKey];
    if (!provider) {
      console.error(`  ✗ Unknown provider "${providerKey}". Run "kin3o providers" to see available options.`);
      process.exit(1);
    }

    const model = options.model ?? provider.defaultModel;
    console.log(`  Provider: ${provider.displayName} (${model})`);
    console.log(`  Prompt: "${prompt}"\n`);

    // 2. Load design tokens
    const tokens = options.tokens ? loadDesignTokens(options.tokens) : undefined;

    // 3. Build system prompt
    const systemPrompt = options.interactive
      ? buildInteractiveSystemPrompt(tokens)
      : buildSystemPrompt(tokens);

    // 4. Generate
    try {
      const result = await provider.generate(model, systemPrompt, prompt);
      console.log(`  ✓ Generated in ${(result.durationMs / 1000).toFixed(1)}s`);

      if (options.interactive) {
        await handleInteractiveOutput(result.content, prompt, options);
      } else {
        await handleStaticOutput(result.content, prompt, options);
      }

      console.log('');
    } catch (err) {
      console.error(`  ✗ Generation failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

async function handleStaticOutput(content: string, prompt: string, options: GenerateOptions): Promise<void> {
  const jsonStr = extractJson(content);
  const lottieJson = JSON.parse(jsonStr) as object;

  const validation = validateLottie(lottieJson);
  if (!validation.valid) {
    console.error('  ✗ Invalid Lottie JSON:');
    validation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }

  let finalJson = lottieJson;
  if (validation.warnings.length > 0) {
    finalJson = autoFix(lottieJson) as object;
    const fixes = validation.warnings.length;
    console.log(`  ✓ Valid Lottie JSON (${fixes} auto-fix${fixes > 1 ? 'es' : ''}: ${validation.warnings.join(', ')})`);
  } else {
    console.log('  ✓ Valid Lottie JSON');
  }

  const outputDir = ensureOutputDir();
  const slug = slugify(prompt);
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = options.output ?? `${slug}-${timestamp}.json`;
  const outputPath = join(outputDir, filename);

  writeFileSync(outputPath, JSON.stringify(finalJson, null, 2), 'utf-8');
  console.log(`  ✓ Written to ${outputPath}`);

  if (options.preview) {
    const previewPath = await openPreview(finalJson);
    console.log(`  ✓ Preview opened: ${previewPath}`);
  }
}

async function handleInteractiveOutput(content: string, prompt: string, options: GenerateOptions): Promise<void> {
  const envelope = extractInteractiveJson(content);
  const animationIds = Object.keys(envelope.animations);
  console.log(`  ✓ Extracted ${animationIds.length} animations: ${animationIds.join(', ')}`);

  // Validate each animation
  let totalFixes = 0;
  const fixedAnimations: Record<string, object> = {};

  for (const [id, anim] of Object.entries(envelope.animations)) {
    const validation = validateLottie(anim);
    if (!validation.valid) {
      console.error(`  ✗ Animation "${id}" invalid:`);
      validation.errors.forEach(e => console.error(`    - ${e}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      fixedAnimations[id] = autoFix(anim) as object;
      totalFixes += validation.warnings.length;
    } else {
      fixedAnimations[id] = anim;
    }
  }

  if (totalFixes > 0) {
    console.log(`  ✓ All animations valid (${totalFixes} auto-fix${totalFixes > 1 ? 'es' : ''})`);
  } else {
    console.log('  ✓ All animations valid');
  }

  // Validate state machine
  const smValidation = validateStateMachine(envelope.stateMachine, animationIds);
  if (!smValidation.valid) {
    console.error('  ✗ Invalid state machine:');
    smValidation.errors.forEach(e => console.error(`    - ${e}`));
    process.exit(1);
  }
  if (smValidation.warnings.length > 0) {
    smValidation.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }
  console.log('  ✓ State machine valid');

  // Package .lottie
  const outputDir = ensureOutputDir();
  const slug = slugify(prompt);
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = options.output ?? `${slug}-${timestamp}.lottie`;
  const outputPath = join(outputDir, filename);

  await writeDotLottie(outputPath, {
    animations: Object.entries(fixedAnimations).map(([id, data]) => ({ id, data })),
    stateMachine: { id: 'state-machine', data: envelope.stateMachine },
  });
  console.log(`  ✓ Written to ${outputPath}`);

  // Preview
  if (options.preview) {
    const buffer = readFileSync(outputPath);
    const previewPath = await openDotLottiePreview(buffer);
    console.log(`  ✓ Preview opened: ${previewPath}`);
  }
}

program
  .command('preview <file>')
  .description('Preview a Lottie JSON or .lottie file in the browser')
  .action(async (file: string) => {
    try {
      if (file.endsWith('.lottie')) {
        const buffer = readFileSync(file);
        const previewPath = await openDotLottiePreview(buffer);
        console.log(`Preview opened: ${previewPath}`);
      } else {
        const raw = readFileSync(file, 'utf-8');
        const json = JSON.parse(raw) as object;
        const previewPath = await openPreview(json);
        console.log(`Preview opened: ${previewPath}`);
      }
    } catch (err) {
      console.error(`Failed to preview: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('providers')
  .description('List available AI providers')
  .action(async () => {
    const available = await detectAvailableProviders();
    console.log('\nAvailable AI Providers:\n');
    for (const [key, config] of Object.entries(PROVIDERS)) {
      const status = available.includes(key) ? '✓' : '✗';
      console.log(`  ${status} ${config.displayName} (${key})`);
      console.log(`    Models: ${config.models.join(', ')}`);
    }
    console.log('');
  });

program
  .command('validate <file>')
  .description('Validate a Lottie JSON or .lottie file')
  .action(async (file: string) => {
    try {
      if (file.endsWith('.lottie')) {
        const { animations, stateMachine } = await readDotLottie(file);
        const animationIds = Object.keys(animations);
        let allValid = true;

        for (const [id, anim] of Object.entries(animations)) {
          const result = validateLottie(anim);
          if (result.valid) {
            console.log(`✓ Animation "${id}": valid`);
          } else {
            console.log(`✗ Animation "${id}": invalid`);
            result.errors.forEach(e => console.log(`  Error: ${e}`));
            allValid = false;
          }
          result.warnings.forEach(w => console.log(`  Warning: ${w}`));
        }

        if (stateMachine) {
          const smResult = validateStateMachine(stateMachine, animationIds);
          if (smResult.valid) {
            console.log('✓ State machine: valid');
          } else {
            console.log('✗ State machine: invalid');
            smResult.errors.forEach(e => console.log(`  Error: ${e}`));
            allValid = false;
          }
          smResult.warnings.forEach(w => console.log(`  Warning: ${w}`));
        }

        process.exit(allValid ? 0 : 1);
      } else {
        const raw = readFileSync(file, 'utf-8');
        const json = JSON.parse(raw) as unknown;
        const result = validateLottie(json);

        if (result.valid) {
          console.log(`✓ Valid Lottie JSON: ${file}`);
        } else {
          console.log(`✗ Invalid Lottie JSON: ${file}`);
          result.errors.forEach(e => console.log(`  Error: ${e}`));
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach(w => console.log(`  Warning: ${w}`));
        }

        process.exit(result.valid ? 0 : 1);
      }
    } catch (err) {
      console.error(`Failed to validate: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
