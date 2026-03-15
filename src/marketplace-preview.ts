import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { ensureOutputDir } from './utils.js';
import type { LottieFilesAnimation } from './marketplace.js';

const templateDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'preview',
);

export interface SearchMeta {
  query: string;
  totalCount: number;
  mode: 'search' | 'featured' | 'popular' | 'recent';
}

export async function openSearchResults(
  animations: LottieFilesAnimation[],
  meta: SearchMeta,
): Promise<string> {
  const template = readFileSync(join(templateDir, 'template-search.html'), 'utf-8');

  const html = template
    .replace('__SEARCH_RESULTS__', JSON.stringify(animations))
    .replace('__SEARCH_META__', JSON.stringify(meta));

  const outputDir = ensureOutputDir();
  const filename = `search-${Date.now()}.html`;
  const fullPath = join(outputDir, filename);

  writeFileSync(fullPath, html, 'utf-8');
  await open(fullPath);

  return fullPath;
}
