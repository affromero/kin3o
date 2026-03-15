import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { ensureOutputDir } from './utils.js';

const templateDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'preview',
);

export async function openPreview(lottieJson: object, outputPath?: string): Promise<string> {
  const template = readFileSync(join(templateDir, 'template.html'), 'utf-8');
  const html = template.replace('__ANIMATION_DATA__', JSON.stringify(lottieJson));

  const outputDir = ensureOutputDir();
  const filename = outputPath ?? `preview-${Date.now()}.html`;
  const fullPath = join(outputDir, filename);

  writeFileSync(fullPath, html, 'utf-8');
  await open(fullPath);

  return fullPath;
}

export async function openDotLottiePreview(dotlottieBuffer: Buffer): Promise<string> {
  const templatePath = join(templateDir, 'template-interactive.html');

  if (!existsSync(templatePath)) {
    throw new Error(`Interactive preview template not found at ${templatePath}`);
  }

  const template = readFileSync(templatePath, 'utf-8');
  const base64 = dotlottieBuffer.toString('base64');
  const html = template.replace('__DOTLOTTIE_DATA_BASE64__', base64);

  const outputDir = ensureOutputDir();
  const fullPath = join(outputDir, `preview-interactive-${Date.now()}.html`);

  writeFileSync(fullPath, html, 'utf-8');
  await open(fullPath);

  return fullPath;
}
