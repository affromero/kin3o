import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, hexToLottieColor, slugify } from './utils.js';

describe('extractJson', () => {
  it('extracts raw JSON', () => {
    const input = '{"v":"5.5.2","fr":60}';
    const result = extractJson(input);
    assert.deepStrictEqual(JSON.parse(result), { v: '5.5.2', fr: 60 });
  });

  it('extracts JSON from markdown fences', () => {
    const input = '```json\n{"v":"5.5.2","fr":60}\n```';
    const result = extractJson(input);
    assert.deepStrictEqual(JSON.parse(result), { v: '5.5.2', fr: 60 });
  });

  it('extracts JSON with surrounding text', () => {
    const input = 'Here is the animation:\n{"v":"5.5.2","fr":60}\nEnjoy!';
    const result = extractJson(input);
    assert.deepStrictEqual(JSON.parse(result), { v: '5.5.2', fr: 60 });
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => extractJson('no json here'), /No JSON object found/);
  });

  it('throws on malformed JSON', () => {
    assert.throws(() => extractJson('{broken: json}'));
  });
});

describe('hexToLottieColor', () => {
  it('converts 6-char hex', () => {
    const result = hexToLottieColor('#D97706');
    assert.deepStrictEqual(result, [0.851, 0.467, 0.024, 1]);
  });

  it('converts 3-char hex', () => {
    const result = hexToLottieColor('#fff');
    assert.deepStrictEqual(result, [1, 1, 1, 1]);
  });

  it('works without hash prefix', () => {
    const result = hexToLottieColor('000000');
    assert.deepStrictEqual(result, [0, 0, 0, 1]);
  });

  it('converts known color (deep navy)', () => {
    const result = hexToLottieColor('#1E3A5F');
    assert.deepStrictEqual(result, [0.118, 0.227, 0.373, 1]);
  });
});

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    assert.strictEqual(slugify('hello world'), 'hello-world');
  });

  it('removes special characters', () => {
    assert.strictEqual(slugify('hello@world!'), 'helloworld');
  });

  it('respects max length', () => {
    const result = slugify('this is a very long prompt that should be truncated', 20);
    assert.ok(result.length <= 20);
  });

  it('handles multiple spaces and hyphens', () => {
    assert.strictEqual(slugify('hello   world---test'), 'hello-world-test');
  });

  it('lowercases input', () => {
    assert.strictEqual(slugify('Hello World'), 'hello-world');
  });
});
