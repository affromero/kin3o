import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { ensureOutputDir } from './utils.js';

const templatePath = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'preview',
  'template.html',
);

export async function openPreview(lottieJson: object, outputPath?: string): Promise<string> {
  const template = readFileSync(templatePath, 'utf-8');
  const html = template.replace('__ANIMATION_DATA__', JSON.stringify(lottieJson));

  const outputDir = ensureOutputDir();
  const filename = outputPath ?? `preview-${Date.now()}.html`;
  const fullPath = join(outputDir, filename);

  writeFileSync(fullPath, html, 'utf-8');
  await open(fullPath);

  return fullPath;
}
