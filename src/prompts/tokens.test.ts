import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDesignTokens, SOTTO_TOKENS } from './tokens.js';

describe('SOTTO_TOKENS', () => {
  it('has all expected color keys', () => {
    const keys = Object.keys(SOTTO_TOKENS.colors);
    assert.ok(keys.includes('primary'));
    assert.ok(keys.includes('accent'));
    assert.ok(keys.includes('background'));
    assert.ok(keys.includes('text'));
  });

  it('colors are normalized 0-1 RGBA arrays', () => {
    for (const [name, color] of Object.entries(SOTTO_TOKENS.colors)) {
      assert.strictEqual(color.length, 4, `${name} should have 4 components`);
      for (const c of color) {
        assert.ok(c >= 0 && c <= 1, `${name} component ${c} out of 0-1 range`);
      }
    }
  });
});

describe('loadDesignTokens', () => {
  it('returns undefined for no path', () => {
    assert.strictEqual(loadDesignTokens(), undefined);
    assert.strictEqual(loadDesignTokens(undefined), undefined);
  });

  it('returns SOTTO_TOKENS for "sotto" preset', () => {
    const result = loadDesignTokens('sotto');
    assert.deepStrictEqual(result, SOTTO_TOKENS);
  });

  it('loads and converts colors from a JSON file', () => {
    const tmpFile = join(tmpdir(), `tokens-test-${Date.now()}.json`);
    try {
      writeFileSync(tmpFile, JSON.stringify({
        colors: { brand: '#FF0000', dark: '#000000' },
      }));

      const result = loadDesignTokens(tmpFile);
      assert.ok(result !== undefined);
      assert.deepStrictEqual(result!.colors['brand'], [1, 0, 0, 1]);
      assert.deepStrictEqual(result!.colors['dark'], [0, 0, 0, 1]);
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });

  it('returns undefined when JSON has no colors key', () => {
    const tmpFile = join(tmpdir(), `tokens-test-no-colors-${Date.now()}.json`);
    try {
      writeFileSync(tmpFile, JSON.stringify({ fonts: {} }));
      const result = loadDesignTokens(tmpFile);
      assert.strictEqual(result, undefined);
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });
});
