#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { PROVIDERS, detectAvailableProviders, getDefaultProvider } from './providers/registry.js';
import { buildSystemPrompt, buildInteractiveSystemPrompt, buildRefinementUserPrompt, buildInteractiveRefinementUserPrompt, loadDesignTokens } from './prompts/index.js';
import { validateLottie, autoFix } from './validator.js';
import { validateStateMachine } from './state-machine-validator.js';
import { openPreview, openDotLottiePreview } from './preview.js';
import { writeDotLottie, readDotLottie } from './packager.js';
import { extractJson, extractInteractiveJson, slugify, ensureOutputDir, nextVersionedPath } from './utils.js';
import { searchAnimations, featuredAnimations, popularAnimations, recentAnimations, resolveTarget, createLoginToken, pollForAccessToken, createUploadRequest, uploadFile, publishAnimation } from './marketplace.js';
import { openSearchResults } from './marketplace-preview.js';
import { loadAuthToken, loadAuthExpiry, saveAuthToken, clearAuthToken } from './marketplace-auth.js';
import { startViewServer } from './view.js';
import { exportAnimation, parseResolution, extractLottieJsonFromFile, extractAnimationMeta, detectChromePath, detectFfmpeg } from './export.js';

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
  .option('--timeout <ms>', 'CLI subprocess timeout in milliseconds (default: auto per model)', parseInt)
  .action(async (prompt: string, options: GenerateOptions & { timeout?: number }) => {
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
      const result = await provider.generate(model, systemPrompt, prompt, options.timeout);
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
  .command('refine <file> <prompt>')
  .description('Refine an existing Lottie animation with a follow-up instruction')
  .option('-p, --provider <provider>', 'AI provider to use')
  .option('-m, --model <model>', 'Model to use')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-preview', 'Skip opening preview in browser')
  .option('-t, --tokens <path>', 'Path to design tokens JSON (or "sotto" for built-in)')
  .option('--timeout <ms>', 'CLI subprocess timeout in milliseconds (default: 600000)', parseInt)
  .action(async (file: string, prompt: string, rawOptions: Omit<GenerateOptions, 'interactive'> & { timeout?: number }) => {
    const resolvedPath = resolve(file);

    // 1. Validate input file
    if (!existsSync(resolvedPath)) {
      console.error(`  ✗ File not found: ${resolvedPath}`);
      process.exit(1);
    }

    const isInteractive = file.endsWith('.lottie');
    const mode = isInteractive ? 'interactive' : 'static';
    console.log(`\nkin3o — Refining ${mode} animation...`);

    // 2. Read current animation
    let currentJson: string;
    try {
      if (isInteractive) {
        const { animations, stateMachine } = await readDotLottie(resolvedPath);
        currentJson = JSON.stringify({ animations, stateMachine }, null, 2);
      } else {
        currentJson = readFileSync(resolvedPath, 'utf-8');
        JSON.parse(currentJson); // validate it's valid JSON
      }
    } catch (err) {
      console.error(`  ✗ Failed to read input file: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    // 3. Warn on large files
    const sizeKb = Math.round(statSync(resolvedPath).size / 1024);
    if (sizeKb > 500) {
      console.log(`  ⚠ Large animation (${sizeKb}KB) — may hit provider token limits`);
    }

    // 4. Detect provider
    let providerKey = rawOptions.provider;
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

    const model = rawOptions.model ?? provider.defaultModel;
    console.log(`  Provider: ${provider.displayName} (${model})`);
    console.log(`  Refining: ${file}`);
    console.log(`  Instruction: "${prompt}"\n`);

    // 5. Build prompts
    const tokens = rawOptions.tokens ? loadDesignTokens(rawOptions.tokens) : undefined;
    const systemPrompt = isInteractive
      ? buildInteractiveSystemPrompt(tokens)
      : buildSystemPrompt(tokens);
    const userPrompt = isInteractive
      ? buildInteractiveRefinementUserPrompt(currentJson, prompt)
      : buildRefinementUserPrompt(currentJson, prompt);

    // 6. Generate refined output
    try {
      const result = await provider.generate(model, systemPrompt, userPrompt, rawOptions.timeout);
      console.log(`  ✓ Refined in ${(result.durationMs / 1000).toFixed(1)}s`);

      // 7. Compute output path
      const outputDir = ensureOutputDir();
      const outputFile = rawOptions.output ?? nextVersionedPath(resolvedPath, outputDir);
      const options: GenerateOptions = { ...rawOptions, interactive: isInteractive, output: outputFile };

      if (isInteractive) {
        await handleInteractiveOutput(result.content, prompt, options);
      } else {
        await handleStaticOutput(result.content, prompt, options);
      }

      console.log('');
    } catch (err) {
      console.error(`  ✗ Refinement failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

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

interface ExportCommandOptions {
  format: string;
  res: string;
  fps: string;
  output?: string;
  bg?: string;
}

program
  .command('export <file>')
  .description('Export a Lottie animation to MP4, WebM, or GIF video')
  .option('--format <format>', 'Output format: mp4, webm, gif', 'mp4')
  .option('--res <resolution>', 'Resolution: 1080p, 720p, 480p, 360p, 4k, or WxH', '1080p')
  .option('--fps <fps>', 'Frames per second', '30')
  .option('-o, --output <path>', 'Output file path')
  .option('--bg <color>', 'Background color (hex or name, default: black for mp4, transparent for gif/webm)')
  .action(async (file: string, options: ExportCommandOptions) => {
    const resolvedPath = resolve(file);

    if (!existsSync(resolvedPath)) {
      console.error(`  ✗ File not found: ${resolvedPath}`);
      process.exit(1);
    }

    const format = options.format.toLowerCase();
    if (!['mp4', 'webm', 'gif'].includes(format)) {
      console.error(`  ✗ Unsupported format "${options.format}". Use mp4, webm, or gif.`);
      process.exit(1);
    }

    let resolution: { width: number; height: number };
    try {
      resolution = parseResolution(options.res);
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    const fps = parseInt(options.fps, 10);
    if (isNaN(fps) || fps <= 0) {
      console.error(`  ✗ Invalid fps "${options.fps}". Must be a positive number.`);
      process.exit(1);
    }

    let background = options.bg ?? (format === 'mp4' ? '#000000' : 'transparent');
    if (format === 'mp4' && background === 'transparent') {
      console.log('  ⚠ MP4 does not support transparency — using black background. Use --format webm for alpha.');
      background = '#000000';
    }

    const outputDir = ensureOutputDir();
    const slug = slugify(file.replace(/\.[^.]+$/, '').split('/').pop() ?? 'animation');
    const outputPath = options.output
      ? resolve(options.output)
      : join(outputDir, `${slug}.${format}`);

    console.log('\nkin3o — Exporting animation...');

    try {
      const lottieJson = await extractLottieJsonFromFile(resolvedPath);
      const meta = extractAnimationMeta(lottieJson);
      console.log(`  Source: ${file}`);
      console.log(`  Format: ${format.toUpperCase()} ${resolution.width}x${resolution.height} @ ${fps}fps`);
      console.log(`  Duration: ${meta.durationSeconds.toFixed(1)}s (${meta.totalFrames} frames)\n`);

      await exportAnimation(resolvedPath, {
        format: format as 'mp4' | 'webm' | 'gif',
        width: resolution.width,
        height: resolution.height,
        fps,
        background,
        output: outputPath,
      }, (frame, total) => {
        const pct = Math.round((frame / total) * 100);
        process.stdout.write(`\r  Exporting: frame ${frame}/${total} (${pct}%)`);
      });

      process.stdout.write('\n');
      console.log(`  ✓ Exported to ${outputPath}\n`);
    } catch (err) {
      process.stdout.write('\n');
      console.error(`  ✗ Export failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('view <file>')
  .description('Live preview with hot reload (file watcher + auto-reload)')
  .option('--port <n>', 'Port number (auto-selects if omitted)')
  .action(async (file: string, options: { port?: string }) => {
    const resolvedPath = resolve(file);

    if (!existsSync(resolvedPath)) {
      console.error(`  ✗ File not found: ${resolvedPath}`);
      process.exit(1);
    }

    const ext = resolvedPath.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'lottie') {
      console.error('  ✗ Unsupported file type. Use .json or .lottie');
      process.exit(1);
    }

    const port = options.port ? parseInt(options.port, 10) : undefined;

    console.log('\nkin3o — Live preview');
    const server = await startViewServer(resolvedPath, { port });
    console.log(`  ✓ Serving ${file}`);
    console.log(`  ✓ ${server.url}`);
    console.log('  Watching for changes... (Ctrl+C to stop)\n');

    process.on('SIGINT', () => {
      server.close();
      console.log('\n  ✓ Server stopped');
      process.exit(0);
    });
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

// --- Marketplace commands ---

interface SearchOptions {
  featured: boolean;
  popular: boolean;
  recent: boolean;
  limit: string;
  browser: boolean;
}

program
  .command('search [query]')
  .description('Search LottieFiles marketplace for animations')
  .option('--featured', 'Show featured animations', false)
  .option('--popular', 'Show popular animations', false)
  .option('--recent', 'Show recent animations', false)
  .option('--limit <n>', 'Number of results', '20')
  .option('--no-browser', 'Print results to terminal instead')
  .action(async (query: string | undefined, options: SearchOptions) => {
    const limit = parseInt(options.limit, 10) || 20;
    const isBrowse = options.featured || options.popular || options.recent;

    if (!query && !isBrowse) {
      console.error('  ✗ Provide a search query or use --featured, --popular, or --recent');
      process.exit(1);
    }

    console.log('\nkin3o — Searching LottieFiles...');

    try {
      let result;
      let mode: 'search' | 'featured' | 'popular' | 'recent';

      if (options.featured) {
        mode = 'featured';
        result = await featuredAnimations(limit);
      } else if (options.popular) {
        mode = 'popular';
        result = await popularAnimations(limit);
      } else if (options.recent) {
        mode = 'recent';
        result = await recentAnimations(limit);
      } else {
        mode = 'search';
        result = await searchAnimations(query!, { first: limit });
      }

      console.log(`  ✓ Found ${result.totalCount} animations${query ? ` for "${query}"` : ''}`);

      if (result.animations.length === 0) {
        console.log('  No results found.\n');
        return;
      }

      if (!options.browser) {
        // Terminal table output
        console.log('');
        const header = '  Name                              Author          UUID             Likes  Downloads';
        console.log(header);
        console.log('  ' + '─'.repeat(header.length - 2));

        for (const anim of result.animations) {
          const name = (anim.name || '').slice(0, 32).padEnd(34);
          const author = (anim.createdBy?.username || 'Unknown').slice(0, 14).padEnd(16);
          const uuid = anim.uuid.slice(0, 14).padEnd(17);
          const likes = String(anim.likesCount).padStart(5);
          const dl = String(anim.downloads ?? 0).padStart(10);
          console.log(`  ${name}${author}${uuid}${likes}${dl}`);
        }

        console.log('');
      } else {
        const previewPath = await openSearchResults(result.animations, {
          query: query || '',
          totalCount: result.totalCount,
          mode,
        });
        console.log(`  ✓ Results opened in browser: ${previewPath}`);
      }

      console.log('  Tip: Run "kin3o download <uuid>" to save an animation to output/\n');
    } catch (err) {
      console.error(`  ✗ Search failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

interface DownloadOptions {
  output?: string;
  preview: boolean;
  lottie: boolean;
}

program
  .command('download <target>')
  .description('Download an animation from LottieFiles (UUID, URL, or CDN link)')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-preview', 'Skip preview')
  .option('--lottie', 'Download .lottie format instead of .json', false)
  .action(async (target: string, options: DownloadOptions) => {
    console.log('\nkin3o — Downloading from LottieFiles...');

    try {
      const resolved = await resolveTarget(target, options.lottie);

      if (options.lottie && resolved.lottieBuffer) {
        const outputDir = ensureOutputDir();
        const slug = resolved.meta ? slugify(resolved.meta.name) : 'animation';
        const timestamp = Math.floor(Date.now() / 1000);
        const outputPath = options.output
          ? join(outputDir, options.output)
          : join(outputDir, `${slug}-${timestamp}.lottie`);

        writeFileSync(outputPath, resolved.lottieBuffer);

        if (resolved.meta) {
          console.log(`  ✓ Downloaded: ${resolved.meta.name} by ${resolved.meta.createdBy?.username ?? 'Unknown'}`);
        }
        console.log(`  ✓ Written to ${outputPath}`);

        if (options.preview) {
          const previewPath = await openDotLottiePreview(resolved.lottieBuffer);
          console.log(`  ✓ Preview opened: ${previewPath}`);
        }

        console.log(`  Tip: Run "kin3o refine ${outputPath} 'your instruction'" to modify\n`);
        return;
      }

      // JSON download
      const lottieJson = resolved.json;

      const validation = validateLottie(lottieJson);
      if (!validation.valid) {
        console.error('  ⚠ Downloaded Lottie has validation errors:');
        validation.errors.forEach(e => console.error(`    - ${e}`));
      }

      let finalJson = lottieJson;
      if (validation.warnings.length > 0) {
        finalJson = autoFix(lottieJson) as object;
        const fixes = validation.warnings.length;
        console.log(`  ✓ Valid Lottie JSON (${fixes} auto-fix${fixes > 1 ? 'es' : ''}: ${validation.warnings.join(', ')})`);
      } else if (validation.valid) {
        console.log('  ✓ Valid Lottie JSON');
      }

      const outputDir = ensureOutputDir();
      const slug = resolved.meta ? slugify(resolved.meta.name) : 'animation';
      const timestamp = Math.floor(Date.now() / 1000);
      const outputPath = options.output
        ? join(outputDir, options.output)
        : join(outputDir, `${slug}-${timestamp}.json`);

      writeFileSync(outputPath, JSON.stringify(finalJson, null, 2), 'utf-8');

      if (resolved.meta) {
        console.log(`  ✓ Downloaded: ${resolved.meta.name} by ${resolved.meta.createdBy?.username ?? 'Unknown'}`);
      }
      console.log(`  ✓ Written to ${outputPath}`);

      if (options.preview) {
        const previewPath = await openPreview(finalJson);
        console.log(`  ✓ Preview opened: ${previewPath}`);
      }

      console.log(`  Tip: Run "kin3o refine ${outputPath} 'your instruction'" to modify\n`);
    } catch (err) {
      console.error(`  ✗ Download failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// --- Auth + Publish commands ---

program
  .command('login')
  .description('Log in to LottieFiles to enable publishing')
  .action(async () => {
    const existing = loadAuthToken();
    if (existing) {
      const expiry = loadAuthExpiry();
      console.log(`  ✓ Already logged in (expires ${expiry ?? 'unknown'})`);
      return;
    }

    const appKey = process.env['LOTTIEFILES_APP_KEY'];
    if (!appKey) {
      console.error('  ✗ LOTTIEFILES_APP_KEY environment variable is required.');
      console.error('    Set it to your LottieFiles app key to enable login.');
      process.exit(1);
    }

    console.log('\nkin3o — Logging in to LottieFiles...');

    try {
      const { loginUrl, token } = await createLoginToken(appKey);

      const open = (await import('open')).default;
      await open(loginUrl);

      console.log('  Waiting for authentication... (complete login in browser)');
      const { accessToken, expiresAt } = await pollForAccessToken(token);

      saveAuthToken(accessToken, expiresAt);
      console.log(`  ✓ Logged in! Token expires ${expiresAt}\n`);
    } catch (err) {
      console.error(`  ✗ Login failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Log out from LottieFiles')
  .action(() => {
    clearAuthToken();
    console.log('  ✓ Logged out');
  });

interface PublishOptions {
  name: string;
  tags: string;
  description?: string;
}

program
  .command('publish <file>')
  .description('Publish an animation to LottieFiles marketplace')
  .requiredOption('--name <name>', 'Animation name')
  .requiredOption('--tags <tags>', 'Comma-separated tags')
  .option('--description <desc>', 'Optional description')
  .action(async (file: string, options: PublishOptions) => {
    const token = loadAuthToken();
    if (!token) {
      console.error('  ✗ Not logged in. Run "kin3o login" first.');
      process.exit(1);
    }

    const resolvedPath = resolve(file);
    if (!existsSync(resolvedPath)) {
      console.error(`  ✗ File not found: ${resolvedPath}`);
      process.exit(1);
    }

    console.log('\nkin3o — Publishing to LottieFiles...');

    try {
      // Validate the file
      const isLottie = file.endsWith('.lottie');
      if (!isLottie) {
        const raw = readFileSync(resolvedPath, 'utf-8');
        const json = JSON.parse(raw) as unknown;
        const validation = validateLottie(json);
        if (!validation.valid) {
          console.error('  ✗ Invalid Lottie JSON:');
          validation.errors.forEach(e => console.error(`    - ${e}`));
          process.exit(1);
        }
        console.log('  ✓ Validation passed');
      }

      const fileBuffer = readFileSync(resolvedPath);
      const type = isLottie ? 'DOT_LOTTIE' : 'LOTTIE';
      const filename = resolvedPath.split('/').pop() ?? 'animation.json';

      // Create upload request
      const { requestId, presignedUrl } = await createUploadRequest(token, filename, type);
      console.log('  ✓ Upload request created');

      // Upload file
      await uploadFile(presignedUrl, fileBuffer);
      console.log('  ✓ File uploaded');

      // Create animation entry
      const tags = options.tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await publishAnimation(token, {
        name: options.name,
        requestId,
        tags,
        description: options.description,
      });

      console.log(`  ✓ Published: ${options.name}`);
      console.log(`  ✓ View at: ${result.url}\n`);
    } catch (err) {
      console.error(`  ✗ Publish failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
