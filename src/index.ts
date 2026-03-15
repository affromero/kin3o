import { readFileSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { PROVIDERS, detectAvailableProviders, getDefaultProvider } from './providers/registry.js';
import { buildSystemPrompt } from './prompts/system.js';
import { loadDesignTokens } from './prompts/tokens.js';
import { validateLottie, autoFix } from './validator.js';
import { openPreview } from './preview.js';
import { extractJson, slugify, ensureOutputDir } from './utils.js';

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
    console.log('\nkin3o — Generating animation...');

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
    const systemPrompt = buildSystemPrompt(tokens);

    // 4. Generate
    try {
      const result = await provider.generate(model, systemPrompt, prompt);
      console.log(`  ✓ Generated in ${(result.durationMs / 1000).toFixed(1)}s`);

      // 5. Extract and parse JSON
      const jsonStr = extractJson(result.content);
      const lottieJson = JSON.parse(jsonStr) as object;

      // 6. Validate
      const validation = validateLottie(lottieJson);

      if (!validation.valid) {
        console.error('  ✗ Invalid Lottie JSON:');
        validation.errors.forEach(e => console.error(`    - ${e}`));
        process.exit(1);
      }

      // 7. Auto-fix if warnings
      let finalJson = lottieJson;
      if (validation.warnings.length > 0) {
        finalJson = autoFix(lottieJson) as object;
        const fixes = validation.warnings.length;
        console.log(`  ✓ Valid Lottie JSON (${fixes} auto-fix${fixes > 1 ? 'es' : ''}: ${validation.warnings.join(', ')})`);
      } else {
        console.log('  ✓ Valid Lottie JSON');
      }

      // 8. Write output
      const outputDir = ensureOutputDir();
      const slug = slugify(prompt);
      const timestamp = Math.floor(Date.now() / 1000);
      const filename = options.output ?? `${slug}-${timestamp}.json`;
      const outputPath = join(outputDir, filename);

      writeFileSync(outputPath, JSON.stringify(finalJson, null, 2), 'utf-8');
      console.log(`  ✓ Written to ${outputPath}`);

      // 9. Preview
      if (options.preview) {
        const previewPath = await openPreview(finalJson);
        console.log(`  ✓ Preview opened: ${previewPath}`);
      }

      console.log('');
    } catch (err) {
      console.error(`  ✗ Generation failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('preview <file>')
  .description('Preview an existing Lottie JSON file in the browser')
  .action(async (file: string) => {
    try {
      const raw = readFileSync(file, 'utf-8');
      const json = JSON.parse(raw) as object;
      const previewPath = await openPreview(json);
      console.log(`Preview opened: ${previewPath}`);
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
  .description('Validate a Lottie JSON file')
  .action(async (file: string) => {
    try {
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
    } catch (err) {
      console.error(`Failed to validate: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
