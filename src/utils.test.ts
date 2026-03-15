import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { extractJson, extractInteractiveJson, hexToLottieColor, slugify, nextVersionedPath } from './utils.js';

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

describe('extractInteractiveJson', () => {
  const validEnvelope = JSON.stringify({
    animations: {
      idle: { v: '5.5.2', fr: 60, ip: 0, op: 120, w: 512, h: 512, layers: [] },
    },
    stateMachine: {
      initial: 'idle',
      states: [{ name: 'idle', type: 'PlaybackState', animation: 'idle' }],
      interactions: [],
      inputs: [],
    },
  });

  it('extracts valid envelope', () => {
    const result = extractInteractiveJson(validEnvelope);
    assert.ok('idle' in result.animations);
    assert.strictEqual(result.stateMachine.initial, 'idle');
  });

  it('extracts from markdown fences', () => {
    const result = extractInteractiveJson('```json\n' + validEnvelope + '\n```');
    assert.ok('idle' in result.animations);
  });

  it('throws on missing animations', () => {
    const bad = JSON.stringify({ stateMachine: { initial: 'a', states: [] } });
    assert.throws(() => extractInteractiveJson(bad), /animations/);
  });

  it('throws on empty animations', () => {
    const bad = JSON.stringify({ animations: {}, stateMachine: { initial: 'a', states: [] } });
    assert.throws(() => extractInteractiveJson(bad), /empty/);
  });

  it('throws on missing stateMachine', () => {
    const bad = JSON.stringify({ animations: { a: { v: '5.5.2' } } });
    assert.throws(() => extractInteractiveJson(bad), /stateMachine/);
  });

  it('throws on missing initial in stateMachine', () => {
    const bad = JSON.stringify({ animations: { a: { v: '5.5.2' } }, stateMachine: { states: [] } });
    assert.throws(() => extractInteractiveJson(bad), /initial/);
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

describe('nextVersionedPath', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-versions');

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('first refinement produces -v2', () => {
    const result = nextVersionedPath('pulsing-circle-1710000000.json', tmpDir);
    assert.strictEqual(result, join(tmpDir, 'pulsing-circle-1710000000-v2.json'));
  });

  it('increments from existing -v2 to -v3', () => {
    writeFileSync(join(tmpDir, 'my-anim-v2.json'), '{}');
    const result = nextVersionedPath('my-anim-v2.json', tmpDir);
    assert.strictEqual(result, join(tmpDir, 'my-anim-v3.json'));
  });

  it('finds highest existing version', () => {
    writeFileSync(join(tmpDir, 'thing-v2.json'), '{}');
    writeFileSync(join(tmpDir, 'thing-v3.json'), '{}');
    writeFileSync(join(tmpDir, 'thing-v5.json'), '{}');
    const result = nextVersionedPath('thing.json', tmpDir);
    assert.strictEqual(result, join(tmpDir, 'thing-v6.json'));
  });

  it('works for .lottie extension', () => {
    const result = nextVersionedPath('toggle-switch.lottie', tmpDir);
    assert.strictEqual(result, join(tmpDir, 'toggle-switch-v2.lottie'));
  });

  it('handles non-existent output dir gracefully', () => {
    const result = nextVersionedPath('anim.json', '/tmp/nonexistent-dir-xyz');
    assert.strictEqual(result, join('/tmp/nonexistent-dir-xyz', 'anim-v2.json'));
  });
});
